import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  root: 'app',
  publicDir: '../public',
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
    babel({ presets: [reactCompilerPreset()] })
  ],
}))
