export type ModelLabel = 'GPT-5.5' | 'Claude' | 'DeepSeek' | 'Gemini' | 'Ollama' | 'User'

export type SpeakingStyle =
  | 'Brief'
  | 'Sharp'
  | 'Encouraging'
  | 'Rigorous'
  | 'Visionary'
  | 'Pragmatic'
  | 'Reflective'
  | 'Warm'

export type RoundtableTemplate =
  | 'relationship-reflection'
  | 'emotional-clarity'
  | 'conflict-mediation'
  | 'dating-clarity'
  | 'philosophy-reflection'
  | 'brainstorming'
  | 'debate'
  | 'peer-review'
  | 'investment-committee'

export type SpeakingOrder = 'fixed' | 'random' | 'moderator'

export type DiscussionMode =
  | 'relationship-reflection'
  | 'emotional-clarity'
  | 'conflict-mediation'
  | 'dating-clarity'
  | 'philosophy-reflection'
  | 'brainstorming'
  | 'debate'
  | 'peer-review'
  | 'investment-committee'

export type FinalOutputType = 'summary' | 'reflection' | 'decision' | 'action-list' | 'report'

export type ThemeId = 'warm-family' | 'work-mode' | 'tech-vision' | 'philosophy-study'

export type TopicSpaceId = 'relationships' | 'philosophy'

export type DiscussionSceneId = 'cozy-roundtable' | 'strategy-room' | 'future-lab'

export type ProviderMode = 'mock' | 'deepseek'

export type DiscussionLanguage = 'zh' | 'en'

export type GuidanceStage = 'story' | 'feelings-needs' | 'boundary-request' | 'summary'

export interface AgentProfile {
  id: string
  name: string
  role: string
  systemPrompt: string
  model: ModelLabel
  temperature: number
  speakingStyle: SpeakingStyle
  enabled: boolean
  avatarUrl: string
  accentColor: string
}

export interface RoundtableConfig {
  question: string
  preDiscussionContext?: string
  topicSpace: TopicSpaceId
  providerMode: ProviderMode
  discussionLanguage: DiscussionLanguage
  template: RoundtableTemplate
  roundCount: number
  speakingOrder: SpeakingOrder
  discussionMode: DiscussionMode
  finalOutputType: FinalOutputType
  theme: ThemeId
  discussionScene: DiscussionSceneId
}

export interface DiscussionMessage {
  id: string
  round: number
  agentId: string
  speakerType?: 'agent' | 'user'
  speakerName: string
  role: string
  model: ModelLabel
  speakingStyle: SpeakingStyle
  content: string
  quotedMessageId?: string
  referencedMessageIds?: string[]
  discussionBrief?: DiscussionBrief
  tokenEstimate: number
  costEstimate: number
  timestamp: string
}

export interface ModeratorSummary {
  content: string
  tokenEstimate: number
  costEstimate: number
  timestamp: string
}

export interface CostSummary {
  totalTokens: number
  totalCost: number
}

export interface DiscussionBriefPoint {
  messageId: string
  speakerName: string
  excerpt: string
}

export interface DiscussionBrief {
  tableState: string
  commonGround: string[]
  tensions: string[]
  openQuestions: string[]
  referencePoints: DiscussionBriefPoint[]
}

export interface ProviderUsage {
  promptTokens?: number
  completionTokens?: number
  totalTokens: number
  costEstimate?: number
  model?: string
  source?: string
}

export type ProviderStreamEvent =
  | { type: 'chunk'; text: string }
  | { type: 'usage'; usage: ProviderUsage }
  | { type: 'done'; usage?: ProviderUsage }

export type ProviderStreamItem = string | ProviderStreamEvent

export interface ProviderTurnInput {
  agent: AgentProfile
  config: RoundtableConfig
  round: number
  turnIndex: number
  activeAgents: AgentProfile[]
  previousMessages: DiscussionMessage[]
  discussionBrief: DiscussionBrief
}

export interface ProviderSummaryInput {
  config: RoundtableConfig
  activeAgents: AgentProfile[]
  messages: DiscussionMessage[]
  discussionBrief: DiscussionBrief
}

export interface GuidanceMessage {
  id: string
  speakerType: 'guide' | 'user'
  stage: GuidanceStage
  content: string
  timestamp: string
}

export interface NeedsGuideInput {
  config: RoundtableConfig
  stage: GuidanceStage
  messages: GuidanceMessage[]
  initialQuestion: string
}

export interface LlmProvider {
  id: string
  label: string
  streamTurn(input: ProviderTurnInput): AsyncGenerator<ProviderStreamItem>
  streamSummary?(input: ProviderSummaryInput): AsyncGenerator<ProviderStreamItem>
  streamGuidance?(input: NeedsGuideInput): AsyncGenerator<ProviderStreamItem>
}

export interface RoundtableRunResult {
  messages: DiscussionMessage[]
  summary: ModeratorSummary
  costSummary: CostSummary
}

export interface RoundtableExportState {
  config: RoundtableConfig
  agents: AgentProfile[]
  messages: DiscussionMessage[]
  summary: ModeratorSummary
  costSummary: CostSummary
  exportedAt: string
}
