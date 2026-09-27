---
paths:
  - "shared/**"
---

# Shared (client + server)

- Only code that is safe on both client and server: Zod schemas, inferred types, constants, pure utils. No Node APIs, no DOM, no Nuxt runtime imports.
- Schemas in `shared/schemas/<domain>.ts`; export `XSchema` and `type X = z.infer<typeof XSchema>`. Frontmatter schemas use passthrough to preserve unknown fields.
- Utils in `shared/utils/` are pure, small and fully unit-tested (`*.test.ts`).
- Changing a schema that affects the on-disk book format requires updating `docs/book-format.md` and a migration note.
