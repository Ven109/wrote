import { describe, expect, it } from 'vitest'
// @ts-expect-error – plain ESM build script without types
import { publishManifest } from './pack.mjs'

describe('publishManifest', () => {
  const pkg = { name: 'wrote', version: '1.2.3', description: 'd', license: 'AGPL-3.0-only', engines: { node: '>=22' }, private: true, dependencies: { nuxt: '^4' } }

  it('publishes the CLI and the built server with only the native database dependency', () => {
    const manifest = publishManifest(pkg, { dependencies: { '@libsql/client': '0.18.0', 'vue': '3.5.0' } })
    expect(manifest).toMatchObject({ name: 'wrote', version: '1.2.3', license: 'AGPL-3.0-only', bin: { wrote: 'dist/cli/wrote.mjs' }, dependencies: { '@libsql/client': '0.18.0' } })
    expect(manifest.files).toEqual(['dist/cli', '.output', 'README.md', 'LICENSE'])
    expect(manifest).not.toHaveProperty('private')
  })

  it('refuses an unbuilt server', () => {
    expect(() => publishManifest(pkg, {})).toThrow('build the app first')
  })
})
