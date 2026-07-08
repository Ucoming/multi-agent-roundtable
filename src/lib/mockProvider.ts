import type {
  DiscussionBriefPoint,
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

function chooseStance(turnIndex: number, round: number) {
  const stances = [
    { zh: '部分同意，但需要补上边界', en: 'Partly agree, but the boundary is under-specified' },
    { zh: '不同意这个侧重点，风险被低估了', en: 'Disagree with the emphasis; the risk is underweighted' },
    { zh: '同意核心感受，但行动还不够具体', en: 'Agree with the core feeling, but the action is not concrete enough' },
  ]
  return stances[(turnIndex + round) % stances.length]
}
