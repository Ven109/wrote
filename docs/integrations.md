# Integrations (MCP client)

Wrote's assistant can use tools from other MCP servers – web search, a reference manager, a dictionary.
Add them under **Settings → Integrations**.

- **Local servers (stdio)**: a command and arguments, e.g. `npx -y @modelcontextprotocol/server-brave-search`.
  Wrote starts the process when it is first needed, restarts it if it crashes (a few times, then shows an
  error) and stops it when the app exits. It gets `PATH` and a few basics from Wrote's environment plus the
  variables you set – not Wrote's own secrets.
- **Remote servers (Streamable HTTP)**: a URL, optionally with headers. Servers that require OAuth show
  **Sign in**; Wrote registers itself, signs in with PKCE in your browser and refreshes tokens after that.
- **Secrets** (environment variables, headers, OAuth tokens) live in `<workspace>/.wrote/integration-secrets.json`
  (readable by you only) and are never sent to the browser; the settings (`integrations.json`) hold only
  their names. Nothing is stored in book folders.
- **Tools** are listed per server with on/off switches. The assistant sees enabled tools as
  `<integration-id>__<tool>`. **Policy** per server: *Ask each time* (you approve every call, like write
  tools), *Always allow* (for read-only tools you trust) or *Off*.
- External tool results are treated as untrusted content, like book text. The assistant saves findings with
  `create_note` when you ask it to.
