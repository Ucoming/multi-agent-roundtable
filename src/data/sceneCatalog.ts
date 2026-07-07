import type { DiscussionSceneId } from '../types'

export interface SceneDefinition {
  id: DiscussionSceneId
  label: string
  description: string
}

export const sceneCatalog: SceneDefinition[] = [
  {
    id: 'cozy-roundtable',
    label: 'Cozy Roundtable',
    description: 'A close table for warm, informal group thinking.',
  },
  {
    id: 'strategy-room',
    label: 'Strategy Room',
    description: 'A focused workroom for decisions, risks, and next steps.',
  },
  {
    id: 'future-lab',
    label: 'Future Lab',
    description: 'A bright speculative room for technical and product imagination.',
  },
]

export const sceneLabels: Record<DiscussionSceneId, string> = {
  'cozy-roundtable': 'Cozy Roundtable',
  'strategy-room': 'Strategy Room',
  'future-lab': 'Future Lab',
}

export function getSceneDefinition(id: DiscussionSceneId) {
  return sceneCatalog.find((scene) => scene.id === id) ?? sceneCatalog[0]
}
