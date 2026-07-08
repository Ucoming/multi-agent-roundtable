// @vitest-environment node
import { createAgentsFromTemplate, defaultConfig } from '../src/data/templates'
import type { DiscussionBrief, DiscussionMessage } from '../src/types'
import { buildAgentPrompt, buildModeratorPrompt, buildNeedsGuidePrompt } from './promptBuilder'

describe('prompt builder', () => {
  it('includes the agent system prompt, user question, table brief, and full transcript', () => {
    const agents = createAgentsFromTemplate('debate')
    const messages: DiscussionMessage[] = [
      createMessage(agents[0].id, agents[0].name, 'The first transcript point matters.'),
      createMessage(agents[1].id, agents[1].name, 'The latest message names a risk.'),
    ]
    const discussionBrief = createBrief(messages)

    const prompt = buildAgentPrompt({
      agent: agents[2],
      config: {
        ...defaultConfig,
        question: 'Should we launch the product now?',
        preDiscussionContext: 'The user first clarified their needs.',
      },
      round: 1,
      turnIndex: 2,
      activeAgents: agents,
      previousMessages: messages,
      discussionBrief,
    })

    expect(prompt.system).toContain(agents[2].systemPrompt)
    expect(prompt.user).toContain('Should we launch the product now?')
    expect(prompt.user).toContain('The user first clarified their needs.')
    expect(prompt.user).toContain('Agent-specific attention filter')
    expect(prompt.user).toContain('Current table brief')
    expect(prompt.user).toContain('Reference points to consider')
    expect(prompt.user).toContain('The latest message names a risk.')
    expect(prompt.user).toContain('The first transcript point matters.')
    expect(prompt.system).toContain('Required output language: Chinese')
    expect(prompt.system).toContain('Use Markdown')
    expect(prompt.system).toContain('Agree, Disagree, or Partly agree')
    expect(prompt.user).toContain('Respond to the whole table brief')
    expect(prompt.user).toContain('Address at least two prior speakers')
  })

  it('builds a moderator prompt from the final full transcript', () => {
    const agents = createAgentsFromTemplate('brainstorming')
    const messages = [createMessage(agents[0].id, agents[0].name, 'Prototype the smallest path.')]

    const prompt = buildModeratorPrompt({
      config: {
        ...defaultConfig,
        finalOutputType: 'action-list',
        preDiscussionContext: 'Needs summary before the table.',
      },
      activeAgents: agents,
      messages,
      discussionBrief: createBrief(messages),
    })

    expect(prompt.system).toContain('moderator')
    expect(prompt.user).toContain('action-list')
    expect(prompt.user).toContain('Needs summary before the table.')
    expect(prompt.user).toContain('Final table brief')
    expect(prompt.user).toContain('Relevant theory lenses to consider')
    expect(prompt.user).toContain('Theory connection')
    expect(prompt.user).toContain('Prototype the smallest path.')
    expect(prompt.user).toContain('Main disagreement or unresolved tension')
    expect(prompt.user).toContain('Multiple plausible readings or outcomes')
  })

  it('builds staged needs guide prompts and fixed summary instructions', () => {
    const storyPrompt = buildNeedsGuidePrompt({
      config: defaultConfig,
      stage: 'story',
      initialQuestion: 'I feel confused about a relationship.',
      messages: [],
    })
    const feelingsPrompt = buildNeedsGuidePrompt({
      config: defaultConfig,
      stage: 'feelings-needs',
      initialQuestion: 'I feel confused about a relationship.',
      messages: [],
    })
    const summaryPrompt = buildNeedsGuidePrompt({
      config: defaultConfig,
      stage: 'summary',
      initialQuestion: 'I feel confused about a relationship.',
      messages: [],
    })

    expect(storyPrompt.user).toContain('发生了什么')
    expect(feelingsPrompt.user).toContain('感受')
    expect(feelingsPrompt.user).toContain('需要')
    expect(summaryPrompt.system).toContain('Do not diagnose')
    expect(summaryPrompt.user).toContain('## 需求总结')
    expect(summaryPrompt.user).toContain('**圆桌问题：**')
  })
})

function createMessage(agentId: string, speakerName: string, content: string): DiscussionMessage {
  return {
    id: `${agentId}-${content.length}`,
    round: 1,
    agentId,
    speakerName,
    role: 'Test role',
    model: 'DeepSeek',
    speakingStyle: 'Rigorous',
    content,
    tokenEstimate: 10,
    costEstimate: 0.001,
    timestamp: '2026-07-08T00:00:00.000Z',
  }
}

function createBrief(messages: DiscussionMessage[]): DiscussionBrief {
  return {
    tableState: 'Two prior speakers have created a disagreement.',
    commonGround: ['Both speakers are addressing the same launch question.'],
    tensions: ['Speed conflicts with risk control.'],
    openQuestions: ['What evidence would change the table position?'],
    referencePoints: messages.map((message) => ({
      messageId: message.id,
      speakerName: message.speakerName,
      excerpt: message.content,
    })),
  }
}
