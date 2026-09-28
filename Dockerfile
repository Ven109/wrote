# syntax=docker/dockerfile:1
# Wrote – self-hosted image with Pandoc and Typst for exports. Multi-arch (linux/amd64, linux/arm64).
#   docker run -v ./books:/books -p 3000:3000 ghcr.io/ven109/wrote
# See docs/self-hosting.md.

ARG NODE_VERSION=22
ARG PANDOC_VERSION=3.6.4
ARG TYPST_VERSION=v0.13.1

# ── Build the Nuxt app (.output is self-contained: server + traced node_modules for this arch) ──
FROM node:${NODE_VERSION}-bookworm-slim AS build
WORKDIR /app
ENV CI=true SKIP_INSTALL_SIMPLE_GIT_HOOKS=1
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store pnpm fetch --frozen-lockfile
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile --offline
# Released images carry the tag's version (reported by /api/health).
ARG VERSION=
RUN if [ -n "$VERSION" ]; then npm pkg set version="$VERSION"; fi && pnpm exec nuxt build

# ── Export tools: static Pandoc and Typst binaries for the target arch ──
FROM debian:bookworm-slim AS tools
ARG TARGETARCH
ARG PANDOC_VERSION
ARG TYPST_VERSION
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl xz-utils \
  && rm -rf /var/lib/apt/lists/*
RUN set -eux; \
  case "$TARGETARCH" in \
    amd64) pandoc_arch=amd64; typst_arch=x86_64 ;; \
    arm64) pandoc_arch=arm64; typst_arch=aarch64 ;; \
    *) echo "unsupported arch: $TARGETARCH" >&2; exit 1 ;; \
  esac; \
  curl -fsSL "https://github.com/jgm/pandoc/releases/download/${PANDOC_VERSION}/pandoc-${PANDOC_VERSION}-linux-${pandoc_arch}.tar.gz" \
    | tar -xz --strip-components=2 -C /usr/local/bin "pandoc-${PANDOC_VERSION}/bin/pandoc"; \
  curl -fsSL "https://github.com/typst/typst/releases/download/${TYPST_VERSION}/typst-${typst_arch}-unknown-linux-musl.tar.xz" \
    | tar -xJ --strip-components=1 -C /usr/local/bin "typst-${typst_arch}-unknown-linux-musl/typst"; \
  pandoc --version | head -1; typst --version

# ── Runtime ──
FROM node:${NODE_VERSION}-bookworm-slim
LABEL org.opencontainers.image.title="Wrote" \
      org.opencontainers.image.description="Open-source, AI-native workspace for writing books" \
      org.opencontainers.image.source="https://github.com/Ven109/wrote" \
      org.opencontainers.image.licenses="AGPL-3.0-only"
# tini forwards signals and reaps children (Pandoc/Typst runs); fontconfig lets Typst find system fonts.
RUN apt-get update \
  && apt-get install -y --no-install-recommends tini fontconfig \
  && rm -rf /var/lib/apt/lists/*
COPY --from=tools /usr/local/bin/pandoc /usr/local/bin/typst /usr/local/bin/
WORKDIR /app
COPY --from=build --chown=node:node /app/.output ./.output
RUN mkdir -p /books && chown node:node /books
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    NUXT_WORKSPACE_DIR=/books \
    WROTE_PANDOC_PATH=/usr/local/bin/pandoc \
    WROTE_TYPST_PATH=/usr/local/bin/typst
USER node
VOLUME ["/books"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "/app/.output/server/index.mjs"]
