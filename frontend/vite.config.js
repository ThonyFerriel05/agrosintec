import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Puerto fijo: si 5173 esta ocupado, Vite FALLA en vez de saltar a 5174
    // (asi el origen siempre coincide con el CORS del backend).
    port: 5173,
    strictPort: true,
  },
})
