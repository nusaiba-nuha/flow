/**
 * The brief spells this key `degaultOptions`; corrected here.
 * Typed, or `networkMode: 'always'` widens to `string` and is rejected.
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
