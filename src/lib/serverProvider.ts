import type {
  LlmProvider,
  ProviderStreamEvent,
  ProviderStreamItem,
  ProviderUsage,
} from '../types'

interface ServerProviderOptions {
  baseUrl?: string
}

export interface ServerHealth {
  ok: boolean
  provider: string
  model: string
  hasDeepSeekKey: boolean
}

interface ServerEvent {
  event: string
  data: unknown
}

const defaultApiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:3001'

export function createServerProvider(options: ServerProviderOptions = {}): LlmProvider {
  const baseUrl = (options.baseUrl ?? defaultApiBaseUrl).replace(/\/$/, '')

  return {
    id: 'deepseek-live',
    label: 'DeepSeek Live Provider',
    streamTurn: (input, requestOptions) =>
      postSse(
        `${baseUrl}/api/agent-turn`,
        { provider: 'deepseek', ...input },
        requestOptions?.signal,
      ),
    streamSummary: (input, requestOptions) =>
      postSse(
        `${baseUrl}/api/moderator-summary`,
        { provider: 'deepseek', ...input },
        requestOptions?.signal,
      ),
    streamGuidance: (input, requestOptions) =>
      postSse(
        `${baseUrl}/api/needs-guide`,
        { provider: 'deepseek', ...input },
        requestOptions?.signal,
      ),
  }
}

export async function checkServerHealth(
  options: ServerProviderOptions & { signal?: AbortSignal } = {},
): Promise<ServerHealth> {
  const baseUrl = (options.baseUrl ?? defaultApiBaseUrl).replace(/\/$/, '')
  const response = await fetch(`${baseUrl}/api/health`, {
    headers: { Accept: 'application/json' },
    signal: options.signal,
  })

  if (!response.ok) throw new Error(`Local API returned ${response.status}.`)
  return (await response.json()) as ServerHealth
}

async function* postSse(
  url: string,
  body: unknown,
  signal?: AbortSignal,
): AsyncGenerator<ProviderStreamItem> {
  let response: Response

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(body),
      signal,
    })
  } catch (error) {
    if (isAbortError(error)) throw error
    throw new Error('Cannot reach the local API at http://127.0.0.1:3001. Run npm run dev:all.')
  }

  if (!response.ok) {
    throw new Error(await readSafeError(response))
  }
  if (!response.body) {
    throw new Error('The local API did not return a readable stream.')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const drained = drainSseBuffer(buffer)
    buffer = drained.rest

    for (const event of drained.events) {
      const item = toProviderItem(event)
      if (item) yield item
    }
  }

  buffer += decoder.decode()
  const drained = drainSseBuffer(`${buffer}\n\n`)
  for (const event of drained.events) {
    const item = toProviderItem(event)
    if (item) yield item
  }
}

async function readSafeError(response: Response) {
  try {
    const payload = (await response.json()) as { error?: string }
    return payload.error ?? `Local API returned ${response.status}.`
  } catch {
    return `Local API returned ${response.status}.`
  }
}

function drainSseBuffer(buffer: string) {
  const events: ServerEvent[] = []
  let rest = buffer.replace(/\r\n/g, '\n')
  let boundary = rest.indexOf('\n\n')

  while (boundary >= 0) {
    const rawEvent = rest.slice(0, boundary)
    rest = rest.slice(boundary + 2)
    const parsed = parseSseEvent(rawEvent)
    if (parsed) events.push(parsed)
    boundary = rest.indexOf('\n\n')
  }

  return { events, rest }
}

function parseSseEvent(rawEvent: string): ServerEvent | undefined {
  const lines = rawEvent.split(/\r?\n/)
  let event = 'message'
  const dataLines: string[] = []

  for (const line of lines) {
    if (line.startsWith('event:')) {
      event = line.slice('event:'.length).trim()
      continue
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice('data:'.length).trimStart())
    }
  }

  if (dataLines.length === 0) return undefined

  try {
    return { event, data: JSON.parse(dataLines.join('\n')) }
  } catch {
    return { event, data: dataLines.join('\n') }
  }
}

function toProviderItem(serverEvent: ServerEvent): ProviderStreamEvent | undefined {
  if (serverEvent.event === 'chunk') {
    const text = readStringField(serverEvent.data, 'text')
    return text ? { type: 'chunk', text } : undefined
  }

  if (serverEvent.event === 'usage') {
    const usage = readUsage(serverEvent.data)
    return usage ? { type: 'usage', usage } : undefined
  }

  if (serverEvent.event === 'done') {
    return { type: 'done', usage: readUsage(serverEvent.data) }
  }

  if (serverEvent.event === 'error') {
    throw new Error(readStringField(serverEvent.data, 'error') ?? 'The local API returned an error.')
  }

  return undefined
}

function readStringField(value: unknown, key: string) {
  return isRecord(value) && typeof value[key] === 'string' ? value[key] : undefined
}

function readUsage(value: unknown): ProviderUsage | undefined {
  if (!isRecord(value)) return undefined
  const totalTokens = Number(value.totalTokens)
  if (!Number.isFinite(totalTokens) || totalTokens <= 0) return undefined

  return {
    totalTokens,
    promptTokens: readOptionalNumber(value.promptTokens),
    completionTokens: readOptionalNumber(value.completionTokens),
    promptCacheHitTokens: readOptionalNumber(value.promptCacheHitTokens),
    promptCacheMissTokens: readOptionalNumber(value.promptCacheMissTokens),
    costEstimate: readOptionalNumber(value.costEstimate),
    model: readStringField(value, 'model'),
    source: readStringField(value, 'source'),
  }
}

function readOptionalNumber(value: unknown) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError'
}
