// @vitest-environment node
import { createAgentsFromTemplate, defaultConfig } from '../src/data/templates'
import type { DiscussionMessage } from '../src/types'
import { buildAgentPrompt, buildModeratorPrompt } from './promptBuilder'

describe('prompt builder', () => {
  it('includes the agent system prompt, user question, latest message, and transcript', () => {
    const agents = createAgentsFromTemplate('debate')
    const messages: DiscussionMessage[] = [
      createMessage(agents[0].id, agents[0].name, 'The first transcript point matters.'),
      createMessage(agents[1].id, agents[1].name, 'The latest message names a risk.'),
    ]

    const prompt = buildAgentPrompt({
      agent: agents[2],
      config: { ...defaultConfig, question: 'Should we launch the product now?' },
      round: 1,
      turnIndex: 2,
      activeAgents: agents,
      previousMessages: messages,
    })

    expect(prompt.system).toContain(agents[2].systemPrompt)
    expect(prompt.user).toContain('Should we launch the product now?')
    expect(prompt.user).toContain('The latest message names a risk.')
    expect(prompt.user).toContain('The first transcript point matters.')
    expect(prompt.system).toContain('Required output language: Chinese')
    expect(prompt.system).toContain('Use Markdown')
    expect(prompt.system).toContain('Agree, Disagree, or Partly agree')
    expect(prompt.user).toContain('Respond directly to')
  })

  it('builds a moderator prompt from the final full transcript', () => {
    const agents = createAgentsFromTemplate('brainstorming')
    const messages = [createMessage(agents[0].id, agents[0].name, 'Prototype the smallest path.')]

    const prompt = buildModeratorPrompt({
      config: { ...defaultConfig, finalOutputType: 'action-list' },
      activeAgents: agents,
      messages,
    })

    expect(prompt.system).toContain('moderator')
    expect(prompt.user).toContain('action-list')
    expect(prompt.user).toContain('Prototype the smallest path.')
    expect(prompt.user).toContain('Main disagreement or unresolved tension')
    expect(prompt.user).toContain('Multiple plausible readings or outcomes')
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
