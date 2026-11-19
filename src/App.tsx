import { useCallback, useEffect, useState } from 'react'
import { useGoogleFonts } from './fonts'
import Guided from './Guided'
import Sheet from './Sheet'
import {
  clearSystem,
  DEFAULT_SYSTEM,
  encodeShare,
  loadSystem,
  saveSystem,
  type System,
} from './tokens'

type Toast = { message: string; action?: { label: string; run: () => void } }

export default function App() {
  const [boot] = useState(loadSystem)
  const [sys, setSys] = useState<System>(boot.system)
  // A first visit starts with the guided steps; a returning visitor or a shared link goes to the sheet.
  const [mode, setMode] = useState<'guided' | 'sheet'>(boot.source === 'none' ? 'guided' : 'sheet')
  const [saveOn, setSaveOn] = useState(boot.source === 'saved')
  const [runKey, setRunKey] = useState(0)
  const [toast, setToast] = useState<Toast | null>(
    boot.source === 'link' ? { message: 'Opened a shared system' } : null,
  )

  const notify = useCallback((message: string, action?: Toast['action']) => setToast({ message, action }), [])

  useGoogleFonts([sys.headingFont, sys.bodyFont])

  // A shared link is shown as-is, and only becomes this browser's saved system once it is edited.
  const editedSharedLink = boot.source === 'link' && mode === 'sheet' && sys !== boot.system
  const saving = saveOn || editedSharedLink
  useEffect(() => {
    if (saving) saveSystem(sys)
  }, [saving, sys])

  useEffect(() => {
    if (boot.source === 'link') history.replaceState(null, '', location.pathname + location.search)
  }, [boot.source])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), toast.action ? 7000 : 2500)
    return () => clearTimeout(t)
  }, [toast])

  const share = async () => {
    const url = `${location.origin}${location.pathname}#s=${encodeShare(sys)}`
    try {
      await navigator.clipboard.writeText(url)
      notify('Share link copied')
    } catch {
      notify('Copying is blocked here, so the link is in the address bar')
      location.hash = `s=${encodeShare(sys)}`
    }
  }

  const reset = () => {
    const previous = sys
    clearSystem()
    setSaveOn(false)
    setSys(DEFAULT_SYSTEM)
    setRunKey((k) => k + 1)
    setMode('guided')
    window.scrollTo(0, 0)
    notify('Started over', {
      label: 'Undo',
      run: () => {
        setSys(previous)
        setSaveOn(true)
        setMode('sheet')
      },
    })
  }

  const toSheet = () => {
    setMode('sheet')
    window.scrollTo(0, 0)
  }

  return (
    <div className="page">
      {mode === 'guided' ? (
        <Guided
          key={runKey}
          sys={sys}
          setSys={setSys}
          onBuild={() => setSaveOn(true)}
          onFinish={toSheet}
          onShare={share}
        />
      ) : (
        <Sheet sys={sys} setSys={setSys} onShare={share} onReset={reset} />
      )}

      <div className="toast" role="status" aria-live="polite">
        {toast && (
          <span>
            {toast.message}
            {toast.action && (
              <button
                type="button"
                className="toast-action"
                onClick={() => {
                  toast.action?.run()
                  setToast(null)
                }}
              >
                {toast.action.label}
              </button>
            )}
          </span>
        )}
      </div>
    </div>
  )
}
