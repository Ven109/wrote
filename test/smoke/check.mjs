// Smoke check against a running Wrote (Docker image or `npx wrote`) serving a folder with the sample book:
//   node test/smoke/check.mjs http://localhost:3000 [--formats md,epub,pdf] [--version 1.2.3]
// Waits for /api/health, checks the book is listed and exports it in each format. Basic auth: SMOKE_AUTH=user:pass.
// Plain Node (no dependencies) so it runs on a clean machine.
import { parseArgs } from 'node:util'

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { formats: { type: 'string', default: 'md' }, version: { type: 'string' }, book: { type: 'string', default: 'sample-book' }, timeout: { type: 'string', default: '120' } },
})
const base = (positionals[0] ?? 'http://localhost:3000').replace(/\/$/, '')
const headers = process.env.SMOKE_AUTH ? { authorization: `Basic ${Buffer.from(process.env.SMOKE_AUTH).toString('base64')}` } : {}

/** File signatures of each export format. */
const MAGIC = { md: '---', epub: 'PK', docx: 'PK', html: '<', pdf: '%PDF-' }

function fail(message) {
  console.error(`✗ ${message}`)
  process.exit(1)
}

async function waitForHealth() {
  const deadline = Date.now() + Number(values.timeout) * 1000
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(3000) })
      if (res.ok) return res.json()
    }
    catch {
      // not up yet
    }
    await new Promise(done => setTimeout(done, 1000))
  }
  fail(`${base}/api/health did not answer within ${values.timeout}s`)
}

const health = await waitForHealth()
console.log(`✓ health ${JSON.stringify(health)}`)
if (values.version && health.version !== values.version) fail(`version ${health.version}, expected ${values.version}`)

const books = await (await fetch(`${base}/api/books`, { headers })).json()
if (!Array.isArray(books) || !books.some(book => book.id === values.book)) fail(`book "${values.book}" not listed: ${JSON.stringify(books)}`)
console.log(`✓ books: ${books.map(book => book.id).join(', ')}`)

const page = await fetch(`${base}/books/${values.book}`, { headers })
if (!page.ok) fail(`app page answered ${page.status}`)
console.log('✓ app page renders')

for (const format of values.formats.split(',').filter(Boolean)) {
  const res = await fetch(`${base}/api/books/${values.book}/export`, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ format }) })
  if (!res.ok) fail(`export ${format} answered ${res.status}: ${(await res.text()).slice(0, 500)}`)
  const bytes = Buffer.from(await res.arrayBuffer())
  const magic = MAGIC[format] ?? ''
  if (!bytes.subarray(0, magic.length).toString().startsWith(magic)) fail(`export ${format} does not look like ${format}`)
  console.log(`✓ export ${format} (${bytes.length} bytes)`)
}
console.log('Smoke test passed.')
