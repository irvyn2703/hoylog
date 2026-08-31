# Hoylog

Pizarrón de avances diarios y notas atemporales. Vite + React + Supabase. MCP para subir el avance del día desde Cursor o Claude.

## Publicar (GitHub Pages)

La app queda en **https://irvyn2703.github.io/hoylog/**

Cada push a `main` construye `web/` y la sube. En el repo: **Settings → Secrets and variables → Actions**:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Settings → Pages → Source:** GitHub Actions.

Los secrets deben estar en el environment **github-pages** (como los pusiste) o a nivel repo. El job de _build_ usa ese environment.

Auth de Google, añade:

- Supabase **Redirect URLs:** `https://irvyn2703.github.io/hoylog/**`
- Google Cloud **Authorized JavaScript origins:** `https://irvyn2703.github.io`

El callback de Google sigue siendo `https://vgnfgynqlcghduxxctpg.supabase.co/auth/v1/callback`.

Local no cambia: `cd web && npm run dev` (base `/`).

## Arranque web

```bash
cd web
cp .env.example .env   # ya puedes usar el .env local
npm install
npm run dev
```

Abre `http://localhost:5173`.

### Google Auth

En Supabase: **Authentication → Providers → Google**. Redirect:

`https://vgnfgynqlcghduxxctpg.supabase.co/auth/v1/callback`

En **URL configuration**:

- Site URL: `http://localhost:5173`
- Redirect URLs: `http://localhost:5173/**`

## MCP

Uso normal: **npx**, sin clonar el repo. Crea el token en la pantalla **MCP** de la web. Tools: `log_progress`, `list_progress`, `update_note`.

```json
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
```

## Modelo

Una tabla `notes`: `type = progress | evergreen`. `occurred_on` solo en avances. Semana/mes se calculan en la UI.
