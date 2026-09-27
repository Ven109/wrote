// @vitest-environment jsdom
// jsdom (not happy-dom): DOMPurify needs a spec-compliant HTML parser to be tested meaningfully.
import { describe, expect, it } from 'vitest'
import { renderMarkdown } from './markdown-html'

describe('renderMarkdown', () => {
  it('renders Markdown', () => {
    expect(renderMarkdown('**Arrival** mentions the *harbor*.')).toContain('<strong>Arrival</strong>')
    expect(renderMarkdown('- a\n- b')).toContain('<li>a</li>')
  })

  it('strips scripts, handlers and javascript: links from model output', () => {
    const html = renderMarkdown('<img src=x onerror="alert(1)"><script>alert(2)</script>[x](javascript:alert(3))')
    expect(html).not.toMatch(/onerror|<script|javascript:/)
  })
})
