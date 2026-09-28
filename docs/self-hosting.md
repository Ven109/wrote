# Run Wrote: `npx wrote` and Docker

Your books are plain folders of Markdown. Wrote runs on your machine (or your server) and works on those folders.

## `npx wrote` (Node 22+)

```bash
npx wrote ./my-book     # a book folder (contains wrote.json): opens that book
npx wrote ~/Books       # a folder of books: opens the book list
npx wrote               # the current folder
```

Wrote picks the first free port from 3000, waits until the app is ready and opens your browser.

| Option | Default | |
|---|---|---|
| `--port <n>` | first free from 3000 | Fixed port (fails if taken) |
| `--host <address>` | `127.0.0.1` | `0.0.0.0` makes it reachable from other devices – turn on [basic auth](#basic-auth) |
| `--no-open` | | Do not open the browser |
| `wrote mcp …` | | MCP over stdio for desktop agents, see [mcp.md](mcp.md) |

A book folder is served from its parent folder, so the book list also shows the book's siblings. Wrote's index
lives in `.wrote/` inside each book (rebuildable; add it to `.gitignore`).

Exports to EPUB, DOCX and HTML need [Pandoc](https://pandoc.org/installing.html), PDF also needs
[Typst](https://github.com/typst/typst/releases) – on your `PATH` or via `WROTE_PANDOC_PATH` / `WROTE_TYPST_PATH`.
Markdown export always works. The Docker image ships both.

## Docker

```bash
docker run -v ./books:/books -p 3000:3000 ghcr.io/ven109/wrote
```

- Images for `linux/amd64` and `linux/arm64`, tagged with the version (`1.2.3`, `1.2`) and `latest`.
- `/books` is the folder of books (a volume). The app runs as the unprivileged `node` user (uid 1000): the mounted
  folder must be writable for it. If your user has another uid, run with `--user "$(id -u):$(id -g)"`.
- Pandoc and Typst are included, so every export format works.
- `GET /api/health` answers `{ "status": "ok", "version": "…" }`; the image's `HEALTHCHECK` uses it.

```yaml
# docker-compose.yml
services:
  wrote:
    image: ghcr.io/ven109/wrote:latest
    ports: ["3000:3000"]
    volumes: ["./books:/books"]
    environment:
      WROTE_AUTH_USER: me
      WROTE_AUTH_PASSWORD: change-me
    restart: unless-stopped
```

## Basic auth

Set **both** `WROTE_AUTH_USER` and `WROTE_AUTH_PASSWORD` to require HTTP basic auth for the app, the API and `/mcp`.
With either unset nothing changes. `/api/health` stays public (it reveals only the version).

MCP clients authenticate with their own bearer token (see [mcp.md](mcp.md)); requests to `/mcp` that carry one are
passed on to the token check instead of basic auth. Note that the MCP HTTP endpoint only accepts `localhost` hosts,
so remote agents cannot reach it through a server's public address.

Basic auth sends the password with every request: put Wrote behind HTTPS (a reverse proxy such as Caddy or Traefik)
when it is reachable from the internet.

## Environment variables

| Variable | Default | |
|---|---|---|
| `NUXT_WORKSPACE_DIR` | `~/Wrote` (`/books` in Docker) | Folder of books |
| `HOST` / `PORT` | `0.0.0.0` / `3000` in Docker | Listen address |
| `WROTE_AUTH_USER`, `WROTE_AUTH_PASSWORD` | – | Basic auth, see above |
| `WROTE_PANDOC_PATH`, `WROTE_TYPST_PATH` | on `PATH` | Export tools |

## Releases

Pushing a tag `vX.Y.Z` runs `.github/workflows/release.yml`: it publishes the npm package `wrote` and the image
`ghcr.io/ven109/wrote` with that version (prereleases like `v1.0.0-beta.1` go to the npm `next` tag and get no
`latest` image tag), then `.github/workflows/smoke.yml` runs both on clean runners. The workflow needs the
`NPM_TOKEN` repository secret; the first GHCR publish creates a private package – make it public in the package
settings. `smoke.yml` also runs on pull requests that touch packaging (image and tarball built from the branch) and
can be run by hand for a published version.

Locally:

```bash
pnpm build && pnpm pack:npm          # dist/wrote-<version>.tgz (staged in dist/npm)
npx -y --package="$(ls "$PWD"/dist/wrote-*.tgz)" wrote ~/Books
docker build -t wrote .
node test/smoke/check.mjs http://localhost:3000 --formats md,epub,pdf
```
