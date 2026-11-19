export function Slider(props: {
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

/** Light / Dark switch for previewing the system in either mode. */
export function ThemeSwitch({ value, onChange }: { value: 'light' | 'dark'; onChange: (t: 'light' | 'dark') => void }) {
  return (
    <div className="theme-switch" role="group" aria-label="Preview mode">
      {(['light', 'dark'] as const).map((t) => (
        <button key={t} type="button" aria-pressed={value === t} onClick={() => onChange(t)}>
          {t === 'light' ? 'Light' : 'Dark'}
        </button>
      ))}
    </div>
  )
}
