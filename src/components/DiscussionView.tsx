import { Bot, Clock3, Coins, MessageSquare, Sparkles } from 'lucide-react'
import { getThemeDefinition } from '../data/themeCatalog'
import type {
  AgentProfile,
  CostSummary,
  DiscussionMessage,
  ModeratorSummary,
  RoundtableConfig,
} from '../types'

interface DiscussionViewProps {
  agents: AgentProfile[]
  config: RoundtableConfig
  costSummary: CostSummary
  error: string
  isRunning: boolean
  messages: DiscussionMessage[]
  summary: ModeratorSummary
}

export function DiscussionView({
  agents,
  config,
  costSummary,
  error,
  isRunning,
  messages,
  summary,
}: DiscussionViewProps) {
  const theme = getThemeDefinition(config.theme)
  const agentMap = new Map(agents.map((agent) => [agent.id, agent]))
  const messageMap = new Map(messages.map((message) => [message.id, message]))

  return (
    <section className="discussion-panel" aria-label="Discussion transcript">
      <div className="discussion-hero">
        <img src={theme.previewUrl} alt="" className="theme-preview" />
        <div className="discussion-hero-copy">
          <p className="eyebrow">Live transcript</p>
          <h2>{theme.label} Roundtable</h2>
          <p>{theme.description}</p>
        </div>
      </div>

      <div className="metrics-row">
        <Metric icon={<Bot size={16} />} label="Messages" value={String(messages.length)} />
        <Metric icon={<Clock3 size={16} />} label="Tokens" value={String(costSummary.totalTokens)} />
        <Metric
          icon={<Coins size={16} />}
          label="Cost"
          value={`$${costSummary.totalCost.toFixed(4)}`}
        />
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="transcript">
        {messages.length === 0 ? (
          <div className="empty-state">
            <MessageSquare size={28} />
            <h3>Ask a question, choose a template, and start the table.</h3>
            <p>
              Mock streaming is enabled by default, so the public GitHub Pages build works without
              API keys.
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const agent = agentMap.get(message.agentId)
            const quoted = message.quotedMessageId
              ? messageMap.get(message.quotedMessageId)
              : undefined

            return (
              <article className="message-card" key={message.id}>
                <div className="message-meta">
                  <img src={agent?.avatarUrl} alt="" className="message-avatar" />
                  <div>
                    <h3>{message.speakerName}</h3>
                    <p>
                      Round {message.round} · {message.model} · {message.speakingStyle}
                    </p>
                  </div>
                </div>

                {quoted ? (
                  <blockquote>
                    <span>Referencing {quoted.speakerName}</span>
                    {quoted.content.slice(0, 180)}
                  </blockquote>
                ) : null}

                <p className="message-content">{message.content}</p>
                <div className="message-cost">
                  <span>{message.tokenEstimate} tokens</span>
                  <span>${message.costEstimate.toFixed(4)}</span>
                </div>
              </article>
            )
          })
        )}
      </div>

      <article className="summary-card">
        <div className="summary-title">
          <Sparkles size={18} />
          <h3>Moderator summary</h3>
          {isRunning ? <span className="live-pill">Streaming</span> : null}
        </div>
        <p>{summary.content || 'The moderator summary will appear after the final round.'}</p>
        {summary.tokenEstimate > 0 ? (
          <div className="message-cost">
            <span>{summary.tokenEstimate} tokens</span>
            <span>${summary.costEstimate.toFixed(4)}</span>
          </div>
        ) : null}
      </article>
    </section>
  )
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="metric">
      {icon}
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  )
}
