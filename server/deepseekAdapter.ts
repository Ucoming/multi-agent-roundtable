import type { ProviderUsage } from '../src/types'
import type { ChatPrompt } from './promptBuilder'

export interface DeepSeekPayload {
  model: string
  messages: Array<{
    role: 'system' | 'user'
    content: string
  }>
  stream: true
  stream_options: {
    include_usage: true
  }
  thinking: {
    type: 'disabled'
  }
  temperature: number
  max_tokens: number
}

export type DeepSeekParsedEvent =
  | { type: 'chunk'; text: string; usage?: ProviderUsage }
  | { type: 'usage'; usage: ProviderUsage }
  | { type: 'done' }

export interface DeepSeekStreamOptions {
  apiKey: string
  baseUrl: string
  payload: DeepSeekPayload
  fetchImpl?: typeof fetch
  signal?: AbortSignal
}

interface DeepSeekUsage {
  prompt_tokens?: number
  completion_tokens?: number
  prompt_cache_hit_tokens?: number
  prompt_cache_miss_tokens?: number
  total_tokens?: number
}

interface DeepSeekPricing {
  inputCacheHit: number
  inputCacheMiss: number
  output: number
}

// USD per 1M tokens. Unknown model IDs use the conservative V4 Pro rates.
const deepSeekPricing: Record<'flash' | 'pro', DeepSeekPricing> = {
  flash: { inputCacheHit: 0.0028, inputCacheMiss: 0.14, output: 0.28 },
  pro: { inputCacheHit: 0.003625, inputCacheMiss: 0.435, output: 0.87 },
}

export function buildDeepSeekPayload({
  prompt,
  model,
  temperature,
  maxTokens,
}: {
  prompt: ChatPrompt
  model: string
  temperature: number
  maxTokens: number
}): DeepSeekPayload {
  return {
    model,
    messages: [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ],
    stream: true,
    stream_options: {
      include_usage: true,
    },
    thinking: {
      type: 'disabled',
    },
    temperature: clampTemperature(temperature),
    max_tokens: maxTokens,
  }
}

export async function* streamDeepSeekChat({
  apiKey,
  baseUrl,
  payload,
  fetchImpl = fetch,
  signal,
}: DeepSeekStreamOptions): AsyncGenerator<DeepSeekParsedEvent> {
  const response = await fetchImpl(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(payload),
    signal,
  })

  if (!response.ok) {
    throw new Error(await readProviderError(response))
  }
  if (!response.body) {
    throw new Error('DeepSeek returned an empty stream.')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const drained = drainDeepSeekSseBuffer(buffer)
    buffer = drained.rest

    for (const data of drained.data) {
      const event = parseDeepSeekData(data, payload.model)
      if (event) yield event
    }
  }

  buffer += decoder.decode()
  const drained = drainDeepSeekSseBuffer(`${buffer}\n\n`)
  for (const data of drained.data) {
    const event = parseDeepSeekData(data, payload.model)
    if (event) yield event
  }
}

export function drainDeepSeekSseBuffer(buffer: string) {
  const data: string[] = []
  let rest = buffer.replace(/\r\n/g, '\n')
  let boundary = rest.indexOf('\n\n')

  while (boundary >= 0) {
    const rawEvent = rest.slice(0, boundary)
    rest = rest.slice(boundary + 2)
    const eventData = rawEvent
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice('data:'.length).trimStart())
      .join('\n')

    if (eventData) data.push(eventData)
    boundary = rest.indexOf('\n\n')
  }

  return { data, rest }
}

export function parseDeepSeekData(data: string, model: string): DeepSeekParsedEvent | undefined {
  if (data.trim() === '[DONE]') return { type: 'done' }

  let payload: unknown
  try {
    payload = JSON.parse(data)
  } catch {
    return undefined
  }

  const usage = normalizeDeepSeekUsage(readRecord(payload)?.usage, model)
  const text = readDeepSeekDeltaText(payload)

  if (usage && !text) return { type: 'usage', usage }
  if (text) return { type: 'chunk', text, usage }
  return undefined
}

function readDeepSeekDeltaText(payload: unknown) {
  const choices = readRecord(payload)?.choices
  if (!Array.isArray(choices)) return ''

  return choices
    .map((choice) => {
      const delta = readRecord(choice)?.delta
      const content = readRecord(delta)?.content
      return typeof content === 'string' ? content : ''
    })
    .join('')
}

function normalizeDeepSeekUsage(value: unknown, model: string): ProviderUsage | undefined {
  const usage = readRecord(value) as DeepSeekUsage | undefined
  if (!usage) return undefined

  const promptTokens = readNumber(usage.prompt_tokens)
  const completionTokens = readNumber(usage.completion_tokens)
  const promptCacheHitTokens = readNumber(usage.prompt_cache_hit_tokens)
  const promptCacheMissTokens = readNumber(usage.prompt_cache_miss_tokens)
  const totalTokens = readNumber(usage.total_tokens) ?? (promptTokens ?? 0) + (completionTokens ?? 0)

  if (!totalTokens) return undefined

  return {
    promptTokens,
    completionTokens,
    promptCacheHitTokens,
    promptCacheMissTokens,
    totalTokens,
    costEstimate: estimateDeepSeekCost({
      model,
      promptTokens,
      completionTokens,
      promptCacheHitTokens,
      promptCacheMissTokens,
    }),
    model,
    source: 'deepseek',
  }
}

export function estimateDeepSeekCost({
  model,
  promptTokens = 0,
  completionTokens = 0,
  promptCacheHitTokens = 0,
  promptCacheMissTokens = 0,
}: {
  model: string
  promptTokens?: number
  completionTokens?: number
  promptCacheHitTokens?: number
  promptCacheMissTokens?: number
}) {
  const pricing = model.includes('flash') ? deepSeekPricing.flash : deepSeekPricing.pro
  const classifiedPromptTokens = promptCacheHitTokens + promptCacheMissTokens
  const uncategorizedPromptTokens = Math.max(0, promptTokens - classifiedPromptTokens)
  const cost =
    (promptCacheHitTokens * pricing.inputCacheHit +
      (promptCacheMissTokens + uncategorizedPromptTokens) * pricing.inputCacheMiss +
      completionTokens * pricing.output) /
    1_000_000

  return Number(cost.toFixed(6))
}

function readNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined
}

function clampTemperature(value: number) {
  if (!Number.isFinite(value)) return 0.7
  return Math.min(2, Math.max(0, value))
}

async function readProviderError(response: Response) {
  try {
    const payload = (await response.json()) as { error?: { message?: string }; message?: string }
    return payload.error?.message ?? payload.message ?? `DeepSeek returned HTTP ${response.status}.`
  } catch {
    return `DeepSeek returned HTTP ${response.status}.`
  }
}
