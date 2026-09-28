import { describe, expect, it } from 'vitest'
import { smallerIcons, thinStroke } from './icons'

describe('icon theme', () => {
  it('thins the stroke of Lucide icons', () => {
    const lucide = '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M3 3h18"/></g>'
    expect(thinStroke(lucide)).toContain('stroke-width="1.5"')
    expect(thinStroke(lucide)).not.toContain('stroke-width="2"')
  })

  it('makes md/lg icons size-4 and xl icons size-5', () => {
    expect(smallerIcons('leadingIcon', 'trailingIcon')).toEqual({
      variants: {
        size: {
          md: { leadingIcon: 'size-4', trailingIcon: 'size-4' },
          lg: { leadingIcon: 'size-4', trailingIcon: 'size-4' },
          xl: { leadingIcon: 'size-5', trailingIcon: 'size-5' },
        },
      },
    })
  })
})
