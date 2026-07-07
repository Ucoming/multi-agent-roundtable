export type ModelLabel = 'GPT-5.5' | 'Claude' | 'DeepSeek' | 'Gemini' | 'Ollama'

export type SpeakingStyle =
  | 'Brief'
  | 'Sharp'
  | 'Encouraging'
  | 'Rigorous'
  | 'Visionary'
  | 'Pragmatic'

export type RoundtableTemplate =
  | 'brainstorming'
  | 'debate'
  | 'peer-review'
  | 'investment-committee'

export type SpeakingOrder = 'fixed' | 'random' | 'moderator'

export type DiscussionMode =
  | 'brainstorming'
  | 'debate'
  | 'peer-review'
  | 'investment-committee'

export type FinalOutputType = 'summary' | 'decision' | 'action-list' | 'report'

export type ThemeId = 'warm-family' | 'work-mode' | 'tech-vision'

export type DiscussionSceneId = 'cozy-roundtable' | 'strategy-room' | 'future-lab'

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
  speakerName: string
  role: string
  model: ModelLabel
  speakingStyle: SpeakingStyle
  content: string
  quotedMessageId?: string
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

export interface ProviderTurnInput {
  agent: AgentProfile
  config: RoundtableConfig
  round: number
  turnIndex: number
  activeAgents: AgentProfile[]
  previousMessages: DiscussionMessage[]
}

export interface ProviderSummaryInput {
  config: RoundtableConfig
  activeAgents: AgentProfile[]
  messages: DiscussionMessage[]
}

export interface LlmProvider {
  id: string
  label: string
  streamTurn(input: ProviderTurnInput): AsyncGenerator<string>
  streamSummary?(input: ProviderSummaryInput): AsyncGenerator<string>
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
