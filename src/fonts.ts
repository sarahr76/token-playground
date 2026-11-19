import { useEffect } from 'react'
import { BODY_FONTS, HEADING_FONTS } from './tokens'

const weightsFor = (name: string): string | undefined =>
  Object.hasOwn(HEADING_FONTS, name)
    ? HEADING_FONTS[name]
    : Object.hasOwn(BODY_FONTS, name)
      ? BODY_FONTS[name]
      : undefined

/** One Google Fonts stylesheet URL for the given families. Unknown names are left out. */
export function fontsUrl(names: string[]): string | null {
  const families = [...new Set(names)].flatMap((name) => {
    const weights = weightsFor(name)
    return weights ? [`family=${name.replace(/ /g, '+')}:wght@${weights}`] : []
  })
  return families.length
    ? `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`
    : null
}

/** Load the Google Fonts a screen needs so it shows the real faces. */
export function useGoogleFonts(names: string[]) {
  const key = names.join('|')
  useEffect(() => {
    const href = fontsUrl(key ? key.split('|') : [])
    if (!href) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    document.head.appendChild(link)
    return () => link.remove()
  }, [key])
}
