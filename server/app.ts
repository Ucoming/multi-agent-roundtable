import cors from 'cors'
import express, { type Request, type Response } from 'express'
import type {
  DiscussionBrief,
  GuidanceStage,
  NeedsGuideInput,
  ProviderSummaryInput,
  ProviderTurnInput,
} from '../src/types'
import {
  buildDeepSeekPayload,
  streamDeepSeekChat,
  type DeepSeekPayload,
} from './deepseekAdapter'
import type { ServerConfig } from './env'
import { buildAgentPrompt, buildModeratorPrompt, buildNeedsGuidePrompt } from './promptBuilder'

type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string }

export function createApp(config: ServerConfig) {
  const app = express()

  app.use(
    cors({
      origin: [/^http:\/\/127\.0\.0\.1:\d+$/, /^http:\/\/localhost:\d+$/],
    }),
  )
  app.use(express.json({ limit: '1mb' }))

  app.get('/api/health', (_request, response) => {
    response.json({
      ok: true,
      provider: 'deepseek',
      model: config.deepseekModel,
      hasDeepSeekKey: Boolean(config.deepseekApiKey),
    })
  })

  app.post('/api/agent-turn', async (request, response) => {
    prepareSse(response)

    const validation = validateTurnRequest(request.body)
    if (!validation.ok) {
      sendSse(response, 'error', { error: validation.error })
      response.end()
      return
    }

    const prompt = buildAgentPrompt(validation.value)
    const payload = buildDeepSeekPayload({
      prompt,
      model: config.deepseekModel,
      temperature: validation.value.agent.temperature,
      maxTokens: 900,
    })

    await streamProviderResponse(request, response, config, payload)
  })

  app.post('/api/moderator-summary', async (request, response) => {
    prepareSse(response)

    const validation = validateSummaryRequest(request.body)
    if (!validation.ok) {
      sendSse(response, 'error', { error: validation.error })
      response.end()
      return
    }

    const prompt = buildModeratorPrompt(validation.value)
    const payload = buildDeepSeekPayload({
      prompt,
      model: config.deepseekModel,
      temperature: 0.35,
      maxTokens: 1100,
    })

    await streamProviderResponse(request, response, config, payload)
  })

  app.post('/api/needs-guide', async (request, response) => {
    prepareSse(response)

    const validation = validateNeedsGuideRequest(request.body)
    if (!validation.ok) {
      sendSse(response, 'error', { error: validation.error })
      response.end()
      return
    }

    const prompt = buildNeedsGuidePrompt(validation.value)
    const payload = buildDeepSeekPayload({
      prompt,
      model: config.deepseekModel,
      temperature: validation.value.stage === 'summary' ? 0.35 : 0.55,
      maxTokens: validation.value.stage === 'summary' ? 900 : 420,
    })

    await streamProviderResponse(request, response, config, payload)
  })

  return app
}

async function streamProviderResponse(
  request: Request,
  response: Response,
  config: ServerConfig,
  payload: DeepSeekPayload,
) {
  if (!config.deepseekApiKey) {
    sendSse(response, 'error', {
      error: 'DeepSeek API key is not configured. Add DEEPSEEK_API_KEY to .env and restart npm run dev:all.',
    })
    response.end()
    return
  }

  const abortController = new AbortController()
  const abortUpstream = () => {
    if (!response.writableEnded) abortController.abort()
  }
  request.once('aborted', abortUpstream)
  response.once('close', abortUpstream)

  try {
    for await (const event of streamDeepSeekChat({
      apiKey: config.deepseekApiKey,
      baseUrl: config.deepseekBaseUrl,
      payload,
      signal: abortController.signal,
    })) {
      if (event.type === 'chunk') {
        if (event.text) sendSse(response, 'chunk', { text: event.text })
        if (event.usage) sendSse(response, 'usage', event.usage)
      }
      if (event.type === 'usage') {
        sendSse(response, 'usage', event.usage)
      }
    }

    sendSse(response, 'done', { ok: true })
  } catch (error) {
    if (abortController.signal.aborted || response.destroyed) return
    sendSse(response, 'error', {
      error: error instanceof Error ? error.message : 'DeepSeek request failed.',
    })
  } finally {
    request.off('aborted', abortUpstream)
    response.off('close', abortUpstream)
    if (!response.writableEnded && !response.destroyed) response.end()
  }
}

function prepareSse(response: Response) {
  response.status(200)
  response.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  response.setHeader('Cache-Control', 'no-cache, no-transform')
  response.setHeader('Connection', 'keep-alive')
  response.flushHeaders?.()
}

function sendSse(response: Response, event: string, data: unknown) {
  response.write(`event: ${event}\n`)
  response.write(`data: ${JSON.stringify(data)}\n\n`)
}

function validateTurnRequest(value: unknown): ValidationResult<ProviderTurnInput> {
  if (!isRecord(value)) return invalid('Request body must be an object.')
  if (value.provider !== 'deepseek') return invalid('Only the deepseek provider is supported.')
  if (!isRecord(value.agent)) return invalid('Missing agent.')
  if (!isRecord(value.config)) return invalid('Missing roundtable config.')
  if (!Array.isArray(value.activeAgents)) return invalid('Missing active agents.')
  if (!Array.isArray(value.previousMessages)) return invalid('Missing previous messages.')
  if (typeof value.config.question !== 'string' || !value.config.question.trim()) {
    return invalid('Question is required.')
  }
  if (typeof value.agent.systemPrompt !== 'string') return invalid('Agent system prompt is required.')

  return {
    ok: true as const,
    value: {
      agent: value.agent as unknown as ProviderTurnInput['agent'],
      config: value.config as unknown as ProviderTurnInput['config'],
      round: Number(value.round),
      turnIndex: Number(value.turnIndex),
      activeAgents: value.activeAgents as ProviderTurnInput['activeAgents'],
      previousMessages: value.previousMessages as ProviderTurnInput['previousMessages'],
      discussionBrief: readDiscussionBrief(value.discussionBrief),
    },
  }
}

function validateSummaryRequest(value: unknown): ValidationResult<ProviderSummaryInput> {
  if (!isRecord(value)) return invalid('Request body must be an object.')
  if (value.provider !== 'deepseek') return invalid('Only the deepseek provider is supported.')
  if (!isRecord(value.config)) return invalid('Missing roundtable config.')
  if (!Array.isArray(value.activeAgents)) return invalid('Missing active agents.')
  if (!Array.isArray(value.messages)) return invalid('Missing transcript messages.')
  if (typeof value.config.question !== 'string' || !value.config.question.trim()) {
    return invalid('Question is required.')
  }

  return {
    ok: true as const,
    value: {
      config: value.config as unknown as ProviderSummaryInput['config'],
      activeAgents: value.activeAgents as ProviderSummaryInput['activeAgents'],
      messages: value.messages as ProviderSummaryInput['messages'],
      discussionBrief: readDiscussionBrief(value.discussionBrief),
    },
  }
}

function validateNeedsGuideRequest(value: unknown): ValidationResult<NeedsGuideInput> {
  if (!isRecord(value)) return invalid('Request body must be an object.')
  if (value.provider !== 'deepseek') return invalid('Only the deepseek provider is supported.')
  if (!isRecord(value.config)) return invalid('Missing roundtable config.')
  if (!isGuidanceStage(value.stage)) return invalid('Missing or invalid guidance stage.')
  if (!Array.isArray(value.messages)) return invalid('Missing guidance messages.')

  return {
    ok: true as const,
    value: {
      config: value.config as unknown as NeedsGuideInput['config'],
      stage: value.stage,
      messages: value.messages as NeedsGuideInput['messages'],
      initialQuestion: typeof value.initialQuestion === 'string' ? value.initialQuestion : '',
    },
  }
}

function readDiscussionBrief(value: unknown): DiscussionBrief {
  if (!isRecord(value)) return emptyDiscussionBrief()

  return {
    tableState: typeof value.tableState === 'string' ? value.tableState : emptyDiscussionBrief().tableState,
    commonGround: readStringArray(value.commonGround),
    tensions: readStringArray(value.tensions),
    openQuestions: readStringArray(value.openQuestions),
    referencePoints: Array.isArray(value.referencePoints)
      ? value.referencePoints
          .filter(isRecord)
          .map((point) => ({
            messageId: readStringField(point, 'messageId'),
            speakerName: readStringField(point, 'speakerName'),
            excerpt: readStringField(point, 'excerpt'),
          }))
          .filter((point) => point.messageId && point.speakerName)
      : [],
  }
}

function emptyDiscussionBrief(): DiscussionBrief {
  return {
    tableState: 'No shared table brief was provided. Use the visible transcript as the source of truth.',
    commonGround: [],
    tensions: [],
    openQuestions: [],
    referencePoints: [],
  }
}

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function readStringField(value: Record<string, unknown>, key: string) {
  return typeof value[key] === 'string' ? value[key] : ''
}

function isGuidanceStage(value: unknown): value is GuidanceStage {
  return (
    value === 'story' ||
    value === 'feelings-needs' ||
    value === 'boundary-request' ||
    value === 'summary'
  )
}

function invalid(error: string) {
  return { ok: false as const, error }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
