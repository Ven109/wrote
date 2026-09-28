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

| Agent | What it looks at |
|---|---|
| Editor | Clarity, awkward or repetitive phrasing, inconsistencies within a scene, immersion breaks |
