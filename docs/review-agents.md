# Review agents

Review agents are AI editorial passes over a scene, a chapter or the whole book. Start one from the
**Review** menu in the editor (agent → *This scene*, *This chapter* or *Whole book…*).

- **Runs** are background jobs: progress per scene in the jobs menu, where they can be cancelled. A
  cancelled run keeps the findings it already made. A whole-book run first shows an estimate (scenes,
  model calls, tokens) to confirm.
- **Findings** are comments in the margin with a severity (low / medium / high) and a category. They quote
  the passage they are about; quotes the model invents are dropped. Anchors survive edits around and inside
  the passage (the passage is found again between its unchanged surroundings); when it is gone, the finding
  is shown as *Passage changed* instead of disappearing.
- **Apply fix** turns a finding's suggested replacement into a normal suggestion (tracked change) on the
  passage as it reads now. Accepting it resolves the finding. Review agents never edit text directly.
- **Resolve** hides a finding; **Dismiss** hides it and the same agent does not raise it again on later
  runs. Open findings are not duplicated by reruns either.
- **Review history** (Review menu) lists the runs that covered the open scene.

Runs and findings live in `.wrote/state.db` (not in the Markdown). Each scene's prompt is built by the
context engine (style guide, summaries, relevant passages) and stored as a context snapshot, like other AI
requests.

## Built-in agents

| Agent | Scopes | What it looks at | Extra material |
|---|---|---|---|
| Editor | scene, chapter, book | Clarity, awkward or repetitive phrasing, inconsistencies within a scene, immersion breaks | – |
| Continuity | scene, chapter, book | Contradictions with the codex, scene details (POV, location, timeline) and earlier summaries: appearance, traits, places, dates, who knows what | codex entries of the POV character and location |
| Line editor | scene, chapter | Repetition, filter words, adverbs, passive voice, clichés, the style guide – each with a fix | heuristic flags (cheap rules) the model confirms or ignores |
| Developmental editor | chapter, book | Scene goal / conflict / outcome, stakes, pacing, arcs | the outline beats the scene tells |
| Beta reader | scene, chapter | Reader reactions in the margin (confused, bored, hooked, moved, …) and a short engagement summary per scene (shown in the review history) | – |
| Fact checker | scene, chapter, book | Real-world claims contradicted or unsupported by the research notes, citing the note | research notes matching the scene |

Every agent also gets the scene's details (POV, location, timeline).

## Evaluating agents

`test/fixtures/review-eval/` is a chapter with planted issues for each agent (`expected.json`). In CI the
eval runs on recorded answers, which checks the pipeline and the scoring. To measure a real model, point it
at a workspace with AI configured:

```bash
WROTE_EVAL_WORKSPACE=~/Wrote pnpm eval:review
```

It prints recall (planted issues caught) and precision (findings that are planted issues – a lower bound)
per agent.
