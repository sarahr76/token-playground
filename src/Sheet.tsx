import { useState, type Dispatch, type SetStateAction } from 'react'
import { contrast, hexToOklch, ramp, STEPS, type Oklch } from './color'
import { ExportDialog } from './Export'
import { SampleCard } from './Sample'
import {
  BODY_FONTS,
  HEADING_FONTS,
  SPACE_MULTIPLES,
  TYPE_STEPS,
  typeSize,
  type ColorToken,
  type System,
} from './tokens'
import type { Theme } from './tokens'
import { Slider, ThemeSwitch } from './ui'

const MAX_COLORS = 5
const wide = () => window.matchMedia('(min-width: 900px)').matches

type Props = {
  sys: System
  setSys: Dispatch<SetStateAction<System>>
  onShare: () => void
  onReset: () => void
}

export default function Sheet({ sys, setSys, onShare, onReset }: Props) {
  const [editingId, setEditingId] = useState<string | null>(() => (wide() ? 'brand' : null))
  const [exportOpen, setExportOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>('light')

  const update = (patch: Partial<System>) => setSys((s) => ({ ...s, ...patch }))
  const updateColor = (id: string, patch: Partial<ColorToken>) =>
    setSys((s) => ({
      ...s,
      colors: s.colors.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }))

  const editing = sys.colors.find((c) => c.id === editingId) ?? null

  const addColor = () => {
    const id = `color-${Date.now()}`
    const hue = (sys.colors[0].base.h + 120 * (sys.colors.length - 2)) % 360
    setSys((s) => ({
      ...s,
      colors: [
        ...s.colors,
        { id, name: `Color ${s.colors.length + 1}`, base: { l: 0.6, c: 0.15, h: (hue + 360) % 360 } },
      ],
    }))
    setEditingId(id)
  }
  const removeColor = (id: string) => {
    setSys((s) => ({ ...s, colors: s.colors.filter((c) => c.id !== id) }))
    setEditingId(null)
  }

  return (
    <>
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
            maxLength={60}
            onChange={(e) => update({ name: e.target.value })}
          />
          <span className="hint">Tap anything on the sheet to change it</span>
        </div>
        <div className="top-actions">
          <button type="button" className="btn" onClick={onReset}>
            Start over
          </button>
          <button type="button" className="btn" onClick={onShare}>
            Share sheet
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setExportOpen(true)}>
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
                      type="button"
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
            <button type="button" className="btn btn-dashed" onClick={addColor}>
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
          <div className="theme-head">
            <h2 className="tag tag-green">See it in use</h2>
            <ThemeSwitch value={theme} onChange={setTheme} />
          </div>
          <SampleCard sys={sys} theme={theme} />
        </section>
      </div>

      {exportOpen && <ExportDialog sys={sys} onClose={() => setExportOpen(false)} />}
    </>
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
            maxLength={40}
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
            <button type="button" className="btn" onClick={props.onRemove}>
              Remove color
            </button>
          )}
          <button type="button" className="btn btn-primary mix-done" onClick={props.onDone}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
