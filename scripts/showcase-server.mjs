#!/usr/bin/env node
// Zero-dependency static server for the booth. `npx serve` needed node_modules
// on the booth machine to avoid a network fetch; this needs only Node itself,
// so `dist/` plus this script is the whole deployment.
import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { extname, join, normalize, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = fileURLToPath(new URL('.', import.meta.url))
const distRoot = resolve(scriptDir, '..', process.argv[2] ?? 'dist')
const port = Number(process.env.SHOWCASE_PORT ?? 4330)

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/vnd.microsoft.icon',
  '.webmanifest': 'application/manifest+json',
}

function mimeType(filePath) {
  return MIME_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
}

// astro.config.mjs sets build.format: 'file', so `/de/showcase` is the file
// `de/showcase.html`, not a directory with an index.html inside it.
async function resolveDistFile(pathname) {
  const relPath = decodeURIComponent(pathname).replace(/^\/+/, '')
  const candidates =
    relPath === ''
      ? ['index.html']
      : extname(relPath)
        ? [relPath]
        : [`${relPath}.html`, join(relPath, 'index.html')]

  for (const candidate of candidates) {
    // path-escape guard: normalize, then require the result to stay under distRoot.
    const absolute = normalize(join(distRoot, candidate))
    if (absolute !== distRoot && !absolute.startsWith(distRoot + sep)) continue

    try {
      const stats = await stat(absolute)
      if (stats.isFile()) return absolute
    } catch {
      // candidate does not exist, try the next one
    }
  }
  return null
}

function parseRange(rangeHeader, size) {
  if (!rangeHeader || !rangeHeader.startsWith('bytes=') || rangeHeader.includes(',')) return null

  const [startStr, endStr] = rangeHeader.slice('bytes='.length).split('-')
  let start
  let end

  if (startStr === '') {
    const suffixLength = Number(endStr)
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return null
    start = Math.max(size - suffixLength, 0)
    end = size - 1
  } else {
    start = Number(startStr)
    end = endStr === '' ? size - 1 : Number(endStr)
  }

  if (!Number.isInteger(start) || !Number.isInteger(end) || start > end || start >= size) {
    return 'unsatisfiable'
  }
  return { start, end: Math.min(end, size - 1) }
}

function streamFile(res, filePath, options) {
  const stream = createReadStream(filePath, options)
  stream.on('error', () => {
    if (!res.headersSent) res.writeHead(500)
    res.end()
  })
  res.on('close', () => stream.destroy())
  stream.pipe(res)
}

async function sendNotFound(res) {
  const notFoundPath = join(distRoot, '404.html')
  try {
    const stats = await stat(notFoundPath)
    res.writeHead(404, { 'Content-Type': mimeType(notFoundPath), 'Content-Length': stats.size })
    streamFile(res, notFoundPath)
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('404 Not Found')
  }
}

const server = createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' })
    res.end()
    return
  }

  const { pathname } = new URL(req.url, 'http://localhost')
  const filePath = await resolveDistFile(pathname)

  if (!filePath) {
    await sendNotFound(res)
    return
  }

  const stats = await stat(filePath)
  const range = parseRange(req.headers.range, stats.size)

  if (range === 'unsatisfiable') {
    res.writeHead(416, { 'Content-Range': `bytes */${stats.size}` })
    res.end()
    return
  }

  const headers = { 'Content-Type': mimeType(filePath), 'Accept-Ranges': 'bytes' }

  if (range) {
    headers['Content-Range'] = `bytes ${range.start}-${range.end}/${stats.size}`
    headers['Content-Length'] = range.end - range.start + 1
    res.writeHead(206, headers)
  } else {
    headers['Content-Length'] = stats.size
    res.writeHead(200, headers)
  }

  if (req.method === 'HEAD') {
    res.end()
    return
  }

  streamFile(res, filePath, range ? { start: range.start, end: range.end } : undefined)
})

const distStats = await stat(distRoot).catch(() => null)
if (!distStats?.isDirectory()) {
  console.error(`dist-Verzeichnis fehlt: ${distRoot}. Erst 'pnpm showcase:build' ausführen.`)
  process.exit(1)
}

server.on('error', (error) => {
  console.error(`Server-Fehler: ${error.message}`)
  process.exit(1)
})

server.listen(port, () => {
  console.log(`Standtafel liefert ${distRoot} auf http://localhost:${port}`)
})
