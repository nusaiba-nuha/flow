// The handwriting font as a data URL, so a sketch drawn by the CLI or the MCP
// server looks the same wherever the SVG is opened.
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
let loaded

export function sketchFont() {
  loaded ??= readFile(
    require.resolve('@fontsource/patrick-hand/files/patrick-hand-latin-400-normal.woff2'),
  )
    .then((bytes) => `data:font/woff2;base64,${bytes.toString('base64')}`)
    .catch(() => '')
  return loaded
}
