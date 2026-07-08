import type { ThemeId } from '../types'

export interface ThemeDefinition {
  id: ThemeId
  label: string
  description: string
  previewUrl: string
}

export const themeCatalog: ThemeDefinition[] = [
  {
    id: 'warm-family',
    label: 'Warm Family',
    description: 'A soft home table with companion-like warmth.',
    previewUrl: './assets/theme-warm-family.png',
  },
  {
    id: 'work-mode',
    label: 'Work Mode',
    description: 'A calm professional room for serious decisions.',
    previewUrl: './assets/theme-work-mode.png',
  },
  {
    id: 'tech-vision',
    label: 'Tech Vision',
    description: 'A bright lab mood for speculative futures.',
    previewUrl: './assets/theme-tech-vision.png',
  },
  {
    id: 'philosophy-study',
    label: 'Philosophy Study',
    description: 'A quiet study table for reflective and philosophical questions.',
    previewUrl: './assets/theme-philosophy-study.png',
  },
]

export const getThemeDefinition = (id: ThemeId) =>
  themeCatalog.find((theme) => theme.id === id) ?? themeCatalog[0]
