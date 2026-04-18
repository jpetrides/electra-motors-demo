import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Two build targets share this config:
 *
 *   (default, `npm run build`)
 *     → SPA at /chat. Builds src/main.tsx → chat-app/dist/ with Vite's
 *       normal index.html pipeline. Kept as a working deep-link route
 *       for direct URL visits.
 *
 *   (`BUILD_TARGET=widget npm run build`)
 *     → Embeddable widget. Builds src/widget.tsx → chat-app/dist-widget/
 *       as a single IIFE file (elektra-chat.js) + CSS. The server then
 *       serves these under /js/elektra-chat.js and /css/elektra-chat.css
 *       so every HTML page can lazy-load them and call
 *       window.ElektraChat.mount(el).
 */
const isWidget = process.env.BUILD_TARGET === 'widget'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: isWidget ? '/' : '/chat/',
  // Vite's lib mode does NOT define process.env.NODE_ENV (unlike the SPA
  // build), since lib output is normally consumed by another bundler.
  // Our widget ships straight to the browser, so we have to inline the
  // replacement ourselves or React's CJS wrapper blows up at runtime
  // with "process is not defined".
  define: isWidget
    ? {
        'process.env.NODE_ENV': JSON.stringify('production'),
      }
    : undefined,
  build: isWidget
    ? {
        outDir: 'dist-widget',
        emptyOutDir: true,
        cssCodeSplit: false,
        lib: {
          entry: 'src/widget.tsx',
          name: 'ElektraChat',
          formats: ['iife'],
          fileName: () => 'elektra-chat.js',
        },
        rollupOptions: {
          output: {
            // Emit a stable CSS filename we can serve at /css/elektra-chat.css
            assetFileNames: assetInfo => {
              if (assetInfo.names?.some(n => n.endsWith('.css'))) return 'elektra-chat.css'
              return 'assets/[name]-[hash][extname]'
            },
          },
        },
      }
    : {
        outDir: 'dist',
        emptyOutDir: true,
      },
})
