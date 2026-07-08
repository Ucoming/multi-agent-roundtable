import type { GuidanceMessage, GuidanceStage } from '../types'

export const guidanceStages: GuidanceStage[] = ['story', 'feelings-needs', 'boundary-request']

export function getNextGuidanceStage(stage: GuidanceStage): GuidanceStage {
  if (stage === 'story') return 'feelings-needs'
  if (stage === 'feelings-needs') return 'boundary-request'
  return 'summary'
}

export function getGuidanceStageLabel(stage: GuidanceStage) {
  const labels: Record<GuidanceStage, string> = {
    story: 'Story',
    'feelings-needs': 'Feelings and needs',
    'boundary-request': 'Boundary or request',
    summary: 'Needs summary',
  }
  return labels[stage]
}

export function getGuidanceStageIndex(stage: GuidanceStage) {
  if (stage === 'summary') return guidanceStages.length
  return guidanceStages.indexOf(stage) + 1
}

export function createGuidanceMessage(
  speakerType: GuidanceMessage['speakerType'],
  stage: GuidanceStage,
  content: string,
): GuidanceMessage {
  return {
    id: `guidance-${speakerType}-${stage}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    speakerType,
    stage,
    content,
    timestamp: new Date().toISOString(),
  }
}

export function extractRoundtableQuestion(summary: string, fallback: string) {
  const patterns = [
    /\*\*\s*圆桌问题\s*[：:]\s*\*\*\s*(.+)/i,
    /\*\*\s*Roundtable question\s*:\s*\*\*\s*(.+)/i,
    /圆桌问题\s*[：:]\s*(.+)/i,
    /Roundtable question\s*:\s*(.+)/i,
  ]

  for (const pattern of patterns) {
    const match = summary.match(pattern)
    const question = match?.[1]?.trim()
    if (question) return cleanupQuestion(question)
  }

  const firstUsefulLine = summary
    .split('\n')
    .map((line) => cleanupQuestion(line))
    .find((line) => line && !line.startsWith('#'))

  return firstUsefulLine || fallback.trim()
}

function cleanupQuestion(value: string) {
  return value
    .replace(/^[-*>\s]+/, '')
    .replace(/\*\*/g, '')
    .trim()
}
