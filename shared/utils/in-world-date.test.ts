import { describe, expect, it } from 'vitest'
import type { TimelineConfig } from '../schemas/timeline'
import { formatInWorldDate, parseInWorldDate } from './in-world-date'

const frost: TimelineConfig = {
  calendars: [{ id: 'reckoning', name: 'Northern Reckoning', era: 'AE', months: [{ name: 'Thaw', days: 30 }, { name: 'Bloom', days: 40 }, { name: 'Frostmonth', days: 20 }] }],
}
const key = (text: string, config?: TimelineConfig) => parseInWorldDate(text, config)?.key ?? null
const order = (texts: string[], config?: TimelineConfig) => [...texts].sort((a, b) => key(a, config)! - key(b, config)!)

describe('parseInWorldDate', () => {
  it('orders ISO dates, partial dates and times, across year and century boundaries', () => {
    expect(order(['1890-05-12T14:30', '1890', '1889-12-31', '1890-05-12', '1890-05', '2000-02-29', '1900-03-01'])).toEqual(['1889-12-31', '1890', '1890-05', '1890-05-12', '1890-05-12T14:30', '1900-03-01', '2000-02-29'])
    expect(key('1890-05-13')! - key('1890-05-12')!).toBe(1)
    expect(key('1900-03-01')! - key('1900-02-28')!).toBe(1)
    expect(key('2000-03-01')! - key('2000-02-28')!).toBe(2)
    expect(parseInWorldDate('1890-13-01')).toBeNull()
  })

  it('orders relative days with times of day, and anchors them to a start date', () => {
    expect(order(['Day 3', 'Day 1', 'Day 2, evening', 'Day 2', 'Day 2 07:15', 'Day 10'])).toEqual(['Day 1', 'Day 2', 'Day 2 07:15', 'Day 2, evening', 'Day 3', 'Day 10'])
    const anchored = { calendars: [], start: '1890-05-10' }
    expect(key('Day 3', anchored)).toBe(key('1890-05-12'))
    expect(order(['1890-05-11', 'Day 1', 'Day 3', '1890-05-11T12:00'], anchored)).toEqual(['Day 1', '1890-05-11', '1890-05-11T12:00', 'Day 3'])
  })

  it('reads custom calendar dates in several forms and orders them', () => {
    expect(order(['12 Frostmonth 1203 AE', 'Bloom 1203', 'Thaw 1, 1204', '1 Thaw 1203 AE', '1203 AE'], frost)).toEqual(['1 Thaw 1203 AE', '1203 AE', 'Bloom 1203', '12 Frostmonth 1203 AE', 'Thaw 1, 1204'])
    expect(key('1 Thaw 1204', frost)! - key('20 Frostmonth 1203', frost)!).toBe(1)
    expect(parseInWorldDate('31 Thaw 1203', frost)).toBeNull()
    expect(parseInWorldDate('12 Smarch 1203', frost)).toBeNull()
    expect(parseInWorldDate('12 Frostmonth 1203', frost)).toMatchObject({ kind: 'calendar', calendarId: 'reckoning' })
  })

  it('returns null for text it cannot read', () => {
    expect(parseInWorldDate('')).toBeNull()
    expect(parseInWorldDate('the next morning')).toBeNull()
  })
})

describe('formatInWorldDate', () => {
  it('writes a key back in the original form', () => {
    const cases: [string, TimelineConfig | undefined][] = [['1890-05-12', undefined], ['1890-05-12T14:30', undefined], ['Day 7', undefined], ['Day 2, 18:00', undefined], ['12 Frostmonth 1203 AE', frost], ['Day 3', { calendars: [], start: '1890-05-10' }]]
    for (const [text, config] of cases) {
      const parsed = parseInWorldDate(text, config)!
      expect(formatInWorldDate(parsed.key, parsed, config)).toBe(text)
    }
    const iso = parseInWorldDate('1890-05-31')!
    expect(formatInWorldDate(iso.key + 1, iso)).toBe('1890-06-01')
    const calendar = parseInWorldDate('20 Frostmonth 1203 AE', frost)!
    expect(formatInWorldDate(calendar.key + 1, calendar, frost)).toBe('1 Thaw 1204 AE')
  })
})
