import { fileURLToPath } from 'node:url'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  root: 'app',
  publicDir: '../public',
  resolve: {
    alias: { '/src': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  envDir: '..',
  base: command === 'build' ? '/Little_Luxe_Sample/' : '/',
  build: { outDir: '../dist', emptyOutDir: true },
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      routesDirectory: '../src/routes',
      generatedRouteTree: '../src/routeTree.gen.ts',
    }),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icons.svg', 'pwa/*.png'],
      manifest: {
        id: '/Little_Luxe_Sample/',
        name: 'Little Luxe', short_name: 'Little Luxe',
        description: 'Shop and manage your Little Luxe store.',
        start_url: '/Little_Luxe_Sample/', scope: '/Little_Luxe_Sample/',
        display: 'standalone', theme_color: '#79543f', background_color: '#ffffff',
        icons: [
          { src: 'pwa/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{html,js,css,woff,woff2,ttf,otf}'],
        globIgnores: ['404.html', '**/*.map'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/\/pwa-version\.json$/, /\/auth\/v1\//, /\/rest\/v1\//],
        runtimeCaching: [],
        cleanupOutdatedCaches: true,
        skipWaiting: false,
        clientsClaim: true,
      },
    })
  ],
}))
