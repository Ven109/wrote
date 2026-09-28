# Writing modes

The write page has three writing modes and an optional session timer. You can turn each one on or off in three ways:
from the ⌘K palette (group *Writing modes*), with a keyboard shortcut, or by tapping the **Writing modes** button
(pen icon) in the page header. None of them changes the document or its Markdown. They only change how it is shown.

| Mode | Shortcut | What it does |
|---|---|---|
| Distraction-free | ⌘⇧F / Ctrl+Shift+F | Hides the sidebar, header, toolbars and panels, and goes full screen |
| Focus | ⌘⇧O / Ctrl+Shift+O | Dims everything except the paragraph (or sentence) at the caret |
| Typewriter scrolling | ⌘⇧Y / Ctrl+Shift+Y | Keeps the caret line vertically centred |

⌘K now opens the palette while you type in the editor too.

## Distraction-free

- Hides the left sidebar, the top bar, the assistant, the page header (breadcrumb, word count, buttons), beats,
  summary, backlinks, margin comments and the editor's own toolbars and block handles. Only the text is left.
- Asks the browser to go full screen. Where the browser does not allow it (for example on iPhone), the chrome is
  still hidden.
- **Esc** exits, and so does leaving full screen any other way. On touch devices, use the faint exit button in the
  bottom corner. Esc first closes an open dialog, menu, suggestion list or ghost completion.
- The layout is restored exactly as it was. Sidebar and assistant state are never changed, only hidden.
- The mode stays on when you switch scenes and ends when you leave the write page. It is not remembered across
  reloads, because full screen needs a user gesture.

## Focus mode

- **Paragraph** (default): the block at the caret stays bright and everything else is dimmed. Inside lists,
  quotes and custom blocks, the dimming follows the nesting.
- **Sentence**: only the sentence at the caret stays bright, including within its paragraph. Toggle it with
  *Focus on the sentence* in the palette or the menu. Sentences are detected with `Intl.Segmenter`.
- It is implemented as decorations (`app/editor/extensions/focus-mode.ts`) plus CSS opacity. Each caret move
  updates at most three decorations, with no document scan. The fade is animated, except with reduced motion.

## Typewriter scrolling

- After every caret move or edit, while the editor has focus, the scroll container is scrolled so that the caret
  line sits in the vertical middle (`app/editor/extensions/typewriter.ts`).
- Padding is added at the start and end of the document, so the first and last lines can also be centred.
- Scrolling is smooth, or instant when *reduce motion* is set.

## Session timer

- Turn on *Session timer* to show an unobtrusive clock in the page header. In distraction-free mode it moves to the
  bottom corner, next to the exit button.
- Click the clock to start or pause it. The chevron menu lets you choose to count up or count down 15/25/45/60
  minutes, reset, or hide the timer. Hiding keeps it running.
- A countdown pauses at 0:00 and shows a "Session time is up" toast.
- The timer is tied to the writing session. It keeps running across scene switches, stops after **30 minutes without
  writing**, and stops when you leave the write page.

## Persistence

Focus mode (and its scope), typewriter scrolling and timer visibility are remembered in the `wrote-writing-modes`
cookie, so the server renders the right chrome. Invalid values fall back to the defaults
(`shared/schemas/writing-modes.ts`). The timer's running state is kept only for the current app session.
