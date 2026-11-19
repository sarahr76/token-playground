// The design system being edited: its shape, defaults, storage and export formats.
import { hexToOklch, ramp, STEPS, type Oklch } from './color'

export type ColorToken = { id: string; name: string; base: Oklch }

export type System = {
  name: string
  colors: ColorToken[]
  headingFont: string
  bodyFont: string
  scale: number
  radius: number
  space: number
}

// Google Fonts on offer, with the weights each one actually ships.
export const HEADING_FONTS: Record<string, string> = {
  'Space Grotesk': '500;700',
  Fraunces: '400;700',
  'Bricolage Grotesque': '400;700',
  'Playfair Display': '400;700',
  Archivo: '400;700',
  'DM Serif Display': '400',
}
export const BODY_FONTS: Record<string, string> = {
  Inter: '400;600',
  'DM Sans': '400;700',
  'Source Sans 3': '400;600',
  Lora: '400;600',
  'IBM Plex Sans': '400;600',
}

const base = (hex: string): Oklch => hexToOklch(hex) ?? { l: 0.5, c: 0.15, h: 265 }

export const DEFAULT_SYSTEM: System = {
  name: 'Untitled system',
  colors: [
    { id: 'brand', name: 'Brand', base: base('#2f5bd7') },
    { id: 'accent', name: 'Accent', base: base('#b54f0a') },
    { id: 'neutral', name: 'Neutral', base: base('#5c6066') },
  ],
  headingFont: 'Space Grotesk',
  bodyFont: 'Inter',
  scale: 1.25,
  radius: 8,
  space: 4,
}

export const TYPE_STEPS = [
  { key: 'display', label: 'Display', power: 4, heading: true },
  { key: 'heading', label: 'Heading', power: 3, heading: true },
  { key: 'title', label: 'Title', power: 2, heading: true },
  { key: 'body', label: 'Body text', power: 0, heading: false },
  { key: 'caption', label: 'Caption', power: -1, heading: false },
] as const

export const typeSize = (scale: number, power: number) => Math.round(16 * scale ** power)

export const SPACE_MULTIPLES = [1, 2, 4, 6, 8, 12]

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'color'

/** Flat list of every token as [css variable name, value]. */
export function flatTokens(sys: System): [string, string][] {
  const out: [string, string][] = []
  for (const color of sys.colors) {
    const shades = ramp(color.base)
    for (const step of STEPS) out.push([`color-${slug(color.name)}-${step}`, shades[step]])
  }
  out.push(['font-heading', `"${sys.headingFont}", sans-serif`])
  out.push(['font-body', `"${sys.bodyFont}", sans-serif`])
  for (const t of TYPE_STEPS) out.push([`text-${t.key}`, `${typeSize(sys.scale, t.power)}px`])
  out.push(['radius', `${sys.radius}px`])
  SPACE_MULTIPLES.forEach((m, i) => out.push([`space-${i + 1}`, `${sys.space * m}px`]))
  return out
}

export function toCss(sys: System): string {
  const lines = flatTokens(sys).map(([k, v]) => `  --${k}: ${v};`)
  return `:root {\n${lines.join('\n')}\n}\n`
}

export function toTailwind(sys: System): string {
  const lines = flatTokens(sys).map(([k, v]) => {
    // Tailwind v4 theme namespaces: --color-*, --font-*, --text-*, --radius-*, --spacing-*
    const name = k === 'radius' ? 'radius-base' : k.replace(/^space-/, 'spacing-')
    return `  --${name}: ${v};`
  })
  return `@import "tailwindcss";\n\n@theme {\n${lines.join('\n')}\n}\n`
}

export function toJson(sys: System): string {
  const color: Record<string, Record<string, { $value: string; $type: string }>> = {}
  for (const c of sys.colors) {
    const shades = ramp(c.base)
    color[slug(c.name)] = Object.fromEntries(
      STEPS.map((s) => [String(s), { $value: shades[s], $type: 'color' }]),
    )
  }
  const tokens = {
    color,
    font: {
      heading: { $value: sys.headingFont, $type: 'fontFamily' },
      body: { $value: sys.bodyFont, $type: 'fontFamily' },
    },
    text: Object.fromEntries(
      TYPE_STEPS.map((t) => [
        t.key,
        { $value: `${typeSize(sys.scale, t.power)}px`, $type: 'dimension' },
      ]),
    ),
    radius: { $value: `${sys.radius}px`, $type: 'dimension' },
    space: Object.fromEntries(
      SPACE_MULTIPLES.map((m, i) => [
        String(i + 1),
        { $value: `${sys.space * m}px`, $type: 'dimension' },
      ]),
    ),
  }
  return JSON.stringify(tokens, null, 2) + '\n'
}

// --- Saving: the browser remembers your system, and a share link carries it in the URL. ---

const KEY = 'token-playground:system'

function isSystem(v: unknown): v is System {
  const s = v as System
  return (
    !!s &&
    typeof s.name === 'string' &&
    Array.isArray(s.colors) &&
    s.colors.length > 0 &&
    s.colors.every(
      (c) =>
        typeof c.id === 'string' &&
        typeof c.name === 'string' &&
        [c.base?.l, c.base?.c, c.base?.h].every((n) => typeof n === 'number' && isFinite(n)),
    ) &&
    typeof s.headingFont === 'string' &&
    typeof s.bodyFont === 'string' &&
    [s.scale, s.radius, s.space].every((n) => typeof n === 'number' && isFinite(n))
  )
}

export const encodeShare = (sys: System) =>
  btoa(encodeURIComponent(JSON.stringify(sys)))

export function loadSystem(): System {
  try {
    const hash = location.hash.replace(/^#s=/, '')
    if (location.hash.startsWith('#s=') && hash) {
      const parsed: unknown = JSON.parse(decodeURIComponent(atob(hash)))
      if (isSystem(parsed)) return parsed
    }
  } catch {
    // A broken share link falls through to the saved or default system.
  }
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (isSystem(parsed)) return parsed
    }
  } catch {
    // Storage can be unavailable (private mode); start fresh.
  }
  return DEFAULT_SYSTEM
}

export function saveSystem(sys: System) {
  try {
    localStorage.setItem(KEY, JSON.stringify(sys))
  } catch {
    // Not being able to save is not fatal.
  }
}
