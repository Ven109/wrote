# Timeline

The **Timeline** page (sidebar → Timeline) shows scenes and events in story order, not manuscript order. It
answers "when does this happen?", flags a character who is in two places at once, and lets you move things in time.

## What is on it

- **Scenes** with a `timeline` date (the “Timeline” field in the scene's metadata).
- **Events**: codex entries of the built-in type `event` (fields `date`, `end`, `participants`, `place`, `summary`).
  An event with an `end` is drawn as a bar over its span.

Scenes and events whose date is missing or unreadable are listed under *Not on the timeline*.

Characters and places of an item are its POV and location, an event's participants and place, and codex
characters/places mentioned by name (or alias) in the text.

## Dates

| Form | Examples | Notes |
|---|---|---|
| ISO | `1890-05-12`, `1890-05`, `1890`, `1890-05-12T14:30` | proleptic Gregorian, negative years allowed |
| Relative | `Day 3`, `Day 3, evening`, `Day 3 14:30` | counted from `timeline.start` when set |
| Custom calendar | `12 Frostmonth 1203 AE`, `Frostmonth 12, 1203`, `Frostmonth 1203`, `1203 AE` | from `timeline.calendars` |

Times of day (`dawn`, `morning`, `noon`/`midday`, `afternoon`, `dusk`, `evening`, `night`, `midnight` or `HH:MM`) order items within a day.
Dates of different kinds only line up when `start` anchors the relative days.

Settings in `wrote.json`:

```json
{
  "timeline": {
    "start": "1203-01-01",
    "calendars": [
      { "id": "reckoning", "name": "Reckoning", "era": "AE",
        "months": [{ "name": "Frostmonth", "days": 30 }, { "name": "Thaw", "days": 31 }] }
    ]
  }
}
```

## Using it

- **Lanes** by chapter (events in their own lane) or by character; **filters** by character and place; **zoom** from
  hours to months.
- **Move** an item by dragging it, or focus it and press ←/→ to move it a day. Wrote rewrites the date in the file,
  in the form it was written (`Day 3` stays relative, `1890-05-12` stays ISO); an event's `end` moves along.
  Enter/click opens the scene or event.
- **Checks**: a character in two different places on the same day (overlapping items), and long gaps – more than four
  times the book's typical spacing between items – are listed above the timeline and outlined on it.

## AI and MCP

- The `timeline_query` tool (read) returns the ordered items, filterable by character, place and date range.
- The built-in **Continuity** review agent gets the items around the reviewed scene as material, so it can spot
  "she was in the capital yesterday" contradictions.
