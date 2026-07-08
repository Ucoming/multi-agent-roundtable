import type { CostSummary, DiscussionMessage, ModelLabel, ModeratorSummary } from '../types'

const costPerThousandTokens: Record<ModelLabel, number> = {
  'GPT-5.5': 0.025,
  Claude: 0.018,
  DeepSeek: 0.004,
  Gemini: 0.006,
  Ollama: 0,
  User: 0,
}

export function estimateTokens(text: string) {
  const normalized = text.trim()
  if (!normalized) return 0
  return Math.max(1, Math.ceil(normalized.length / 4))
}

export function estimateCost(model: ModelLabel, tokens: number) {
  return Number(((tokens / 1000) * costPerThousandTokens[model]).toFixed(4))
}

export function summarizeCosts(
  messages: DiscussionMessage[],
  summary?: ModeratorSummary,
): CostSummary {
  const messageTokens = messages.reduce((total, message) => total + message.tokenEstimate, 0)
  const messageCost = messages.reduce((total, message) => total + message.costEstimate, 0)
  const summaryTokens = summary?.tokenEstimate ?? 0
  const summaryCost = summary?.costEstimate ?? 0

  return {
    totalTokens: messageTokens + summaryTokens,
    totalCost: Number((messageCost + summaryCost).toFixed(4)),
  }
}
