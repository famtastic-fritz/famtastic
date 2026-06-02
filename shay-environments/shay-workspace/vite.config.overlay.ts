/**
 * vite.config.overlay.ts — local Shay Workspace dev overlay.
 *
 * This wraps upstream hermes-workspace's real vite config, keeps all TanStack
 * Start behavior, and adds Shay chrome injection + asset serving.
 *
 * Usage:
 *   cd ~/famtastic/shay-environments/shay-workspace
 *   PORT=3002 npx vite dev -c vite.config.overlay.ts
 */

import { join, resolve } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import type { Plugin, UserConfig } from 'vite'
import upstreamConfig from '../../_refs/hermes-workspace-v2.3/vite.config.ts'

const CHROME_DIR = resolve(__dirname, process.env.SHAY_CHROME_DIR || 'chrome')

function safeRead(path: string): string {
  try { return readFileSync(path, 'utf-8') } catch { return '' }
}

const cssContent = safeRead(join(CHROME_DIR, 'shay-chrome.css')) || '/* Shay chrome CSS missing */'
const jsContent = safeRead(join(CHROME_DIR, 'shay-chrome.js')) || '/* Shay chrome JS missing */'

const shayChromePlugin = (): Plugin => ({
  name: 'shay-chrome-inject',
  enforce: 'post',
  transformIndexHtml(html) {
    if (html.includes('id="shay-chrome-css"')) return html
    return html.replace(
      '</head>',
      `<style id="shay-chrome-css">\n${cssContent}\n</style>\n` +
      `<script id="shay-chrome-js">\n${jsContent}\n</script>\n` +
      '</head>'
    )
  },
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (!req.url?.startsWith('/shay-chrome/') || req.method !== 'GET') return next()
      const filename = req.url.replace('/shay-chrome/', '').split('?')[0]
      const filePath = join(CHROME_DIR, filename)
      if (!existsSync(filePath)) return next()

      const ext = filename.split('.').pop() || ''
      const mimes: Record<string, string> = {
        svg: 'image/svg+xml',
        png: 'image/png',
        ico: 'image/x-icon',
        webp: 'image/webp',
        json: 'application/json',
      }
      res.writeHead(200, {
        'Content-Type': mimes[ext] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      })
      res.end(readFileSync(filePath))
    })
  },
})

function materialize(config: UserConfig | (() => UserConfig)): UserConfig {
  return typeof config === 'function' ? config({ command: 'serve', mode: process.env.NODE_ENV || 'development' }) : config
}

const base = materialize(upstreamConfig as UserConfig | (() => UserConfig))

export default {
  ...base,
  root: resolve(__dirname, '../../_refs/hermes-workspace-v2.3'),
  server: {
    ...(base.server || {}),
    port: Number(process.env.PORT || 3002),
    strictPort: true,
  },
  plugins: [
    ...(base.plugins || []),
    shayChromePlugin(),
  ],
} satisfies UserConfig
