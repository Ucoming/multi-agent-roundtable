import { CheckCircle2, Clock3, History, Plus, Trash2 } from 'lucide-react'
import type { SessionListItem, SessionStatus } from '../types'

export type SessionSaveState = 'idle' | 'saving' | 'saved' | 'error'

interface SessionHistoryPanelProps {
  sessions: SessionListItem[]
  currentSessionId?: string
  disabled: boolean
  saveState: SessionSaveState
  onNewDiscussion(): void
  onLoadSession(id: string): void
  onDeleteSession(id: string): void
}

export function SessionHistoryPanel({
  sessions,
  currentSessionId,
  disabled,
  saveState,
  onNewDiscussion,
  onLoadSession,
  onDeleteSession,
}: SessionHistoryPanelProps) {
  return (
    <section className="session-history-card" id="conversation-history" aria-label="Conversation history">
      <div className="session-history-top">
        <div>
          <p className="eyebrow">History</p>
          <h3>Conversation History / 对话历史</h3>
        </div>
        <button
          className="mini-action-button"
          type="button"
          disabled={disabled}
          onClick={onNewDiscussion}
        >
          <Plus size={15} />
          New
        </button>
      </div>

      <div className={`save-state save-state-${saveState}`}>
        {saveState === 'saving' ? <Clock3 size={14} /> : <CheckCircle2 size={14} />}
        <span>{formatSaveState(saveState)}</span>
      </div>

      <details className="session-history-details" open>
        <summary>
          <History size={15} />
          <span>{sessions.length} saved discussions</span>
        </summary>

        {sessions.length === 0 ? (
          <p className="session-empty">
            No saved discussions yet. Start a discussion and it will auto-save here.
          </p>
        ) : (
          <div className="session-list">
            {sessions.map((session) => {
              const isCurrent = session.id === currentSessionId

              return (
                <article
                  className={`session-list-item ${isCurrent ? 'is-current' : ''}`}
                  key={session.id}
                >
                  <button
                    className="session-load-button"
                    type="button"
                    disabled={disabled}
                    aria-label={`Open ${session.title}`}
                    onClick={() => onLoadSession(session.id)}
                  >
                    <span className="session-title-row">
                      <span className="session-title">{session.title}</span>
                      {isCurrent ? <span className="session-current-pill">Current</span> : null}
                    </span>
                    <span className="session-meta">
                      {formatTopic(session.topicSpace)} | {formatStatus(session.status)} |{' '}
                      {session.messageCount} messages
                    </span>
                    <span className="session-updated">{formatUpdatedAt(session.updatedAt)}</span>
                    {session.summaryPreview ? (
                      <span className="session-preview">{session.summaryPreview}</span>
                    ) : null}
                    <span className="session-open-label">
                      {isCurrent ? 'Click to restore saved state' : 'Open discussion'}
                    </span>
                  </button>
                  <button
                    className="session-delete-button"
                    type="button"
                    disabled={disabled}
                    aria-label={`Delete ${session.title}`}
                    onClick={() => onDeleteSession(session.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                </article>
              )
            })}
          </div>
        )}
      </details>
    </section>
  )
}

function formatSaveState(saveState: SessionSaveState) {
  const labels: Record<SessionSaveState, string> = {
    idle: 'No active saved session',
    saving: 'Saving...',
    saved: 'Auto-saved',
    error: 'Save failed',
  }
  return labels[saveState]
}

function formatStatus(status: SessionStatus) {
  const labels: Record<SessionStatus, string> = {
    draft: 'Draft',
    running: 'Running',
    completed: 'Completed',
    stopped: 'Stopped',
    error: 'Error',
  }
  return labels[status]
}

function formatTopic(topicSpace: SessionListItem['topicSpace']) {
  return topicSpace === 'philosophy' ? 'Philosophy' : 'Relationships'
}

function formatUpdatedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
