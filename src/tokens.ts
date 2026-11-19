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

export const slug = (s: string) =>
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

// --- Loading and saving. A share link carries the whole system in the URL, so anything read
// from it (or from storage) is treated as untrusted and rebuilt field by field. ---

const KEY = 'token-playground:system'

const inRange = (n: unknown, min: number, max: number): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max

function sanitize(v: unknown): System | null {
  if (!v || typeof v !== 'object') return null
  const s = v as Record<string, unknown>
  if (typeof s.name !== 'string' || s.name.length > 60) return null
  if (!Array.isArray(s.colors) || s.colors.length < 1 || s.colors.length > 8) return null

  const colors: ColorToken[] = []
  const ids = new Set<string>()
  for (const raw of s.colors) {
    if (!raw || typeof raw !== 'object') return null
    const c = raw as Record<string, unknown>
    const b = c.base as Record<string, unknown> | undefined
    if (typeof c.id !== 'string' || !c.id || c.id.length > 40 || ids.has(c.id)) return null
    if (typeof c.name !== 'string' || c.name.length > 40) return null
    if (!b || !inRange(b.l, 0, 1) || !inRange(b.c, 0, 0.4) || !inRange(b.h, 0, 360)) return null
    ids.add(c.id)
    colors.push({ id: c.id, name: c.name, base: { l: b.l, c: b.c, h: b.h } })
  }

  if (typeof s.headingFont !== 'string' || !Object.hasOwn(HEADING_FONTS, s.headingFont)) return null
  if (typeof s.bodyFont !== 'string' || !Object.hasOwn(BODY_FONTS, s.bodyFont)) return null
  if (!inRange(s.scale, 1.05, 1.6) || !inRange(s.radius, 0, 32) || !inRange(s.space, 1, 10)) {
    return null
  }
  return {
    name: s.name,
    colors,
    headingFont: s.headingFont,
    bodyFont: s.bodyFont,
    scale: s.scale,
    radius: s.radius,
    space: s.space,
  }
}

export const encodeShare = (sys: System) => btoa(encodeURIComponent(JSON.stringify(sys)))

export type Loaded = { system: System; source: 'link' | 'saved' | 'none' }

export function loadSystem(): Loaded {
  try {
    if (location.hash.startsWith('#s=')) {
      const parsed = sanitize(JSON.parse(decodeURIComponent(atob(location.hash.slice(3)))))
      if (parsed) return { system: parsed, source: 'link' }
    }
  } catch {
    // A broken share link falls through to the saved or default system.
  }
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = sanitize(JSON.parse(raw))
      if (parsed) return { system: parsed, source: 'saved' }
    }
  } catch {
    // Storage can be unavailable (private mode); start fresh.
  }
  return { system: DEFAULT_SYSTEM, source: 'none' }
}

export function saveSystem(sys: System) {
  try {
    localStorage.setItem(KEY, JSON.stringify(sys))
  } catch {
    // Not being able to save is not fatal.
  }
}

export function clearSystem() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}
