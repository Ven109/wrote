# Goals, writing sessions & streaks

**Goals** (sidebar) shows your word target, today's writing and your streak. Once a target and deadline are set, the
editor header shows today's words against the daily target (a yellow ring).

## Target and deadline

Set a **word target** and a **deadline** on the Goals page (stored in `wrote.json` as `goals: { target, deadline }`).
The **daily target** is the words still needed at the start of today divided by the days left including today – it
stays fixed during the day and adapts tomorrow to what you wrote.

## Sessions: net and gross

Every scene save is compared with the previous version, block by block:

- **Written (added)**: words typed or retyped – a rewritten sentence counts even if the length stays the same.
- **Deleted**: words removed.
- **Net**: the change of the word count.
- **Moved text is not writing**: a paragraph cut and pasted within a scene – or into another scene within ten
  minutes – does not count as written.

Edits less than 30 minutes apart form one **session** (start, end, minutes, added, deleted, net), stored in
`.wrote/state.db`. Only scenes count. Edits from any source count – the editor, other apps (file watcher), the assistant.

## Streaks and history

A day counts for the **streak** when words were written; today without writing does not break the current streak until
the day is over. The **heatmap** shows the last year (yellow intensity relative to your busiest day); **words over
time** shows the book's total per day with a dashed line to the target at the deadline.

## For agents

`get_progress` (assistant and MCP) returns the same data as the Goals page: counts, target, deadline, remaining, days
left, daily target, today, streaks, the last 30 days, words over time and recent sessions.
