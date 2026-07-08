import type {
  DiscussionMode,
  FinalOutputType,
  RoundtableTemplate,
  ThemeId,
  TopicSpaceId,
} from '../types'

export interface TopicSpaceDefinition {
  id: TopicSpaceId
  label: string
  description: string
  headline: string
  theme: ThemeId
  template: RoundtableTemplate
  discussionMode: DiscussionMode
  finalOutputType: FinalOutputType
  defaultQuestion: string
  presetGroup: 'relationship' | 'philosophy'
}

export const topicCatalog: TopicSpaceDefinition[] = [
  {
    id: 'relationships',
    label: 'Relationships & Feelings',
    description: 'Warm reflection for ambiguous emotional and interpersonal questions.',
    headline: 'Reflect on relationship questions with multiple caring perspectives.',
    theme: 'warm-family',
    template: 'relationship-reflection',
    discussionMode: 'relationship-reflection',
    finalOutputType: 'reflection',
    defaultQuestion:
      'I feel stuck in an important relationship situation with no obvious right answer. Help me think through what I feel, what I need, and what I might say or do next.',
    presetGroup: 'relationship',
  },
  {
    id: 'philosophy',
    label: 'Philosophy & Thinking',
    description: 'A study-table for values, contradictions, meaning, ethics, and practical judgment.',
    headline: 'Think through hard questions with contrasting philosophical lenses.',
    theme: 'philosophy-study',
    template: 'philosophy-reflection',
    discussionMode: 'philosophy-reflection',
    finalOutputType: 'reflection',
    defaultQuestion:
      'I am wrestling with a difficult question about values, practice, freedom, meaning, or social reality. Help me examine the contradictions, assumptions, and possible ways to act.',
    presetGroup: 'philosophy',
  },
]

export function getTopicDefinition(id: TopicSpaceId) {
  return topicCatalog.find((topic) => topic.id === id) ?? topicCatalog[0]
}
