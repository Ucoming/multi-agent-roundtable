import type {
  AgentProfile,
  DiscussionMessage,
  ProviderSummaryInput,
  ProviderTurnInput,
} from '../src/types'

export interface ChatPrompt {
  system: string
  user: string
}

const maxTranscriptChars = 14000

export function buildAgentPrompt(input: ProviderTurnInput): ChatPrompt {
  const latestMessage = input.previousMessages.at(-1)

  return {
    system: [
      `You are ${input.agent.name}.`,
      `Role: ${input.agent.role}`,
      `System prompt: ${input.agent.systemPrompt}`,
      `Speaking style: ${input.agent.speakingStyle}`,
      '',
      'Roundtable rules:',
      '- Speak only as this agent, not as the moderator.',
      '- Use the visible transcript as shared memory.',
      '- Explicitly build on, challenge, or refine at least one prior point when prior messages exist.',
      '- Keep the turn concise, concrete, and useful for the selected final artifact.',
      '- Do not invent tool results, private API state, or hidden messages.',
    ].join('\n'),
    user: [
      `Original user question: ${input.config.question}`,
      `Discussion mode: ${input.config.discussionMode}`,
      `Final output type: ${input.config.finalOutputType}`,
      `Current round: ${input.round} of ${input.config.roundCount}`,
      `Current turn index: ${input.turnIndex + 1}`,
      '',
      'Active agents:',
      formatAgentList(input.activeAgents),
      '',
      'Latest prior message:',
      latestMessage ? formatMessage(latestMessage) : 'No prior message. Open the discussion.',
      '',
      'Visible transcript:',
      formatTranscript(input.previousMessages),
      '',
      'Write the next contribution for your agent. Keep it under 180 words.',
    ].join('\n'),
  }
}

export function buildModeratorPrompt(input: ProviderSummaryInput): ChatPrompt {
  return {
    system: [
      'You are the moderator of a multi-agent roundtable.',
      'Your job is to synthesize the discussion into the requested final artifact.',
      'Do not add new unsupported claims. Preserve useful disagreements and open risks.',
    ].join('\n'),
    user: [
      `Original user question: ${input.config.question}`,
      `Discussion mode: ${input.config.discussionMode}`,
      `Final output type: ${input.config.finalOutputType}`,
      '',
      'Participants:',
      formatAgentList(input.activeAgents),
      '',
      'Full visible transcript:',
      formatTranscript(input.messages),
      '',
      'Produce the moderator synthesis with: key agreement, strongest disagreement, decision or next actions, and residual risks.',
    ].join('\n'),
  }
}

export function formatTranscript(messages: DiscussionMessage[]) {
  if (messages.length === 0) return 'No transcript yet.'

  const transcript = messages
    .map((message, index) => `${index + 1}. ${formatMessage(message)}`)
    .join('\n\n')

  if (transcript.length <= maxTranscriptChars) return transcript

  return [
    `[Transcript compacted: showing the most recent ${maxTranscriptChars} characters.]`,
    transcript.slice(-maxTranscriptChars),
  ].join('\n')
}

function formatAgentList(agents: AgentProfile[]) {
  return agents
    .map(
      (agent, index) =>
        `${index + 1}. ${agent.name} (${agent.role}; style: ${agent.speakingStyle}; enabled: ${agent.enabled ? 'yes' : 'no'})`,
    )
    .join('\n')
}

function formatMessage(message: DiscussionMessage) {
  return [
    `${message.speakerName} | round ${message.round} | role: ${message.role}`,
    message.content,
  ].join('\n')
}
