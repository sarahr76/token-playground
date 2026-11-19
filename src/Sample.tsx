import type { CSSProperties } from 'react'
import { ramp } from './color'
import { themeTokens, typeSize, type System, type Theme } from './tokens'

/** The user's own system, exposed as CSS variables for the sample card only. */
function sampleVars(sys: System, theme: Theme): CSSProperties {
  const t = Object.fromEntries(themeTokens(sys, theme))
  const brand = ramp(sys.colors[0].base)
  return {
    '--s-surface': t['color-surface'],
    '--s-brand': t['color-action'],
    '--s-brand-soft': t['color-action-soft'],
    '--s-brand-deep': theme === 'light' ? brand[700] : brand[100],
    '--s-on-brand': t['color-on-action'],
    '--s-text': t['color-text'],
    '--s-muted': t['color-text-muted'],
    '--s-line': t['color-line'],
    '--s-radius': `${sys.radius}px`,
    '--s-space': `${sys.space}px`,
    '--s-heading': `"${sys.headingFont}", sans-serif`,
    '--s-body': `"${sys.bodyFont}", sans-serif`,
  } as CSSProperties
}

export function SampleCard({ sys, compact = false, theme = 'light' }: { sys: System; compact?: boolean; theme?: Theme }) {
  return (
    <div className={`card sample${compact ? ' sample-compact' : ''}`} style={sampleVars(sys, theme)}>
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
