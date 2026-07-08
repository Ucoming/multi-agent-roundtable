import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { AgentRoster } from './components/AgentRoster'
import { ControlPanel } from './components/ControlPanel'
import { DiscussionView } from './components/DiscussionView'
import { NeedsGuidePanel } from './components/NeedsGuidePanel'
import {
  SessionHistoryPanel,
  type SessionSaveState,
} from './components/SessionHistoryPanel'
import { getTopicDefinition, topicCatalog } from './data/topicCatalog'
import {
  createAgentFromPreset,
  createAgentsFromTemplate,
  defaultConfig,
  getThemedAvatarUrl,
  type AgentPresetId,
} from './data/templates'
import { downloadJson, downloadMarkdown, downloadPdf } from './lib/exports'
import { estimateTokens, summarizeCosts } from './lib/costs'
import { runRoundtable } from './lib/discussionEngine'
import { createMockProvider } from './lib/mockProvider'
import { createServerProvider } from './lib/serverProvider'
import {
  deleteSession,
  getSession,
  listSessions,
  saveSession,
} from './lib/sessionStorage'
import type {
  AgentProfile,
  ModeratorSummary,
  ProviderMode,
  RoundtableConfig,
  RoundtableExportState,
  RoundtableSessionMeta,
  RoundtableSessionSnapshot,
  RoundtableTemplate,
  SessionListItem,
  SessionStatus,
  ThemeId,
  TopicSpaceId,
} from './types'

const mockChunkDelayMs = import.meta.env.MODE === 'test' ? 0 : 18
const minAgents = 1
const maxAgents = 8

const customAgentAvatars = [
  './assets/avatar-scout.png',
  './assets/avatar-builder.png',
  './assets/avatar-advocate.png',
  './assets/avatar-keeper.png',
  './assets/avatar-chair.png',
  './assets/avatar-operator.png',
]

const customAgentColors = ['#2f9c95', '#d16b4f', '#7b68a8', '#6b8f4e', '#bc7642', '#5f8c57']

export function App() {
  const [config, setConfig] = useState<RoundtableConfig>(defaultConfig)
  const [agents, setAgents] = useState<AgentProfile[]>(() =>
    createAgentsFromTemplate(defaultConfig.template, defaultConfig.question, defaultConfig.theme),
  )
  const [messages, setMessages] = useState<RoundtableExportState['messages']>([])
  const [summary, setSummary] = useState<ModeratorSummary>(() => createBlankSummary())
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState('')
  const [sessions, setSessions] = useState<SessionListItem[]>([])
  const [currentSession, setCurrentSession] = useState<RoundtableSessionMeta>()
  const [autosaveEnabled, setAutosaveEnabled] = useState(false)
  const [saveState, setSaveState] = useState<SessionSaveState>('idle')
  const stopRef = useRef(false)
  const interjectionQueueRef = useRef<RoundtableExportState['messages']>([])
  const saveTimerRef = useRef<number | undefined>(undefined)

  const provider = useMemo(
    () =>
      config.providerMode === 'deepseek'
        ? createServerProvider()
        : createMockProvider({ chunkDelayMs: mockChunkDelayMs }),
    [config.providerMode],
  )
  const costSummary = useMemo(() => summarizeCosts(messages, summary), [messages, summary])
  const exportState = useMemo<RoundtableExportState>(
    () => ({
      config,
      agents,
      messages,
      summary,
      costSummary,
      exportedAt: new Date().toISOString(),
      session: currentSession,
    }),
    [agents, config, costSummary, currentSession, messages, summary],
  )

  const enabledAgentCount = agents.filter((agent) => agent.enabled).length
  const currentTopic = getTopicDefinition(config.topicSpace)

  const refreshSessions = useCallback(async () => {
    setSessions(await listSessions())
  }, [])

  useEffect(() => {
    void refreshSessions()
  }, [refreshSessions])

  useEffect(() => {
    if (!currentSession) {
      setSaveState('idle')
      return
    }

    if (!autosaveEnabled) {
      setSaveState('saved')
      return
    }

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current)
    }

    setSaveState('saving')
    saveTimerRef.current = window.setTimeout(() => {
      const snapshot = createSessionSnapshot({
        session: currentSession,
        config,
        agents,
        messages,
        summary,
        costSummary,
        error,
      })

      void saveSession(snapshot)
        .then(refreshSessions)
        .then(() => {
          setSaveState('saved')
          if (snapshot.session.status !== 'running') {
            setAutosaveEnabled(false)
          }
        })
        .catch(() => setSaveState('error'))
    }, 350)

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current)
      }
    }
  }, [
    agents,
    autosaveEnabled,
    config,
    costSummary,
    currentSession,
    error,
    messages,
    refreshSessions,
    summary,
  ])

  function updateConfig(patch: Partial<RoundtableConfig>) {
    setConfig((current) => ({ ...current, ...patch }))
  }

  function updateTemplate(template: RoundtableTemplate) {
    setConfig((current) => ({
      ...current,
      template,
      discussionMode: template,
    }))
    setAgents(createAgentsFromTemplate(template, config.question, config.theme))
  }

  function updateTopicSpace(topicSpace: TopicSpaceId) {
    const topic = getTopicDefinition(topicSpace)
    setConfig((current) => ({
      ...current,
      topicSpace,
      theme: topic.theme,
      template: topic.template,
      discussionMode: topic.discussionMode,
      finalOutputType: topic.finalOutputType,
      question: topic.defaultQuestion,
      preDiscussionContext: undefined,
    }))
    setAgents(createAgentsFromTemplate(topic.template, topic.defaultQuestion, topic.theme))
  }

  function updateProviderMode(providerMode: ProviderMode) {
    setConfig((current) => ({ ...current, providerMode }))
    setError('')
  }

  function updateAgent(id: string, patch: Partial<AgentProfile>) {
    setAgents((current) =>
      current.map((agent) => (agent.id === id ? { ...agent, ...patch } : agent)),
    )
  }

  function addAgent() {
    setAgents((current) => {
      if (current.length >= maxAgents) return current
      return [...current, createCustomAgent(current.length + 1, config.theme, config.topicSpace)]
    })
  }

  function addPresetAgent(presetId: AgentPresetId) {
    setAgents((current) => {
      if (current.length >= maxAgents) return current
      return [...current, createAgentFromPreset(presetId, current.length + 1, config.theme)]
    })
  }

  function removeAgent(id: string) {
    setAgents((current) => {
      if (current.length <= minAgents) return current
      return current.filter((agent) => agent.id !== id)
    })
  }

  function removeLastAgent() {
    setAgents((current) => {
      if (current.length <= minAgents) return current
      return current.slice(0, -1)
    })
  }

  function regenerateAgents() {
    setAgents(createAgentsFromTemplate(config.template, config.question, config.theme))
  }

  async function startDiscussion() {
    if (!config.question.trim()) {
      setError('Add a question before starting the roundtable.')
      return
    }
    if (enabledAgentCount === 0) {
      setError('Enable at least one agent before starting the roundtable.')
      return
    }

    const session = createSessionMeta(config, 'running')
    const blankSummary = createBlankSummary()

    setError('')
    setMessages([])
    setSummary(blankSummary)
    setCurrentSession(session)
    setAutosaveEnabled(true)
    setSaveState('saving')
    setIsRunning(true)
    stopRef.current = false
    interjectionQueueRef.current = []

    let finalStatus: SessionStatus = 'completed'

    try {
      const result = await runRoundtable(config, agents, provider, {
        onMessageStart: (message) => {
          setMessages((current) => [...current, message])
        },
        onMessageChunk: (message) => {
          setMessages((current) =>
            current.map((existing) => (existing.id === message.id ? message : existing)),
          )
        },
        onMessageComplete: (message) => {
          setMessages((current) =>
            current.map((existing) => (existing.id === message.id ? message : existing)),
          )
        },
        onSummaryStart: (nextSummary) => {
          setSummary(nextSummary)
        },
        onSummaryChunk: (nextSummary) => {
          setSummary(nextSummary)
        },
        onSummaryComplete: (nextSummary) => {
          setSummary(nextSummary)
        },
        shouldStop: () => stopRef.current,
        consumeUserInterjections: () => {
          const queued = interjectionQueueRef.current
          interjectionQueueRef.current = []
          return queued
        },
      })

      setMessages(result.messages)
      setSummary(result.summary)
      finalStatus = stopRef.current ? 'stopped' : 'completed'
    } catch (runError) {
      finalStatus = 'error'
      setError(runError instanceof Error ? runError.message : 'The roundtable failed to run.')
    } finally {
      setCurrentSession((current) =>
        current?.id === session.id
          ? { ...current, status: finalStatus, updatedAt: new Date().toISOString() }
          : current,
      )
      setIsRunning(false)
    }
  }

  function stopDiscussion() {
    stopRef.current = true
  }

  function addUserInterjection(content: string) {
    const trimmed = content.trim()
    if (!trimmed || !isRunning) return

    const message = createUserInterjection(trimmed, messages.at(-1)?.round ?? 1)
    interjectionQueueRef.current = [...interjectionQueueRef.current, message]
    setMessages((current) => [...current, message])
  }

  async function loadSessionSnapshot(sessionId: string) {
    if (isRunning) return

    const snapshot = await getSession(sessionId)
    if (!snapshot) {
      setError('That saved discussion could not be found.')
      await refreshSessions()
      return
    }

    setConfig(snapshot.config)
    setAgents(snapshot.agents)
    setMessages(snapshot.messages)
    setSummary(snapshot.summary)
    setError(snapshot.error)
    setCurrentSession(snapshot.session)
    setAutosaveEnabled(false)
    setSaveState('saved')
  }

  async function deleteSessionSnapshot(sessionId: string) {
    if (isRunning) return

    await deleteSession(sessionId)
    await refreshSessions()

    if (currentSession?.id === sessionId) {
      setCurrentSession(undefined)
      setAutosaveEnabled(false)
      setSaveState('idle')
    }
  }

  function createNewDiscussion() {
    if (isRunning) return

    const topic = getTopicDefinition(config.topicSpace)
    const nextConfig: RoundtableConfig = {
      ...defaultConfig,
      providerMode: config.providerMode,
      discussionLanguage: config.discussionLanguage,
      topicSpace: topic.id,
      theme: topic.theme,
      template: topic.template,
      discussionMode: topic.discussionMode,
      finalOutputType: topic.finalOutputType,
      discussionScene: config.discussionScene,
      question: topic.defaultQuestion,
      preDiscussionContext: undefined,
    }

    setConfig(nextConfig)
    setAgents(createAgentsFromTemplate(nextConfig.template, nextConfig.question, nextConfig.theme))
    setMessages([])
    setSummary(createBlankSummary())
    setError('')
    setCurrentSession(undefined)
    setAutosaveEnabled(false)
    setSaveState('idle')
    interjectionQueueRef.current = []
  }

  return (
    <main className={`app-shell theme-${config.theme}`}>
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">
            <Sparkles size={20} />
          </div>
          <div>
            <p className="eyebrow">Multi-Agent Roundtable</p>
            <h1>{currentTopic.headline}</h1>
          </div>
        </div>

        <div className="topbar-actions">
          <a className="history-shortcut" href="#conversation-history">
            History / 对话历史
          </a>

          <label className="theme-switcher">
            <span>Topic</span>
            <select
              aria-label="Topic space"
              value={config.topicSpace}
              disabled={isRunning}
              onChange={(event) => updateTopicSpace(event.target.value as TopicSpaceId)}
            >
              {topicCatalog.map((topic) => (
                <option value={topic.id} key={topic.id}>
                  {topic.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <div className="workspace">
        <AgentRoster
          agents={agents}
          disabled={isRunning}
          maxAgents={maxAgents}
          minAgents={minAgents}
          topicSpace={config.topicSpace}
          onAddAgent={addAgent}
          onAddPresetAgent={addPresetAgent}
          onAgentChange={updateAgent}
          onRemoveAgent={removeAgent}
          onRemoveLastAgent={removeLastAgent}
          onResetAgents={regenerateAgents}
        />
        <DiscussionView
          agents={agents}
          config={config}
          costSummary={costSummary}
          error={error}
          isRunning={isRunning}
          messages={messages}
          onUserInterjection={addUserInterjection}
          summary={summary}
        />
        <ControlPanel
          config={config}
          canExport={messages.length > 0 || Boolean(summary.content)}
          isRunning={isRunning}
          onConfigChange={updateConfig}
          onProviderModeChange={updateProviderMode}
          onTemplateChange={updateTemplate}
          onRun={startDiscussion}
          onStop={stopDiscussion}
          onRegenerateAgents={regenerateAgents}
          onExportMarkdown={() => downloadMarkdown(exportState)}
          onExportJson={() => downloadJson(exportState)}
          onExportPdf={() => downloadPdf(exportState)}
          historySlot={
            <SessionHistoryPanel
              currentSessionId={currentSession?.id}
              disabled={isRunning}
              saveState={saveState}
              sessions={sessions}
              onDeleteSession={deleteSessionSnapshot}
              onLoadSession={loadSessionSnapshot}
              onNewDiscussion={createNewDiscussion}
            />
          }
          needsGuideSlot={
            <NeedsGuidePanel
              config={config}
              disabled={isRunning}
              provider={provider}
              onApply={(question, context) => {
                updateConfig({ question, preDiscussionContext: context })
                setError('')
              }}
              onError={setError}
            />
          }
        />
      </div>
    </main>
  )
}

function createBlankSummary(): ModeratorSummary {
  return {
    content: '',
    tokenEstimate: 0,
    costEstimate: 0,
    timestamp: new Date().toISOString(),
  }
}

function createSessionMeta(config: RoundtableConfig, status: SessionStatus): RoundtableSessionMeta {
  const now = new Date().toISOString()
  return {
    id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    title: createSessionTitle(config.question),
    status,
    createdAt: now,
    updatedAt: now,
  }
}

function createSessionSnapshot({
  session,
  config,
  agents,
  messages,
  summary,
  costSummary,
  error,
}: {
  session: RoundtableSessionMeta
  config: RoundtableConfig
  agents: AgentProfile[]
  messages: RoundtableExportState['messages']
  summary: ModeratorSummary
  costSummary: RoundtableExportState['costSummary']
  error: string
}): RoundtableSessionSnapshot {
  const now = new Date().toISOString()
  const updatedSession = { ...session, updatedAt: now }

  return {
    session: updatedSession,
    config,
    agents,
    messages,
    summary,
    costSummary,
    error,
    exportedAt: now,
  }
}

function createSessionTitle(question: string) {
  const compact = question.replace(/\s+/g, ' ').trim()
  if (!compact) return 'Untitled roundtable'
  return compact.length > 64 ? `${compact.slice(0, 61)}...` : compact
}

function createUserInterjection(content: string, round: number): RoundtableExportState['messages'][number] {
  const tokenEstimate = estimateTokens(content)
  return {
    id: `user-interjection-${Date.now()}`,
    round,
    agentId: 'user',
    speakerType: 'user',
    speakerName: 'You',
    role: 'User context and live intervention',
    model: 'User',
    speakingStyle: 'Reflective',
    content,
    tokenEstimate,
    costEstimate: 0,
    timestamp: new Date().toISOString(),
  }
}

function createCustomAgent(index: number, theme: ThemeId, topicSpace: TopicSpaceId): AgentProfile {
  const avatar = customAgentAvatars[(index - 1) % customAgentAvatars.length]
  const isPhilosophy = topicSpace === 'philosophy'
  return {
    id: `custom-agent-${Date.now()}-${index}`,
    name: `Custom Agent ${index}`,
    role: isPhilosophy
      ? 'Adds a distinct philosophical lens to the table.'
      : 'Adds a new reflective perspective to the table.',
    systemPrompt: isPhilosophy
      ? 'You contribute a distinct philosophical lens, clarify assumptions, compare values, and help the user think without pretending there is one perfect answer.'
      : 'You contribute a distinct perspective on the relationship or emotional question, respond to the prior speaker, and help the user think without pretending there is one perfect answer.',
    model: 'DeepSeek',
    temperature: 0.55,
    speakingStyle: 'Pragmatic',
    enabled: true,
    avatarUrl: getThemedAvatarUrl(avatar, theme),
    accentColor: customAgentColors[(index - 1) % customAgentColors.length],
  }
}
