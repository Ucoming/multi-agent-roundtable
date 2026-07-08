import {
  Download,
  FileDown,
  FileJson,
  FileText,
  Play,
  RefreshCw,
  Square,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { sceneLabels } from '../data/sceneCatalog'
import {
  finalOutputLabels,
  modeLabels,
  templateLabels,
} from '../data/templates'
import type {
  DiscussionSceneId,
  DiscussionMode,
  DiscussionLanguage,
  FinalOutputType,
  ProviderMode,
  RoundtableConfig,
  RoundtableTemplate,
  SpeakingOrder,
} from '../types'

interface ControlPanelProps {
  config: RoundtableConfig
  canExport: boolean
  isRunning: boolean
  onConfigChange(patch: Partial<RoundtableConfig>): void
  onProviderModeChange(providerMode: ProviderMode): void
  onTemplateChange(template: RoundtableTemplate): void
  onRun(): void
  onStop(): void
  onRegenerateAgents(): void
  onExportMarkdown(): void
  onExportJson(): void
  onExportPdf(): void
  needsGuideSlot?: ReactNode
}

const templateOptions = Object.keys(templateLabels) as RoundtableTemplate[]
const modeOptions = Object.keys(modeLabels) as DiscussionMode[]
const outputOptions = Object.keys(finalOutputLabels) as FinalOutputType[]
const sceneOptions = Object.keys(sceneLabels) as DiscussionSceneId[]
const speakingOrders: SpeakingOrder[] = ['fixed', 'random', 'moderator']
const providerOptions: ProviderMode[] = ['mock', 'deepseek']
const languageOptions: DiscussionLanguage[] = ['zh', 'en']

export function ControlPanel({
  config,
  canExport,
  isRunning,
  onConfigChange,
  onProviderModeChange,
  onTemplateChange,
  onRun,
  onStop,
  onRegenerateAgents,
  onExportMarkdown,
  onExportJson,
  onExportPdf,
  needsGuideSlot,
}: ControlPanelProps) {
  return (
    <aside className="panel control-panel" aria-label="Roundtable controls">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Controls</p>
          <h2>Session setup</h2>
        </div>
      </div>

      <label className="field">
        <span>Provider</span>
        <select
          aria-label="Provider mode"
          value={config.providerMode}
          disabled={isRunning}
          onChange={(event) => onProviderModeChange(event.target.value as ProviderMode)}
        >
          {providerOptions.map((provider) => (
            <option value={provider} key={provider}>
              {formatProvider(provider)}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Discussion language</span>
        <select
          aria-label="Discussion language"
          value={config.discussionLanguage}
          disabled={isRunning}
          onChange={(event) =>
            onConfigChange({ discussionLanguage: event.target.value as DiscussionLanguage })
          }
        >
          {languageOptions.map((language) => (
            <option value={language} key={language}>
              {formatLanguage(language)}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Visual scene</span>
        <select
          value={config.discussionScene}
          disabled={isRunning}
          onChange={(event) =>
            onConfigChange({ discussionScene: event.target.value as DiscussionSceneId })
          }
        >
          {sceneOptions.map((scene) => (
            <option value={scene} key={scene}>
              {sceneLabels[scene]}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Question</span>
        <textarea
          className="question-input"
          value={config.question}
          rows={6}
          disabled={isRunning}
          onChange={(event) => onConfigChange({ question: event.target.value })}
        />
      </label>
      {needsGuideSlot}

      <div className="control-grid">
        <label className="field">
          <span>Discussion template</span>
          <select
            value={config.template}
            disabled={isRunning}
            onChange={(event) => onTemplateChange(event.target.value as RoundtableTemplate)}
          >
            {templateOptions.map((template) => (
              <option value={template} key={template}>
                {templateLabels[template]}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Discussion mode</span>
          <select
            value={config.discussionMode}
            disabled={isRunning}
            onChange={(event) =>
              onConfigChange({ discussionMode: event.target.value as DiscussionMode })
            }
          >
            {modeOptions.map((mode) => (
              <option value={mode} key={mode}>
                {modeLabels[mode]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="field temperature-field">
        <span>Rounds: {config.roundCount}</span>
        <input
          type="range"
          min="1"
          max="10"
          step="1"
          value={config.roundCount}
          disabled={isRunning}
          onChange={(event) => onConfigChange({ roundCount: Number(event.target.value) })}
        />
      </label>

      <div className="control-grid">
        <label className="field">
          <span>Speaking order</span>
          <select
            value={config.speakingOrder}
            disabled={isRunning}
            onChange={(event) =>
              onConfigChange({ speakingOrder: event.target.value as SpeakingOrder })
            }
          >
            {speakingOrders.map((order) => (
              <option value={order} key={order}>
                {formatOrder(order)}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Final output</span>
          <select
            value={config.finalOutputType}
            disabled={isRunning}
            onChange={(event) =>
              onConfigChange({ finalOutputType: event.target.value as FinalOutputType })
            }
          >
            {outputOptions.map((output) => (
              <option value={output} key={output}>
                {finalOutputLabels[output]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="primary-actions">
        <button className="primary-button" type="button" onClick={onRun} disabled={isRunning}>
          <Play size={17} />
          Start discussion
        </button>
        <button className="secondary-button" type="button" onClick={onStop} disabled={!isRunning}>
          <Square size={16} />
          Stop
        </button>
      </div>

      <button
        className="secondary-button full-width"
        type="button"
        onClick={onRegenerateAgents}
        disabled={isRunning}
      >
        <RefreshCw size={16} />
        Regenerate agents
      </button>

      <div className="export-box">
        <div className="export-title">
          <Download size={16} />
          <span>Export</span>
        </div>
        <div className="export-actions">
          <button type="button" onClick={onExportMarkdown} disabled={!canExport}>
            <FileText size={16} />
            Markdown
          </button>
          <button type="button" onClick={onExportJson} disabled={!canExport}>
            <FileJson size={16} />
            JSON
          </button>
          <button type="button" onClick={onExportPdf} disabled={!canExport}>
            <FileDown size={16} />
            PDF
          </button>
        </div>
      </div>
    </aside>
  )
}

function formatProvider(provider: ProviderMode) {
  const labels: Record<ProviderMode, string> = {
    mock: 'Mock demo',
    deepseek: 'DeepSeek live',
  }
  return labels[provider]
}

function formatLanguage(language: DiscussionLanguage) {
  const labels: Record<DiscussionLanguage, string> = {
    zh: 'Chinese',
    en: 'English',
  }
  return labels[language]
}

function formatOrder(order: SpeakingOrder) {
  const labels: Record<SpeakingOrder, string> = {
    fixed: 'Fixed',
    random: 'Random',
    moderator: 'Moderator-called',
  }
  return labels[order]
}
