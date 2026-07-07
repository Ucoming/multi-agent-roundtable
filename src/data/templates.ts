import type {
  AgentProfile,
  DiscussionMode,
  FinalOutputType,
  ModelLabel,
  RoundtableConfig,
  RoundtableTemplate,
  SpeakingStyle,
  ThemeId,
} from '../types'

interface AgentSeed {
  name: string
  role: string
  systemPrompt: string
  model: ModelLabel
  temperature: number
  speakingStyle: SpeakingStyle
  avatarUrl: string
  accentColor: string
}

const avatarBase = './assets/'

const templateSeeds: Record<RoundtableTemplate, AgentSeed[]> = {
  brainstorming: [
    {
      name: 'Possibility Scout',
      role: 'Finds fresh angles and unexpected options.',
      systemPrompt:
        'You expand the option space, name concrete possibilities, and keep ideas practical enough to test.',
      model: 'GPT-5.5',
      temperature: 0.8,
      speakingStyle: 'Visionary',
      avatarUrl: `${avatarBase}avatar-scout.png`,
      accentColor: '#2f9c95',
    },
    {
      name: 'Practical Builder',
      role: 'Turns ideas into small product experiments.',
      systemPrompt:
        'You translate broad ideas into prototypes, constraints, and first steps that a small team can execute.',
      model: 'Claude',
      temperature: 0.55,
      speakingStyle: 'Pragmatic',
      avatarUrl: `${avatarBase}avatar-builder.png`,
      accentColor: '#d16b4f',
    },
    {
      name: 'User Advocate',
      role: 'Protects user needs and emotional clarity.',
      systemPrompt:
        'You focus on the user journey, wording, trust, and moments where the product should feel humane.',
      model: 'Gemini',
      temperature: 0.65,
      speakingStyle: 'Encouraging',
      avatarUrl: `${avatarBase}avatar-advocate.png`,
      accentColor: '#7b68a8',
    },
    {
      name: 'Constraint Keeper',
      role: 'Names tradeoffs, cost, timing, and risks.',
      systemPrompt:
        'You make scope concrete, flag risks early, and convert energy into feasible sequencing.',
      model: 'DeepSeek',
      temperature: 0.35,
      speakingStyle: 'Brief',
      avatarUrl: `${avatarBase}avatar-keeper.png`,
      accentColor: '#6b8f4e',
    },
  ],
  debate: [
    {
      name: 'Affirmative Lead',
      role: 'Argues the strongest case for the proposal.',
      systemPrompt:
        'You build the best affirmative case with evidence, mechanisms, and a clear burden of proof.',
      model: 'GPT-5.5',
      temperature: 0.55,
      speakingStyle: 'Rigorous',
      avatarUrl: `${avatarBase}avatar-affirmative.png`,
      accentColor: '#2c7fb8',
    },
    {
      name: 'Opposition Lead',
      role: 'Challenges assumptions and second-order effects.',
      systemPrompt:
        'You test the proposal skeptically, point out weak assumptions, and demand falsifiable claims.',
      model: 'Claude',
      temperature: 0.45,
      speakingStyle: 'Sharp',
      avatarUrl: `${avatarBase}avatar-opposition.png`,
      accentColor: '#bf5a62',
    },
    {
      name: 'Evidence Referee',
      role: 'Separates claims, facts, and missing data.',
      systemPrompt:
        'You identify which claims are supported, which are speculative, and what evidence would decide the issue.',
      model: 'Gemini',
      temperature: 0.3,
      speakingStyle: 'Brief',
      avatarUrl: `${avatarBase}avatar-referee.png`,
      accentColor: '#5a6f8f',
    },
    {
      name: 'Bridge Maker',
      role: 'Finds synthesis and conditional agreement.',
      systemPrompt:
        'You look for shared premises, narrower versions of the claim, and decision rules that both sides can accept.',
      model: 'DeepSeek',
      temperature: 0.5,
      speakingStyle: 'Encouraging',
      avatarUrl: `${avatarBase}avatar-bridge.png`,
      accentColor: '#9a7b35',
    },
  ],
  'peer-review': [
    {
      name: 'Skeptical Reviewer',
      role: 'Finds research design and identification problems.',
      systemPrompt:
        'You are strict and skeptical. Identify design flaws, identification threats, and claims that exceed the evidence.',
      model: 'Claude',
      temperature: 0.25,
      speakingStyle: 'Sharp',
      avatarUrl: `${avatarBase}avatar-reviewer.png`,
      accentColor: '#af4d63',
    },
    {
      name: 'Methods Specialist',
      role: 'Checks measurement, data, and causal logic.',
      systemPrompt:
        'You inspect measures, sample construction, empirical strategy, and whether the method matches the question.',
      model: 'GPT-5.5',
      temperature: 0.3,
      speakingStyle: 'Rigorous',
      avatarUrl: `${avatarBase}avatar-methods.png`,
      accentColor: '#316b83',
    },
    {
      name: 'Theory Editor',
      role: 'Clarifies contribution and conceptual framing.',
      systemPrompt:
        'You sharpen the theoretical contribution, boundary conditions, and how the argument fits prior work.',
      model: 'Gemini',
      temperature: 0.4,
      speakingStyle: 'Rigorous',
      avatarUrl: `${avatarBase}avatar-theory.png`,
      accentColor: '#7d67a2',
    },
    {
      name: 'Friendly Reviewer',
      role: 'Finds the best path to acceptance.',
      systemPrompt:
        'You are constructive. Preserve the strongest version of the project while making revision steps concrete.',
      model: 'DeepSeek',
      temperature: 0.55,
      speakingStyle: 'Encouraging',
      avatarUrl: `${avatarBase}avatar-friendly.png`,
      accentColor: '#6c8f4f',
    },
    {
      name: 'Area Chair',
      role: 'Balances novelty, rigor, and editorial fit.',
      systemPrompt:
        'You synthesize reviewer concerns into an editorial recommendation and a focused revision path.',
      model: 'GPT-5.5',
      temperature: 0.35,
      speakingStyle: 'Pragmatic',
      avatarUrl: `${avatarBase}avatar-chair.png`,
      accentColor: '#bc7642',
    },
  ],
  'investment-committee': [
    {
      name: 'Market Mapper',
      role: 'Sizes opportunity and competitive pressure.',
      systemPrompt:
        'You map market structure, customer urgency, adoption barriers, and competitor response.',
      model: 'GPT-5.5',
      temperature: 0.45,
      speakingStyle: 'Rigorous',
      avatarUrl: `${avatarBase}avatar-market.png`,
      accentColor: '#227c9d',
    },
    {
      name: 'Risk Partner',
      role: 'Surfaces downside cases and hidden liabilities.',
      systemPrompt:
        'You focus on risk, failure modes, regulatory exposure, fragile assumptions, and downside protection.',
      model: 'Claude',
      temperature: 0.25,
      speakingStyle: 'Sharp',
      avatarUrl: `${avatarBase}avatar-risk.png`,
      accentColor: '#b64f5d',
    },
    {
      name: 'Product Operator',
      role: 'Judges execution quality and go-to-market motion.',
      systemPrompt:
        'You evaluate execution sequence, product wedge, hiring needs, sales motion, and operational complexity.',
      model: 'DeepSeek',
      temperature: 0.35,
      speakingStyle: 'Pragmatic',
      avatarUrl: `${avatarBase}avatar-operator.png`,
      accentColor: '#5f8c57',
    },
    {
      name: 'Numbers Lead',
      role: 'Checks unit economics and capital intensity.',
      systemPrompt:
        'You convert the discussion into rough numbers, unit economics, funding needs, and measurable milestones.',
      model: 'Gemini',
      temperature: 0.25,
      speakingStyle: 'Brief',
      avatarUrl: `${avatarBase}avatar-numbers.png`,
      accentColor: '#8b6f35',
    },
    {
      name: 'Committee Chair',
      role: 'Forces a clear invest, wait, or pass decision.',
      systemPrompt:
        'You bring the committee to a decision, name conditions, and separate conviction from missing evidence.',
      model: 'GPT-5.5',
      temperature: 0.3,
      speakingStyle: 'Pragmatic',
      avatarUrl: `${avatarBase}avatar-committee.png`,
      accentColor: '#6c6fa6',
    },
  ],
}

export const templateLabels: Record<RoundtableTemplate, string> = {
  brainstorming: 'Brainstorming',
  debate: 'Debate',
  'peer-review': 'Peer Review',
  'investment-committee': 'Investment Committee',
}

export const modeLabels: Record<DiscussionMode, string> = templateLabels

export const finalOutputLabels: Record<FinalOutputType, string> = {
  summary: 'Summary',
  decision: 'Decision',
  'action-list': 'Action List',
  report: 'Report',
}

export const defaultConfig: RoundtableConfig = {
  question:
    'How should we design a multi-agent discussion product that feels useful, trustworthy, and enjoyable to revisit?',
  template: 'brainstorming',
  roundCount: 2,
  speakingOrder: 'fixed',
  discussionMode: 'brainstorming',
  finalOutputType: 'summary',
  theme: 'warm-family',
}

export function createAgentsFromTemplate(
  template: RoundtableTemplate,
  _question = '',
  theme: ThemeId = 'warm-family',
): AgentProfile[] {
  return templateSeeds[template].map((seed, index) => ({
    id: `${template}-${index + 1}`,
    enabled: true,
    ...seed,
    avatarUrl: applyThemeAvatar(seed.avatarUrl, theme),
  }))
}

function applyThemeAvatar(avatarUrl: string, theme: ThemeId) {
  if (theme === 'warm-family') return avatarUrl
  const filename = avatarUrl.split('/').at(-1) ?? avatarUrl
  return `${avatarBase}${theme}-${filename}`
}
