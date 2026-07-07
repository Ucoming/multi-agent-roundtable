import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { PNG } from 'pngjs'

const outDir = join(process.cwd(), 'public', 'assets')
mkdirSync(outDir, { recursive: true })

const themes = {
  warm: {
    prefix: '',
    bg: '#fff4e6',
    panel: '#f6c7a7',
    table: '#6aa89a',
    accent: '#d66f57',
    face: '#f2b880',
    line: '#7a4e3b',
  },
  work: {
    prefix: 'work-mode-',
    bg: '#eef2f5',
    panel: '#cbd8df',
    table: '#3f6f88',
    accent: '#4f8f75',
    face: '#d8b78d',
    line: '#2e4050',
  },
  tech: {
    prefix: 'tech-vision-',
    bg: '#10191d',
    panel: '#14323b',
    table: '#3bd3c3',
    accent: '#b9e769',
    face: '#77d4ff',
    line: '#effffb',
  },
}

const avatarNames = [
  'scout',
  'builder',
  'advocate',
  'keeper',
  'affirmative',
  'opposition',
  'referee',
  'bridge',
  'reviewer',
  'methods',
  'theory',
  'friendly',
  'chair',
  'market',
  'risk',
  'operator',
  'numbers',
  'committee',
]

writePng('theme-warm-family.png', drawThemePreview(themes.warm, 'warm'))
writePng('theme-work-mode.png', drawThemePreview(themes.work, 'work'))
writePng('theme-tech-vision.png', drawThemePreview(themes.tech, 'tech'))

for (const [themeName, theme] of Object.entries(themes)) {
  for (const [index, name] of avatarNames.entries()) {
    const filename = `${theme.prefix}avatar-${name}.png`
    writePng(filename, drawAvatar(theme, themeName, index))
  }
}

function drawThemePreview(theme, variant) {
  const png = createPng(920, 420, theme.bg)
  drawGradientBand(png, 0, 0, 920, 420, theme.bg, theme.panel)
  drawRoundedRect(png, 70, 78, 780, 260, 34, withAlpha(theme.panel, 230))
  drawRoundedRect(png, 120, 130, 680, 130, 42, withAlpha(theme.table, 235))

  const seats = [
    [190, 125],
    [360, 105],
    [540, 105],
    [710, 125],
    [275, 290],
    [630, 290],
  ]

  seats.forEach(([x, y], index) => {
    const fill = index % 2 === 0 ? theme.face : theme.accent
    drawCircle(png, x, y, 42, fill)
    drawCircle(png, x - 14, y - 8, 5, theme.line)
    drawCircle(png, x + 14, y - 8, 5, theme.line)
    drawRoundedRect(png, x - 18, y + 14, 36, 8, 4, theme.line)
  })

  if (variant === 'warm') {
    drawTriangle(png, 158, 88, 183, 45, 208, 88, theme.face)
    drawTriangle(png, 672, 88, 697, 45, 722, 88, theme.face)
    drawCircle(png, 118, 316, 24, '#f3d2b6')
    drawCircle(png, 790, 315, 24, '#f3d2b6')
  }

  if (variant === 'work') {
    drawRoundedRect(png, 155, 70, 610, 24, 8, '#ffffff')
    drawRoundedRect(png, 235, 298, 450, 18, 8, '#ffffff')
  }

  if (variant === 'tech') {
    drawLine(png, 120, 90, 790, 310, theme.accent, 3)
    drawLine(png, 790, 90, 120, 310, theme.table, 3)
    for (let x = 120; x < 820; x += 80) drawCircle(png, x, 350, 4, theme.accent)
  }

  return png
}

function drawAvatar(theme, variant, index) {
  const png = createPng(160, 160, theme.bg)
  drawGradientBand(png, 0, 0, 160, 160, theme.bg, theme.panel)
  drawCircle(png, 80, 80, 60, withAlpha(theme.panel, 220))
  drawCircle(png, 80, 82, 44, theme.face)

  const accentShift = index % 3
  if (variant === 'warm') {
    drawTriangle(png, 48, 51, 65, 18, 82, 51, theme.face)
    drawTriangle(png, 78, 51, 96, 18, 113, 51, theme.face)
    drawCircle(png, 65, 75, 5, theme.line)
    drawCircle(png, 96, 75, 5, theme.line)
    drawRoundedRect(png, 64, 101, 34, 8, 4, theme.line)
  } else if (variant === 'work') {
    drawRoundedRect(png, 47, 44, 66, 18, 4, theme.line)
    drawCircle(png, 65, 80, 5, theme.line)
    drawCircle(png, 95, 80, 5, theme.line)
    drawRoundedRect(png, 57, 102, 48, 7, 4, theme.line)
  } else {
    drawCircle(png, 80, 82, 50, withAlpha(theme.table, 70))
    drawCircle(png, 65, 77, 6, theme.line)
    drawCircle(png, 96, 77, 6, theme.line)
    drawLine(png, 62, 103, 99, 103, theme.accent, 4)
    drawLine(png, 34, 80, 126, 80, withAlpha(theme.accent, 160), 2)
  }

  const markerColor = accentShift === 0 ? theme.accent : accentShift === 1 ? theme.table : theme.line
  drawCircle(png, 124, 124, 16, markerColor)
  return png
}

function createPng(width, height, color) {
  const png = new PNG({ width, height })
  fillRect(png, 0, 0, width, height, color)
  return png
}

function writePng(filename, png) {
  writeFileSync(join(outDir, filename), PNG.sync.write(png))
}

function fillRect(png, x, y, width, height, color) {
  const rgba = parseColor(color)
  for (let py = Math.max(0, y); py < Math.min(png.height, y + height); py += 1) {
    for (let px = Math.max(0, x); px < Math.min(png.width, x + width); px += 1) {
      setPixel(png, px, py, rgba)
    }
  }
}

function drawGradientBand(png, x, y, width, height, from, to) {
  const a = parseColor(from)
  const b = parseColor(to)
  for (let py = y; py < y + height; py += 1) {
    const ratio = (py - y) / height
    const color = [
      Math.round(a[0] + (b[0] - a[0]) * ratio),
      Math.round(a[1] + (b[1] - a[1]) * ratio),
      Math.round(a[2] + (b[2] - a[2]) * ratio),
      255,
    ]
    for (let px = x; px < x + width; px += 1) setPixel(png, px, py, color)
  }
}

function drawRoundedRect(png, x, y, width, height, radius, color) {
  for (let py = y; py < y + height; py += 1) {
    for (let px = x; px < x + width; px += 1) {
      const dx = Math.max(x - px + radius, 0, px - (x + width - radius - 1))
      const dy = Math.max(y - py + radius, 0, py - (y + height - radius - 1))
      if (dx * dx + dy * dy <= radius * radius) setPixel(png, px, py, parseColor(color))
    }
  }
}

function drawCircle(png, cx, cy, radius, color) {
  const rgba = parseColor(color)
  for (let y = cy - radius; y <= cy + radius; y += 1) {
    for (let x = cx - radius; x <= cx + radius; x += 1) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2) setPixel(png, x, y, rgba)
    }
  }
}

function drawTriangle(png, ax, ay, bx, by, cx, cy, color) {
  const rgba = parseColor(color)
  const minX = Math.min(ax, bx, cx)
  const maxX = Math.max(ax, bx, cx)
  const minY = Math.min(ay, by, cy)
  const maxY = Math.max(ay, by, cy)
  const area = edge(ax, ay, bx, by, cx, cy)

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const w1 = edge(x, y, bx, by, cx, cy) / area
      const w2 = edge(ax, ay, x, y, cx, cy) / area
      const w3 = edge(ax, ay, bx, by, x, y) / area
      if (w1 >= 0 && w2 >= 0 && w3 >= 0) setPixel(png, x, y, rgba)
    }
  }
}

function drawLine(png, x1, y1, x2, y2, color, width) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1))
  for (let index = 0; index <= steps; index += 1) {
    const ratio = index / steps
    const x = Math.round(x1 + (x2 - x1) * ratio)
    const y = Math.round(y1 + (y2 - y1) * ratio)
    drawCircle(png, x, y, width, color)
  }
}

function edge(ax, ay, bx, by, cx, cy) {
  return (cx - ax) * (by - ay) - (cy - ay) * (bx - ax)
}

function setPixel(png, x, y, color) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return
  const idx = (png.width * y + x) << 2
  const alpha = color[3] / 255
  png.data[idx] = Math.round(color[0] * alpha + png.data[idx] * (1 - alpha))
  png.data[idx + 1] = Math.round(color[1] * alpha + png.data[idx + 1] * (1 - alpha))
  png.data[idx + 2] = Math.round(color[2] * alpha + png.data[idx + 2] * (1 - alpha))
  png.data[idx + 3] = 255
}

function parseColor(color) {
  if (Array.isArray(color)) return color
  const hex = color.replace('#', '')
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
    255,
  ]
}

function withAlpha(color, alpha) {
  const [r, g, b] = parseColor(color)
  return [r, g, b, alpha]
}
