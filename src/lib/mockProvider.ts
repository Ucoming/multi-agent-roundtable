import type {
  DiscussionMessage,
  LlmProvider,
  ProviderSummaryInput,
  ProviderTurnInput,
} from '../types'

interface MockProviderOptions {
  chunkDelayMs?: number
}

export function createMockProvider(options: MockProviderOptions = {}): LlmProvider {
  const chunkDelayMs = options.chunkDelayMs ?? 18

  return {
    id: 'mock-streaming',
    label: 'Mock Streaming Provider',
    streamTurn: (input) => streamText(buildTurnText(input), chunkDelayMs),
    streamSummary: (input) => streamText(buildSummaryText(input), chunkDelayMs),
  }
}

function buildTurnText(input: ProviderTurnInput) {
  const lastMessage = input.previousMessages.at(-1)
  const handoff = lastMessage
    ? `Building on ${lastMessage.speakerName}'s point about "${quoteFragment(lastMessage)}", `
    : `Opening round ${input.round}, `

  const styleMove = styleDirective(input.agent.speakingStyle)
  const modeMove = modeDirective(input.config.discussionMode)
  const roundMove =
    input.round === 1
      ? 'I would frame the first pass around the decision we need from this table.'
      : 'At this stage I would tighten the discussion around what changed after the prior round.'

  return `${handoff}${input.agent.name} sees the question as: ${input.config.question} ${styleMove} ${modeMove} ${roundMove} The concrete next move is to name one testable claim, one risk, and one owner before the moderator closes the loop.`
}

function buildSummaryText(input: ProviderSummaryInput) {
  const messageCount = input.messages.length
  const finalSpeaker = input.messages.at(-1)?.speakerName ?? 'the table'
  const activeNames = input.activeAgents.map((agent) => agent.name).join(', ')
  const decisionSentence = outputDirective(input.config.finalOutputType)

  return `Moderator summary: ${messageCount} contributions were made by ${activeNames}. The strongest shared thread is that the question should be converted into a visible decision path rather than left as open-ended conversation. ${finalSpeaker} provided the final handoff, so the synthesis should preserve that momentum. ${decisionSentence}`
}

async function* streamText(text: string, chunkDelayMs: number) {
  const words = text.split(' ')
  for (let index = 0; index < words.length; index += 1) {
    const suffix = index === words.length - 1 ? '' : ' '
    yield `${words[index]}${suffix}`
    if (chunkDelayMs > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, chunkDelayMs))
    }
  }
}

function quoteFragment(message: DiscussionMessage) {
  const sentence = message.content.split('.').find(Boolean) ?? message.content
  return sentence.slice(0, 96)
}

function styleDirective(style: string) {
  const directives: Record<string, string> = {
    Brief: 'I will keep the claim compact and force a short list of tradeoffs.',
    Sharp: 'I will pressure-test the weak assumption before adding new ideas.',
    Encouraging: 'I will keep the group constructive while still asking for evidence.',
    Rigorous: 'I will separate mechanism, evidence, and uncertainty.',
    Visionary: 'I will widen the opportunity space without losing the path to a prototype.',
    Pragmatic: 'I will translate the idea into sequence, owner, and constraint.',
  }
  return directives[style] ?? directives.Pragmatic
}

function modeDirective(mode: string) {
  const directives: Record<string, string> = {
    brainstorming: 'For brainstorming, divergence is useful only if we capture the highest-value experiments.',
    debate: 'For debate, the burden of proof should be explicit and revisable.',
    'peer-review':
      'For peer review, the table should distinguish fatal flaws from fixable revision tasks.',
    'investment-committee':
      'For an investment committee, the discussion should end in invest, wait, or pass conditions.',
  }
  return directives[mode] ?? directives.brainstorming
}

function outputDirective(outputType: string) {
  const directives: Record<string, string> = {
    summary: 'Recommended output: a concise summary with the main agreement, tension, and unresolved evidence.',
    decision: 'Recommended output: a decision with conditions, confidence, and the evidence that could reverse it.',
    'action-list':
      'Recommended output: an action list with owners, next checks, and the earliest useful review point.',
    report:
      'Recommended output: a structured report that records context, options, evidence, risks, and recommendation.',
  }
  return directives[outputType] ?? directives.summary
}
