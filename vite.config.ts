import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    tailwindcss(), 
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'PokéSleep Optimizer',
        short_name: 'SleepOpt',
        description: 'Optimiza tus equipos de Pokémon Sleep',
        theme_color: '#4ade80',
        background_color: '#ffffff',
        icons: []
      }
    })
  ],
})
