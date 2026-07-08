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
  | 'brainstorming'
  | 'debate'
  | 'peer-review'
  | 'investment-committee'

export type SpeakingOrder = 'fixed' | 'random' | 'moderator'

export type DiscussionMode =
  | 'relationship-reflection'
  | 'emotional-clarity'
  | 'conflict-mediation'
  | 'brainstorming'
  | 'debate'
  | 'peer-review'
  | 'investment-committee'

export type FinalOutputType = 'summary' | 'reflection' | 'decision' | 'action-list' | 'report'

export type ThemeId = 'warm-family' | 'work-mode' | 'tech-vision'

export type DiscussionSceneId = 'cozy-roundtable' | 'strategy-room' | 'future-lab'

export type ProviderMode = 'mock' | 'deepseek'

export type DiscussionLanguage = 'zh' | 'en'

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
}

export interface ProviderSummaryInput {
  config: RoundtableConfig
  activeAgents: AgentProfile[]
  messages: DiscussionMessage[]
}

export interface LlmProvider {
  id: string
  label: string
  streamTurn(input: ProviderTurnInput): AsyncGenerator<ProviderStreamItem>
  streamSummary?(input: ProviderSummaryInput): AsyncGenerator<ProviderStreamItem>
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
