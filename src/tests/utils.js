import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia } from 'pinia'

import { queryClientConfig } from '@/api/queryClient.js'

/** The app's config minus retries, so a failing test fails once, not three times. */
export function createTestQueryClient() {
  return new QueryClient({
    ...queryClientConfig,
    defaultOptions: {
      ...queryClientConfig.defaultOptions,
      queries: { ...queryClientConfig.defaultOptions?.queries, retry: false },
      mutations: { retry: false },
    },
  })
}

/**
 * `useQuery` and `inject` only work inside a component instance.
 * @template T
 * @param {() => T} composable
 * @param {{ queryClient?: QueryClient }} [options]
 * @returns {{ result: T, queryClient: QueryClient, unmount: () => void }}
 */
export function withSetup(composable, { queryClient = createTestQueryClient() } = {}) {
  /** @type {any} */
  let result

  const wrapper = mount(
    defineComponent({
      setup() {
        result = composable()
        return () => h('div')
      },
    }),
    { global: { plugins: [createPinia(), [VueQueryPlugin, { queryClient }]] } },
  )

  return { result, queryClient, unmount: () => wrapper.unmount() }
}

/** @param {number} [ms] */
export const flush = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Wait on real state rather than a guessed timeout.
 * @param {() => boolean} predicate @param {number} [timeout]
 */
export async function waitUntil(predicate, timeout = 2000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    if (predicate()) return
    await flush(10)
  }
  throw new Error('waitUntil timed out')
}
