// A self-contained style guide page: one HTML file that shows the system and needs no code to use.
import { contrast, ramp, STEPS } from './color'
import { fontsUrl } from './fonts'
import {
  SPACE_MULTIPLES,
  toCss,
  TYPE_STEPS,
  typeSize,
  type System,
} from './tokens'

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const textOn = (hex: string) => (contrast(hex, '#ffffff') >= contrast(hex, '#111111') ? '#ffffff' : '#111111')

export function toStyleGuide(sys: System): string {
  const neutral = ramp((sys.colors.find((c) => c.id === 'neutral') ?? sys.colors[0]).base)
  const brand = ramp(sys.colors[0].base)
  const fonts = fontsUrl([sys.headingFont, sys.bodyFont])
  const name = esc(sys.name || 'Untitled system')

  const colorSections = sys.colors
    .map((color) => {
      const shades = ramp(color.base)
      const chips = STEPS.map(
        (step) => `
        <li class="chip" style="background:${shades[step]};color:${textOn(shades[step])}">
          <b>${step}</b><span>${shades[step].toUpperCase()}</span>
        </li>`,
      ).join('')
      return `
    <div class="ramp">
      <h3>${esc(color.name)}</h3>
      <ul class="chips">${chips}
      </ul>
    </div>`
    })
    .join('')

  const typeRows = TYPE_STEPS.map((t) => {
    const size = typeSize(sys.scale, t.power)
    const family = t.heading ? 'var(--font-heading)' : 'var(--font-body)'
    return `
      <div class="type-row">
        <span style="font-family:${family};font-weight:${t.heading ? 700 : 400};font-size:${size}px;line-height:1.15">${t.label}</span>
        <span class="muted">${size}px</span>
      </div>`
  }).join('')

  const spaceBlocks = SPACE_MULTIPLES.map((m) => {
    const px = sys.space * m
    return `
      <div class="space-item"><div class="space-block" style="width:${px}px;height:${px}px"></div><span class="muted">${px}</span></div>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${name} style guide</title>
${fonts ? `<link rel="stylesheet" href="${fonts}">` : ''}
<style>
${toCss(sys)}
* { box-sizing: border-box; }
body { margin: 0; padding: 48px 24px 96px; background: ${neutral[100]}; color: ${neutral[900]}; font-family: var(--font-body); font-size: 16px; line-height: 1.5; }
main { max-width: 960px; margin: 0 auto; display: flex; flex-direction: column; gap: 56px; }
h1, h2, h3 { font-family: var(--font-heading); margin: 0; line-height: 1.15; }
h1 { font-size: var(--text-display); }
h2 { font-size: var(--text-title); padding-bottom: 8px; border-bottom: 2px solid ${neutral[300]}; }
h3 { font-size: var(--text-body); margin-bottom: 8px; }
section { display: flex; flex-direction: column; gap: 20px; }
.muted { color: ${neutral[700]}; font-size: 14px; }
.chips { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; }
.chip { min-height: 110px; padding: 10px; border-radius: var(--radius); display: flex; flex-direction: column; justify-content: flex-end; gap: 2px; font-size: 13px; }
.ramp { display: flex; flex-direction: column; }
.type-row { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; padding: 8px 0; border-bottom: 1px solid ${neutral[300]}; }
.spaces { display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
.space-item { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.space-block { background: ${brand[500]}; }
.radius-demo { width: 120px; height: 72px; background: ${brand[500]}; border-radius: var(--radius); }
.sample { background: #fff; border: 1px solid ${neutral[300]}; border-radius: var(--radius); padding: calc(var(--space-1) * 6); display: flex; flex-direction: column; gap: calc(var(--space-1) * 3); }
.sample p { margin: 0; color: ${neutral[700]}; max-width: 52ch; }
.btns { display: flex; flex-wrap: wrap; gap: calc(var(--space-1) * 3); }
button { min-height: 44px; padding: 0 calc(var(--space-1) * 5); border-radius: var(--radius); font: inherit; font-weight: 600; cursor: pointer; }
.primary { border: 0; background: ${brand[500]}; color: #fff; }
.secondary { border: 1px solid ${brand[500]}; background: #fff; color: ${brand[500]}; }
footer { color: ${neutral[700]}; font-size: 14px; }
@media (max-width: 640px) { .chips { grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 4px; } .chip span { display: none; } }
</style>
</head>
<body>
<main>
  <header>
    <p class="muted">Style guide</p>
    <h1>${name}</h1>
  </header>

  <section>
    <h2>Color</h2>${colorSections}
  </section>

  <section>
    <h2>Type</h2>
    <p class="muted">Headings: ${esc(sys.headingFont)}. Body: ${esc(sys.bodyFont)}. Each size is ${sys.scale} times the one before it.</p>${typeRows}
  </section>

  <section>
    <h2>Space and corners</h2>
    <div class="spaces">${spaceBlocks}
      <div class="space-item"><div class="radius-demo"></div><span class="muted">${sys.radius}px corners</span></div>
    </div>
  </section>

  <section>
    <h2>In use</h2>
    <div class="sample">
      <h3>Card heading</h3>
      <p>Body text sits here so you can judge the fonts, sizes and colors together.</p>
      <div class="btns"><button class="primary">Primary</button><button class="secondary">Secondary</button></div>
    </div>
  </section>

  <footer>Made with Token Playground</footer>
</main>
</body>
</html>
`
}
