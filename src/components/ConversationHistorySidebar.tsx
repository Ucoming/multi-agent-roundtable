import { CheckCircle2, Clock3, History, Plus, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { SessionListItem, SessionStatus } from '../types'

export type SessionSaveState = 'idle' | 'saving' | 'saved' | 'error'

interface ConversationHistorySidebarProps {
  sessions: SessionListItem[]
  currentSessionId?: string
  isRunning: boolean
  saveState: SessionSaveState
  onNewDiscussion(): void
  onLoadSession(id: string): void
  onDeleteSession(id: string): void
}

export function ConversationHistorySidebar({
  sessions,
  currentSessionId,
  isRunning,
  saveState,
  onNewDiscussion,
  onLoadSession,
  onDeleteSession,
}: ConversationHistorySidebarProps) {
  const [query, setQuery] = useState('')
  const filteredSessions = useMemo(
    () => filterSessions(sessions, query),
    [query, sessions],
  )

  return (
    <aside
      className="panel conversation-sidebar"
      id="conversation-history"
      aria-label="Conversation History"
    >
      <div className="conversation-sidebar-header">
        <div>
          <p className="eyebrow">History</p>
          <h2>Conversation History / 对话历史</h2>
        </div>
        <button
          className="mini-action-button"
          type="button"
          disabled={isRunning}
          onClick={onNewDiscussion}
        >
          <Plus size={15} />
          New
        </button>
      </div>

      <div className={`save-state save-state-${saveState}`}>
        {saveState === 'saving' ? <Clock3 size={14} /> : <CheckCircle2 size={14} />}
        <span>{formatSaveState(saveState, isRunning)}</span>
      </div>

      <label className="history-search">
        <Search size={15} />
        <input
          aria-label="Search conversation history"
          placeholder="Search history"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      <div className="history-count">
        <History size={15} />
        <span>
          {filteredSessions.length} of {sessions.length} saved discussions
        </span>
      </div>

      {filteredSessions.length === 0 ? (
        <p className="session-empty">
          {sessions.length === 0
            ? 'No saved discussions yet. Start a discussion and it will auto-save here.'
            : 'No saved discussions match this search.'}
        </p>
      ) : (
        <div className="conversation-list">
          {filteredSessions.map((session) => {
            const isCurrent = session.id === currentSessionId

            return (
              <article
                className={`conversation-list-item ${isCurrent ? 'is-current' : ''}`}
                key={session.id}
              >
                <button
                  className="conversation-open-button"
                  type="button"
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
                    {isRunning ? 'Stop current run and open' : 'Open discussion'}
                  </span>
                </button>
                <button
                  className="session-delete-button"
                  type="button"
                  disabled={isRunning}
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
    </aside>
  )
}

function filterSessions(sessions: SessionListItem[], query: string) {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return sessions

  return sessions.filter((session) =>
    [
      session.title,
      session.summaryPreview,
      session.topicSpace,
      session.status,
      session.providerMode,
    ]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery),
  )
}

function formatSaveState(saveState: SessionSaveState, isRunning: boolean) {
  if (isRunning && saveState !== 'error') return 'Saving current discussion...'

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
