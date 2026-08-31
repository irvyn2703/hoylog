# hoylog-mcp

Servidor MCP de [Hoylog](https://irvyn2703.github.io/hoylog/). Tools: `log_progress`, `list_progress`, `update_note`.

`SUPABASE_URL` y `SUPABASE_ANON_KEY` son las públicas del proyecto (la misma anon key que usa la web). **No** uses la `service_role`. Cada persona crea **su** `HOYLOG_TOKEN`.

Hace falta **Node 22 o superior**. En una terminal: `node -v`.

## Cursor / Claude Desktop

En `mcp.json` (Cursor: `~/.cursor/mcp.json`; Claude: `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "hoylog": {
      "command": "npx",
      "args": ["-y", "hoylog-mcp"],
      "env": {
        "SUPABASE_URL": "https://vgnfgynqlcghduxxctpg.supabase.co",
        "SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnbmZneW5xbGNnaGR1eHhjdHBnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4NjQ4NzYsImV4cCI6MjEwMzQ0MDg3Nn0.4J2cab57sGUV74i8FHJLqtv4qF3iWRELb60T3gHXShg",
        "HOYLOG_TOKEN": "hyl_…",
        "TZ": "America/Mexico_City"
      }
    }
  }
}
```

1. Entra a https://irvyn2703.github.io/hoylog/ y crea un token en **MCP**.
2. Sustituye `hyl_…` por ese token.

Si Claude Desktop arranca un Node viejo (error `Headers is not defined`), no uses `npx` a secas. En tu máquina corre `which node` y `dirname "$(which npx)"` con Node 22+ activo, y pon esa ruta de **tu** `npx` en `command` y su carpeta `bin` en `env.PATH`.
