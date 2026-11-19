// Choices and helpers for the guided start.
import { rgb255ToOklch, type Oklch } from './color'
import type { System } from './tokens'

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

// ---- Type pairings, text size, corners and spacing ----

export const PAIRINGS = [
  { id: 'modern', label: 'Modern', blurb: 'Clean and even, good for apps and services.', heading: 'Space Grotesk', body: 'Inter' },
  { id: 'classic', label: 'Classic', blurb: 'A little formal, good for shops and studios.', heading: 'Fraunces', body: 'Inter' },
  { id: 'friendly', label: 'Friendly', blurb: 'Rounder and looser, good for family brands.', heading: 'Bricolage Grotesque', body: 'DM Sans' },
] as const
export type PairingId = (typeof PAIRINGS)[number]['id']

export const FEELS = [
  { id: 'compact', label: 'Compact', scale: 1.2 },
  { id: 'comfortable', label: 'Comfortable', scale: 1.25 },
  { id: 'roomy', label: 'Roomy', scale: 1.3 },
] as const
export type FeelId = (typeof FEELS)[number]['id']

export const CORNERS = [
  { id: 'sharp', label: 'Sharp', radius: 0 },
  { id: 'soft', label: 'Soft', radius: 8 },
  { id: 'round', label: 'Round', radius: 20 },
] as const
export type CornerId = (typeof CORNERS)[number]['id']

export const ROOMS = [
  { id: 'tight', label: 'Tight', space: 3, gap: 3 },
  { id: 'regular', label: 'Regular', space: 4, gap: 7 },
  { id: 'airy', label: 'Airy', space: 6, gap: 12 },
] as const
export type RoomId = (typeof ROOMS)[number]['id']

/** A good body font to go with a chosen heading font. */
export function bodyFor(heading: string): string {
  if (heading === 'Bricolage Grotesque') return 'DM Sans'
  if (heading === 'Playfair Display' || heading === 'DM Serif Display') return 'Source Sans 3'
  return 'Inter'
}

// ---- Mood: sets sensible starting points for type, corners and spacing ----

export const MOODS = [
  { id: 'calm', label: 'Calm', pairing: 'classic', corners: 'soft', room: 'airy', feel: 'comfortable' },
  { id: 'confident', label: 'Confident', pairing: 'modern', corners: 'sharp', room: 'regular', feel: 'roomy' },
  { id: 'warm', label: 'Warm', pairing: 'classic', corners: 'round', room: 'regular', feel: 'comfortable' },
  { id: 'playful', label: 'Playful', pairing: 'friendly', corners: 'round', room: 'airy', feel: 'roomy' },
  { id: 'technical', label: 'Technical', pairing: 'modern', corners: 'sharp', room: 'tight', feel: 'compact' },
] as const
export type Mood = (typeof MOODS)[number]['id']

export function applyMood(sys: System, mood: Mood): System {
  const m = MOODS.find((x) => x.id === mood)!
  const pairing = PAIRINGS.find((p) => p.id === m.pairing)!
  return {
    ...sys,
    headingFont: pairing.heading,
    bodyFont: pairing.body,
    radius: CORNERS.find((c) => c.id === m.corners)!.radius,
    space: ROOMS.find((r) => r.id === m.room)!.space,
    scale: FEELS.find((f) => f.id === m.feel)!.scale,
  }
}

// ---- Accent and grey: derived from the brand color ----

export const ACCENTS = [
  { id: 'opposite', label: 'Opposite', note: 'Stands out against your color', turn: 160 },
  { id: 'cousin', label: 'Close cousin', note: 'Sits quietly next to it', turn: 35 },
  { id: 'wild', label: 'Wild card', note: 'A lively third voice', turn: 120 },
] as const
export type AccentKind = (typeof ACCENTS)[number]['id']

export function accentFor(brand: Oklch, kind: AccentKind): Oklch {
  const turn = ACCENTS.find((a) => a.id === kind)!.turn
  return { l: 0.52, c: clamp(brand.c, 0.1, 0.17), h: (brand.h + turn) % 360 }
}

export const GREYS = [
  { id: 'cool', label: 'Cool', h: 250, c: 0.02 },
  { id: 'plain', label: 'Plain', h: 0, c: 0 },
  { id: 'warm', label: 'Warm', h: 70, c: 0.02 },
] as const
export type GreyId = (typeof GREYS)[number]['id']

export function neutralFor(grey: GreyId): Oklch {
  const g = GREYS.find((x) => x.id === grey)!
  return { l: 0.5, c: g.c, h: g.h }
}

/** Rebuild the accent and neutral colors from the brand color and the user's choices. */
export function applyDerived(sys: System, accent: AccentKind, grey: GreyId): System {
  const brand = sys.colors[0].base
  return {
    ...sys,
    colors: sys.colors.map((c) =>
      c.id === 'accent'
        ? { ...c, base: accentFor(brand, accent) }
        : c.id === 'neutral'
          ? { ...c, base: neutralFor(grey) }
          : c,
    ),
  }
}

/** A plain-language name for a hue angle (OKLCH), for labels. */
export function hueName(h: number): string {
  const stops: [number, string][] = [
    [15, 'Rose'], [40, 'Red'], [75, 'Orange'], [110, 'Gold'], [165, 'Green'],
    [200, 'Teal'], [235, 'Sky'], [275, 'Blue'], [315, 'Purple'], [350, 'Magenta'],
  ]
  return stops.find(([max]) => h < max)?.[1] ?? 'Rose'
}

// ---- Picking a brand color from a logo or photo ----

/** The most prominent colorful hue in an image, tuned to work as a brand color. Null if the image is greyscale. */
export function colorFromImage(file: File): Promise<Oklch | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const done = (v: Oklch | null) => {
      URL.revokeObjectURL(url)
      resolve(v)
    }
    const img = new Image()
    img.onerror = () => done(null)
    img.onload = () => {
      try {
        const size = 64
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) return done(null)
        const w = img.naturalWidth || size
        const h = img.naturalHeight || size
        const scale = Math.min(size / w, size / h)
        ctx.drawImage(img, 0, 0, w * scale, h * scale)
        const { data } = ctx.getImageData(0, 0, size, size)

        // Group colorful pixels into 15-degree hue buckets, weighted by how vivid they are.
        const buckets = Array.from({ length: 24 }, () => ({ w: 0, l: 0, c: 0, x: 0, y: 0 }))
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 128) continue
          const px = rgb255ToOklch(data[i], data[i + 1], data[i + 2])
          if (px.c < 0.04 || px.l < 0.15 || px.l > 0.95) continue
          const b = buckets[Math.floor(px.h / 15) % 24]
          const rad = (px.h * Math.PI) / 180
          b.w += px.c
          b.l += px.l * px.c
          b.c += px.c * px.c
          b.x += Math.cos(rad) * px.c
          b.y += Math.sin(rad) * px.c
        }
        const best = buckets.reduce((a, b) => (b.w > a.w ? b : a))
        if (best.w === 0) return done(null)
        const hue = ((Math.atan2(best.y, best.x) * 180) / Math.PI + 360) % 360
        done({
          l: clamp(best.l / best.w, 0.4, 0.58),
          c: clamp(best.c / best.w, 0.06, 0.25),
          h: hue,
        })
      } catch {
        done(null)
      }
    }
    img.src = url
  })
}
