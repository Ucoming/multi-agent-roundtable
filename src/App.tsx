import { useMemo, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { AgentRoster } from './components/AgentRoster'
import { ControlPanel } from './components/ControlPanel'
import { DiscussionView } from './components/DiscussionView'
import { NeedsGuidePanel } from './components/NeedsGuidePanel'
import { themeCatalog } from './data/themeCatalog'
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
import type {
  AgentProfile,
  ModeratorSummary,
  ProviderMode,
  RoundtableConfig,
  RoundtableExportState,
  RoundtableTemplate,
  ThemeId,
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
  const stopRef = useRef(false)
  const interjectionQueueRef = useRef<RoundtableExportState['messages']>([])

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
    }),
    [agents, config, costSummary, messages, summary],
  )

  const enabledAgentCount = agents.filter((agent) => agent.enabled).length

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

  function updateTheme(theme: ThemeId) {
    setConfig((current) => ({ ...current, theme }))
    setAgents((current) =>
      current.map((agent) => ({
        ...agent,
        avatarUrl: getThemedAvatarUrl(agent.avatarUrl, theme),
      })),
    )
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
      return [...current, createCustomAgent(current.length + 1, config.theme)]
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

    setError('')
    setMessages([])
    setSummary(createBlankSummary())
    setIsRunning(true)
    stopRef.current = false
    interjectionQueueRef.current = []

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
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'The roundtable failed to run.')
    } finally {
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

  return (
    <main className={`app-shell theme-${config.theme}`}>
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">
            <Sparkles size={20} />
          </div>
          <div>
            <p className="eyebrow">Multi-Agent Roundtable</p>
            <h1>Reflect on relationship questions with multiple caring perspectives.</h1>
          </div>
        </div>

        <label className="theme-switcher">
          <span>Style</span>
          <select
            aria-label="Theme style"
            value={config.theme}
            disabled={isRunning}
            onChange={(event) => updateTheme(event.target.value as ThemeId)}
          >
            {themeCatalog.map((theme) => (
              <option value={theme.id} key={theme.id}>
                {theme.label}
              </option>
            ))}
          </select>
        </label>
      </header>

      <div className="workspace">
        <AgentRoster
          agents={agents}
          disabled={isRunning}
          maxAgents={maxAgents}
          minAgents={minAgents}
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

function createCustomAgent(index: number, theme: ThemeId): AgentProfile {
  const avatar = customAgentAvatars[(index - 1) % customAgentAvatars.length]
  return {
    id: `custom-agent-${Date.now()}-${index}`,
    name: `Custom Agent ${index}`,
    role: 'Adds a new reflective perspective to the table.',
    systemPrompt:
      'You contribute a distinct perspective on the relationship or emotional question, respond to the prior speaker, and help the user think without pretending there is one perfect answer.',
    model: 'DeepSeek',
    temperature: 0.55,
    speakingStyle: 'Pragmatic',
    enabled: true,
    avatarUrl: getThemedAvatarUrl(avatar, theme),
    accentColor: customAgentColors[(index - 1) % customAgentColors.length],
  }
}
