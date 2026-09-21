/**
 * Query client options, as specified in the brief.
 *
 * Note: the brief spells the key `degaultOptions`. That is a typo in the source
 * document, so it is corrected here to `defaultOptions`, the real TanStack key.
 *
 * The annotation matters: without it, `networkMode: 'always'` widens to `string`,
 * and TanStack expects the union `'online' | 'always' | 'offlineFirst'`. Typing
 * the export fixes it here rather than at every call site.
 *
 * @type {import('@tanstack/vue-query').QueryClientConfig}
 */
export const queryClientConfig = {
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      networkMode: 'always',
      staleTime: Infinity,
      gcTime: 60 * 60 * 1000,
    },
  },
}
