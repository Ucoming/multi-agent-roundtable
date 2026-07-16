import type {
  AgentProfile,
  DiscussionBrief,
  DiscussionMessage,
  LlmProvider,
  ModeratorSummary,
  ProviderStreamItem,
  ProviderUsage,
  RoundtableConfig,
  RoundtableRunResult,
  SpeakingOrder,
} from '../types'
import { estimateCost, estimateTokens, summarizeCosts } from './costs'

export interface RoundtableRunCallbacks {
  onMessageStart?(message: DiscussionMessage): void
  onMessageChunk?(message: DiscussionMessage, chunk: string): void
  onMessageComplete?(message: DiscussionMessage): void
  onSummaryStart?(summary: ModeratorSummary): void
  onSummaryChunk?(summary: ModeratorSummary, chunk: string): void
  onSummaryComplete?(summary: ModeratorSummary): void
  shouldStop?(): boolean
  consumeUserInterjections?(): DiscussionMessage[]
  signal?: AbortSignal
}

export function getEnabledAgents(agents: AgentProfile[]) {
  return agents.filter((agent) => agent.enabled)
}

export function getSpeakingSequence(
  agents: AgentProfile[],
  order: SpeakingOrder,
  round: number,
  question = '',
): AgentProfile[] {
  const activeAgents = getEnabledAgents(agents)
  if (order === 'fixed') return activeAgents

  if (order === 'random') {
    return [...activeAgents].sort((a, b) => {
      const left = deterministicScore(`${question}-${round}-${a.id}`)
      const right = deterministicScore(`${question}-${round}-${b.id}`)
      return left - right
    })
  }

  return [...activeAgents].sort((a, b) => {
    const left = moderatorPriority(a, round)
    const right = moderatorPriority(b, round)
    return left - right
  })
}

export function createDiscussionPlan(agents: AgentProfile[], config: RoundtableConfig) {
  return Array.from({ length: config.roundCount }, (_, roundIndex) => ({
    round: roundIndex + 1,
    agents: getSpeakingSequence(
      agents,
      config.speakingOrder,
      roundIndex + 1,
      config.question,
    ),
  }))
}

export function createDiscussionBrief(
  messages: DiscussionMessage[],
  config: RoundtableConfig,
  currentAgentId = '',
): DiscussionBrief {
  const visibleMessages = messages.filter((message) => message.content.trim())
  const referencePoints = selectReferencePoints(visibleMessages, currentAgentId)
  const speakerNames = [...new Set(visibleMessages.map((message) => message.speakerName))]
  const latestUserInput = [...visibleMessages].reverse().find((message) => message.speakerType === 'user')

  return {
    tableState:
      visibleMessages.length === 0
        ? 'No one has spoken yet. Open the table by framing the shared question.'
        : `${visibleMessages.length} contributions from ${speakerNames.join(', ')}. Respond to the whole table, not only the latest message.`,
    commonGround: buildCommonGround(visibleMessages, config.question),
    tensions: buildTensions(visibleMessages),
    openQuestions: buildOpenQuestions(visibleMessages, latestUserInput),
    referencePoints,
  }
}

export async function runRoundtable(
  config: RoundtableConfig,
  agents: AgentProfile[],
  provider: LlmProvider,
  callbacks: RoundtableRunCallbacks = {},
): Promise<RoundtableRunResult> {
  const activeAgents = getEnabledAgents(agents)
  const messages: DiscussionMessage[] = []
  const plan = createDiscussionPlan(activeAgents, config)

  for (const roundPlan of plan) {
    for (const [turnIndex, agent] of roundPlan.agents.entries()) {
      appendUserInterjections(messages, callbacks)

      if (shouldStop(callbacks)) {
        const partialSummary = createEmptySummary()
        return {
          messages,
          summary: partialSummary,
          costSummary: summarizeCosts(messages, partialSummary),
        }
      }

      const discussionBrief = createDiscussionBrief(messages, config, agent.id)
      const referencedMessageIds = discussionBrief.referencePoints.map((point) => point.messageId)
      const quotedMessageId = referencedMessageIds[0] ?? messages.at(-1)?.id
      const startedAt = new Date().toISOString()
      let draft: DiscussionMessage = {
        id: `round-${roundPlan.round}-${agent.id}-${startedAt}`,
        round: roundPlan.round,
        agentId: agent.id,
        speakerName: agent.name,
        role: agent.role,
        model: agent.model,
        speakingStyle: agent.speakingStyle,
        content: '',
        quotedMessageId,
        referencedMessageIds,
        discussionBrief,
        tokenEstimate: 0,
        costEstimate: 0,
        timestamp: startedAt,
      }

      callbacks.onMessageStart?.(draft)

      let usage: ProviderUsage | undefined

      try {
        for await (const item of provider.streamTurn(
          {
            agent,
            config,
            round: roundPlan.round,
            turnIndex,
            activeAgents,
            previousMessages: messages,
            discussionBrief,
          },
          { signal: callbacks.signal },
        )) {
          if (shouldStop(callbacks)) break

          const event = normalizeProviderItem(item)
          if (event.type === 'usage') {
            usage = event.usage
            continue
          }
          if (event.type === 'done') {
            usage = event.usage ?? usage
            continue
          }

          draft = { ...draft, content: draft.content + event.text }
          callbacks.onMessageChunk?.(draft, event.text)
        }
      } catch (error) {
        if (!isAbortError(error, callbacks)) throw error
      }

      if (shouldStop(callbacks) && !draft.content.trim()) {
        const partialSummary = createEmptySummary()
        return {
          messages,
          summary: partialSummary,
          costSummary: summarizeCosts(messages, partialSummary),
        }
      }

      const tokenEstimate = usage?.totalTokens ?? estimateTokens(draft.content)
      const completeMessage = {
        ...draft,
        tokenEstimate,
        costEstimate: usage?.costEstimate ?? estimateCost(agent.model, tokenEstimate),
      }
      messages.push(completeMessage)
      callbacks.onMessageComplete?.(completeMessage)

      if (shouldStop(callbacks)) {
        const partialSummary = createEmptySummary()
        return {
          messages,
          summary: partialSummary,
          costSummary: summarizeCosts(messages, partialSummary),
        }
      }
    }
  }

  appendUserInterjections(messages, callbacks)
  const summary = await streamSummary(config, activeAgents, messages, provider, callbacks)
  return {
    messages,
    summary,
    costSummary: summarizeCosts(messages, summary),
  }
}

async function streamSummary(
  config: RoundtableConfig,
  activeAgents: AgentProfile[],
  messages: DiscussionMessage[],
  provider: LlmProvider,
  callbacks: RoundtableRunCallbacks,
) {
  let summary: ModeratorSummary = createEmptySummary()
  callbacks.onSummaryStart?.(summary)

  const stream =
    provider.streamSummary?.(
      {
        config,
        activeAgents,
        messages,
        discussionBrief: createDiscussionBrief(messages, config),
      },
      { signal: callbacks.signal },
    ) ??
    fallbackSummaryStream(config, activeAgents, messages)

  let usage: ProviderUsage | undefined

  try {
    for await (const item of stream) {
      if (shouldStop(callbacks)) break

      const event = normalizeProviderItem(item)
      if (event.type === 'usage') {
        usage = event.usage
        continue
      }
      if (event.type === 'done') {
        usage = event.usage ?? usage
        continue
      }

      summary = { ...summary, content: summary.content + event.text }
      callbacks.onSummaryChunk?.(summary, event.text)
    }
  } catch (error) {
    if (!isAbortError(error, callbacks)) throw error
  }

  const tokenEstimate = usage?.totalTokens ?? estimateTokens(summary.content)
  const completedSummary = {
    ...summary,
    tokenEstimate,
    costEstimate: usage?.costEstimate ?? estimateCost('GPT-5.5', tokenEstimate),
  }
  callbacks.onSummaryComplete?.(completedSummary)
  return completedSummary
}

function createEmptySummary(): ModeratorSummary {
  return {
    content: '',
    tokenEstimate: 0,
    costEstimate: 0,
    timestamp: new Date().toISOString(),
  }
}

async function* fallbackSummaryStream(
  config: RoundtableConfig,
  activeAgents: AgentProfile[],
  messages: DiscussionMessage[],
) {
  const strongestPoint = messages.at(-1)?.content.split('.').at(0) ?? 'The discussion is incomplete'
  yield `Moderator summary for ${activeAgents.length} agents: ${strongestPoint}. Final output type: ${config.finalOutputType}.`
}

function normalizeProviderItem(item: ProviderStreamItem) {
  return typeof item === 'string' ? { type: 'chunk' as const, text: item } : item
}

function shouldStop(callbacks: RoundtableRunCallbacks) {
  return callbacks.signal?.aborted || callbacks.shouldStop?.() || false
}

function isAbortError(error: unknown, callbacks: RoundtableRunCallbacks) {
  return shouldStop(callbacks) || (error instanceof Error && error.name === 'AbortError')
}

function selectReferencePoints(messages: DiscussionMessage[], currentAgentId: string) {
  const bySpeaker = new Map<string, DiscussionMessage>()
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message.agentId === currentAgentId) continue
    if (!bySpeaker.has(message.speakerName)) {
      bySpeaker.set(message.speakerName, message)
    }
    if (bySpeaker.size >= 4) break
  }

  return [...bySpeaker.values()]
    .reverse()
    .map((message) => ({
      messageId: message.id,
      speakerName: message.speakerName,
      excerpt: excerpt(message.content, 150),
    }))
}

function buildCommonGround(messages: DiscussionMessage[], question: string) {
  if (messages.length === 0) {
    return [`The table has not yet tested the question: ${excerpt(question, 140)}`]
  }

  return [
    'Everyone is contributing to the same user question rather than separate mini-essays.',
    'The next useful move is to compare perspectives and clarify what remains unresolved.',
  ]
}

function buildTensions(messages: DiscussionMessage[]) {
  if (messages.length < 2) {
    return ['No table-level disagreement is visible yet.']
  }

  const first = messages[0]
  const latest = messages.at(-1) ?? first
  const prior = messages.length > 2 ? messages[messages.length - 2] : first

  return [
    `${prior.speakerName} may emphasize "${excerpt(prior.content, 82)}", while ${latest.speakerName} may shift the table toward "${excerpt(latest.content, 82)}".`,
    `${first.speakerName}'s opening frame still needs to be tested against later objections and user input.`,
  ]
}

function buildOpenQuestions(
  messages: DiscussionMessage[],
  latestUserInput: DiscussionMessage | undefined,
) {
  const questions = [
    'Which prior view should be revised, not merely acknowledged?',
    'What disagreement should remain open because the situation has no single clean answer?',
  ]

  if (latestUserInput) {
    questions.unshift(`How does the user's added context change the table: "${excerpt(latestUserInput.content, 110)}"?`)
  }

  if (messages.length < 2) {
    questions.unshift('What first disagreement or tension should the table create for useful reflection?')
  }

  return questions
}

function excerpt(content: string, maxLength: number) {
  const compact = content.replace(/\s+/g, ' ').trim()
  if (compact.length <= maxLength) return compact
  return `${compact.slice(0, maxLength - 3)}...`
}

function appendUserInterjections(
  messages: DiscussionMessage[],
  callbacks: RoundtableRunCallbacks,
) {
  const interjections = callbacks.consumeUserInterjections?.() ?? []
  const existingIds = new Set(messages.map((message) => message.id))

  for (const message of interjections) {
    if (!existingIds.has(message.id)) {
      messages.push(message)
      existingIds.add(message.id)
    }
  }
}

function deterministicScore(input: string) {
  let hash = 0
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) % 1000003
  }
  return hash
}

function moderatorPriority(agent: AgentProfile, round: number) {
  const stylePriority: Record<string, number> = {
    Rigorous: 1,
    Sharp: 2,
    Pragmatic: 3,
    Brief: 4,
    Encouraging: 5,
    Visionary: 6,
  }
  return ((stylePriority[agent.speakingStyle] ?? 9) + round) % 10
}
