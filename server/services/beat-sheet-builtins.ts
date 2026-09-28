/**
 * Beat sheets shipped with Wrote, copied into the workspace's `templates/beat-sheets/` folder on first use so
 * people can edit, delete or add to them. Same format as `outline.md` (`##` acts, `###` beats, summaries).
 */
export const BUILTIN_BEAT_SHEETS: Record<string, string> = {
  'three-acts.md': `---
title: Three Acts
description: The classic setup, confrontation and resolution.
---

## Act One: Setup

### Hook

Open on the protagonist's ordinary world and what they want.

### Inciting incident

Something disrupts that world and sets the story in motion.

### Plot point one

The protagonist commits to a course of action; there is no going back.

## Act Two: Confrontation

### Rising action

Obstacles grow; attempts fail or cost more than expected.

### Midpoint

A reversal or revelation raises the stakes and changes the goal.

### Plot point two

Everything falls apart; the protagonist is at their lowest.

## Act Three: Resolution

### Climax

The final confrontation where the central conflict is decided.

### Resolution

The new normal, and what the journey changed.
`,
  'save-the-cat.md': `---
title: Save the Cat
description: Blake Snyder's fifteen beats.
---

## Act One

### Opening image

A snapshot of the hero and their world before the story.

### Theme stated

Someone hints at the lesson the hero will have to learn.

### Set-up

The hero's life, flaws and what is missing.

### Catalyst

The event that changes everything.

### Debate

The hero hesitates: should they go?

## Act Two

### Break into two

The hero chooses to enter the new world.

### B story

A new relationship that carries the theme.

### Fun and games

The promise of the premise: the story people came for.

### Midpoint

A false victory or false defeat; the stakes go up.

### Bad guys close in

Pressure from outside and doubt from inside.

### All is lost

The lowest point; something or someone is lost.

### Dark night of the soul

The hero wallows, then finds the lesson.

## Act Three

### Break into three

A new idea, often from the B story, shows the way.

### Finale

The hero applies the lesson and wins – or fails meaningfully.

### Final image

The opposite of the opening image: proof of change.
`,
  'heros-journey.md': `---
title: Hero's Journey
description: Christopher Vogler's twelve stages of the monomyth.
---

## Departure

### Ordinary world

The hero at home, with a lack or a wound.

### Call to adventure

A problem or challenge appears.

### Refusal of the call

Fear or duty holds the hero back.

### Meeting the mentor

Advice, training or a gift prepares the hero.

### Crossing the threshold

The hero leaves the known world.

## Initiation

### Tests, allies and enemies

The hero learns the rules of the special world.

### Approach to the inmost cave

Preparing for the central ordeal.

### The ordeal

A life-or-death crisis; the hero faces their greatest fear.

### Reward

The hero seizes the sword: an object, knowledge or reconciliation.

## Return

### The road back

Consequences follow the hero; the pull of home.

### Resurrection

A final test where everything learned is put to use.

### Return with the elixir

The hero comes home changed, bringing something of value.
`,
  'kishotenketsu.md': `---
title: Kishōtenketsu
description: Four-part structure from East Asian storytelling, built on a twist instead of conflict.
---

## Ki: Introduction

### Introduction

Characters, setting and situation.

## Shō: Development

### Development

The situation deepens without a major change.

## Ten: Twist

### Twist

An unexpected turn that recasts what came before.

## Ketsu: Reconciliation

### Reconciliation

The parts come together in a new understanding.
`,
  'snowflake.md': `---
title: Snowflake
description: Randy Ingermanson's method – grow the story from one sentence, through three disasters.
---

One-sentence summary: …

One-paragraph summary: setup, three disasters, ending.

## Act One

### Setup

Who the story is about and what they want.

### First disaster

The first catastrophe that ends the first quarter.

## Act Two

### Second disaster

The midpoint catastrophe; often the hero changes approach.

## Act Three

### Third disaster

The catastrophe that forces the ending.

### Ending

How it all resolves.
`,
}
