import { useState, type FormEvent } from 'react'
import { CheckCircle2, MessageCircleQuestion, RotateCcw, Send, Wand2 } from 'lucide-react'
import { MarkdownContent } from './MarkdownContent'
import {
  createGuidanceMessage,
  extractRoundtableQuestion,
  getGuidanceStageIndex,
  getGuidanceStageLabel,
  getNextGuidanceStage,
} from '../lib/needsGuide'
import type {
  GuidanceMessage,
  GuidanceStage,
  LlmProvider,
  ProviderStreamItem,
  RoundtableConfig,
} from '../types'

interface NeedsGuidePanelProps {
  config: RoundtableConfig
  disabled: boolean
  provider: LlmProvider
  onApply(question: string, context: string): void
  onError(error: string): void
}

export function NeedsGuidePanel({
  config,
  disabled,
  provider,
  onApply,
  onError,
}: NeedsGuidePanelProps) {
  const [expanded, setExpanded] = useState(false)
  const [messages, setMessages] = useState<GuidanceMessage[]>([])
  const [currentStage, setCurrentStage] = useState<GuidanceStage>('story')
  const [draft, setDraft] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [localError, setLocalError] = useState('')
  const summaryMessage = [...messages]
    .reverse()
    .find((message) => message.speakerType === 'guide' && message.stage === 'summary')
  const canSubmit = Boolean(
    expanded &&
      !disabled &&
      !isStreaming &&
      !summaryMessage &&
      currentStage !== 'summary' &&
      draft.trim(),
  )
  const canGenerateSummary = Boolean(
    expanded &&
      !disabled &&
      !isStreaming &&
      !summaryMessage &&
      currentStage === 'summary' &&
      messages.some(
        (message) => message.speakerType === 'user' && message.stage === 'boundary-request',
      ),
  )

  function toggleExpanded() {
    const nextExpanded = !expanded
    setExpanded(nextExpanded)
    if (nextExpanded && messages.length === 0 && !isStreaming) {
      void runGuideTurn('story', [])
    }
  }

  async function submitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return

    const userMessage = createGuidanceMessage('user', currentStage, draft.trim())
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setDraft('')

    const nextStage = getNextGuidanceStage(currentStage)
    setCurrentStage(nextStage)

    if (nextStage !== 'summary') {
      await runGuideTurn(nextStage, nextMessages)
    }
  }

  async function generateSummary() {
    if (!canGenerateSummary) return
    await runGuideTurn('summary', messages)
  }

  function useForRoundtable() {
    if (!summaryMessage) return
    const question = extractRoundtableQuestion(summaryMessage.content, config.question)
    onApply(question, summaryMessage.content)
  }

  function resetGuide() {
    setMessages([])
    setCurrentStage('story')
    setDraft('')
    setLocalError('')
  }

  async function runGuideTurn(stage: GuidanceStage, transcript: GuidanceMessage[]) {
    if (!provider.streamGuidance) {
      const message = 'The selected provider does not support needs guidance.'
      setLocalError(message)
      onError(message)
      return
    }

    const guideMessage = createGuidanceMessage('guide', stage, '')
    setMessages([...transcript, guideMessage])
    setIsStreaming(true)
    setLocalError('')

    try {
      let nextGuideMessage = guideMessage
      for await (const item of provider.streamGuidance({
        config,
        stage,
        messages: transcript,
        initialQuestion: config.question,
      })) {
        const event = normalizeProviderItem(item)
        if (event.type !== 'chunk') continue

        nextGuideMessage = {
          ...nextGuideMessage,
          content: nextGuideMessage.content + event.text,
        }
        setMessages((current) =>
          current.map((message) =>
            message.id === nextGuideMessage.id ? nextGuideMessage : message,
          ),
        )
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Needs guide failed to respond.'
      setLocalError(message)
      onError(message)
      setMessages((current) =>
        current.filter((message) => message.id !== guideMessage.id || message.content.trim()),
      )
    } finally {
      setIsStreaming(false)
    }
  }

  return (
    <div className="needs-guide-card">
      <button
        className="secondary-button full-width"
        type="button"
        aria-expanded={expanded}
        onClick={toggleExpanded}
        disabled={disabled || isStreaming}
      >
        <MessageCircleQuestion size={16} />
        Guide me first
      </button>

      {expanded ? (
        <div className="needs-guide-body">
          <div className="needs-guide-progress">
            <span>
              Stage {Math.min(getGuidanceStageIndex(currentStage), 3)} / 3
            </span>
            <strong>{getGuidanceStageLabel(currentStage)}</strong>
          </div>

          <div className="needs-guide-thread" aria-label="Needs guide conversation">
            {messages.map((message) => (
              <article className={`needs-guide-message ${message.speakerType}`} key={message.id}>
                <span>{message.speakerType === 'guide' ? 'Guide' : 'You'}</span>
                <MarkdownContent content={message.content || '...'} />
              </article>
            ))}
          </div>

          {localError ? <div className="mini-error">{localError}</div> : null}

          {!summaryMessage ? (
            <form className="needs-guide-input" onSubmit={submitAnswer}>
              <textarea
                value={draft}
                rows={3}
                disabled={disabled || isStreaming || currentStage === 'summary'}
                placeholder="Answer the guide in your own words."
                onChange={(event) => setDraft(event.target.value)}
              />
              <button type="submit" disabled={!canSubmit}>
                <Send size={15} />
                Send
              </button>
            </form>
          ) : null}

          <div className="needs-guide-actions">
            <button type="button" onClick={generateSummary} disabled={!canGenerateSummary}>
              <Wand2 size={15} />
              Generate needs summary
            </button>
            <button type="button" onClick={useForRoundtable} disabled={!summaryMessage || disabled}>
              <CheckCircle2 size={15} />
              Use for roundtable
            </button>
            <button type="button" onClick={resetGuide} disabled={isStreaming}>
              <RotateCcw size={15} />
              Reset
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function normalizeProviderItem(item: ProviderStreamItem) {
  return typeof item === 'string' ? { type: 'chunk' as const, text: item } : item
}
