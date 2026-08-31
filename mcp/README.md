# hoylog-mcp

Servidor MCP de [Hoylog](https://irvyn2703.github.io/hoylog/). Tools: `log_progress`, `list_progress`, `update_note`.

`SUPABASE_URL` y `SUPABASE_ANON_KEY` son las públicas del proyecto (la misma anon key que usa la web). **No** uses la `service_role`. Cada persona crea **su** `HOYLOG_TOKEN`.

## Cursor

En `~/.cursor/mcp.json`:

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

Hace falta **Node 22+**. Claude Desktop a menudo toma un Node viejo de nvm (`v16`); usa la ruta absoluta a `npx` de Node 24 y pon `PATH` en `env`:

```json
"command": "/Users/irvyn/.nvm/versions/node/v24.16.0/bin/npx",
"args": ["-y", "hoylog-mcp"],
"env": {
  "PATH": "/Users/irvyn/.nvm/versions/node/v24.16.0/bin:/usr/bin:/bin"
}
```

Para desarrollar contra el repo local, usa `node` y la ruta a `mcp/src/index.js` en lugar de `npx`.
