// Bundles the `wrote` CLI (MCP over stdio) into dist/cli/wrote.mjs. Dependencies stay external.
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))

export async function buildCli(outfile = `${root}dist/cli/wrote.mjs`) {
  await build({
    entryPoints: [`${root}cli/wrote.ts`],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    packages: 'external',
    alias: { '#shared': `${root}shared` },
    banner: { js: '#!/usr/bin/env node' },
    logLevel: 'warning',
  })
  return outfile
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await buildCli()
