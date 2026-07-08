import { createAgentsFromTemplate, defaultConfig, templateLabels } from '../data/templates'
import { createDiscussionPlan, getSpeakingSequence, runRoundtable } from './discussionEngine'
import { createJsonExport, createMarkdownExport } from './exports'
import { createMockProvider } from './mockProvider'
import type {
  DiscussionBrief,
  DiscussionMessage,
  LlmProvider,
  RoundtableTemplate,
} from '../types'

const templates = Object.keys(templateLabels) as RoundtableTemplate[]

describe('roundtable templates', () => {
  it('creates 3 to 5 enabled agents for every template', () => {
    for (const template of templates) {
      const agents = createAgentsFromTemplate(template)

      expect(agents.length).toBeGreaterThanOrEqual(3)
      expect(agents.length).toBeLessThanOrEqual(5)
      expect(agents.every((agent) => agent.enabled)).toBe(true)
    }
  })
})

describe('speaking order', () => {
  it('creates valid fixed, random, and moderator sequences', () => {
    const agents = createAgentsFromTemplate('peer-review')
    const activeIds = agents.map((agent) => agent.id).sort()

    for (const order of ['fixed', 'random', 'moderator'] as const) {
      const sequence = getSpeakingSequence(agents, order, 1, defaultConfig.question)
      expect(sequence.map((agent) => agent.id).sort()).toEqual(activeIds)
    }
  })

  it('creates a turn plan for every configured round', () => {
    const agents = createAgentsFromTemplate('debate')
    const plan = createDiscussionPlan(agents, { ...defaultConfig, roundCount: 3 })

    expect(plan).toHaveLength(3)
    expect(plan.every((round) => round.agents.length === agents.length)).toBe(true)
  })
})

describe('roundtable run', () => {
  it('generates a moderator summary after the configured rounds', async () => {
    const agents = createAgentsFromTemplate('brainstorming')
    const result = await runRoundtable(
      { ...defaultConfig, roundCount: 2 },
      agents,
      createMockProvider({ chunkDelayMs: 0 }),
    )

    expect(result.messages).toHaveLength(agents.length * 2)
    expect(result.summary.content).toContain('Theory Link')
    expect(result.costSummary.totalTokens).toBeGreaterThan(0)
  })

  it('routes a user interjection into later agent turns', async () => {
    const agents = createAgentsFromTemplate('relationship-reflection').slice(0, 2)
    const seenInputs: string[][] = []
    let consumeCalls = 0
    const provider: LlmProvider = {
      id: 'capture-provider',
      label: 'Capture Provider',
      streamTurn: async function* (input) {
        seenInputs.push(input.previousMessages.map((message) => message.speakerName))
        yield `${input.agent.name} heard the room.`
      },
      streamSummary: async function* () {
        yield 'Moderator summary.'
      },
    }

    const result = await runRoundtable(
      { ...defaultConfig, roundCount: 1, speakingOrder: 'fixed' },
      agents,
      provider,
      {
        consumeUserInterjections: () => {
          consumeCalls += 1
          return consumeCalls === 2 ? [createUserMessage('Please also consider my fear.')] : []
        },
      },
    )

    expect(seenInputs[0]).toEqual([])
    expect(seenInputs[1]).toContain('You')
    expect(result.messages.map((message) => message.speakerName)).toEqual([
      agents[0].name,
      'You',
      agents[1].name,
    ])
  })

  it('routes the whole table brief into later agent turns', async () => {
    const agents = createAgentsFromTemplate('relationship-reflection').slice(0, 3)
    const seenBriefs: DiscussionBrief[] = []
    const provider: LlmProvider = {
      id: 'table-brief-capture',
      label: 'Table Brief Capture',
      streamTurn: async function* (input) {
        seenBriefs.push(input.discussionBrief)
        const speakers = input.discussionBrief.referencePoints
          .map((point) => point.speakerName)
          .join(', ')
        yield `${input.agent.name} responds to ${speakers || 'the opening question'}.`
      },
      streamSummary: async function* () {
        yield 'Moderator summary.'
      },
    }

    const result = await runRoundtable(
      { ...defaultConfig, roundCount: 1, speakingOrder: 'fixed' },
      agents,
      provider,
    )

    expect(seenBriefs[0].referencePoints).toHaveLength(0)
    expect(seenBriefs[2].referencePoints.map((point) => point.speakerName)).toEqual([
      agents[0].name,
      agents[1].name,
    ])
    expect(result.messages[2].referencedMessageIds).toEqual([
      result.messages[0].id,
      result.messages[1].id,
    ])
    expect(result.messages[2].content).toContain(agents[0].name)
    expect(result.messages[2].content).toContain(agents[1].name)
  })
})

describe('exports', () => {
  it('includes question, agents, transcript, and summary in Markdown and JSON exports', async () => {
    const agents = createAgentsFromTemplate('debate')
    const result = await runRoundtable(
      { ...defaultConfig, template: 'debate', discussionMode: 'debate', roundCount: 1 },
      agents,
      createMockProvider({ chunkDelayMs: 0 }),
    )
    const state = {
      config: { ...defaultConfig, template: 'debate' as const, discussionMode: 'debate' as const },
      agents,
      messages: result.messages,
      summary: result.summary,
      costSummary: result.costSummary,
      exportedAt: '2026-07-07T00:00:00.000Z',
    }

    const markdown = createMarkdownExport(state)
    const json = createJsonExport(state)

    expect(markdown).toContain('## Question')
    expect(markdown).toContain(agents[0].name)
    expect(markdown).toContain(result.messages[0].content)
    expect(markdown).toContain(result.summary.content)
    expect(json).toContain(defaultConfig.question)
    expect(JSON.parse(json).summary.content).toBe(result.summary.content)
  })
})

function createUserMessage(content: string): DiscussionMessage {
  return {
    id: 'user-test-note',
    round: 1,
    agentId: 'user',
    speakerType: 'user',
    speakerName: 'You',
    role: 'User context',
    model: 'User',
    speakingStyle: 'Reflective',
    content,
    tokenEstimate: 5,
    costEstimate: 0,
    timestamp: '2026-07-08T00:00:00.000Z',
  }
}
