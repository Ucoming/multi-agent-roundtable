import { useMemo, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { AgentRoster } from './components/AgentRoster'
import { ControlPanel } from './components/ControlPanel'
import { DiscussionView } from './components/DiscussionView'
import { themeCatalog } from './data/themeCatalog'
import {
  createAgentsFromTemplate,
  defaultConfig,
  getThemedAvatarUrl,
} from './data/templates'
import { downloadJson, downloadMarkdown, downloadPdf } from './lib/exports'
import { summarizeCosts } from './lib/costs'
import { runRoundtable } from './lib/discussionEngine'
import { createMockProvider } from './lib/mockProvider'
import type {
  AgentProfile,
  ModeratorSummary,
  RoundtableConfig,
  RoundtableExportState,
  RoundtableTemplate,
  ThemeId,
} from './types'

const provider = createMockProvider({ chunkDelayMs: import.meta.env.MODE === 'test' ? 0 : 18 })

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

  function updateAgent(id: string, patch: Partial<AgentProfile>) {
    setAgents((current) =>
      current.map((agent) => (agent.id === id ? { ...agent, ...patch } : agent)),
    )
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

  return (
    <main className={`app-shell theme-${config.theme}`}>
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">
            <Sparkles size={20} />
          </div>
          <div>
            <p className="eyebrow">Multi-Agent Roundtable</p>
            <h1>Structured discussions that end in a usable artifact.</h1>
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
          onAgentChange={updateAgent}
          onResetAgents={regenerateAgents}
        />
        <DiscussionView
          agents={agents}
          config={config}
          costSummary={costSummary}
          error={error}
          isRunning={isRunning}
          messages={messages}
          summary={summary}
        />
        <ControlPanel
          config={config}
          canExport={messages.length > 0 || Boolean(summary.content)}
          isRunning={isRunning}
          onConfigChange={updateConfig}
          onTemplateChange={updateTemplate}
          onRun={startDiscussion}
          onStop={stopDiscussion}
          onRegenerateAgents={regenerateAgents}
          onExportMarkdown={() => downloadMarkdown(exportState)}
          onExportJson={() => downloadJson(exportState)}
          onExportPdf={() => downloadPdf(exportState)}
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
