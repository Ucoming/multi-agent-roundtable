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
  const isChinese = input.config.discussionLanguage === 'zh'
  const stance = chooseStance(input.turnIndex, input.round)
  const styleMove = styleDirective(input.agent.speakingStyle, isChinese)
  const modeMove = modeDirective(input.config.discussionMode, isChinese)

  if (isChinese) {
    const responseTarget = lastMessage
      ? `回应 **${lastMessage.speakerName}**：> ${quoteFragment(lastMessage)}`
      : `开启第 ${input.round} 轮：先把问题放在桌面上。`

    return [
      `### ${input.agent.name}`,
      '',
      responseTarget,
      '',
      `- **立场**：${lastMessage ? stance.zh : '先建立共同问题'}`,
      `- **我的视角**：${styleMove}`,
      `- **关键张力**：${modeMove}`,
      `- **推进问题**：如果没有标准答案，我们此刻最需要分清的是“真实感受”“可验证事实”和“下一句可以怎么说”。`,
    ].join('\n')
  }

  const responseTarget = lastMessage
    ? `Responding to **${lastMessage.speakerName}**: > ${quoteFragment(lastMessage)}`
    : `Opening round ${input.round}: put the core question on the table.`

  return [
    `### ${input.agent.name}`,
    '',
    responseTarget,
    '',
    `- **Position**: ${lastMessage ? stance.en : 'Frame the shared question first'}`,
    `- **Lens**: ${styleMove}`,
    `- **Tension**: ${modeMove}`,
    '- **Next move**: Since there may be no single right answer, separate feelings, observable facts, and the next sentence the user could actually say.',
  ].join('\n')
}

function buildSummaryText(input: ProviderSummaryInput) {
  const isChinese = input.config.discussionLanguage === 'zh'
  const messageCount = input.messages.length
  const finalSpeaker = input.messages.at(-1)?.speakerName ?? 'the table'
  const activeNames = input.activeAgents.map((agent) => agent.name).join(', ')
  const decisionSentence = outputDirective(input.config.finalOutputType, isChinese)

  if (isChinese) {
    return [
      '## 主持人总结',
      '',
      `本轮共有 **${messageCount}** 条发言，参与者包括：${activeNames}。`,
      '',
      '### 共同点',
      '大家都认为这个问题不适合被压成一个简单答案，需要同时看见感受、事实、边界和可执行的沟通方式。',
      '',
      '### 仍然存在的分歧',
      `最后由 **${finalSpeaker}** 交接，但桌面上仍保留不同解释：一部分视角更重视情绪确认，另一部分更重视边界和行动。`,
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
    `${finalSpeaker} provided the final handoff, but the table still holds a real tension between emotional validation, boundary clarity, and action.`,
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

function quoteFragment(message: DiscussionMessage) {
  const sentence = message.content.split('.').find(Boolean) ?? message.content
  return sentence.slice(0, 96)
}

function styleDirective(style: string, isChinese: boolean) {
  const directives: Record<string, string> = {
    Brief: isChinese ? '我会压缩成少数关键取舍。' : 'I will keep the claim compact and force a short list of tradeoffs.',
    Sharp: isChinese ? '我会温和但直接地挑战薄弱假设。' : 'I will pressure-test the weak assumption before adding new ideas.',
    Encouraging: isChinese ? '我会保持建设性，同时要求具体证据。' : 'I will keep the group constructive while still asking for evidence.',
    Rigorous: isChinese ? '我会区分机制、证据和不确定性。' : 'I will separate mechanism, evidence, and uncertainty.',
    Visionary: isChinese ? '我会打开可能性，但不离开现实行动。' : 'I will widen the opportunity space without losing the path to a prototype.',
    Pragmatic: isChinese ? '我会把洞察转成顺序、责任和限制。' : 'I will translate the idea into sequence, owner, and constraint.',
    Reflective: isChinese ? '我会放慢速度，看见内在冲突。' : 'I will slow down the inner conflict and name what may be emotionally true.',
    Warm: isChinese ? '我会先承接感受，再轻轻打开下一个问题。' : 'I will respond with care first, then gently open a next question.',
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
