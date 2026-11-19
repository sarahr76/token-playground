import { useEffect, useMemo, useRef, useState } from 'react'
import { toStyleGuide } from './styleguide'
import { slug, toCss, toJson, toTailwind, type System } from './tokens'

const FORMATS = [
  {
    id: 'guide',
    label: 'Style guide page',
    note: 'A page anyone can open. No code needed.',
    file: (sys: System) => `${slug(sys.name)}-style-guide.html`,
    mime: 'text/html',
    make: toStyleGuide,
  },
  {
    id: 'css',
    label: 'CSS variables',
    note: "Paste into any website's stylesheet.",
    file: () => 'tokens.css',
    mime: 'text/css',
    make: toCss,
  },
  {
    id: 'json',
    label: 'Design tokens (JSON)',
    note: 'For design tools and build pipelines.',
    file: () => 'tokens.json',
    mime: 'application/json',
    make: toJson,
  },
  {
    id: 'tailwind',
    label: 'Tailwind theme',
    note: 'A ready-made theme block.',
    file: () => 'theme.css',
    mime: 'text/css',
    make: toTailwind,
  },
] as const

type FormatId = (typeof FORMATS)[number]['id']

export function ExportPanel({ sys }: { sys: System }) {
  const [format, setFormat] = useState<FormatId>('css')
  const [copy, setCopy] = useState<'idle' | 'done' | 'failed'>('idle')
  const current = FORMATS.find((f) => f.id === format)!
  const code = useMemo(() => current.make(sys), [current, sys])
  const file = current.file(sys)

  useEffect(() => {
    if (copy === 'idle') return
    const t = setTimeout(() => setCopy('idle'), 2500)
    return () => clearTimeout(t)
  }, [copy])

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopy('done')
    } catch {
      setCopy('failed')
    }
  }
  const download = () => {
    const url = URL.createObjectURL(new Blob([code], { type: current.mime }))
    const a = document.createElement('a')
    a.href = url
    a.download = file
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="export">
      <div className="formats" role="group" aria-label="Export format">
        {FORMATS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`opt opt-text${f.id === format ? ' opt-selected' : ''}`}
            aria-pressed={f.id === format}
            onClick={() => setFormat(f.id)}
          >
            <span className="opt-title">{f.label}</span>
            <span className="opt-note">{f.note}</span>
          </button>
        ))}
      </div>
      <pre className="code" tabIndex={0} aria-label={`${current.label} code`}>
        {code}
      </pre>
      <div className="export-actions">
        <button type="button" className="btn btn-primary" onClick={copyCode}>
          {copy === 'done' ? 'Copied' : 'Copy code'}
        </button>
        <button type="button" className="btn" onClick={download}>
          Download {file}
        </button>
      </div>
      <p className="muted small export-note" role="status">
        {copy === 'failed' ? 'Copying is blocked here. Select the code above and copy it.' : ''}
      </p>
    </div>
  )
}

export function ExportDialog({ sys, onClose }: { sys: System; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    ref.current?.showModal()
  }, [])

  return (
    <dialog ref={ref} className="dialog" onClose={onClose} aria-labelledby="export-title">
      <div className="dialog-head">
        <h2 id="export-title">Your system is ready</h2>
        <button type="button" className="btn" onClick={onClose}>
          Close
        </button>
      </div>
      <ExportPanel sys={sys} />
    </dialog>
  )
}
