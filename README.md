# Token Playground

Build a small design system by tapping on a living style sheet, then export it as CSS variables, design tokens (JSON) or a Tailwind theme.

- `npm install` then `npm run dev` to work on it locally
- `npm run build` outputs the site to `dist/`

## How it is organised

- `src/color.ts`: color math (OKLCH conversion, shade ramps, contrast checks)
- `src/tokens.ts`: the system's shape, defaults, saving, and the export formats
- `src/App.tsx`: the specimen sheet, the color mixing panel and the export dialog
- `src/index.css`: the app's own "Paint chips" look
