import type {
  AgentProfile,
  DiscussionMessage,
  LlmProvider,
  ModeratorSummary,
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
      if (callbacks.shouldStop?.()) {
        const partialSummary = createEmptySummary()
        return {
          messages,
          summary: partialSummary,
          costSummary: summarizeCosts(messages, partialSummary),
        }
      }

      const quotedMessageId = messages.at(-1)?.id
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
        tokenEstimate: 0,
        costEstimate: 0,
        timestamp: startedAt,
      }

      callbacks.onMessageStart?.(draft)

      for await (const chunk of provider.streamTurn({
        agent,
        config,
        round: roundPlan.round,
        turnIndex,
        activeAgents,
        previousMessages: messages,
      })) {
        if (callbacks.shouldStop?.()) break
        draft = { ...draft, content: draft.content + chunk }
        callbacks.onMessageChunk?.(draft, chunk)
      }

      const tokenEstimate = estimateTokens(draft.content)
      const completeMessage = {
        ...draft,
        tokenEstimate,
        costEstimate: estimateCost(agent.model, tokenEstimate),
      }
      messages.push(completeMessage)
      callbacks.onMessageComplete?.(completeMessage)

      if (callbacks.shouldStop?.()) {
        const partialSummary = createEmptySummary()
        return {
          messages,
          summary: partialSummary,
          costSummary: summarizeCosts(messages, partialSummary),
        }
      }
    }
  }

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
    provider.streamSummary?.({ config, activeAgents, messages }) ??
    fallbackSummaryStream(config, activeAgents, messages)

  for await (const chunk of stream) {
    if (callbacks.shouldStop?.()) break
    summary = { ...summary, content: summary.content + chunk }
    callbacks.onSummaryChunk?.(summary, chunk)
  }

  const tokenEstimate = estimateTokens(summary.content)
  const completedSummary = {
    ...summary,
    tokenEstimate,
    costEstimate: estimateCost('GPT-5.5', tokenEstimate),
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
