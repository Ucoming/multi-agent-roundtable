import type {
  DiscussionBriefPoint,
  GuidanceMessage,
  LlmProvider,
  NeedsGuideInput,
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
    streamTurn: (input) => streamText(`${buildTurnText(input)}\n\n${buildAgentFocusFooter(input)}`, chunkDelayMs),
    streamSummary: (input) =>
      streamText(`${buildSummaryText(input)}\n\n${buildTheoryFooter(input)}`, chunkDelayMs),
    streamGuidance: (input) => streamText(buildGuidanceText(input), chunkDelayMs),
  }
}

function buildTurnText(input: ProviderTurnInput) {
  const references = input.discussionBrief.referencePoints
  const isChinese = input.config.discussionLanguage === 'zh'
  const stance = chooseStance(input.turnIndex, input.round)
  const styleMove = styleDirective(input.agent.speakingStyle, isChinese)
  const modeMove = modeDirective(input.config.discussionMode, isChinese)
  const openQuestion = input.discussionBrief.openQuestions[0]

  if (isChinese) {
    const responseTarget = references.length
      ? `回应全桌：${formatReferenceList(references, true)}`
      : `开启第 ${input.round} 轮：先把共同问题放到桌面上。`

    return [
      `### ${input.agent.name}`,
      '',
      responseTarget,
      '',
      `- **立场**：${references.length ? stance.zh : '先建立共同问题'}`,
      `- **保留的共识**：${input.discussionBrief.commonGround[0]}`,
      `- **我挑战的张力**：${input.discussionBrief.tensions[0]}`,
      `- **我的视角**：${styleMove}`,
      `- **推进方式**：${modeMove}`,
      `- **留给桌面的下一问**：${openQuestion}`,
    ].join('\n')
  }

  const responseTarget = references.length
    ? `Responding to the table: ${formatReferenceList(references, false)}`
    : `Opening round ${input.round}: put the core question on the table.`

  return [
    `### ${input.agent.name}`,
    '',
    responseTarget,
    '',
    `- **Position**: ${references.length ? stance.en : 'Frame the shared question first'}`,
    `- **Common ground I keep**: ${input.discussionBrief.commonGround[0]}`,
    `- **Tension I challenge**: ${input.discussionBrief.tensions[0]}`,
    `- **Lens**: ${styleMove}`,
    `- **Discussion move**: ${modeMove}`,
    `- **Next table question**: ${openQuestion}`,
  ].join('\n')
}

function buildSummaryText(input: ProviderSummaryInput) {
  const isChinese = input.config.discussionLanguage === 'zh'
  const messageCount = input.messages.length
  const activeNames = input.activeAgents.map((agent) => agent.name).join(', ')
  const decisionSentence = outputDirective(input.config.finalOutputType, isChinese)
  const tensions = input.discussionBrief.tensions.join('；')
  const openQuestions = input.discussionBrief.openQuestions.join('；')

  if (isChinese) {
    return [
      '## 主持人总结',
      '',
      `本轮共有 **${messageCount}** 条发言，参与者包括：${activeNames}。`,
      '',
      '### 共同点',
      '大家都把这个问题视为需要反复澄清的关系/情绪问题，而不是一个可以直接判分的标准答案题。',
      '',
      '### 仍然存在的分歧',
      tensions || '桌面上还没有形成清晰分歧，需要继续追问事实、感受、边界和可执行沟通。',
      '',
      '### 多种可能解释',
      '一种解释强调情绪确认和安全感，另一种解释强调边界、行动和可验证事实；两者可以同时保留。',
      '',
      '### 下一步',
      openQuestions || '把最关键的不确定点转成一句可以对当事人说出口的话。',
      '',
      `### 输出形式\n${decisionSentence}`,
    ].join('\n')
  }

  return [
    '## Moderator Summary',
    '',
    `The table produced **${messageCount}** contributions from ${activeNames}.`,
    '',
    '### Common Ground',
    'The group treats this as an ambiguous human question rather than a puzzle with one correct answer.',
    '',
    '### Remaining Disagreement',
    tensions || 'The table has not yet formed a strong disagreement, so the next round should separate facts, feelings, boundaries, and action.',
    '',
    '### Multiple Plausible Readings',
    'One reading emphasizes emotional validation and safety; another emphasizes boundaries, action, and observable evidence.',
    '',
    '### Next Move',
    openQuestions || 'Turn the most important uncertainty into one sentence the user could actually say.',
    '',
    `### Output\n${decisionSentence}`,
  ].join('\n')
}

function buildAgentFocusFooter(input: ProviderTurnInput) {
  const isChinese = input.config.discussionLanguage === 'zh'
  if (isChinese) {
    return [
      '### Agent-specific focus',
      `这个发言不是复述全桌简报，而是由 **${input.agent.name}** 的角色过滤后选择重点。`,
      `角色注意力：${input.agent.role}`,
    ].join('\n')
  }

  return [
    '### Agent-specific focus',
    `This turn is filtered through **${input.agent.name}** rather than a neutral consensus voice.`,
    `Role attention: ${input.agent.role}`,
  ].join('\n')
}

function buildTheoryFooter(input: ProviderSummaryInput) {
  const isChinese = input.config.discussionLanguage === 'zh'
  const guide = theoryDirective(input.config.discussionMode, isChinese)
  if (isChinese) {
    return [
      '### Theory Link',
      guide,
      '这些理论只作为解释框架，不等同于诊断；真正有价值的是用它们生成更清楚的下一步问题。',
    ].join('\n')
  }

  return [
    '### Theory Link',
    guide,
    'These theories are interpretive lenses, not diagnoses; their value is to generate clearer next questions.',
  ].join('\n')
}

function buildGuidanceText(input: NeedsGuideInput) {
  const isChinese = input.config.discussionLanguage === 'zh'
  if (input.stage === 'summary') return buildGuidanceSummary(input, isChinese)

  if (isChinese) {
    const prompts = {
      story:
        '### 引导者\n先不用组织得很完美。请告诉我：发生了什么？现在最卡住你的点是什么？你最希望圆桌理解哪一部分？',
      'feelings-needs':
        '### 引导者\n我听到了事情的大概。现在我们往里走一层：这件事让你最明显的感受是什么？你觉得哪一种需要没有被看见？你害怕失去什么？',
      'boundary-request':
        '### 引导者\n最后把它落到表达上：你希望这件事往什么方向变化？你的边界是什么？如果只说一句话，你想怎样开口？',
    }
    return prompts[input.stage]
  }

  const prompts = {
    story:
      '### Guide\nNo need to make it polished yet. What happened, what feels most stuck, and what do you most want the roundtable to understand?',
    'feelings-needs':
      '### Guide\nI have the rough story. Now go one layer deeper: what feelings are strongest, what need feels unseen, and what are you afraid of losing?',
    'boundary-request':
      '### Guide\nNow make it speakable: what outcome do you hope for, what boundary matters, and what is one sentence or action you could try next?',
  }
  return prompts[input.stage]
}

function buildGuidanceSummary(input: NeedsGuideInput, isChinese: boolean) {
  const story = latestUserAnswer(input.messages, 'story')
  const feelings = latestUserAnswer(input.messages, 'feelings-needs')
  const boundary = latestUserAnswer(input.messages, 'boundary-request')
  const roughQuestion = input.initialQuestion.trim()

  if (isChinese) {
    return [
      '## 需求总结',
      '',
      `**圆桌问题：** 我在这个关系或情绪处境里，如何理解自己的感受、需求和边界，并找到一个合适的表达方式？`,
      '',
      '### 发生了什么',
      story || roughQuestion || '用户还没有提供足够的事件描述。',
      '',
      '### 我的感受',
      feelings || '需要继续澄清具体感受，以及这些感受背后在保护什么。',
      '',
      '### 我的需求',
      feelings
        ? '我可能需要被理解、被尊重、获得更清楚的回应，或确认这段关系里的安全感和互惠。'
        : '需要进一步区分真实需要、期待、害怕和可验证事实。',
      '',
      '### 边界或请求',
      boundary || '需要把边界或请求转成一句温和但清楚的话。',
      '',
      '### 希望圆桌重点讨论',
      '请圆桌帮助区分感受、事实、需求、边界和下一步表达，并保留可能存在的不同解释。',
    ].join('\n')
  }

  return [
    '## Needs Summary',
    '',
    '**Roundtable question:** How should I understand my feelings, needs, and boundaries in this relationship situation, and what would be a useful next expression?',
    '',
    '### What happened',
    story || roughQuestion || 'The user has not provided enough story detail yet.',
    '',
    '### Feelings',
    feelings || 'The concrete feelings still need clarification, especially what they may be protecting.',
    '',
    '### Needs',
    feelings
      ? 'The user may need understanding, respect, clearer response, safety, or reciprocity.'
      : 'The user still needs to separate needs, expectations, fears, and observable facts.',
    '',
    '### Boundary or request',
    boundary || 'The boundary or request should be turned into one clear but gentle sentence.',
    '',
    '### What the roundtable should focus on',
    'Help separate feelings, facts, needs, boundaries, and the next expression while preserving multiple plausible readings.',
  ].join('\n')
}

function latestUserAnswer(messages: GuidanceMessage[], stage: GuidanceMessage['stage']) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message.stage === stage && message.speakerType === 'user') return message.content
  }
  return ''
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

function formatReferenceList(references: DiscussionBriefPoint[], isChinese: boolean) {
  return references
    .slice(0, 3)
    .map((reference) =>
      isChinese
        ? `**${reference.speakerName}**「${quoteFragment(reference.excerpt)}」`
        : `**${reference.speakerName}**: "${quoteFragment(reference.excerpt)}"`,
    )
    .join(isChinese ? '；' : '; ')
}

function quoteFragment(content: string) {
  const sentence = content.split(/[.!?。！？]/).find(Boolean) ?? content
  return sentence.slice(0, 96)
}

function styleDirective(style: string, isChinese: boolean) {
  const directives: Record<string, string> = {
    Brief: isChinese
      ? '我会压缩成少数关键取舍，避免把讨论拖成散文。'
      : 'I will keep the claim compact and force a short list of tradeoffs.',
    Sharp: isChinese
      ? '我会温和但直接地挑战薄弱假设。'
      : 'I will pressure-test the weak assumption before adding new ideas.',
    Encouraging: isChinese
      ? '我会保持建设性，同时要求具体证据。'
      : 'I will keep the group constructive while still asking for evidence.',
    Rigorous: isChinese
      ? '我会区分机制、证据和不确定性。'
      : 'I will separate mechanism, evidence, and uncertainty.',
    Visionary: isChinese
      ? '我会打开可能性，但不离开现实行动。'
      : 'I will widen the opportunity space without losing the path to a prototype.',
    Pragmatic: isChinese
      ? '我会把洞察转成顺序、责任和限制。'
      : 'I will translate the idea into sequence, owner, and constraint.',
    Reflective: isChinese
      ? '我会放慢速度，看见内在冲突。'
      : 'I will slow down the inner conflict and name what may be emotionally true.',
    Warm: isChinese
      ? '我会先承接感受，再轻轻打开下一个问题。'
      : 'I will respond with care first, then gently open a next question.',
  }
  return directives[style] ?? directives.Pragmatic
}

function modeDirective(mode: string, isChinese: boolean) {
  const directives: Record<string, string> = {
    'relationship-reflection': isChinese
      ? '关系反思的重点是把感受、需要、边界和可说出口的话分开。'
      : 'For relationship reflection, clarify feelings, needs, boundaries, and possible words.',
    'emotional-clarity': isChinese
      ? '情绪澄清要先画出想法、感受、需要和重复模式。'
      : 'For emotional clarity, map thoughts, feelings, needs, and patterns before recommending action.',
    'conflict-mediation': isChinese
      ? '冲突调解要降低责备，找到双方需要和可修复的下一次对话。'
      : 'For conflict mediation, reduce blame, name each side needs, and identify one repairable next conversation.',
    'dating-clarity': isChinese
      ? '恋爱判断要同时看吸引、尊重、边界、互惠和操控风险。'
      : 'For dating clarity, examine attraction, respect, boundaries, reciprocity, and manipulation risk together.',
    'philosophy-reflection': isChinese
      ? '哲学反思要先澄清概念和矛盾，再把抽象判断放回实践、伦理和现实条件中检验。'
      : 'For philosophy reflection, clarify concepts and contradictions, then test abstract claims against practice, ethics, and real conditions.',
    brainstorming: isChinese
      ? '头脑风暴只有在能沉淀实验时才有价值。'
      : 'For brainstorming, divergence is useful only if we capture the highest-value experiments.',
    debate: isChinese
      ? '辩论要明确举证责任，并允许立场被更新。'
      : 'For debate, the burden of proof should be explicit and revisable.',
    'peer-review': isChinese
      ? '审稿要区分致命问题和可修改问题。'
      : 'For peer review, distinguish fatal flaws from fixable revision tasks.',
    'investment-committee': isChinese
      ? '投资委员会要落到投、等、拒绝的条件。'
      : 'For an investment committee, end in invest, wait, or pass conditions.',
  }
  return directives[mode] ?? directives.brainstorming
}

function outputDirective(outputType: string, isChinese: boolean) {
  const directives: Record<string, string> = {
    summary: isChinese
      ? '建议输出：简洁总结，包含主要共识、关键张力和未解决问题。'
      : 'Recommended output: a concise summary with the main agreement, tension, and unresolved evidence.',
    reflection: isChinese
      ? '建议输出：反思笔记，包含情绪主题、可能解释、可继续问的问题和温和下一步。'
      : 'Recommended output: reflection notes with emotional themes, possible interpretations, useful questions, and a gentle next step.',
    decision: isChinese
      ? '建议输出：带条件和信心等级的决定，同时说明什么证据会改变它。'
      : 'Recommended output: a decision with conditions, confidence, and the evidence that could reverse it.',
    'action-list': isChinese
      ? '建议输出：行动清单，包含下一步检查和最早复盘点。'
      : 'Recommended output: an action list with owners, next checks, and the earliest useful review point.',
    report: isChinese
      ? '建议输出：结构化报告，记录背景、选项、证据、风险和建议。'
      : 'Recommended output: a structured report that records context, options, evidence, risks, and recommendation.',
  }
  return directives[outputType] ?? directives.summary
}

function theoryDirective(mode: string, isChinese: boolean) {
  const isRelationshipMode =
    mode === 'relationship-reflection' ||
    mode === 'emotional-clarity' ||
    mode === 'conflict-mediation' ||
    mode === 'dating-clarity'
  const isPhilosophyMode = mode === 'philosophy-reflection'

  if (isChinese) {
    if (isPhilosophyMode) {
      return '可以把本次讨论连接到实践与矛盾分析、苏格拉底追问、斯多葛可控/不可控、存在主义自由与责任、道家顺势、实用主义实验、历史唯物的现实条件，以及后果论/义务论/德性伦理/关怀伦理。'
    }

    return isRelationshipMode
      ? '可以把本次讨论连接到成人依恋理论、非暴力沟通、CBT 的想法-感受-行为链条、Gottman 式修复尝试，以及边界/同意框架。'
      : '可以把本次讨论连接到决策理论、认知偏差、冲突解决框架和系统思维。'
  }

  if (isPhilosophyMode) {
    return 'Map the discussion to practice and contradiction analysis, Socratic questioning, Stoic control, existential freedom and responsibility, Daoist non-forcing, pragmatist experiments, material conditions, and consequentialist/deontological/virtue/care ethics.'
  }

  return isRelationshipMode
    ? 'Map the discussion to adult attachment theory, Nonviolent Communication, CBT thought-feeling-behavior links, Gottman-style repair attempts, and boundary/consent frameworks.'
    : 'Map the discussion to decision theory, cognitive bias lenses, conflict-resolution frameworks, and systems thinking.'
}

function chooseStance(turnIndex: number, round: number) {
  const stances = [
    { zh: '部分同意，但需要补上边界', en: 'Partly agree, but the boundary is under-specified' },
    { zh: '不同意这个侧重点，风险被低估了', en: 'Disagree with the emphasis; the risk is underweighted' },
    { zh: '同意核心感受，但行动还不够具体', en: 'Agree with the core feeling, but the action is not concrete enough' },
  ]
  return stances[(turnIndex + round) % stances.length]
}
