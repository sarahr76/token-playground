# Token Playground

Build a small design system, then take it with you. Preview it in light and dark. Start from a color, a font, or a logo or photo, follow a 5-step guided flow (or jump to the full specimen sheet), and export it as a style guide page, CSS variables, design tokens (JSON) or a Tailwind theme.

- `npm install` then `npm run dev` to work on it locally
- `npm run build` outputs the site to `dist/` (relative paths, so it can be hosted anywhere)
- Hosting: any static host works. On Cloudflare Pages use build command `npm run build` and output directory `dist`

## How it is organised

- `src/color.ts`: color math (OKLCH conversion, shade ramps, contrast checks)
- `src/tokens.ts`: the system's shape, defaults, validation of saved and shared data, saving, and the export formats
- `src/guided.ts` and `src/Guided.tsx`: the 5-step guided start (moods, accents, pairings, image color pick)
- `src/Sheet.tsx`: the full specimen sheet with the color mixing panel
- `src/Export.tsx` and `src/styleguide.ts`: the export panel and the standalone style guide page
- `src/Sample.tsx`: the sample card styled only by your tokens, in light or dark
- `src/App.tsx`: chooses guided or sheet mode, saving, share links, start over with undo
- `src/index.css`: the app's own "Paint chips" look

Share links keep the system in the URL hash. Anything loaded from a link or from saved storage is validated before use.
