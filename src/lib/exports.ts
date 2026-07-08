import type { RoundtableExportState } from '../types'

export function createMarkdownExport(state: RoundtableExportState) {
  const enabledAgents = state.agents.filter((agent) => agent.enabled)
  const messageMap = new Map(state.messages.map((message) => [message.id, message]))
  const agentRows = enabledAgents
    .map(
      (agent) =>
        `| ${agent.name} | ${agent.role} | ${agent.model} | ${agent.temperature} | ${agent.speakingStyle} |`,
    )
    .join('\n')

  const transcript = state.messages
    .map((message) => {
      const referenceIds = message.referencedMessageIds?.length
        ? message.referencedMessageIds
        : message.quotedMessageId
          ? [message.quotedMessageId]
          : []
      const referenceLine = referenceIds.length
        ? `\n> Responding to table: ${referenceIds
            .map((referenceId) => messageMap.get(referenceId))
            .filter(Boolean)
            .map((reference) => `${reference?.speakerName}: ${compactExportReference(reference?.content ?? '')}`)
            .join(' | ')}\n`
        : ''
      const label = message.speakerType === 'user' ? 'User input' : `Round ${message.round}`
      return `### ${label}: ${message.speakerName}\n${referenceLine}\n${message.content}\n\nTokens: ${message.tokenEstimate} | Cost: $${message.costEstimate.toFixed(4)}`
    })
    .join('\n\n')

  return `# Multi-Agent Roundtable Export

Exported: ${state.exportedAt}

## Question

${state.config.question}

## Configuration

- Template: ${state.config.template}
- Provider: ${state.config.providerMode}
- Discussion language: ${state.config.discussionLanguage}
- Discussion mode: ${state.config.discussionMode}
- Rounds: ${state.config.roundCount}
- Speaking order: ${state.config.speakingOrder}
- Final output: ${state.config.finalOutputType}
- Theme: ${state.config.theme}
- Visual scene: ${state.config.discussionScene}

## Agents

| Name | Role | Model | Temperature | Style |
| --- | --- | --- | --- | --- |
${agentRows}

## Transcript

${transcript || 'No transcript generated yet.'}

## Moderator Summary

${state.summary.content || 'No moderator summary generated yet.'}

## Cost Summary

- Total tokens: ${state.costSummary.totalTokens}
- Estimated cost: $${state.costSummary.totalCost.toFixed(4)}
`
}

export function createJsonExport(state: RoundtableExportState) {
  return JSON.stringify(state, null, 2)
}

export function downloadMarkdown(state: RoundtableExportState) {
  downloadTextFile('roundtable-export.md', createMarkdownExport(state), 'text/markdown')
}

export function downloadJson(state: RoundtableExportState) {
  downloadTextFile('roundtable-export.json', createJsonExport(state), 'application/json')
}

export async function downloadPdf(state: RoundtableExportState) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const margin = 48
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const usableWidth = pageWidth - margin * 2
  let y = margin

  const write = (text: string, size = 10, gap = 14) => {
    doc.setFontSize(size)
    const lines = doc.splitTextToSize(text, usableWidth) as string[]
    for (const line of lines) {
      if (y > pageHeight - margin) {
        doc.addPage()
        y = margin
      }
      doc.text(line, margin, y)
      y += gap
    }
    y += 4
  }

  write('Multi-Agent Roundtable Export', 18, 22)
  write(`Question: ${state.config.question}`, 11, 15)
  write(
    `Configuration: ${state.config.template}, ${state.config.roundCount} rounds, ${state.config.speakingOrder} order, ${state.config.finalOutputType} output.`,
  )
  write(`Cost: ${state.costSummary.totalTokens} tokens, $${state.costSummary.totalCost.toFixed(4)} estimated.`)
  write('Moderator Summary', 14, 18)
  write(state.summary.content || 'No moderator summary generated yet.')
  write('Transcript', 14, 18)

  for (const message of state.messages) {
    const label = message.speakerType === 'user' ? 'User input' : `Round ${message.round}`
    write(`${label} - ${message.speakerName} (${message.model})`, 12, 16)
    write(message.content)
  }

  doc.save('roundtable-export.pdf')
}

function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function compactExportReference(content: string) {
  const compact = content.replace(/\s+/g, ' ').trim()
  return compact.length > 120 ? `${compact.slice(0, 117)}...` : compact
}
