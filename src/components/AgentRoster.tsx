import { Minus, Plus, RefreshCw, SlidersHorizontal, Trash2 } from 'lucide-react'
import { getAgentPresetsForTopic, type AgentPresetId } from '../data/templates'
import type { AgentProfile, ModelLabel, SpeakingStyle, TopicSpaceId } from '../types'

const modelOptions: ModelLabel[] = ['GPT-5.5', 'Claude', 'DeepSeek', 'Gemini', 'Ollama']
const styleOptions: SpeakingStyle[] = [
  'Brief',
  'Sharp',
  'Encouraging',
  'Rigorous',
  'Visionary',
  'Pragmatic',
  'Reflective',
  'Warm',
]

interface AgentRosterProps {
  agents: AgentProfile[]
  disabled: boolean
  maxAgents: number
  minAgents: number
  topicSpace: TopicSpaceId
  onAddAgent(): void
  onAddPresetAgent(presetId: AgentPresetId): void
  onAgentChange(id: string, patch: Partial<AgentProfile>): void
  onRemoveAgent(id: string): void
  onRemoveLastAgent(): void
  onResetAgents(): void
}

export function AgentRoster({
  agents,
  disabled,
  maxAgents,
  minAgents,
  topicSpace,
  onAddAgent,
  onAddPresetAgent,
  onAgentChange,
  onRemoveAgent,
  onRemoveLastAgent,
  onResetAgents,
}: AgentRosterProps) {
  const enabledCount = agents.filter((agent) => agent.enabled).length
  const canAdd = !disabled && agents.length < maxAgents
  const canRemove = !disabled && agents.length > minAgents
  const presetOptions = getAgentPresetsForTopic(topicSpace)
  const presetPlaceholder =
    topicSpace === 'philosophy'
      ? 'Choose a philosophy agent...'
      : 'Choose a relationship agent...'

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
        <div className="agent-count-label">
          <SlidersHorizontal size={16} />
          <span>
            {agents.length} total | {enabledCount} enabled
          </span>
        </div>
        <div className="agent-count-actions" aria-label="Agent count controls">
          <button
            type="button"
            onClick={onRemoveLastAgent}
            disabled={!canRemove}
            title="Remove the last agent"
            aria-label="Remove last agent"
          >
            <Minus size={15} />
          </button>
          <button
            type="button"
            onClick={onAddAgent}
            disabled={!canAdd}
            title="Add a new agent"
            aria-label="Add agent"
          >
            <Plus size={15} />
          </button>
        </div>
      </div>

      <label className="field preset-adder">
        <span>Add preset perspective</span>
        <select
          value=""
          disabled={!canAdd}
          aria-label="Add preset agent"
          onChange={(event) => {
            const presetId = event.target.value as AgentPresetId
            if (presetId) onAddPresetAgent(presetId)
          }}
        >
          <option value="">{presetPlaceholder}</option>
          {presetOptions.map((preset) => (
            <option value={preset.id} key={preset.id}>
              {preset.shortLabel}
            </option>
          ))}
        </select>
      </label>

      <div className="agent-list">
        {agents.map((agent) => (
          <article className="agent-card" key={agent.id}>
            <div className="agent-card-top">
              <img src={agent.avatarUrl} alt="" className="agent-avatar" />
              <div className="agent-card-actions">
                <label className="switch-label">
                  <input
                    type="checkbox"
                    checked={agent.enabled}
                    disabled={disabled}
                    onChange={(event) =>
                      onAgentChange(agent.id, { enabled: event.target.checked })
                    }
                  />
                  <span>Enabled</span>
                </label>
                <button
                  className="mini-icon-button"
                  type="button"
                  onClick={() => onRemoveAgent(agent.id)}
                  disabled={!canRemove}
                  title={`Remove ${agent.name}`}
                  aria-label={`Remove ${agent.name}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
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
