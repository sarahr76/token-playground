// Color math: sRGB <-> OKLCH, ramp generation and WCAG contrast.

export type Oklch = { l: number; c: number; h: number }
export type Rgb = { r: number; g: number; b: number } // linear 0..1

const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
const toGamma = (v: number) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055)

export function hexToRgb(hex: string): Rgb | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  let s = m[1]
  if (s.length === 3) s = s.split('').map((ch) => ch + ch).join('')
  const n = parseInt(s, 16)
  return {
    r: toLinear(((n >> 16) & 255) / 255),
    g: toLinear(((n >> 8) & 255) / 255),
    b: toLinear((n & 255) / 255),
  }
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const ch = (v: number) =>
    Math.round(Math.min(1, Math.max(0, toGamma(v))) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${ch(r)}${ch(g)}${ch(b)}`
}

export function rgbToOklch({ r, g, b }: Rgb): Oklch {
  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_
  const h = (Math.atan2(bb, a) * 180) / Math.PI
  return { l: L, c: Math.hypot(a, bb), h: (h + 360) % 360 }
}

/** Convert an sRGB pixel (0..255 per channel) to OKLCH. */
export function rgb255ToOklch(r: number, g: number, b: number): Oklch {
  return rgbToOklch({ r: toLinear(r / 255), g: toLinear(g / 255), b: toLinear(b / 255) })
}

function oklchToRgbRaw({ l, c, h }: Oklch): Rgb {
  const a = c * Math.cos((h * Math.PI) / 180)
  const b = c * Math.sin((h * Math.PI) / 180)
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  return {
    r: 4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    g: -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    b: -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  }
}

const inGamut = ({ r, g, b }: Rgb) =>
  [r, g, b].every((v) => v >= -0.0005 && v <= 1.0005)

/** Convert to a displayable hex, lowering vividness until the color fits sRGB. */
export function oklchToHex(color: Oklch): string {
  let c = color.c
  let rgb = oklchToRgbRaw({ ...color, c })
  while (!inGamut(rgb) && c > 0) {
    c = Math.max(0, c - 0.004)
    rgb = oklchToRgbRaw({ ...color, c })
  }
  return rgbToHex(rgb)
}

export function hexToOklch(hex: string): Oklch | null {
  const rgb = hexToRgb(hex)
  return rgb ? rgbToOklch(rgb) : null
}

export const STEPS = [100, 300, 500, 700, 900] as const
export type Step = (typeof STEPS)[number]

/** Build a five-shade ramp around a base color (the base is shade 500). */
export function ramp(base: Oklch): Record<Step, string> {
  const { l, c, h } = base
  return {
    100: oklchToHex({ l: 0.95, c: c * 0.2, h }),
    300: oklchToHex({ l: l + (0.95 - l) * 0.55, c: c * 0.6, h }),
    500: oklchToHex(base),
    700: oklchToHex({ l: l * 0.76, c: c * 0.9, h }),
    900: oklchToHex({ l: l * 0.5, c: c * 0.7, h }),
  }
}

function luminance(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0
  return 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b
}

/** WCAG contrast ratio between two hex colors. */
export function contrast(a: string, b: string): number {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}
