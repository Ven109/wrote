# Wrote — Concept

> An open-source, AI-native workspace for writing books.
> Collect notes, build your story bible, outline, draft, and revise — with an AI collaborator that knows your whole book, and an MCP server that lets any AI agent work with it too.

Status: **Concept / RFC** — nothing here is final. Open questions are collected at the end.

---

## 1. Vision

Writing a book is a long, messy process: scattered notes, research, character sheets, half-finished outlines, many drafts. Existing tools either handle the *writing* (Scrivener, Ulysses) or the *thinking* (Obsidian, Notion) — and bolt AI on as a text box that knows nothing about your book.

**Wrote** puts everything a book needs in one place and makes AI a first-class collaborator that:

- **knows the whole book** — manuscript, notes, characters, world, research, style;
- **proposes, never overwrites** — every AI change is a reviewable suggestion;
- **is open in both directions** — Wrote is an MCP *server* (Claude, Cursor, any agent can read and edit your book) and an MCP *client* (its built-in assistant can use your other tools).

### Principles

| Principle | What it means |
|---|---|
| **Author first** | AI assists, the author decides. No silent edits, clear provenance of AI-written text. |
| **Your files, your book** | A book is a folder of Markdown files with frontmatter. Git-friendly, readable without Wrote, no lock-in. |
| **Bring your own model** | Anthropic, OpenAI, Google, Mistral, or local models via Ollama / LM Studio. No mandatory cloud. |
| **AI-native, not AI-bolted** | Context retrieval, agents, and tools are part of the core data model — not a chat sidebar on top. |
| **Protocol over plugins** | Extensibility via MCP first. Anything Wrote can do, an agent can do through MCP. |
| **Calm UI** | A quiet, focused writing surface. Zinc neutrals, a single yellow accent, dark mode first. |

---

## 2. Who is it for?

- **Novelists** — plotting, characters, continuity across 100k words.
- **Non-fiction authors** — research, sources, citations, argument structure.
- **Technical / documentation writers** — long-form, structured, versioned content.
- **Hobbyists & NaNoWriMo writers** — goals, streaks, distraction-free drafting.

---

## 3. Core concepts (domain model)

```
Workspace
└── Book
    ├── Manuscript        Parts → Chapters → Scenes (ordered, the actual book)
    ├── Notes             Free-form notes, inbox, links & backlinks
    ├── Codex             Story bible: Characters, Places, Items, Lore, Glossary, Timeline
    ├── Research          Sources, clippings, PDFs, interviews (audio + transcript), quotes
    ├── Outline           Beats / plot points, linked to scenes (board + tree view)
    ├── Style Guide       Voice, tense, POV, banned words, sample passages
    ├── Snapshots         Named versions of scenes/chapters (diffable)
    └── Goals             Word targets, deadlines, sessions, streaks
```

Everything is an **Entry** with a type, a Markdown body, typed frontmatter, and links:

```md
---
id: chr_mara
type: character
name: Mara Velden
aliases: [The Cartographer]
role: protagonist
tags: [act-1, north]
---
Mara grew up in the port of [[Hollow Bay]]. She is afraid of deep water …
```

- `[[Wiki links]]` and `@mentions` connect anything to anything (notes → characters → scenes).
- The **Codex** is just entries with structured frontmatter — which makes it queryable by AI ("which scenes is Mara in?", "what colour are her eyes?").
- **Scenes** carry metadata: POV, location, timeline date, status (`idea → draft → revised → final`), word count.

### On-disk layout

```
my-novel/
├── wrote.config.ts          # book settings (title, language, AI defaults)
├── manuscript/
│   ├── 01-part-one/
│   │   ├── 01-the-harbor/
│   │   │   ├── 01-arrival.md
│   │   │   └── 02-the-map.md
├── notes/
│   ├── inbox/
│   └── ideas-about-the-ending.md
├── codex/
│   ├── characters/mara-velden.md
│   ├── places/hollow-bay.md
│   └── lore/the-drowned-guild.md
├── research/
├── outline.md
├── style-guide.md
└── .wrote/                  # generated: SQLite index, embeddings, cache (gitignored)
```

The folder is the **source of truth**. `.wrote/` holds a SQLite index (full-text + vector embeddings) that can always be rebuilt.

---

## 4. Feature areas

### 4.1 Capture — get ideas in fast
- **Quick capture** (`⌘⇧N`) from anywhere in the app → lands in the Notes inbox.
- **Voice notes** → transcribed, optionally cleaned up by AI.
- **Web clipper / share target** (PWA) → saves URL, selection, and summary to Research.
- **Capture via MCP** — "Claude, save this idea to my book's inbox" from any MCP client.
- **AI triage** of the inbox: suggests tags, links to existing codex entries, "this belongs to chapter 7".

### 4.1b Research — interviews *(planned for a later version)*
Record interviews directly in Wrote and turn them into searchable, quotable research.

- **Record** in the **Electron desktop app** (reliable mic access, long recordings streamed to disk, optional system-audio capture for online calls, choice of input device) or **upload** existing audio/video (mp3, m4a, wav, mp4). Browser recording (`MediaRecorder`) as a lightweight fallback in the web version.
- **Transcribe** with timestamps and **speaker labels** (diarization) — via cloud speech-to-text (e.g. OpenAI, Deepgram, AssemblyAI through the AI SDK) or **fully local** with whisper.cpp for sensitive interviews.
- **Interview view**: audio player synced with the transcript — click a sentence to jump to that moment, correct transcript text in the block editor, rename speakers.
- **AI on top**: summary, key topics, notable quotes, follow-up questions for the next interview, suggested links to codex entries and chapters.
- **Quote into the book**: select transcript text → *Insert as quote* creates a `quote-source` block that keeps a link to interview + timestamp (and becomes a citation / footnote on export for non-fiction).
- **Interview prep**: a question-list note per interview, which the AI can help draft from your outline and open questions.
- **Consent & privacy**: consent checkbox/record before recording, audio stored inside the book folder (`research/interviews/`), per-interview choice of local vs. cloud transcription.
- **MCP**: `list_interviews`, `search_transcripts`, `get_quote` — e.g. *"Claude, find everything my interviewees said about the flood of 1953."*

```
research/interviews/2026-10-02-anna-berger/
├── interview.md        # metadata (people, date, consent), prep questions, AI summary
├── transcript.md       # speaker-labelled, timestamped transcript
└── audio.m4a
```

### 4.2 Organize — build the world
- Codex with templates per type (character, place, faction, …).
- Backlinks panel and a lightweight graph view.
- **AI extraction**: "Scan chapter 3 and propose new codex entries" → reviewable list.
- **Mention detection**: names in the manuscript get linked to codex entries automatically (hover card with details).

### 4.3 Plan — shape the story
- Outline as **tree** (structure) and **board** (cards per beat/scene, drag & drop).
- Beat-sheet templates (Three Acts, Save the Cat, Hero's Journey, Kishōtenketsu, custom).
- **Timeline** of in-world events, linked to scenes.
- AI: "Suggest three ways to get from beat 4 to beat 5", "Find plot holes in this outline".

### 4.4 Write — the block editor
Built on Nuxt UI's **`UEditor`** (TipTap 3), Markdown in / Markdown out, with a **Notion-style block layout**:

- **Everything is a block** — paragraph, heading, quote, list, image, scene break, callout, plus Wrote-specific blocks (see below).
- **Drag handle** (`UEditorDragHandle`) — hover a block to grab it, move it, or open its block menu (turn into…, duplicate, delete, ✦ AI actions on this block).
- **Slash menu** (`UEditorSuggestionMenu`) — `/` inserts any block type or AI action.
- **Mentions** (`UEditorMentionMenu`) — `@` links a codex entry (character, place, …), `[[` links any note.
- **Bubble toolbar** (`UEditorToolbar`) on selection — formatting + inline AI.
- Distraction-free / focus / typewriter modes, per-session word goals.

**Custom Wrote blocks** (TipTap node extensions rendered with Vue components):

| Block | Purpose | Exported to book? |
|---|---|---|
| `scene-break` | `* * *` separator between scenes | yes |
| `note` | Author's margin note / TODO inside the text | no |
| `codex-card` | Embedded codex entry (character sheet, place) | no |
| `quote-source` | Quote pulled from research/interview, linked back to its source & timestamp | text yes, link → citation |
| `ai-suggestion` | Pending AI proposal (accept / reject / edit) | no |
| `beat` | Outline beat shown inline while drafting | no |

"Working" blocks (notes, cards, suggestions) live alongside the prose while writing but are stripped on export. In Markdown they are stored as directives (e.g. `:::note … :::`) so files stay readable in any editor.

The same block editor is used everywhere — manuscript, notes, codex entries, research — so there's one editing experience across the app.
- **Inline AI** on selection: *continue, rephrase, expand, tighten, show-don't-tell, change tone, translate*.
- **Ghost text** autocomplete (opt-in, off by default).
- AI output appears as **suggestions** (tracked-change style: accept / reject / edit), never as silent edits.
- **Provenance marks**: AI-authored text can be highlighted and counted ("12% AI-assisted") — authors decide what to disclose.

### 4.5 Revise — the AI editorial team
Pre-built **review agents** that run over a scene, chapter, or the whole book and return comments anchored to text:

| Agent | Checks |
|---|---|
| **Continuity** | Contradictions vs. the Codex & timeline (eye colour, dates, who knows what when). |
| **Line editor** | Repetition, filter words, passive voice, adverbs, style-guide violations. |
| **Developmental** | Pacing, stakes, character arcs, scene goal/conflict/outcome. |
| **Beta reader** | Reader-perspective reactions: confusion, boredom, emotional peaks. |
| **Fact checker** | (Non-fiction) Claims vs. Research sources, missing citations. |

Users can create their own agents (prompt + tools + scope), stored as Markdown in the book folder.

### 4.6 Publish
- Export to **EPUB, PDF, DOCX, Markdown, HTML** (Pandoc / Typst based pipeline).
- Manuscript-format presets (Shunn), print presets (trim sizes), front/back matter.
- Optional: publish a book or single chapters as a static site (Nuxt Content).

---

## 5. AI architecture

### 5.1 The context engine
The key to useful AI in a book is **context**. For every AI request Wrote assembles:

1. **Pinned context** — style guide, book synopsis, current chapter summary.
2. **Local context** — the text around the cursor / selection.
3. **Retrieved context** — codex entries mentioned in the scene (via links + mention detection), relevant notes/research via hybrid search (SQLite FTS5 + vector embeddings).
4. **Rolling summaries** — each scene/chapter gets an auto-maintained summary so the model "knows" the whole book without sending 100k words.

The user can always see (and edit) exactly what context was sent — a "Context" drawer on every AI response.

### 5.2 The agent
The in-app assistant (right-hand chat panel) is a tool-using agent built on the **Vercel AI SDK**. It uses the **same tool set that Wrote exposes via MCP** — one implementation, two consumers:

```
            ┌─────────────────────── Wrote tool layer ───────────────────────┐
            │ search · read_entry · list_scenes · propose_edit · create_note │
            │ get_codex · update_outline · run_review · get_summary · …      │
            └───────────────▲────────────────────────────────▲───────────────┘
                            │                                │
                 In-app assistant (AI SDK)          MCP server (/mcp)
                  + external MCP servers        Claude Desktop, Claude Code,
                    (web search, Zotero, …)        Cursor, custom agents
```

### 5.3 Permission model
Every tool is classified, and the user sets a policy per client (in-app / each MCP client):

| Level | Examples | Default |
|---|---|---|
| `read` | search, read entry, list scenes, get codex | allowed |
| `propose` | propose edit, suggest codex entry, add comment | allowed → lands as suggestion |
| `write` | create note, update outline, apply edit | ask |
| `destructive` | delete, move, overwrite | always ask |

All AI and MCP writes are recorded in an **activity log** and can be undone.

### 5.4 Models
- Provider-agnostic via the AI SDK: Anthropic, OpenAI, Google, Mistral, OpenRouter, Ollama, LM Studio (OpenAI-compatible).
- Per-task model routing: e.g. a small/fast model for autocomplete & summaries, a large model for developmental review.
- Local embeddings option (e.g. via Ollama) so search works fully offline.

---

## 6. MCP integration

### 6.1 Wrote as an MCP server
Exposed at `/mcp` (Streamable HTTP) using `@nuxtjs/mcp-toolkit`, plus a `wrote mcp` stdio command for local desktop clients.

**Tools**

| Tool | Description |
|---|---|
| `list_books` | Books in the workspace |
| `search` | Hybrid search across manuscript, notes, codex, research |
| `read_entry` | Read any entry by id or path |
| `get_structure` | Parts/chapters/scenes tree with status & word counts |
| `get_codex` | Characters/places/… with filters |
| `create_note` | Add a note (default: inbox) |
| `propose_edit` | Suggest a change to a scene → appears as a suggestion in the editor |
| `add_comment` | Anchor a comment to a text range |
| `update_outline` | Add / move / edit beats |
| `run_review` | Run a review agent and return findings |
| `get_progress` | Word counts, goals, streaks |

**Resources** — `wrote://book/{id}/scene/{id}`, `wrote://book/{id}/codex/{type}/{id}`, `wrote://book/{id}/style-guide`, …

**Prompts** — `continue-scene`, `critique-chapter`, `brainstorm-titles`, `character-interview`, `summarize-book`.

Example: in Claude Code → *"Read chapter 4 of my novel, check it against the codex for continuity errors, and leave comments."* The comments show up in Wrote in real time.

### 6.2 Wrote as an MCP client
In Settings → Integrations, users connect external MCP servers which the in-app assistant can then use: web search, Zotero (citations), Notion/Obsidian (import notes), image generation (cover mockups), etc.

---

## 7. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Nuxt 4** (4.5+) | Full-stack Vue, server routes (Nitro), great DX |
| UI | **Nuxt UI 4** (4.11+) | Dashboard layouts, `UEditor` (TipTap), `UChat*` components, command palette, Tailwind v4 |
| Theme | `primary: yellow`, `neutral: zinc` | See §8 |
| Editor | `UEditor` + TipTap 3 extensions | Block layout (drag handle, slash menu), Markdown round-trip, mentions, custom Wrote blocks |
| Speech-to-text (later) | AI SDK transcription providers / whisper.cpp (local) | Interview transcription with timestamps & speakers |
| AI | Vercel **AI SDK** (`ai`, `@ai-sdk/vue`) | Streaming, tool calling, multi-provider |
| MCP server | **`@nuxtjs/mcp-toolkit`** | Tools/resources/prompts defined inside the Nuxt app |
| MCP client | `@modelcontextprotocol/sdk` / AI SDK MCP client | Connect external servers |
| Database | **SQLite** (libSQL) + **Drizzle ORM** | Index, search (FTS5), vectors (`sqlite-vec`), settings, activity log |
| Files | Markdown + YAML frontmatter, file watcher | Source of truth, git-friendly |
| Validation | Zod | Shared schemas for frontmatter, tools, API |
| Export | Pandoc / Typst | EPUB, PDF, DOCX |
| Collaboration (later) | Yjs (TipTap Collaboration) | Real-time co-writing |
| Distribution | Docker image, `npx wrote`, later **Electron** desktop app | Self-host or run locally; desktop for mic recording, local files & local whisper.cpp |

### Architecture

```
┌────────────────────────────── Nuxt app ──────────────────────────────┐
│  app/ (Vue)                                                          │
│   pages · components · composables (useBook, useEditor, useAgent)    │
│                                  │ $fetch / SSE                      │
│  server/ (Nitro)                 ▼                                   │
│   api/*        REST for the UI                                       │
│   api/chat     AI SDK streaming endpoint (agent + tools)             │
│   mcp/         MCP tools · resources · prompts (@nuxtjs/mcp-toolkit) │
│   services/    tool layer (shared by agent & MCP)                    │
│   storage/     file repo (Markdown) ⇄ indexer ⇄ SQLite (Drizzle)     │
└──────────────────────────────────────────────────────────────────────┘
          │                              │
   Book folders on disk            LLM providers / Ollama
```

### Repository layout (proposed)

```
wrote/
├── app/
│   ├── app.config.ts            # Nuxt UI theme (yellow / zinc)
│   ├── assets/css/main.css
│   ├── layouts/default.vue      # UDashboardGroup shell
│   ├── pages/
│   │   ├── index.vue            # library / all books
│   │   └── books/[book]/
│   │       ├── write/[[...path]].vue
│   │       ├── notes/…
│   │       ├── codex/…
│   │       ├── outline.vue
│   │       └── settings.vue
│   ├── components/{editor,codex,outline,assistant}/
│   └── composables/
├── server/
│   ├── api/
│   ├── mcp/{tools,resources,prompts}/
│   ├── services/                # book, entry, search, review, context
│   ├── storage/                 # fs repo, watcher, indexer
│   └── db/schema.ts             # Drizzle
├── shared/                      # Zod schemas & types used client + server
├── docs/
└── nuxt.config.ts
```

---

## 8. Design & theme

**Zinc + Yellow.** Zinc gives a calm, paper-and-ink neutral; yellow is the single accent — the highlighter on the page. Dark mode is the default (long writing sessions), light mode fully supported.

```ts
// app/app.config.ts
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'yellow',
      neutral: 'zinc'
    }
  }
})
```

```css
/* app/assets/css/main.css */
@import "tailwindcss";
@import "@nuxt/ui";

@theme {
  --font-sans: 'Inter', sans-serif;
  --font-serif: 'Literata', serif;   /* manuscript text */
}
```

- **Yellow** is used sparingly: primary actions, active nav item, cursor/selection, AI suggestion highlights, goal progress.
- **Serif** (Literata) for the manuscript, **sans** (Inter) for UI chrome.
- AI-related UI uses a consistent "sparkles" icon + subtle yellow tint, so it's always clear what came from AI.

### Main layout

```
┌────────────┬──────────────────────────────────────────┬─────────────────┐
│ ▣ Wrote    │  Part I › The Harbor › Arrival    ◷ 1,204│  ✦ Assistant    │
│            ├──────────────────────────────────────────┤                 │
│ 📖 Write   │                                          │  Context: scene,│
│ 🗒 Notes  3│   The tide was out when Mara reached     │  Mara, Hollow   │
│ 👤 Codex   │   Hollow Bay. The harbor smelled of …    │  Bay, style     │
│ 🧭 Outline │                                          │                 │
│ 🔎 Research│   ░░ suggestion: "…of salt and tar" ░░   │  > Tighten this │
│ 📈 Goals   │        [Accept] [Reject] [Edit]          │    paragraph    │
│            │                                          │                 │
│ ── Book ── │                                          │  ✦ Here is a    │
│ ▾ Part I   │                                          │    tighter …    │
│   ▾ Harbor │                                          │                 │
│     Arrival│                                          │ ┌─────────────┐ │
│     The Map│                                          │ │ Ask…    ⏎   │ │
│ ⌘K Search  │                                          │ └─────────────┘ │
└────────────┴──────────────────────────────────────────┴─────────────────┘
```

Built from Nuxt UI building blocks: `UDashboardGroup`, `UDashboardSidebar`, `UDashboardPanel` (resizable, collapsible), `UNavigationMenu` / `UTree` for the manuscript tree, `UEditor` + `UEditorToolbar` + `UEditorSuggestionMenu` + `UEditorMentionMenu`, `UChatMessages` + `UChatPrompt` for the assistant, `UCommandPalette` for ⌘K.

---

## 9. Roadmap

### v0.1 — Foundation (MVP)
- [ ] Nuxt 4 + Nuxt UI 4 scaffold, theme, dashboard shell
- [ ] Book folder format, file repo, watcher, SQLite index (Drizzle)
- [ ] Manuscript tree + block editor (`UEditor`: drag handle, slash menu, mentions), Markdown round-trip, autosave, word count
- [ ] Notes with inbox, tags, `[[links]]`, backlinks
- [ ] Assistant panel (AI SDK) with BYO API key / Ollama
- [ ] MCP server with read tools + `create_note` + `propose_edit`

### v0.2 — AI-native writing
- [ ] Codex with templates and mention detection
- [ ] Context engine: FTS + embeddings, rolling summaries, context drawer
- [ ] Inline AI actions → suggestions (accept/reject), provenance marks
- [ ] Permission model + activity log + undo

### v0.3 — Plan & revise
- [ ] Outline tree + board, beat-sheet templates, timeline
- [ ] Review agents (continuity, line editor, developmental, beta reader)
- [ ] Custom agents stored in the book folder
- [ ] MCP client: connect external servers

### v0.4 — Publish & polish
- [ ] Export EPUB / PDF / DOCX, snapshots & diffs, goals & streaks
- [ ] Web clipper / PWA share target, voice notes

### v0.5 — Desktop & Interviews
- [ ] Electron shell around the Nuxt app (local server, book folders on disk, auto-update)
- [ ] Native mic recording (device picker, streamed to disk, optional system audio)
- [ ] Record / upload interviews, transcription (cloud or local whisper.cpp) with speakers & timestamps
- [ ] Synced audio + transcript view, AI summaries & quote extraction
- [ ] `quote-source` blocks linking manuscript quotes to interview timestamps, citations on export
- [ ] Docker image & `npx wrote`

### Later
- Real-time collaboration (Yjs), comments & roles for editors/beta readers
- Mobile capture app
- Plugin marketplace for templates, agents, and export themes

---

## 10. Open questions

1. **Local-first vs. hosted** — Start as a self-hosted/local app (folder on disk) and add a hosted multi-user mode later? *(Proposal: yes — local-first first.)*
2. **License** — MIT (max adoption) or AGPL-3.0 (protects against closed hosted forks)? *(Proposal: AGPL-3.0 for the app, MIT for SDK/format packages.)*
3. **Scene granularity** — One file per scene (fine-grained, great for git & AI) or per chapter? *(Proposal: per scene, chapters are folders.)*
4. **AI disclosure** — Should provenance tracking be on by default?
5. **Embeddings** — Default to a local model to keep things offline, or the configured provider?
6. **Name** — "Wrote" ✓ (short, past tense of *write* — "the book you wrote").
