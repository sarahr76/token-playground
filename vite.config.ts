import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative asset paths so the built app works from any folder or host.
export default defineConfig({
  base: './',
  plugins: [react()],
})
