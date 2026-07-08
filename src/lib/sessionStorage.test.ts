import { vi } from 'vitest'
import { createAgentsFromTemplate, defaultConfig } from '../data/templates'
import type { RoundtableSessionSnapshot, SessionStatus } from '../types'
import {
  deleteSession,
  getSession,
  listSessions,
  maxStoredSessions,
  saveSession,
} from './sessionStorage'

describe('session storage fallback', () => {
  beforeEach(() => {
    vi.stubGlobal('indexedDB', undefined)
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('saves and restores a full session snapshot', async () => {
    const snapshot = createSnapshot('session-a', '2026-07-08T10:00:00.000Z')

    await saveSession(snapshot)
    const restored = await getSession('session-a')

    expect(restored?.config.question).toBe(defaultConfig.question)
    expect(restored?.agents).toHaveLength(snapshot.agents.length)
    expect(restored?.messages[0].content).toBe('A stored transcript point.')
    expect(restored?.summary.content).toBe('A stored moderator summary.')
  })

  it('lists sessions by most recent update first', async () => {
    await saveSession(createSnapshot('older', '2026-07-08T09:00:00.000Z'))
    await saveSession(createSnapshot('newer', '2026-07-08T11:00:00.000Z'))

    const sessions = await listSessions()

    expect(sessions.map((session) => session.id)).toEqual(['newer', 'older'])
    expect(sessions[0].messageCount).toBe(1)
    expect(sessions[0].topicSpace).toBe(defaultConfig.topicSpace)
  })

  it('deletes sessions', async () => {
    await saveSession(createSnapshot('keep', '2026-07-08T09:00:00.000Z'))
    await saveSession(createSnapshot('remove', '2026-07-08T10:00:00.000Z'))

    await deleteSession('remove')

    expect(await getSession('remove')).toBeNull()
    expect((await listSessions()).map((session) => session.id)).toEqual(['keep'])
  })

  it('keeps only the newest saved sessions in fallback storage', async () => {
    for (let index = 0; index < maxStoredSessions + 2; index += 1) {
      await saveSession(
        createSnapshot(
          `session-${index}`,
          `2026-07-08T10:${String(index).padStart(2, '0')}:00.000Z`,
        ),
      )
    }

    const sessions = await listSessions()

    expect(sessions).toHaveLength(maxStoredSessions)
    expect(sessions.map((session) => session.id)).not.toContain('session-0')
    expect(sessions.map((session) => session.id)).not.toContain('session-1')
  })
})

function createSnapshot(
  id: string,
  updatedAt: string,
  status: SessionStatus = 'completed',
): RoundtableSessionSnapshot {
  const agents = createAgentsFromTemplate(defaultConfig.template)
  return {
    session: {
      id,
      title: `Saved session ${id}`,
      status,
      createdAt: '2026-07-08T08:00:00.000Z',
      updatedAt,
    },
    config: defaultConfig,
    agents,
    messages: [
      {
        id: `${id}-message`,
        round: 1,
        agentId: agents[0].id,
        speakerName: agents[0].name,
        role: agents[0].role,
        model: agents[0].model,
        speakingStyle: agents[0].speakingStyle,
        content: 'A stored transcript point.',
        tokenEstimate: 6,
        costEstimate: 0.001,
        timestamp: updatedAt,
      },
    ],
    summary: {
      content: 'A stored moderator summary.',
      tokenEstimate: 5,
      costEstimate: 0.001,
      timestamp: updatedAt,
    },
    costSummary: {
      totalTokens: 11,
      totalCost: 0.002,
    },
    exportedAt: updatedAt,
    error: '',
  }
}
