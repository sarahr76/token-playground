import { useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { contrast, hexToOklch, oklchToHex, ramp, STEPS, type Oklch } from './color'
import { ExportPanel } from './Export'
import { useGoogleFonts } from './fonts'
import {
  ACCENTS,
  accentFor,
  applyDerived,
  applyMood,
  bodyFor,
  colorFromImage,
  CORNERS,
  FEELS,
  GREYS,
  hueName,
  MOODS,
  PAIRINGS,
  ROOMS,
  type AccentKind,
  type GreyId,
  type Mood,
} from './guided'
import { SampleCard } from './Sample'
import { ThemeSwitch } from './ui'
import { BODY_FONTS, HEADING_FONTS, type System, type Theme } from './tokens'

const STEP_NAMES = ['Start', 'Color', 'Type', 'Space and corners', 'Export'] as const
type Step = 1 | 2 | 3 | 4 | 5
type StartKind = 'color' | 'font' | 'image'

type Props = {
  sys: System
  setSys: Dispatch<SetStateAction<System>>
  onBuild: () => void
  onFinish: () => void
  onShare: () => void
}

function Opt(props: { selected: boolean; onClick: () => void; className?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      className={`opt${props.selected ? ' opt-selected' : ''}${props.className ? ` ${props.className}` : ''}`}
      aria-pressed={props.selected}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  )
}

function PickChip(props: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      className={`pickchip${props.selected ? ' pickchip-on' : ''}`}
      aria-pressed={props.selected}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  )
}

export default function Guided({ sys, setSys, onBuild, onFinish, onShare }: Props) {
  const [step, setStep] = useState<Step>(1)
  const [maxStep, setMaxStep] = useState<Step>(1)
  const [startKind, setStartKind] = useState<StartKind>('color')
  const [mood, setMood] = useState<Mood | null>(null)
  const [accent, setAccent] = useState<AccentKind>('opposite')
  const [grey, setGrey] = useState<GreyId>('cool')
  const brand = sys.colors[0].base
  const brandHex = oklchToHex(brand)
  const [hexDraft, setHexDraft] = useState(brandHex.toUpperCase())
  const [imageNote, setImageNote] = useState('')
  const [ownFonts, setOwnFonts] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>('light')
  const headingRef = useRef<HTMLHeadingElement>(null)
  const firstRender = useRef(true)

  useGoogleFonts(step === 3 ? PAIRINGS.flatMap((p) => [p.heading, p.body]) : [])

  // Move focus to the new step's heading so keyboard and screen reader users land in the right place.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    window.scrollTo(0, 0)
    headingRef.current?.focus()
  }, [step])

  const go = (next: Step) => {
    setStep(next)
    setMaxStep((m) => (next > m ? next : m))
    setPreviewOpen(false)
  }

  const setBrand = (base: Oklch) =>
    setSys((s) => ({ ...s, colors: s.colors.map((c, i) => (i === 0 ? { ...c, base } : c)) }))

  const onHex = (value: string) => {
    setHexDraft(value)
    const parsed = hexToOklch(value)
    if (parsed) setBrand(parsed)
  }
  const hexValid = hexToOklch(hexDraft) !== null

  const onImage = async (file: File | undefined) => {
    if (!file) return
    setImageNote('Looking at your image...')
    const picked = await colorFromImage(file)
    if (!picked) {
      setImageNote('That image is mostly black, white or grey, so there is no color to pick. Type one instead.')
      return
    }
    setBrand(picked)
    setHexDraft(oklchToHex(picked).toUpperCase())
    setImageNote('We picked this color from your image. Change it below if you like.')
  }

  const build = () => {
    setSys((s) => applyDerived(s, accent, grey))
    onBuild()
    go(2)
  }

  const shades = ramp(brand)
  const onWhite = contrast(shades[500], '#ffffff')
  const readable = onWhite >= 4.5
  const darken = () => {
    let b = brand
    for (let i = 0; i < 60 && contrast(oklchToHex(b), '#ffffff') < 4.5; i++) b = { ...b, l: b.l - 0.01 }
    setBrand(b)
    setHexDraft(oklchToHex(b).toUpperCase())
  }

  const accentHex = ramp(sys.colors.find((c) => c.id === 'accent')?.base ?? brand)[500]
  const status = (own: Step) => (step === own ? 'In progress' : step > own ? 'Done' : 'Not yet')

  return (
    <>
      <header className="top">
        <span className="brand-name">Token Playground</span>
        <ol className="stepper" aria-label="Steps">
          {STEP_NAMES.map((name, i) => {
            const n = (i + 1) as Step
            const state = n === step ? 'current' : n < step ? 'done' : 'todo'
            return (
              <li key={name}>
                <button
                  type="button"
                  className={`step-pill step-${state}`}
                  aria-current={n === step ? 'step' : undefined}
                  disabled={n > maxStep}
                  onClick={() => go(n)}
                >
                  {n} {name}
                </button>
              </li>
            )
          })}
        </ol>
        <div className="progress">
          <span className="progress-label">
            Step {step} of 5: {STEP_NAMES[step - 1]}
          </span>
          <span className="progress-bar" aria-hidden="true">
            {STEP_NAMES.map((name, i) => (
              <span key={name} className={`progress-seg${i + 1 === step ? ' seg-current' : i + 1 < step ? ' seg-done' : ''}`} />
            ))}
          </span>
        </div>
      </header>

      <div className="columns g-columns">
        <main className="g-main">
          {step === 1 && (
            <>
              <div className="g-intro">
                <h1 ref={headingRef} tabIndex={-1}>Start with one thing you already have</h1>
                <p>Give us a single starting point and we will build the rest around it. You can change everything later.</p>
              </div>

              <div className="opt-grid" role="group" aria-label="Your starting point">
                <Opt selected={startKind === 'color'} onClick={() => setStartKind('color')}>
                  <span className="dot" style={{ background: brandHex }} aria-hidden="true" />
                  <span className="opt-title">A color</span>
                </Opt>
                <Opt selected={startKind === 'font'} onClick={() => setStartKind('font')}>
                  <span className="opt-aa" style={{ fontFamily: `"${sys.headingFont}", sans-serif` }} aria-hidden="true">Aa</span>
                  <span className="opt-title">A font</span>
                </Opt>
                <Opt selected={startKind === 'image'} onClick={() => setStartKind('image')}>
                  <span className="dashed-box" aria-hidden="true" />
                  <span className="opt-title">A logo or photo</span>
                </Opt>
              </div>

              {startKind === 'font' && (
                <label className="field g-field">
                  <span>Your heading font</span>
                  <select
                    value={sys.headingFont}
                    onChange={(e) => setSys((s) => ({ ...s, headingFont: e.target.value, bodyFont: bodyFor(e.target.value) }))}
                  >
                    {Object.keys(HEADING_FONTS).map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                </label>
              )}
              {startKind === 'image' && (
                <div className="field g-field">
                  <label htmlFor="start-image">Choose an image</label>
                  <input id="start-image" type="file" accept="image/*" onChange={(e) => onImage(e.target.files?.[0])} />
                  <p className="muted small g-note" role="status">{imageNote}</p>
                </div>
              )}

              <div className="field g-field">
                <label htmlFor="start-hex">Your color</label>
                <span className="hexbox">
                  <input
                    className="hexbox-picker"
                    type="color"
                    aria-label="Pick a color"
                    value={brandHex}
                    onChange={(e) => onHex(e.target.value.toUpperCase())}
                  />
                  <input
                    id="start-hex"
                    value={hexDraft}
                    spellCheck={false}
                    aria-invalid={!hexValid}
                    aria-describedby="hex-help"
                    onChange={(e) => onHex(e.target.value)}
                  />
                </span>
                <span id="hex-help" className="muted small" role="status">
                  {hexValid ? '' : 'Type a hex code like #2F5BD7.'}
                </span>
              </div>

              <div className="g-group">
                <span className="g-label">How should it feel?</span>
                <div className="chip-row" role="group" aria-label="Mood">
                  {MOODS.map((m) => (
                    <PickChip
                      key={m.id}
                      selected={mood === m.id}
                      onClick={() => {
                        if (mood === m.id) {
                          setMood(null)
                        } else {
                          setMood(m.id)
                          setSys((s) => applyMood(s, m.id))
                        }
                      }}
                    >
                      {m.label}
                    </PickChip>
                  ))}
                </div>
                <p className="muted small g-note">This picks starting fonts, corners and spacing. You can change each one in the next steps.</p>
              </div>

              <div className="g-actions">
                <button type="button" className="btn btn-big btn-primary" onClick={build}>Build my palette</button>
                <button type="button" className="linkbtn" onClick={() => { onBuild(); onFinish() }}>
                  Skip to the full sheet
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="g-intro">
                <h1 ref={headingRef} tabIndex={-1}>Here is your palette</h1>
                <p>We built these shades from your color. You can fine-tune any of them later on the full sheet.</p>
              </div>

              <div className="g-group">
                <span className="g-label">Your brand color, light to dark</span>
                <div className="chips">
                  {STEPS.map((s) => (
                    <div className="chip chip-static" key={s}>
                      <span className="chip-color" style={{ background: shades[s] }} />
                      <span className="chip-label">
                        <b>{s}</b>
                        <span className="muted small hex">{shades[s].toUpperCase()}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="g-group">
                <span className="g-label">Pick a second color for highlights</span>
                <div className="opt-grid" role="group" aria-label="Highlight color">
                  {ACCENTS.map((a) => {
                    const base = accentFor(brand, a.id)
                    return (
                      <Opt
                        key={a.id}
                        className="opt-row"
                        selected={accent === a.id}
                        onClick={() => {
                          setAccent(a.id)
                          setSys((s) => applyDerived(s, a.id, grey))
                        }}
                      >
                        <span className="dot" style={{ background: oklchToHex(base) }} aria-hidden="true" />
                        <span className="opt-text-col">
                          <span className="opt-title">{a.label}</span>
                          <span className="opt-note">{hueName(base.h)}. {a.note}.</span>
                        </span>
                      </Opt>
                    )
                  })}
                </div>
              </div>

              <div className="g-group">
                <span className="g-label">Greys for text and backgrounds</span>
                <div className="chip-row" role="group" aria-label="Grey tone">
                  {GREYS.map((g) => (
                    <PickChip
                      key={g.id}
                      selected={grey === g.id}
                      onClick={() => {
                        setGrey(g.id)
                        setSys((s) => applyDerived(s, accent, g.id))
                      }}
                    >
                      {g.label}
                    </PickChip>
                  ))}
                </div>
              </div>

              <div className="g-readable">
                <span className={`pill ${readable ? 'pill-green' : 'pill-pink'}`}>{readable ? 'Easy to read' : 'Hard to read'}</span>
                <span className="muted">
                  {readable
                    ? 'White text on your brand color passes.'
                    : 'White text on your brand color is hard to read.'}
                </span>
                {!readable && (
                  <button type="button" className="btn" onClick={darken}>Darken it a little</button>
                )}
              </div>

              <div className="g-actions">
                <button type="button" className="btn btn-big" onClick={() => go(1)}>Back</button>
                <button type="button" className="btn btn-big btn-primary" onClick={() => go(3)}>Looks good, next</button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="g-intro">
                <h1 ref={headingRef} tabIndex={-1}>Pick a voice for your words</h1>
                <p>Each pair has one font for headings and one for everyday text. All of them are free to use.</p>
              </div>

              <div className="opt-grid" role="group" aria-label="Font pairing">
                {PAIRINGS.map((p) => (
                  <Opt
                    key={p.id}
                    className="opt-tall"
                    selected={sys.headingFont === p.heading && sys.bodyFont === p.body}
                    onClick={() => setSys((s) => ({ ...s, headingFont: p.heading, bodyFont: p.body }))}
                  >
                    <span className="opt-text-col">
                      <span className="opt-sample" style={{ fontFamily: `"${p.heading}", sans-serif`, fontWeight: 700 }}>{p.label}</span>
                      <span className="opt-note" style={{ fontFamily: `"${p.body}", sans-serif` }}>{p.blurb}</span>
                    </span>
                    <span className="opt-fonts">{p.heading} + {p.body}</span>
                  </Opt>
                ))}
              </div>

              <button type="button" className="linkbtn" aria-expanded={ownFonts} onClick={() => setOwnFonts((o) => !o)}>
                {ownFonts ? 'Hide my own fonts' : 'Choose my own fonts'}
              </button>
              {ownFonts && (
                <div className="field-row">
                  <label className="field">
                    <span>Headings</span>
                    <select value={sys.headingFont} onChange={(e) => setSys((s) => ({ ...s, headingFont: e.target.value }))}>
                      {Object.keys(HEADING_FONTS).map((f) => <option key={f}>{f}</option>)}
                    </select>
                  </label>
                  <label className="field">
                    <span>Body</span>
                    <select value={sys.bodyFont} onChange={(e) => setSys((s) => ({ ...s, bodyFont: e.target.value }))}>
                      {Object.keys(BODY_FONTS).map((f) => <option key={f}>{f}</option>)}
                    </select>
                  </label>
                </div>
              )}

              <div className="g-group">
                <span className="g-label">How big should text feel?</span>
                <div className="chip-row" role="group" aria-label="Text size">
                  {FEELS.map((f) => (
                    <PickChip key={f.id} selected={sys.scale === f.scale} onClick={() => setSys((s) => ({ ...s, scale: f.scale }))}>
                      {f.label}
                    </PickChip>
                  ))}
                </div>
              </div>

              <div className="g-actions">
                <button type="button" className="btn btn-big" onClick={() => go(2)}>Back</button>
                <button type="button" className="btn btn-big btn-primary" onClick={() => go(4)}>Looks good, next</button>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div className="g-intro">
                <h1 ref={headingRef} tabIndex={-1}>Sharp or soft?</h1>
                <p>Corners and breathing room change the mood more than most people expect. Watch the sample card as you pick.</p>
              </div>

              <div className="g-group">
                <span className="g-label">Corners</span>
                <div className="opt-grid" role="group" aria-label="Corners">
                  {CORNERS.map((c) => (
                    <Opt key={c.id} selected={sys.radius === c.radius} onClick={() => setSys((s) => ({ ...s, radius: c.radius }))}>
                      <span className="corner-demo" style={{ background: brandHex, borderRadius: c.radius }} aria-hidden="true" />
                      <span className="opt-title">{c.label}</span>
                    </Opt>
                  ))}
                </div>
              </div>

              <div className="g-group">
                <span className="g-label">Breathing room</span>
                <div className="opt-grid" role="group" aria-label="Breathing room">
                  {ROOMS.map((r) => (
                    <Opt key={r.id} selected={sys.space === r.space} onClick={() => setSys((s) => ({ ...s, space: r.space }))}>
                      <span className="room-demo" style={{ gap: r.gap }} aria-hidden="true">
                        <span /><span /><span />
                      </span>
                      <span className="opt-title">{r.label}</span>
                    </Opt>
                  ))}
                </div>
              </div>

              <div className="g-actions">
                <button type="button" className="btn btn-big" onClick={() => go(3)}>Back</button>
                <button type="button" className="btn btn-big btn-primary" onClick={() => go(5)}>Finish my system</button>
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <div className="g-intro">
                <h1 ref={headingRef} tabIndex={-1}>Your system is ready</h1>
                <p>Take it with you in whichever form helps. Not sure? The style guide page is the one to send to whoever builds your site.</p>
              </div>

              <ExportPanel sys={sys} />

              <div className="g-actions">
                <button type="button" className="btn btn-big" onClick={() => go(4)}>Back</button>
                <button type="button" className="btn btn-big" onClick={onShare}>Copy share link</button>
                <button type="button" className="linkbtn" onClick={onFinish}>Keep fine-tuning on the full sheet</button>
              </div>
            </>
          )}
        </main>

        <aside className={`g-aside${previewOpen ? ' g-aside-open' : ''}`}>
          <button
            type="button"
            className="preview-toggle"
            aria-expanded={previewOpen}
            aria-controls="g-preview"
            onClick={() => setPreviewOpen((o) => !o)}
          >
            <span className="preview-toggle-left">
              <span className="preview-toggle-title">Your system so far</span>
              <span className="swatch-strip" aria-hidden="true">
                {STEPS.map((s) => <span key={s} style={{ background: shades[s] }} />)}
                <span style={{ background: accentHex }} />
              </span>
            </span>
            <span className="preview-toggle-action">{previewOpen ? 'Hide' : 'Preview'}</span>
          </button>
          <div id="g-preview" className="preview-body">
            <div className="theme-head">
              <h2 className="tag tag-blue">Your system so far</h2>
              <ThemeSwitch value={theme} onChange={setTheme} />
            </div>
            <div className="card card-raised">
              <SampleCard sys={sys} compact theme={theme} />
              <ul className="status-list">
                {([['Color', 2], ['Type', 3], ['Space and corners', 4]] as const).map(([label, own]) => (
                  <li key={label}>
                    <span>{label}</span>
                    <span className={`pill ${step > own ? 'pill-green' : step === own ? 'pill-yellow' : 'pill-plain'}`}>{status(own)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </>
  )
}
