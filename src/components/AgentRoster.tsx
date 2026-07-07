import { RefreshCw, SlidersHorizontal } from 'lucide-react'
import type { AgentProfile, ModelLabel, SpeakingStyle } from '../types'

const modelOptions: ModelLabel[] = ['GPT-5.5', 'Claude', 'DeepSeek', 'Gemini', 'Ollama']
const styleOptions: SpeakingStyle[] = [
  'Brief',
  'Sharp',
  'Encouraging',
  'Rigorous',
  'Visionary',
  'Pragmatic',
]

interface AgentRosterProps {
  agents: AgentProfile[]
  disabled: boolean
  onAgentChange(id: string, patch: Partial<AgentProfile>): void
  onResetAgents(): void
}

export function AgentRoster({
  agents,
  disabled,
  onAgentChange,
  onResetAgents,
}: AgentRosterProps) {
  const enabledCount = agents.filter((agent) => agent.enabled).length

  return (
    <aside className="panel agent-panel" aria-label="Agent roster">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Roundtable</p>
          <h2>Agent members</h2>
        </div>
        <button
          className="icon-button"
          type="button"
          onClick={onResetAgents}
          disabled={disabled}
          title="Regenerate agents from the selected template"
          aria-label="Regenerate agents from template"
        >
          <RefreshCw size={17} />
        </button>
      </div>

      <div className="agent-count">
        <SlidersHorizontal size={16} />
        <span>{enabledCount} enabled</span>
      </div>

      <div className="agent-list">
        {agents.map((agent) => (
          <article className="agent-card" key={agent.id}>
            <div className="agent-card-top">
              <img src={agent.avatarUrl} alt="" className="agent-avatar" />
              <label className="switch-label">
                <input
                  type="checkbox"
                  checked={agent.enabled}
                  disabled={disabled}
                  onChange={(event) => onAgentChange(agent.id, { enabled: event.target.checked })}
                />
                <span>Enabled</span>
              </label>
            </div>

            <label className="field">
              <span>Name</span>
              <input
                value={agent.name}
                disabled={disabled}
                onChange={(event) => onAgentChange(agent.id, { name: event.target.value })}
              />
            </label>

            <label className="field">
              <span>Role</span>
              <input
                value={agent.role}
                disabled={disabled}
                onChange={(event) => onAgentChange(agent.id, { role: event.target.value })}
              />
            </label>

            <label className="field">
              <span>System Prompt</span>
              <textarea
                value={agent.systemPrompt}
                disabled={disabled}
                rows={4}
                onChange={(event) =>
                  onAgentChange(agent.id, { systemPrompt: event.target.value })
                }
              />
            </label>

            <div className="agent-grid">
              <label className="field">
                <span>Model</span>
                <select
                  value={agent.model}
                  disabled={disabled}
                  onChange={(event) =>
                    onAgentChange(agent.id, { model: event.target.value as ModelLabel })
                  }
                >
                  {modelOptions.map((model) => (
                    <option value={model} key={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Style</span>
                <select
                  value={agent.speakingStyle}
                  disabled={disabled}
                  onChange={(event) =>
                    onAgentChange(agent.id, {
                      speakingStyle: event.target.value as SpeakingStyle,
                    })
                  }
                >
                  {styleOptions.map((style) => (
                    <option value={style} key={style}>
                      {style}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="field temperature-field">
              <span>Temperature: {agent.temperature.toFixed(2)}</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={agent.temperature}
                disabled={disabled}
                onChange={(event) =>
                  onAgentChange(agent.id, { temperature: Number(event.target.value) })
                }
              />
            </label>
          </article>
        ))}
      </div>
    </aside>
  )
}
