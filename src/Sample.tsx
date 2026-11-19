import type { CSSProperties } from 'react'
import { ramp } from './color'
import { typeSize, type System } from './tokens'

/** The user's own system, exposed as CSS variables for the sample card only. */
function sampleVars(sys: System): CSSProperties {
  const brand = ramp(sys.colors[0].base)
  const neutral = ramp((sys.colors.find((c) => c.id === 'neutral') ?? sys.colors[0]).base)
  return {
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
}

export function SampleCard({ sys, compact = false }: { sys: System; compact?: boolean }) {
  return (
    <div className={`card sample${compact ? ' sample-compact' : ''}`} style={sampleVars(sys)}>
      <span className="s-badge">Badge</span>
      <span className="s-heading" style={{ fontSize: typeSize(sys.scale, 2) }}>
        Card heading
      </span>
      <p className="s-body">
        Body text sits here so you can judge the fonts, sizes and colors together.
        {!compact && (
          <>
            {' '}
            Here is{' '}
            <a href="#sample" onClick={(e) => e.preventDefault()}>
              a text link
            </a>
            .
          </>
        )}
      </p>
      <div className="s-row">
        <button type="button" className="s-btn s-btn-primary">
          Primary
        </button>
        {!compact && (
          <>
            <button type="button" className="s-btn s-btn-secondary">
              Secondary
            </button>
            <label className="s-field">
              <span>Email</span>
              <input type="email" placeholder="name@example.com" />
            </label>
          </>
        )}
      </div>
    </div>
  )
}
