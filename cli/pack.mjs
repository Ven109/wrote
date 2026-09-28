// Stages the npm package in dist/npm (run after `pnpm build`) and, with --pack, packs it into a tarball.
// The repo's package.json stays private with the full dev dependency tree; the published package only ships the
// CLI bundle and the self-contained Nitro build (.output), plus @libsql/client so npm installs the native libsql
// binary for the user's platform (the one traced into .output is only for the build machine).
import { execFileSync } from 'node:child_process'
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const out = `${root}dist/npm/`

const readJson = async path => JSON.parse(await readFile(path, 'utf8'))

/** The published manifest, derived from the repo's package.json and the built server's dependency versions. */
export function publishManifest(pkg, serverPkg) {
  const libsql = serverPkg.dependencies?.['@libsql/client']
  if (!libsql) throw new Error('.output/server/package.json has no @libsql/client – build the app first.')
  return {
    name: pkg.name,
    version: pkg.version,
    description: pkg.description,
    license: pkg.license,
    type: 'module',
    keywords: ['writing', 'book', 'novel', 'markdown', 'ai', 'mcp'],
    homepage: 'https://github.com/Ven109/wrote',
    repository: { type: 'git', url: 'git+https://github.com/Ven109/wrote.git' },
    bugs: 'https://github.com/Ven109/wrote/issues',
    engines: pkg.engines,
    bin: { wrote: 'dist/cli/wrote.mjs' },
    files: ['dist/cli', '.output', 'README.md', 'LICENSE'],
    dependencies: { '@libsql/client': libsql },
  }
}

async function stage() {
  for (const required of ['dist/cli/wrote.mjs', '.output/server/index.mjs']) {
    if (!existsSync(`${root}${required}`)) throw new Error(`${required} is missing – run \`pnpm build\` first.`)
  }
  const manifest = publishManifest(await readJson(`${root}package.json`), await readJson(`${root}.output/server/package.json`))
  await rm(out, { recursive: true, force: true })
  await mkdir(`${out}dist`, { recursive: true })
  await cp(`${root}dist/cli`, `${out}dist/cli`, { recursive: true })
  // Nitro links packages needed in several versions (node_modules/x → .nitro/x@1.2.3); npm drops symlinks.
  await cp(`${root}.output`, `${out}.output`, { recursive: true, dereference: true })
  for (const file of ['README.md', 'LICENSE']) {
    if (existsSync(`${root}${file}`)) await cp(`${root}${file}`, `${out}${file}`)
  }
  await writeFile(`${out}package.json`, `${JSON.stringify(manifest, null, 2)}\n`)
  return manifest
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const manifest = await stage()
  console.log(`Staged ${manifest.name}@${manifest.version} in dist/npm`)
  if (process.argv.includes('--pack')) {
    execFileSync('npm', ['pack', '--pack-destination', `${root}dist`], { cwd: out, stdio: 'inherit' })
  }
}
