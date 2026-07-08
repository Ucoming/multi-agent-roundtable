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
  const outputLanguage = languageName(input.config.discussionLanguage)

  return {
    system: [
      `You are ${input.agent.name}.`,
      `Role: ${input.agent.role}`,
      `System prompt: ${input.agent.systemPrompt}`,
      `Speaking style: ${input.agent.speakingStyle}`,
      `Required output language: ${outputLanguage}.`,
      '',
      'Roundtable rules:',
      '- Speak only as this agent, not as the moderator.',
      '- Use the visible transcript as shared memory.',
      '- Use Markdown for all visible output. Prefer short headings, bullets, and quoted fragments when useful.',
      '- Explicitly build on, challenge, or refine at least one prior point when prior messages exist.',
      '- Do not write an isolated essay. Treat the prior transcript as a live discussion.',
      '- When there are prior messages, name the speaker you are responding to and state one of: Agree, Disagree, or Partly agree.',
      '- It is acceptable for the final table to preserve unresolved disagreement when the human question has no single right answer.',
      '- Keep the turn concise, concrete, and useful for the selected final artifact.',
      '- Do not invent tool results, private API state, or hidden messages.',
      '- This is reflective support, not professional therapy, diagnosis, legal advice, or emergency help.',
      '- If the transcript suggests self-harm, abuse, coercion, or immediate danger, prioritize safety and recommend trusted human or emergency support.',
    ].join('\n'),
    user: [
      `Original user question: ${input.config.question}`,
      `Required response language: ${outputLanguage}`,
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
      'Required discussion move:',
      buildTurnMove(input, latestMessage),
      '',
      'Write the next contribution for your agent in Markdown. Keep it under 180 words.',
    ].join('\n'),
  }
}

export function buildModeratorPrompt(input: ProviderSummaryInput): ChatPrompt {
  const outputLanguage = languageName(input.config.discussionLanguage)

  return {
    system: [
      'You are the moderator of a multi-agent roundtable.',
      'Your job is to synthesize the discussion into the requested final artifact.',
      'Do not add new unsupported claims. Preserve useful disagreements and open risks.',
      'This product supports reflection on ambiguous human questions. It must not diagnose, prescribe treatment, or replace professional help.',
      `Required output language: ${outputLanguage}.`,
      'Use Markdown for the final synthesis.',
    ].join('\n'),
    user: [
      `Original user question: ${input.config.question}`,
      `Required response language: ${outputLanguage}`,
      `Discussion mode: ${input.config.discussionMode}`,
      `Final output type: ${input.config.finalOutputType}`,
      '',
      'Participants:',
      formatAgentList(input.activeAgents),
      '',
      'Full visible transcript:',
      formatTranscript(input.messages),
      '',
      'Produce the moderator synthesis with these Markdown sections:',
      '- Key common ground',
      '- Main disagreement or unresolved tension',
      '- Multiple plausible readings or outcomes if no single answer exists',
      '- Suggested next conversation or experiment',
      '- Safety or boundary notes if relevant',
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
  const speakerType = message.speakerType === 'user' ? 'user live input' : 'agent'
  return [
    `${message.speakerName} | ${speakerType} | round ${message.round} | role: ${message.role}`,
    message.content,
  ].join('\n')
}

function buildTurnMove(input: ProviderTurnInput, latestMessage: DiscussionMessage | undefined) {
  if (!latestMessage) {
    return 'Open the discussion by naming the emotional or practical question the table must not avoid.'
  }

  if (input.round > 1 && input.turnIndex === 0) {
    return 'Start this round by identifying the strongest unresolved tension from the prior round, then add your position.'
  }

  return [
    `Respond directly to ${latestMessage.speakerName}.`,
    'State Agree, Disagree, or Partly agree.',
    'Explain the specific point of agreement or disagreement.',
    'Add one new lens, question, boundary, or repair step that moves the discussion forward.',
  ].join(' ')
}

function languageName(language: string | undefined) {
  return language === 'en' ? 'English' : 'Chinese'
}
