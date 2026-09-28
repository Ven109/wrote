# Snapshots

A snapshot is a named copy of a scene, a chapter or the whole book that you can compare with the current text and
restore – all of it, one file, or single paragraphs.

## Taking snapshots

- **Manually**: *Snapshots* in the sidebar → *Take snapshot*, or the camera button in the editor header (snapshots of
  that scene; the dialog offers the scene, its chapter or the whole book).
- **Automatically before AI bulk actions**: when the assistant or a connected agent changes several files, or several
  paragraphs of one file, in one tool call, Wrote keeps the affected files as they were in a snapshot labelled
  *Before <action> (<who>)*. Single-paragraph edits are covered by the activity log alone. The newest 100 automatic
  snapshots are kept; named ones are never removed automatically.
- **Before every restore** (see below).

A whole-book snapshot holds every Markdown file of the book plus `wrote.json`.

## Comparing and restoring

Pick a snapshot to see the files that differ from now as a **block diff** (paragraphs, headings, lists, code blocks),
**side by side** or **inline**. A change of only the `updated` timestamp is not shown.

- **Restore** on a block puts back that block only; **Restore file** one file; **Restore all** the whole snapshot (a
  whole-book snapshot also removes files created since).
- A restore first snapshots the current state of the files it changes, and is logged in the **activity log** – undo
  it from the toast, from *Activity*, or by restoring the *Before restoring …* snapshot.
- If a file changed after the comparison was loaded, the restore is refused (reload the comparison).

## Git

With *Book settings → Commit snapshots to git* on and the book folder inside a git repository, each named snapshot
commits the snapshotted files with the message `Snapshot: <name>` (other staged work stays staged). Automatic
snapshots are not committed. With the setting off, git is never touched.

## Storage

Contents are stored once per distinct file version as gzipped, content-addressed blobs in
`.wrote/snapshots/objects/`; the list of snapshots (name, scope, file → blob) is in `.wrote/state.db`. Deleting a
snapshot removes blobs no other snapshot uses.

API: `GET/POST /api/books/:id/snapshots`, `GET …/:snapshotId/diff`, `POST …/:snapshotId/restore`, `DELETE …/:snapshotId`.
