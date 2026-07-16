import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Bot, Clock3, Coins, MessageSquare, Send, Sparkles } from 'lucide-react'
import { MarkdownContent } from './MarkdownContent'
import { RoundtableScene } from './RoundtableScene'
import { formatCost } from '../lib/costs'
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
  onUserInterjection(content: string): void
  summary: ModeratorSummary
}

export function DiscussionView({
  agents,
  config,
  costSummary,
  error,
  isRunning,
  messages,
  onUserInterjection,
  summary,
}: DiscussionViewProps) {
  const [interjection, setInterjection] = useState('')
  const transcriptRef = useRef<HTMLDivElement>(null)
  const followLatestRef = useRef(true)
  const agentMap = new Map(agents.map((agent) => [agent.id, agent]))
  const messageMap = new Map(messages.map((message) => [message.id, message]))
  const canSubmitInterjection = isRunning && interjection.trim().length > 0

  useEffect(() => {
    const transcript = transcriptRef.current
    if (!transcript || !followLatestRef.current) return
    transcript.scrollTo?.({ top: transcript.scrollHeight, behavior: 'smooth' })
  }, [messages])

  function submitInterjection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmitInterjection) return

    onUserInterjection(interjection)
    setInterjection('')
  }

  return (
    <section
      className="discussion-panel"
      aria-label="Discussion transcript"
      aria-busy={isRunning}
    >
      <RoundtableScene agents={agents} config={config} isRunning={isRunning} messages={messages} />

      <div className="metrics-row">
        <Metric icon={<Bot size={16} />} label="Messages" value={String(messages.length)} />
        <Metric icon={<Clock3 size={16} />} label="Tokens" value={String(costSummary.totalTokens)} />
        <Metric
          icon={<Coins size={16} />}
          label="Cost"
          value={`$${formatCost(costSummary.totalCost)}`}
        />
      </div>

      {error ? (
        <div className="error-banner" role="alert">
          {error}
        </div>
      ) : null}

      <form className="interjection-box" onSubmit={submitInterjection}>
        <label className="field">
          <span>Join the discussion</span>
          <textarea
            value={interjection}
            rows={3}
            disabled={!isRunning}
            placeholder={
              isRunning
                ? 'Add new context, correct an assumption, or ask the agents to consider another angle.'
                : 'Start a discussion to add live context.'
            }
            onChange={(event) => setInterjection(event.target.value)}
          />
        </label>
        <button type="submit" disabled={!canSubmitInterjection}>
          <Send size={16} />
          Add to table
        </button>
      </form>

      <div
        className="transcript"
        ref={transcriptRef}
        onScroll={(event) => {
          const element = event.currentTarget
          followLatestRef.current =
            element.scrollHeight - element.scrollTop - element.clientHeight < 120
        }}
      >
        {messages.length === 0 ? (
          <div className="empty-state">
            <MessageSquare size={28} />
            <h3>Ask a question, choose a template, and start the table.</h3>
            <p>
              {config.providerMode === 'deepseek'
                ? 'DeepSeek live mode uses the local Express API. Add DEEPSEEK_API_KEY to .env, then run npm run dev:all.'
                : 'Mock streaming is enabled by default, so the public static build works without API keys.'}
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const agent = agentMap.get(message.agentId)
            const referenceIds = message.referencedMessageIds?.length
              ? message.referencedMessageIds
              : message.quotedMessageId
                ? [message.quotedMessageId]
                : []
            const referencedMessages = referenceIds
              .map((referenceId) => messageMap.get(referenceId))
              .filter((reference): reference is DiscussionMessage => Boolean(reference))
            const isUserMessage = message.speakerType === 'user'

            return (
              <article
                className={`message-card ${isUserMessage ? 'user-message-card' : ''}`}
                key={message.id}
              >
                <div className="message-meta">
                  {isUserMessage ? (
                    <div className="message-avatar user-avatar">You</div>
                  ) : (
                    <img src={agent?.avatarUrl} alt="" className="message-avatar" />
                  )}
                  <div>
                    <h3>{message.speakerName}</h3>
                    <p>
                      Round {message.round} | {message.model} | {message.speakingStyle}
                    </p>
                  </div>
                </div>

                {referencedMessages.length ? (
                  <div className="reference-stack" aria-label="Table references">
                    <div className="reference-stack-title">Responding to table</div>
                    {referencedMessages.map((reference) => (
                      <blockquote className="reference-item" key={reference.id}>
                        <span>{reference.speakerName}</span>
                        {compactReference(reference.content)}
                      </blockquote>
                    ))}
                  </div>
                ) : null}

                <MarkdownContent className="message-content" content={message.content} />
                <div className="message-cost">
                  <span>{message.tokenEstimate} tokens</span>
                  <span>${formatCost(message.costEstimate)}</span>
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
        {summary.content ? (
          <MarkdownContent content={summary.content} />
        ) : (
          <p>The moderator summary will appear after the final round.</p>
        )}
        {summary.tokenEstimate > 0 ? (
          <div className="message-cost">
            <span>{summary.tokenEstimate} tokens</span>
            <span>${formatCost(summary.costEstimate)}</span>
          </div>
        ) : null}
      </article>
    </section>
  )
}

function compactReference(content: string) {
  const compact = content.replace(/\s+/g, ' ').trim()
  return compact.length > 180 ? `${compact.slice(0, 177)}...` : compact
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
