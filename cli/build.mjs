// Bundles the `wrote` CLI into dist/cli/wrote.mjs: the launcher (`wrote [folder]`) and MCP over stdio (`wrote mcp`).
// Everything is inlined except libsql, whose native binary is platform-specific and installed by npm per platform,
// so the published package only depends on `libsql` (see cli/pack.mjs).
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))

/** Packages the bundle leaves external; they must be dependencies of the published package. */
export const CLI_EXTERNALS = ['libsql', '@libsql/*']

export async function buildCli(outfile = `${root}dist/cli/wrote.mjs`) {
  await build({
    entryPoints: [`${root}cli/wrote.ts`],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    external: CLI_EXTERNALS,
    alias: { '#shared': `${root}shared` },
    // Bundled CommonJS dependencies call `require`, which ESM output lacks.
    banner: { js: '#!/usr/bin/env node\nimport { createRequire as __wroteCreateRequire } from \'node:module\';\nconst require = __wroteCreateRequire(import.meta.url);' },
    logLevel: 'warning',
  })
  return outfile
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await buildCli()
