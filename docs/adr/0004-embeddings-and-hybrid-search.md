# ADR 0004 – Embeddings and hybrid search on libSQL vectors

- Status: accepted
- Date: 2026-09-27
- Work item: WRO-44

## Context

Writers search by description ("scenes where Mara feels guilty"), not only by words. Semantic search needs
embeddings, which are slow or cost money to compute, must work offline with a local model, and must never block
writing. The plan named `sqlite-vec` for storage.

## Decision

- **Storage: libSQL's native vectors**, not `sqlite-vec`. The libSQL client we already use ships vector functions
  (`vector_distance_cos`, `vector32`, Float32 blobs) – nothing to load or bundle per platform (Electron!). Vectors live
  in the rebuildable `index.db`.
- **Chunks:** the indexer splits each entry into passages (`server/search/chunk.ts`): paragraphs grouped under their
  heading, closed at *content-defined* boundaries (a paragraph whose hash is divisible by 3) or a size limit. Because a
  boundary depends only on the paragraph itself, an edit changes at most the chunk it is in and the next one.
- **Vectors keyed by chunk hash** (`embeddings(hash, vector)`): identical text is embedded once and unchanged text
  survives edits and re-indexing. `index_meta.embedding_model` records the `provider:model`; a different model drops
  all vectors.
- **Background job `embed`** (ADR 0002 queue): embeds chunks without a vector in batches of 32 and prunes vectors of
  deleted text. It is enqueued *unique + debounced* (4 s) after every index change, on book open (catch-up) and when
  the embedding model changes. Progress shows in the jobs indicator.
- **Search:** exact k-NN scan (a book has at most a few thousand chunks), best chunk per entry, fused with FTS5 BM25
  via reciprocal rank fusion (k = 60). Only the closest `limit` entries by meaning take part, as nearest neighbours
  always exist. Without a model, vectors, or when the model fails at query time, search is full-text only.
- **Models:** an `embedding` slot next to `chat`/`fast` in AI settings, resolved by `getEmbeddingModel()`.

## Consequences

- No native extension to ship; the approach carries over to a Postgres backend as pgvector (WRO-374).
- Bumping `INDEX_SCHEMA_VERSION` drops the vectors too; they are recomputed in the background.
- An approximate index (`libsql_vector_idx`) can be added if books ever grow past exact-scan speed.
