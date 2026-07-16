import type { CSSProperties } from 'react'
import { Radio } from 'lucide-react'
import { getSceneDefinition } from '../data/sceneCatalog'
import type { AgentProfile, DiscussionMessage, RoundtableConfig } from '../types'

interface RoundtableSceneProps {
  agents: AgentProfile[]
  config: RoundtableConfig
  isRunning: boolean
  messages: DiscussionMessage[]
}

type SeatStyle = CSSProperties & {
  '--seat-x': string
  '--seat-y': string
  '--seat-accent': string
}

type ChairStyle = CSSProperties & {
  '--chair-x': string
  '--chair-y': string
  '--seat-angle': string
  '--seat-accent': string
}

export function RoundtableScene({
  agents,
  config,
  isRunning,
  messages,
}: RoundtableSceneProps) {
  const activeAgents = agents.filter((agent) => agent.enabled)
  const scene = getSceneDefinition(config.discussionScene)
  const latestMessage = messages.at(-1)

  return (
    <div className={`roundtable-scene scene-${config.discussionScene}`}>
      <div className="scene-heading">
        <div>
          <p className="eyebrow">Visual discussion scene</p>
          <h2>{scene.label}</h2>
          <p>{scene.description}</p>
        </div>
        <div className="active-speaker-chip" role="status" aria-live="polite">
          <Radio size={15} />
          <span>{latestMessage ? speakerStatus(latestMessage.speakerName, isRunning) : 'Waiting'}</span>
        </div>
      </div>

      <div
        className={`roundtable-stage ${activeAgents.length > 6 ? 'many-agents' : ''}`}
        aria-label={`${scene.label} with agent speech bubbles`}
      >
        <div className="painted-room-backdrop" aria-hidden="true" />
        <div className="painted-floor" aria-hidden="true" />
        {activeAgents.map((agent, index) => {
          const position = getSeatPosition(index, activeAgents.length)

          return (
            <div
              aria-hidden="true"
              className={`stage-chair chair-${position.zone}`}
              key={`${agent.id}-chair`}
              style={
                {
                  '--chair-x': `${position.chairX}%`,
                  '--chair-y': `${position.chairY}%`,
                  '--seat-angle': `${position.angle}deg`,
                  '--seat-accent': agent.accentColor,
                } as ChairStyle
              }
            />
          )
        })}
        <div className="table-surface">
          <span>{activeAgents.length} voices</span>
        </div>

        {activeAgents.map((agent, index) => {
          const latestForAgent = findLatestMessage(agent.id, messages)
          const isActive = latestMessage?.agentId === agent.id
          const position = getSeatPosition(index, activeAgents.length)

          return (
            <article
              className={`scene-seat is-${position.zone} ${isActive ? 'is-speaking' : ''}`}
              key={agent.id}
              style={
                {
                  '--seat-x': `${position.x}%`,
                  '--seat-y': `${position.y}%`,
                  '--seat-accent': agent.accentColor,
                } as SeatStyle
              }
              aria-label={`${agent.name}${isActive ? ' is speaking' : ''}`}
            >
              <div className="scene-agent">
                <img src={agent.avatarUrl} alt="" />
                <div>
                  <strong>{agent.name}</strong>
                  <span>{agent.speakingStyle}</span>
                </div>
              </div>
              <div className="speech-bubble">
                {latestForAgent
                  ? compactSpeech(latestForAgent.content)
                  : `Ready with a ${agent.speakingStyle.toLowerCase()} lens.`}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

function findLatestMessage(agentId: string, messages: DiscussionMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].agentId === agentId) return messages[index]
  }
  return undefined
}

function compactSpeech(content: string) {
  const trimmed = content.trim()
  if (!trimmed) return 'Thinking through the next point...'
  return trimmed.length > 96 ? `${trimmed.slice(0, 93)}...` : trimmed
}

function speakerStatus(name: string, isRunning: boolean) {
  return isRunning ? `${name} speaking` : `${name} spoke last`
}

function getSeatPosition(index: number, count: number) {
  const radiusX = count <= 3 ? 27 : count > 6 ? 34 : 31
  const radiusY = count <= 3 ? 25 : count > 6 ? 31 : 29
  const angle = -90 + (360 / count) * index
  const radians = (angle * Math.PI) / 180
  const x = 50 + Math.cos(radians) * radiusX
  const y = 51 + Math.sin(radians) * radiusY
  const chairRadiusX = Math.max(18, radiusX - 6)
  const chairRadiusY = Math.max(16, radiusY - 5)

  return {
    angle,
    chairX: 50 + Math.cos(radians) * chairRadiusX,
    chairY: 51 + Math.sin(radians) * chairRadiusY,
    x,
    y,
    zone: y > 52 ? 'bottom' : 'top',
  }
}
