import type {
  AgentProfile,
  DiscussionBrief,
  DiscussionMessage,
  NeedsGuideInput,
  ProviderSummaryInput,
  ProviderTurnInput,
} from '../src/types'

export interface ChatPrompt {
  system: string
  user: string
}

const maxTranscriptChars = 14000

export function buildAgentPrompt(input: ProviderTurnInput): ChatPrompt {
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
      '- Treat the table brief as a neutral compressed map, not as a consensus you must accept.',
      '- Your role, system prompt, and speaking style decide what you notice, question, or down-rank.',
      '- Respond to the current table state, not only to the latest prior message.',
      '- Use Markdown for all visible output. Prefer short headings, bullets, and quoted fragments when useful.',
      '- Explicitly build on, challenge, or refine multiple prior points when multiple prior speakers exist.',
      '- Do not write an isolated essay. Treat the prior transcript as a live discussion.',
      '- When there are prior messages, name the speakers you are responding to and state one of: Agree, Disagree, or Partly agree.',
      '- It is acceptable for the final table to preserve unresolved disagreement when the human question has no single right answer.',
      '- Keep the turn concise, concrete, and useful for the selected final artifact.',
      '- Do not invent tool results, private API state, or hidden messages.',
      '- This is reflective support, not professional therapy, diagnosis, legal advice, or emergency help.',
      '- If the transcript suggests self-harm, abuse, coercion, or immediate danger, prioritize safety and recommend trusted human or emergency support.',
      formatModeSpecificRules(input.config.discussionMode),
    ].join('\n'),
    user: [
      `Original user question: ${input.config.question}`,
      '',
      'Pre-discussion context:',
      input.config.preDiscussionContext?.trim() || 'None provided.',
      '',
      `Required response language: ${outputLanguage}`,
      `Discussion mode: ${input.config.discussionMode}`,
      `Final output type: ${input.config.finalOutputType}`,
      `Current round: ${input.round} of ${input.config.roundCount}`,
      `Current turn index: ${input.turnIndex + 1}`,
      '',
      'Active agents:',
      formatAgentList(input.activeAgents),
      '',
      'Agent-specific attention filter:',
      formatAgentAttentionFilter(input.agent),
      '',
      'Current table brief:',
      formatDiscussionBrief(input.discussionBrief),
      '',
      'Visible transcript:',
      formatTranscript(input.previousMessages),
      '',
      'Required discussion move:',
      buildTurnMove(input),
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
      'You must connect the user problem and roundtable discussion to relevant existing theories or frameworks.',
      'Use theories as interpretive lenses, not as diagnosis, certainty, or professional treatment advice.',
      'This product supports reflection on ambiguous human questions. It must not diagnose, prescribe treatment, or replace professional help.',
      `Required output language: ${outputLanguage}.`,
      'Use Markdown for the final synthesis.',
    ].join('\n'),
    user: [
      `Original user question: ${input.config.question}`,
      '',
      'Pre-discussion context:',
      input.config.preDiscussionContext?.trim() || 'None provided.',
      '',
      `Required response language: ${outputLanguage}`,
      `Discussion mode: ${input.config.discussionMode}`,
      `Final output type: ${input.config.finalOutputType}`,
      '',
      'Participants:',
      formatAgentList(input.activeAgents),
      '',
      'Final table brief:',
      formatDiscussionBrief(input.discussionBrief),
      '',
      'Relevant theory lenses to consider:',
      formatTheoryGuide(input.config.discussionMode),
      '',
      'Full visible transcript:',
      formatTranscript(input.messages),
      '',
      'Produce the moderator synthesis with these Markdown sections:',
      '- Key common ground',
      '- Main disagreement or unresolved tension',
      '- Multiple plausible readings or outcomes if no single answer exists',
      '- Theory connection: connect the user problem and discussion to 2-4 relevant theories/frameworks, explain the fit and the limits',
      '- Suggested next conversation or experiment',
      '- Safety or boundary notes if relevant',
    ].join('\n'),
  }
}

export function buildNeedsGuidePrompt(input: NeedsGuideInput): ChatPrompt {
  const outputLanguage = languageName(input.config.discussionLanguage)
  const isSummary = input.stage === 'summary'

  return {
    system: [
      'You are the pre-roundtable needs clarification guide.',
      'Your job is to help the user clarify a relationship, emotional, or interpersonal concern before it goes to the multi-agent roundtable.',
      `Required output language: ${outputLanguage}.`,
      'Use warm, concise Markdown.',
      'Ask one focused question at a time during guidance stages.',
      'Do not diagnose, prescribe treatment, or replace professional therapy, legal advice, or emergency support.',
      'If the user mentions self-harm, violence, coercion, abuse, or immediate danger, prioritize real-world safety and trusted human or emergency support.',
      isSummary
        ? 'Now produce the final needs summary in the required fixed Markdown structure.'
        : 'Now produce the next guide message for the current stage.',
    ].join('\n'),
    user: [
      `Initial user question or rough thought: ${input.initialQuestion || 'No initial question provided.'}`,
      `Current stage: ${input.stage}`,
      `Discussion language: ${outputLanguage}`,
      '',
      'Guidance transcript so far:',
      formatGuidanceTranscript(input.messages),
      '',
      'Stage instruction:',
      formatGuidanceStageInstruction(input.stage, input.config.discussionLanguage),
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

function formatGuidanceTranscript(messages: NeedsGuideInput['messages']) {
  if (messages.length === 0) return 'No guidance transcript yet.'

  return messages
    .map((message, index) => {
      const speaker = message.speakerType === 'guide' ? 'Guide' : 'User'
      return `${index + 1}. ${speaker} | ${message.stage}\n${message.content}`
    })
    .join('\n\n')
}

function formatGuidanceStageInstruction(stage: NeedsGuideInput['stage'], language: string | undefined) {
  const isEnglish = language === 'en'

  if (stage === 'story') {
    return isEnglish
      ? 'Ask the user to describe what happened, what feels stuck, and what they most want the roundtable to understand. Do not summarize yet.'
      : '请引导用户描述发生了什么、现在最卡住的点是什么、最希望圆桌理解什么。不要总结。'
  }

  if (stage === 'feelings-needs') {
    return isEnglish
      ? 'Ask the user to name feelings, unmet needs, what they fear losing, and what they wish could be understood. Do not summarize yet.'
      : '请引导用户说出感受、未被满足的需要、害怕失去什么、真正想被理解什么。不要总结。'
  }

  if (stage === 'boundary-request') {
    return isEnglish
      ? 'Ask the user to clarify desired outcome, boundary, possible request, and one next sentence or action. Do not summarize yet.'
      : '请引导用户澄清希望的结果、边界、可以提出的请求，以及下一句话或下一步行动。不要总结。'
  }

  return isEnglish
    ? [
        'Create the final Markdown summary using exactly these sections:',
        '## Needs Summary',
        '**Roundtable question:** ...',
        '### What happened',
        '### Feelings',
        '### Needs',
        '### Boundary or request',
        '### What the roundtable should focus on',
        'The roundtable question must be a clear, discussable question under 45 words.',
      ].join('\n')
    : [
        '请使用以下固定 Markdown 结构生成最终总结：',
        '## 需求总结',
        '**圆桌问题：** ...',
        '### 发生了什么',
        '### 我的感受',
        '### 我的需求',
        '### 边界或请求',
        '### 希望圆桌重点讨论',
        '圆桌问题必须是一个清晰、适合讨论的问题，尽量不超过 45 个汉字。',
      ].join('\n')
}

function formatAgentAttentionFilter(agent: AgentProfile) {
  return [
    `Use your role as "${agent.role}" to choose what matters from the shared table brief.`,
    `Speaking style: ${agent.speakingStyle}.`,
    'Keep your distinct perspective: you may agree with the table brief, challenge it, or argue that another point deserves priority.',
    'Do not cover everything. Pick the 1-2 points your persona would most naturally notice.',
  ].join('\n')
}

function formatDiscussionBrief(brief: DiscussionBrief) {
  return [
    `Table state: ${brief.tableState}`,
    '',
    'Common ground:',
    formatBullets(brief.commonGround),
    '',
    'Tensions to test:',
    formatBullets(brief.tensions),
    '',
    'Open questions:',
    formatBullets(brief.openQuestions),
    '',
    'Reference points to consider:',
    brief.referencePoints.length
      ? brief.referencePoints
          .map((point) => `- ${point.speakerName}: ${point.excerpt} [${point.messageId}]`)
          .join('\n')
      : '- None yet.',
  ].join('\n')
}

function formatBullets(items: string[]) {
  return items.length ? items.map((item) => `- ${item}`).join('\n') : '- None.'
}

function formatTheoryGuide(mode: string) {
  const philosophyGuide = [
    '- Practice and contradiction analysis: concrete conditions, principal contradiction, secondary contradictions, and action as a test of understanding.',
    '- Socratic method: definitions, hidden assumptions, internal contradictions, and clearer claims.',
    '- Stoic inquiry: control versus non-control, judgment, desire, discipline, and action.',
    '- Existentialist inquiry: freedom, responsibility, authenticity, bad faith, absurdity, and chosen meaning.',
    '- Daoist inquiry: non-forcing, timing, reversal, balance, and the cost of over-control.',
    '- Pragmatism: consequences, experiments, lived verification, and belief revision.',
    '- Material conditions: interests, institutions, incentives, power, labor, and historical constraints.',
    '- Ethics: consequentialist, deontological, virtue, and care-ethical readings.',
  ]
  const relationshipGuide = [
    '- Adult attachment theory: pursue-withdraw cycles, reassurance, distancing, safety, and secure-base behavior.',
    '- Nonviolent Communication: observations, feelings, needs, requests, and blame-free wording.',
    '- CBT-style formulation: thoughts, feelings, behaviors, evidence, and alternative interpretations.',
    '- Gottman-style relationship work: bids for connection, repair attempts, soft start-up, defensiveness, contempt, stonewalling, and flooding.',
    '- Boundary and consent frameworks: self-respect, reciprocity, coercion risk, and enforceable limits.',
  ]
  const genericGuide = [
    '- Decision theory: options, uncertainty, reversibility, cost of delay, and evidence that would change the decision.',
    '- Cognitive bias lenses: confirmation bias, availability, loss aversion, overconfidence, and motivated reasoning.',
    '- Conflict-resolution frameworks: interests versus positions, tradeoffs, BATNA, repair moves, and escalation risks.',
    '- Systems thinking: feedback loops, incentives, second-order effects, and constraints.',
  ]

  if (mode === 'philosophy-reflection') {
    return philosophyGuide.join('\n')
  }

  if (
    mode === 'relationship-reflection' ||
    mode === 'emotional-clarity' ||
    mode === 'conflict-mediation' ||
    mode === 'dating-clarity'
  ) {
    return relationshipGuide.join('\n')
  }

  return genericGuide.join('\n')
}

function formatModeSpecificRules(mode: string) {
  if (mode !== 'philosophy-reflection') return ''

  return [
    '',
    'Philosophy mode rules:',
    '- Treat each agent as a method-inspired lens, not as the historical philosopher speaking.',
    '- Clarify concepts and assumptions before giving advice.',
    '- Connect abstract claims back to practical action, consequences, or lived tests.',
    '- Preserve deep disagreement when different philosophical frameworks imply different priorities.',
    '- Avoid propaganda, hagiography, or one-school certainty.',
  ].join('\n')
}

function buildTurnMove(input: ProviderTurnInput) {
  if (input.previousMessages.length === 0) {
    return 'Open the discussion by naming the emotional or practical question the table must not avoid.'
  }

  const referencedSpeakers = [
    ...new Set(input.discussionBrief.referencePoints.map((point) => point.speakerName)),
  ]
  const speakerList = referencedSpeakers.join(', ')
  const multiReferenceRule =
    input.discussionBrief.referencePoints.length >= 2
      ? 'Address at least two prior speakers or two distinct table positions before adding your own view.'
      : 'Address the prior table position before adding your own view.'

  if (input.round > 1 && input.turnIndex === 0) {
    return [
      'Start this round from the table brief, not from the last sentence alone.',
      multiReferenceRule,
      `Prior speakers available: ${speakerList || 'none yet'}.`,
      'Identify the strongest unresolved tension from the prior round, then add your position.',
    ].join(' ')
  }

  return [
    'Respond to the whole table brief rather than a single handoff.',
    multiReferenceRule,
    `Prior speakers available: ${speakerList || 'none yet'}.`,
    'State Agree, Disagree, or Partly agree.',
    'Explain what you keep from the table, what you challenge, and what remains unresolved.',
    'Add one new lens, question, boundary, or repair step that moves the discussion forward.',
  ].join(' ')
}

function languageName(language: string | undefined) {
  return language === 'en' ? 'English' : 'Chinese'
}
