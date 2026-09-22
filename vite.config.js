import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// One config file, not two: Vitest resolves the same `@` alias the app does.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const payloadProxy = env.PAYLOAD_ORIGIN
    ? {
        '/api/payload': {
          target: env.PAYLOAD_ORIGIN,
          changeOrigin: true,
          rewrite: () => env.PAYLOAD_PATH,
        },
      }
    : undefined

  return {
    plugins: [vue(), tailwindcss()],

    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },

    // The bucket sends no Access-Control-Allow-Origin, so the browser cannot
    // call it directly. Both servers proxy it instead; preview is what E2E runs against.
    server: { proxy: payloadProxy },
    preview: { proxy: payloadProxy },

    test: {
      environment: 'happy-dom',
      globals: true,
      setupFiles: ['./src/tests/setup.js'],
      include: ['src/**/*.spec.js'],
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{js,vue}'],
        exclude: ['src/tests/**', 'src/main.js'],
      },
    },
  }
})
