# Higgsfield Cursor plugin — schema fix

## Cause

Cursor rejects marketplace manifests that set:

```json
"$schema": "https://raw.githubusercontent.com/cursor/plugins/main/schemas/plugin.schema.json"
```

Working plugins (Vercel, Exa, …) omit `$schema`. Same class of bug as Monday CRM on the Cursor forum.

## What we did

1. Removed `$schema` from the cached marketplace copy under `~/.cursor/plugins/cache/cursor-public/higgsfield/…`
2. Installed a durable local plugin at `~/.cursor/plugins/local/higgsfield/` (v1.0.1, no `$schema`)
3. Registered MCP server `higgsfield` → `https://mcp.higgsfield.ai/mcp` in `~/.cursor/mcp.json`

## What you do now

1. **Developer: Reload Window** (or restart Cursor)
2. Settings → Plugins: Higgsfield should load without the orange error (local and/or marketplace)
3. Settings → Tools & MCPs: `higgsfield` should appear; complete auth on first connect
4. If marketplace copy still shows the error, **Uninstall** the marketplace plugin and keep the **local** one (or reinstall marketplace after upstream removes `$schema`)

## Generation without the plugin UI

Repo CLI still works (needs credits):

```bash
python3 scripts/higgsfield/cli.py smoke
```
