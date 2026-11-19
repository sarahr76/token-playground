import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { contrast, hexToOklch, ramp, STEPS, type Oklch } from './color'
import {
  BODY_FONTS,
  DEFAULT_SYSTEM,
  encodeShare,
  HEADING_FONTS,
  loadSystem,
  saveSystem,
  SPACE_MULTIPLES,
  toCss,
  toJson,
  toTailwind,
  TYPE_STEPS,
  typeSize,
  type ColorToken,
  type System,
} from './tokens'

const MAX_COLORS = 5
const wide = () => window.matchMedia('(min-width: 900px)').matches

/** Load the Google Fonts the system uses so the sheet shows the real faces. */
function useGoogleFonts(sys: System) {
  useEffect(() => {
    const families = [
      [sys.headingFont, HEADING_FONTS[sys.headingFont]],
      [sys.bodyFont, BODY_FONTS[sys.bodyFont]],
    ]
      .filter(([, weights]) => weights)
      .map(([name, weights]) => `family=${name.replace(/ /g, '+')}:wght@${weights}`)
    if (!families.length) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`
    document.head.appendChild(link)
    return () => link.remove()
  }, [sys.headingFont, sys.bodyFont])
}

export default function App() {
  const [sys, setSys] = useState<System>(loadSystem)
  const [editingId, setEditingId] = useState<string | null>(() => (wide() ? 'brand' : null))
  const [exportOpen, setExportOpen] = useState(false)
  const [notice, setNotice] = useState('')

  useGoogleFonts(sys)
  useEffect(() => saveSystem(sys), [sys])
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(''), 2500)
    return () => clearTimeout(t)
  }, [notice])

  const update = (patch: Partial<System>) => setSys((s) => ({ ...s, ...patch }))
  const updateColor = (id: string, patch: Partial<ColorToken>) =>
    setSys((s) => ({
      ...s,
      colors: s.colors.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }))

  const editing = sys.colors.find((c) => c.id === editingId) ?? null
  const brand = ramp(sys.colors[0].base)
  const neutral = ramp((sys.colors.find((c) => c.id === 'neutral') ?? sys.colors[0]).base)

  const addColor = () => {
    const id = `color-${Date.now()}`
    const hue = (sys.colors[0].base.h + 120 * (sys.colors.length - 2)) % 360
    setSys((s) => ({
      ...s,
      colors: [...s.colors, { id, name: `Color ${s.colors.length + 1}`, base: { l: 0.6, c: 0.15, h: hue } }],
    }))
    setEditingId(id)
  }
  const removeColor = (id: string) => {
    setSys((s) => ({ ...s, colors: s.colors.filter((c) => c.id !== id) }))
    setEditingId(null)
  }

  const share = async () => {
    const url = `${location.origin}${location.pathname}#s=${encodeShare(sys)}`
    try {
      await navigator.clipboard.writeText(url)
      setNotice('Share link copied')
    } catch {
      location.hash = `s=${encodeShare(sys)}`
      setNotice('Share link is in the address bar')
    }
  }

  const reset = () => {
    setSys(DEFAULT_SYSTEM)
    setEditingId(wide() ? 'brand' : null)
    history.replaceState(null, '', location.pathname)
    setNotice('Started over')
  }

  // The user's own system, exposed as CSS variables to the "See it in use" card.
  const sampleVars = {
    '--s-brand': brand[500],
    '--s-brand-soft': brand[100],
    '--s-brand-deep': brand[700],
    '--s-text': neutral[900],
    '--s-muted': neutral[700],
    '--s-line': neutral[300],
    '--s-radius': `${sys.radius}px`,
    '--s-space': `${sys.space}px`,
    '--s-heading': `"${sys.headingFont}", sans-serif`,
    '--s-body': `"${sys.bodyFont}", sans-serif`,
  } as CSSProperties

  return (
    <div className="page">
      <header className="top">
        <div className="top-left">
          <span className="brand-name">Token Playground</span>
          <label className="visually-hidden" htmlFor="sys-name">
            System name
          </label>
          <input
            id="sys-name"
            className="name-input"
            value={sys.name}
            onChange={(e) => update({ name: e.target.value })}
          />
          <span className="hint">Tap anything on the sheet to change it</span>
        </div>
        <div className="top-actions">
          <button className="btn" onClick={reset}>
            Start over
          </button>
          <button className="btn" onClick={share}>
            Share sheet
          </button>
          <button className="btn btn-primary" onClick={() => setExportOpen(true)}>
            Export tokens
          </button>
        </div>
      </header>

      <div className="columns">
        <section className="col-narrow">
          <h2 className="tag tag-pink">Type</h2>
          <div className="card card-raised">
            <div className="aa" style={{ fontFamily: `"${sys.headingFont}", sans-serif` }}>
              Aa
            </div>
            <div className="field-row">
              <label className="field">
                <span>Headings</span>
                <select value={sys.headingFont} onChange={(e) => update({ headingFont: e.target.value })}>
                  {Object.keys(HEADING_FONTS).map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Body</span>
                <select value={sys.bodyFont} onChange={(e) => update({ bodyFont: e.target.value })}>
                  {Object.keys(BODY_FONTS).map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </label>
            </div>
            <Slider
              label="Size steps"
              value={sys.scale}
              min={1.1}
              max={1.5}
              step={0.025}
              display={sys.scale.toFixed(2)}
              onChange={(scale) => update({ scale })}
            />
            <div className="ladder">
              {TYPE_STEPS.map((t) => {
                const size = typeSize(sys.scale, t.power)
                return (
                  <div className="ladder-row" key={t.key}>
                    <span
                      style={{
                        fontFamily: `"${t.heading ? sys.headingFont : sys.bodyFont}", sans-serif`,
                        fontWeight: t.heading ? 700 : 400,
                        fontSize: size,
                        lineHeight: 1.15,
                      }}
                    >
                      {t.label}
                    </span>
                    <span className="muted small">{size}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="col-wide">
          <h2 className="tag tag-blue">Color</h2>
          {sys.colors.map((color) => {
            const shades = ramp(color.base)
            const active = color.id === editingId
            return (
              <div className="ramp" key={color.id}>
                <div className="ramp-head">
                  <span className="ramp-name">{color.name}</span>
                  {active && <span className="pill pill-yellow">Editing</span>}
                </div>
                <div className="chips">
                  {STEPS.map((step) => (
                    <button
                      key={step}
                      className={`chip${active && step === 500 ? ' chip-active' : ''}`}
                      onClick={() => setEditingId(color.id)}
                      aria-label={`Edit ${color.name}, shade ${step}, ${shades[step]}`}
                    >
                      <span className="chip-color" style={{ background: shades[step] }} />
                      <span className="chip-label">
                        <b>{step}</b>
                        <span className="muted small hex">{shades[step].toUpperCase()}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
          {sys.colors.length < MAX_COLORS && (
            <button className="btn btn-dashed" onClick={addColor}>
              Add a color
            </button>
          )}

          {editing && (
            <MixPanel
              key={editing.id}
              color={editing}
              removable={!['brand', 'accent', 'neutral'].includes(editing.id)}
              onChange={(patch) => updateColor(editing.id, patch)}
              onRemove={() => removeColor(editing.id)}
              onDone={() => setEditingId(null)}
            />
          )}
        </section>
      </div>

      <div className="columns">
        <section className="col-narrow">
          <h2 className="tag tag-yellow">Space and corners</h2>
          <div className="card">
            <div className="ruler">
              {SPACE_MULTIPLES.map((m) => (
                <div className="ruler-item" key={m}>
                  <div className="ruler-block" style={{ width: sys.space * m, height: sys.space * m }} />
                  <span className="muted small">{sys.space * m}</span>
                </div>
              ))}
            </div>
            <Slider
              label="Breathing room"
              value={sys.space}
              min={2}
              max={8}
              step={1}
              display={String(sys.space)}
              onChange={(space) => update({ space })}
            />
            <Slider
              label="Corner roundness"
              value={sys.radius}
              min={0}
              max={24}
              step={1}
              display={String(sys.radius)}
              onChange={(radius) => update({ radius })}
            />
          </div>
        </section>

        <section className="col-wide">
          <h2 className="tag tag-green">See it in use</h2>
          <div className="card sample" style={sampleVars}>
            <span className="s-badge">Badge</span>
            <span className="s-heading" style={{ fontSize: typeSize(sys.scale, 2) }}>
              Card heading
            </span>
            <p className="s-body">
              Body text sits here so you can judge the fonts, sizes and colors together. Here is{' '}
              <a href="#sample" onClick={(e) => e.preventDefault()}>
                a text link
              </a>
              .
            </p>
            <div className="s-row">
              <button className="s-btn s-btn-primary">Primary</button>
              <button className="s-btn s-btn-secondary">Secondary</button>
              <label className="s-field">
                <span>Email</span>
                <input type="email" placeholder="name@example.com" />
              </label>
            </div>
          </div>
        </section>
      </div>

      {exportOpen && <ExportDialog sys={sys} onClose={() => setExportOpen(false)} />}
      <div className="toast" role="status" aria-live="polite">
        {notice && <span>{notice}</span>}
      </div>
    </div>
  )
}

function Slider(props: {
  label: string
  value: number
  min: number
  max: number
  step: number
  display: string
  onChange: (v: number) => void
}) {
  return (
    <label className="slider">
      <span className="slider-head">
        <span>{props.label}</span>
        <span className="muted">{props.display}</span>
      </span>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </label>
  )
}

function MixPanel(props: {
  color: ColorToken
  removable: boolean
  onChange: (patch: Partial<ColorToken>) => void
  onRemove: () => void
  onDone: () => void
}) {
  const { color, onChange } = props
  const shades = ramp(color.base)
  const [hexDraft, setHexDraft] = useState(shades[500].toUpperCase())
  const setBase = (patch: Partial<Oklch>) => {
    const base = { ...color.base, ...patch }
    onChange({ base })
    setHexDraft(ramp(base)[500].toUpperCase())
  }
  const onWhite = contrast(shades[500], '#ffffff')
  const pairs = [
    { label: 'White text on it', ok: onWhite >= 4.5, ratio: onWhite },
    {
      label: 'On its lightest shade',
      ok: contrast(shades[500], shades[100]) >= 4.5,
      ratio: contrast(shades[500], shades[100]),
    },
    {
      label: 'Darkest on lightest',
      ok: contrast(shades[900], shades[100]) >= 4.5,
      ratio: contrast(shades[900], shades[100]),
    },
  ]

  return (
    <div className="mix card card-raised">
      <span className="grabber" aria-hidden="true" />
      <div className="mix-col">
        <div className="mix-title">
          <label className="visually-hidden" htmlFor="color-name">
            Color name
          </label>
          <span className="mix-word">Mix</span>
          <input
            id="color-name"
            className="mix-name"
            value={color.name}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </div>
        <label className="field">
          <span>Hex code</span>
          <input
            value={hexDraft}
            spellCheck={false}
            onChange={(e) => {
              setHexDraft(e.target.value)
              const parsed = hexToOklch(e.target.value)
              if (parsed) onChange({ base: parsed })
            }}
          />
        </label>
        <Slider
          label="Hue"
          value={color.base.h}
          min={0}
          max={360}
          step={1}
          display={String(Math.round(color.base.h))}
          onChange={(h) => setBase({ h })}
        />
        <Slider
          label="Vividness"
          value={color.base.c}
          min={0}
          max={0.3}
          step={0.005}
          display={color.base.c.toFixed(2)}
          onChange={(c) => setBase({ c })}
        />
        <Slider
          label="Lightness"
          value={color.base.l}
          min={0.3}
          max={0.85}
          step={0.005}
          display={color.base.l.toFixed(2)}
          onChange={(l) => setBase({ l })}
        />
      </div>
      <div className="mix-col">
        <span className="mix-sub">Easy to read?</span>
        {pairs.map((p) => (
          <div className="check" key={p.label}>
            <span>{p.label}</span>
            <span className={`pill ${p.ok ? 'pill-green' : 'pill-pink'}`}>
              {p.ok ? 'Yes' : 'Not quite'} · {p.ratio.toFixed(1)}
            </span>
          </div>
        ))}
        <p className="muted small">
          Aim for 4.5 or higher. Moving the sliders shifts this whole row of shades.
        </p>
        <div className="mix-actions">
          {props.removable && (
            <button className="btn" onClick={props.onRemove}>
              Remove color
            </button>
          )}
          <button className="btn btn-primary mix-done" onClick={props.onDone}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

const FORMATS = [
  { id: 'css', label: 'CSS variables', file: 'tokens.css', make: toCss },
  { id: 'json', label: 'Design tokens (JSON)', file: 'tokens.json', make: toJson },
  { id: 'tailwind', label: 'Tailwind theme', file: 'theme.css', make: toTailwind },
] as const

function ExportDialog({ sys, onClose }: { sys: System; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [format, setFormat] = useState<(typeof FORMATS)[number]['id']>('css')
  const [copied, setCopied] = useState(false)
  const current = FORMATS.find((f) => f.id === format)!
  const code = useMemo(() => current.make(sys), [current, sys])

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }
  const download = () => {
    const url = URL.createObjectURL(new Blob([code], { type: 'text/plain' }))
    const a = document.createElement('a')
    a.href = url
    a.download = current.file
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <dialog ref={ref} className="dialog" onClose={onClose} aria-labelledby="export-title">
      <div className="dialog-head">
        <h2 id="export-title">Your system is ready</h2>
        <button className="btn" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="tabs" role="tablist">
        {FORMATS.map((f) => (
          <button
            key={f.id}
            role="tab"
            aria-selected={f.id === format}
            className={`btn tab${f.id === format ? ' tab-active' : ''}`}
            onClick={() => setFormat(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <pre className="code" tabIndex={0}>
        {code}
      </pre>
      <div className="dialog-actions">
        <button className="btn btn-primary" onClick={copy}>
          {copied ? 'Copied' : 'Copy code'}
        </button>
        <button className="btn" onClick={download}>
          Download {current.file}
        </button>
      </div>
    </dialog>
  )
}
