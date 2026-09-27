# Book format

A Wrote book is a **plain folder of Markdown files**. The folder is the source of truth: it is readable without Wrote, works with git, and can be edited in any editor. Wrote only adds a rebuildable index in `.wrote/`.

## Layout

```
my-novel/
├── wrote.json                     # book config
├── manuscript/
│   └── 01-part-one/               # part (folder)
│       ├── index.md               # part metadata
│       └── 01-the-harbor/         # chapter (folder)
│           ├── index.md           # chapter metadata
│           ├── 01-arrival.md      # scene
│           └── 02-the-map.md      # scene
├── notes/
│   ├── inbox/                     # quick captures land here
│   └── ending.md
├── codex/                         # story bible (any sub-folders)
│   ├── characters/mara-velden.md
│   └── places/hollow-bay.md
├── research/                      # sources, clippings, interviews
├── outline.md
├── style-guide.md
└── .wrote/                        # index (rebuildable), app state, AI provenance – gitignored
```

Paths inside the book are POSIX and relative to the book root. Entry types are derived from the location (`shared/book/layout.ts`):

| Path | Type |
|---|---|
| `manuscript/<part>/index.md` | `part` |
| `manuscript/<part>/<chapter>/index.md` | `chapter` |
| `manuscript/<part>/<chapter>/<scene>.md` | `scene` |
| `notes/**/*.md` | `note` (inbox if under `notes/inbox/`) |
| `codex/**/*.md` | `codex` |
| `research/**/*.md` | `research` |
| `outline.md` | `outline` |
| `style-guide.md` | `style-guide` |

## Ordering

Parts, chapters and scenes are ordered by a **numeric prefix** in the file or folder name: `01-arrival.md`, `02-the-map.md`. Prefixes are at least two digits. Reordering renames files (see [ADR 0001](adr/0001-ordering-and-ids.md)). Notes, codex and research entries are unordered.

## Entries

Every entry is Markdown with YAML frontmatter:

```md
---
id: scn_arr1val001
title: Arrival
status: draft
pov: Mara Velden
tags: [act-1]
---
The tide was out when Mara reached [[Hollow Bay]].
```

Common fields (all types):

| Field | Type | Notes |
|---|---|---|
| `id` | string | **Required.** Stable id `<prefix>_<random>`; never changes, independent of the filename |
| `title` | string | **Required** |
| `tags` | string[] | default `[]` |
| `created`, `updated` | ISO datetime | optional |

Type-specific fields:

| Type | Id prefix | Fields |
|---|---|---|
| `part` | `prt` | `synopsis` |
| `chapter` | `chp` | `synopsis` |
| `scene` | `scn` | `status` (`idea` · `draft` · `revised` · `final`, default `draft`), `pov`, `location`, `timeline`, `synopsis` |
| `note` | `nte` | `pinned` (default `false`) |
| `codex` | `cdx` | `codexType` (**required**: `character` · `place` · `item` · `faction` · `lore` · `glossary` or a custom type), `aliases`, type fields (see Codex types) |
| `research` | `rsc` | `source`, `url`, `author` |
| `outline` | `otl` | – |
| `style-guide` | `sty` | – |

**Unknown fields are preserved.** Custom fields (e.g. `eyes: grey` on a character) are kept on read and write, and key order is preserved.

Schemas live in `shared/schemas/` (Zod) and are the single source of truth for this document.

## Codex types

Codex entries (`codex/<type folder>/<slug>.md`) have `codexType` in their frontmatter plus the fields of their type
template. Built-in types: `character` (role, age, appearance, personality, goals, relationships), `place` (region,
atmosphere, features), `item` (owner, significance), `faction` (leader, members, goals), `lore` (era, summary),
`glossary` (definition). `aliases` (list) are matched by links, search and mention detection.

Custom types live in `codex/_types/<id>.yaml` (the file name is the type id):

```yaml
label: Creature
plural: Creatures
icon: i-lucide-bug
folder: creatures        # entries are created in codex/creatures/
fields:
  - key: habitat
    label: Habitat
  - key: diet
    label: Diet
    kind: select          # text | longtext | list | select | entry | entries
    options: [herbivore, carnivore]
  - key: predators
    label: Predators
    kind: entries         # ids of other codex entries
```

Fields that are not in the template are kept untouched when Wrote saves an entry.

Titles and aliases of codex entries are highlighted where they appear in the text (a display-only decoration; nothing is
written into the Markdown). Add `detect: false` to an entry's frontmatter (or switch it off on the entry page) to skip
it, e.g. for common words. Typing `@` in the editor inserts a `[[link]]` to a codex entry.

## Links

- `[[Title]]` or `[[id|Label]]` links to any entry (notes, scenes, codex, research).
- Targets resolve case-insensitively by id, title or codex alias. A link to a missing entry is kept as written ("broken"); following it creates a note with that title.
- Renaming an entry (in the app or via the API) rewrites `[[Old title]]` links in all other files to the new title, keeping labels. It is skipped if another entry still has the old title or alias. The app offers an undo.
- Custom editor blocks are stored as Markdown directives, e.g. `:::note … :::`, so files stay readable.

## Body Markdown

Bodies are GitHub-flavoured Markdown. The editor writes a canonical form, so saving an entry may normalize equivalent syntax once:

| Written | Saved as |
|---|---|
| `***`, `___` (scene break) | `---` |
| `* item` | `- item` |
| `__bold__`, `_em_` | `**bold**`, `*em*` |

Bodies end with exactly one newline. `[[Target]]` / `[[Target|Label]]` wiki links are kept verbatim. Known limitation: inline formatting wrapped around a wiki link (`**[[Target]]**`) is dropped by the editor.

## Book config – `wrote.json`

```json
{
  "version": 1,
  "title": "The Cartographer of Hollow Bay",
  "author": "Sample Author",
  "language": "en",
  "template": "novel",
  "ai": { "model": "anthropic:claude-sonnet-5" }
}
```

| Field | Notes |
|---|---|
| `version` | format version, currently `1` |
| `title` | **required** |
| `subtitle`, `author` | optional |
| `language` | BCP 47 code, default `en` |
| `template` | `novel` · `non-fiction` · `blank` |
| `ai.model` | default model for this book (`provider:model`) |

Unknown keys are preserved.

## `.wrote/`

Wrote's own data about the book, next to the Markdown files:

| Path | What | If deleted |
|---|---|---|
| `index.db` | search index, chunks and vectors | rebuilt from the Markdown files (vectors re-embedded in the background) |
| `state.db` | background jobs, chat threads, summaries, suggestions, codex proposals, activity log, AI context snapshots | lost – regenerated where possible (summaries), otherwise gone |
| `provenance/<entry id>.json` | which accepted passages were AI-written | lost – the text stays, the AI-assisted marks disappear |

`.wrote/` is gitignored by default. Commit `provenance/` if you want AI provenance to travel with the book.

## Example

See `test/fixtures/sample-book/`.
