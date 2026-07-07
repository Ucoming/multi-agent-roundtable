import type { CSSProperties } from 'react'
import { MessageCircle, Radio } from 'lucide-react'
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
        <div className="active-speaker-chip">
          <Radio size={15} />
          <span>{latestMessage ? speakerStatus(latestMessage.speakerName, isRunning) : 'Waiting'}</span>
        </div>
      </div>

      <div className="roundtable-stage" aria-label={`${scene.label} with agent speech bubbles`}>
        <div className="room-backdrop" />
        <div className="town-map" aria-hidden="true">
          <div className="town-road road-main" />
          <div className="town-road road-cross" />
          <div className="town-block block-library" />
          <div className="town-block block-cafe" />
          <div className="town-block block-park" />
          <div className="town-block block-lab" />
        </div>
        <div className="table-surface">
          <MessageCircle size={24} />
          <span>{activeAgents.length} agents</span>
        </div>

        {activeAgents.map((agent, index) => {
          const latestForAgent = findLatestMessage(agent.id, messages)
          const isActive = latestMessage?.agentId === agent.id
          const position = getSeatPosition(index, activeAgents.length)

          return (
            <article
              className={`scene-seat ${isActive ? 'is-speaking' : ''}`}
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
                  : `Ready as ${agent.role.toLowerCase()}`}
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
  return trimmed.length > 124 ? `${trimmed.slice(0, 121)}...` : trimmed
}

function speakerStatus(name: string, isRunning: boolean) {
  return isRunning ? `${name} speaking` : `${name} spoke last`
}

function getSeatPosition(index: number, count: number) {
  const radiusX = count <= 3 ? 28 : 30
  const radiusY = count <= 3 ? 27 : 32
  const angle = -90 + (360 / count) * index
  const radians = (angle * Math.PI) / 180

  return {
    x: 50 + Math.cos(radians) * radiusX,
    y: 51 + Math.sin(radians) * radiusY,
  }
}
