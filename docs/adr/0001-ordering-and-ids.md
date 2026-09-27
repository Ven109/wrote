# ADR 0001 – Ordering by filename prefix, identity by frontmatter id

- Status: accepted
- Date: 2026-09-27

## Context

Manuscript entries need a stable order and a stable identity. Links (`[[…]]`), suggestions, comments and the index must survive renames and reordering. Files must stay pleasant to use outside Wrote (file browsers, git, other editors).

## Decision

1. **Order** is encoded as a numeric filename/folder prefix (`01-arrival.md`). File browsers, `ls` and git show the manuscript in reading order, and no hidden ordering file can drift out of sync.
2. **Identity** is a random, prefixed `id` in frontmatter (`scn_k3j9x2m1q0`), independent of filename, title and position. Everything that references an entry uses the id.

## Consequences

- Reordering renames files (sibling renumbering). This is done transactionally by the storage layer; git sees renames.
- Titles can change without touching links, since links resolve by id (title links are resolved via the index and rewritten on rename).
- Entries created outside Wrote without an `id` get one assigned on first index.
