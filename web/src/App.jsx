import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import {
  isoWeekInfo,
  periodLabel,
  periodRange,
  shiftCursor,
  todayInTz,
  weekdayLabel,
} from './lib/dates'
import { randomToken, sha256Hex } from './lib/token'

const COLORS = ['yellow', 'pink', 'mint', 'lilac', 'peach']

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null))
    const { data } = supabase.auth.onAuthStateChange((_e, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])

  if (session === undefined) return <div className="board-shell"><p className="empty">Cargando el pizarrón…</p></div>
  if (!session) return <Login />

  return (
    <div className="board-shell">
      <div className="board">
        <header className="tray">
          <p className="brand">Hoylog</p>
          <nav className="nav">
            <NavLink to="/" end>Avances</NavLink>
            <NavLink to="/notas">Notas</NavLink>
            <NavLink to="/mcp">MCP</NavLink>
            <button className="ghost" type="button" onClick={() => supabase.auth.signOut()}>Salir</button>
          </nav>
        </header>
        <Routes>
          <Route path="/" element={<ProgressBoard userId={session.user.id} />} />
          <Route path="/notas" element={<NotesBoard userId={session.user.id} />} />
          <Route path="/mcp" element={<McpPage userId={session.user.id} />} />
        </Routes>
      </div>
    </div>
  )
}

function Login() {
  const [error, setError] = useState('')

  async function enter() {
    setError('')
    const { error: next } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}` },
    })
    if (next) setError(next.message)
  }

  return (
    <div className="login">
      <div className="login-card">
        <h1>Hoylog</h1>
        <p>Tu pizarrón de avances diarios y notas que no caducan.</p>
        <div className="row" style={{ justifyContent: 'flex-start' }}>
          <button className="primary" type="button" onClick={enter}>Entrar con Google</button>
        </div>
        {error ? <p className="error">{error}</p> : null}
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
          Si Google no está activado en Supabase Auth, el botón devolverá un error de provider.
        </p>
      </div>
    </div>
  )
}

function ProgressBoard({ userId }) {
  const [mode, setMode] = useState('week')
  const [cursor, setCursor] = useState(todayInTz())
  const [notes, setNotes] = useState([])
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const range = useMemo(() => periodRange(mode, cursor), [mode, cursor])

  useEffect(() => {
    let live = true
    ;(async () => {
      const { data, error: next } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'progress')
        .gte('occurred_on', range.from)
        .lte('occurred_on', range.to)
        .order('occurred_on', { ascending: true })
        .order('created_at', { ascending: true })
      if (!live) return
      if (next) setError(next.message)
      else {
        setError('')
        setNotes(data ?? [])
      }
    })()
    return () => { live = false }
  }, [userId, range.from, range.to])

  const days = useMemo(() => {
    if (mode !== 'week') return null
    const { monday } = isoWeekInfo(cursor)
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDaysSafe(monday, i)
      return { date, items: notes.filter((n) => n.occurred_on === date) }
    })
  }, [mode, cursor, notes])

  return (
    <>
      <div className="period">
        <button className="ghost" type="button" onClick={() => setCursor(shiftCursor(mode, cursor, -1))}>←</button>
        <h2>{periodLabel(mode, cursor)}</h2>
        <button className="ghost" type="button" onClick={() => setCursor(shiftCursor(mode, cursor, 1))}>→</button>
        <button className="chip" type="button" onClick={() => setCursor(todayInTz())}>Hoy</button>
        {['day', 'week', 'month'].map((m) => (
          <button key={m} className={`chip${mode === m ? ' active' : ''}`} type="button" onClick={() => setMode(m)}>
            {m === 'day' ? 'Día' : m === 'week' ? 'Semana' : 'Mes'}
          </button>
        ))}
      </div>
      {error ? <p className="error">{error}</p> : null}
      {mode === 'week' && days ? (
        <div className="week-grid">
          {days.map((col) => (
            <section key={col.date} className="week-col">
              <h3>{weekdayLabel(col.date)}</h3>
              {col.items.map((note) => (
                <Sticky key={note.id} note={note} onClick={() => setEditing(note)} />
              ))}
            </section>
          ))}
        </div>
      ) : notes.length ? (
        <div className="masonry">
          {notes.map((note) => (
            <Sticky key={note.id} note={note} onClick={() => setEditing(note)} />
          ))}
        </div>
      ) : (
        <p className="empty">Este periodo está en blanco. Pega el primer avance.</p>
      )}
      <button className="fab" type="button" aria-label="Nuevo avance" onClick={() => setEditing({
        type: 'progress',
        body: '',
        title: '',
        color: 'yellow',
        occurred_on: range.from > todayInTz() || range.to < todayInTz() ? range.from : todayInTz(),
      })}>+</button>
      {editing ? (
        <Editor
          note={editing}
          type="progress"
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setNotes((curr) => upsert(curr, saved))
            setEditing(null)
          }}
          onDeleted={(id) => {
            setNotes((curr) => curr.filter((n) => n.id !== id))
            setEditing(null)
          }}
        />
      ) : null}
    </>
  )
}

function addDaysSafe(iso, n) {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + n)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function NotesBoard({ userId }) {
  const [notes, setNotes] = useState([])
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    ;(async () => {
      const { data, error: next } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'evergreen')
        .order('created_at', { ascending: false })
      if (!live) return
      if (next) setError(next.message)
      else setNotes(data ?? [])
    })()
    return () => { live = false }
  }, [userId])

  const shown = notes.filter((n) => {
    const hay = `${n.title ?? ''} ${n.body}`.toLowerCase()
    return hay.includes(q.trim().toLowerCase())
  })

  return (
    <>
      <div className="period">
        <h2>Notas que no caducan</h2>
        <input className="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar" />
      </div>
      {error ? <p className="error">{error}</p> : null}
      {shown.length ? (
        <div className="masonry">
          {shown.map((note) => (
            <Sticky key={note.id} note={note} onClick={() => setEditing(note)} />
          ))}
        </div>
      ) : (
        <p className="empty">Todavía no hay notas pegadas.</p>
      )}
      <button className="fab" type="button" aria-label="Nueva nota" onClick={() => setEditing({
        type: 'evergreen', body: '', title: '', color: 'mint', occurred_on: null,
      })}>+</button>
      {editing ? (
        <Editor
          note={editing}
          type="evergreen"
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setNotes((curr) => upsert(curr, saved))
            setEditing(null)
          }}
          onDeleted={(id) => {
            setNotes((curr) => curr.filter((n) => n.id !== id))
            setEditing(null)
          }}
        />
      ) : null}
    </>
  )
}

function Sticky({ note, onClick }) {
  return (
    <button type="button" className={`sticky ${note.color}`} onClick={onClick}>
      <h3>{note.title || (note.type === 'progress' ? 'Avance' : 'Nota')}</h3>
      <p>{note.body}</p>
      {note.occurred_on ? <time>{note.occurred_on}</time> : null}
    </button>
  )
}

function Editor({ note, type, onClose, onSaved, onDeleted }) {
  const [title, setTitle] = useState(note.title ?? '')
  const [body, setBody] = useState(note.body ?? '')
  const [color, setColor] = useState(note.color ?? 'yellow')
  const [occurredOn, setOccurredOn] = useState(note.occurred_on ?? todayInTz())
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [canDismiss, setCanDismiss] = useState(false)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const t = window.setTimeout(() => setCanDismiss(true), 400)
    return () => {
      document.body.style.overflow = prev
      window.clearTimeout(t)
    }
  }, [])

  async function save(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const payload = {
      type,
      title: title.trim() || null,
      body: body.trim(),
      color,
      occurred_on: type === 'progress' ? occurredOn : null,
    }
    const { data: authData } = await supabase.auth.getUser()
    const userId = authData.user?.id
    const query = note.id
      ? supabase.from('notes').update(payload).eq('id', note.id).select().single()
      : supabase.from('notes').insert({ ...payload, user_id: userId }).select().single()
    const { data, error: next } = await query
    setBusy(false)
    if (next) setError(next.message)
    else onSaved(data)
  }

  async function remove() {
    if (!note.id) return onClose()
    setBusy(true)
    const { error: next } = await supabase.from('notes').delete().eq('id', note.id)
    setBusy(false)
    if (next) setError(next.message)
    else onDeleted(note.id)
  }

  return createPortal(
    <div
      className="sheet"
      onClick={() => {
        if (canDismiss) onClose()
      }}
      role="presentation"
    >
      <form className="sticky-editor" onClick={(e) => e.stopPropagation()} onSubmit={save}>
        <label htmlFor="title">Título</label>
        <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <label htmlFor="body">Texto</label>
        <textarea id="body" required value={body} onChange={(e) => setBody(e.target.value)} />
        {type === 'progress' ? (
          <>
            <label htmlFor="when">Día del avance</label>
            <input id="when" type="date" value={occurredOn} onChange={(e) => setOccurredOn(e.target.value)} required />
          </>
        ) : null}
        <label>Color</label>
        <div className="colors">
          {COLORS.map((c) => (
            <button key={c} type="button" className={`swatch ${c}${color === c ? ' on' : ''}`} style={{ background: `var(--${c})` }} onClick={() => setColor(c)} aria-label={c} />
          ))}
        </div>
        {error ? <p className="error">{error}</p> : null}
        <div className="row">
          {note.id ? <button className="ghost" type="button" onClick={remove} disabled={busy}>Borrar</button> : null}
          <button className="ghost" type="button" onClick={onClose}>Cerrar</button>
          <button className="primary" type="submit" disabled={busy}>Guardar</button>
        </div>
      </form>
    </div>,
    document.body,
  )
}

function upsert(list, row) {
  const i = list.findIndex((n) => n.id === row.id)
  if (i === -1) return [row, ...list]
  const next = list.slice()
  next[i] = row
  return next
}

function McpPage({ userId }) {
  const [tokens, setTokens] = useState([])
  const [plain, setPlain] = useState('')
  const [name, setName] = useState('Cursor')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    supabase.from('api_tokens').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      .then(({ data, error: next }) => {
        if (next) setError(next.message)
        else setTokens(data ?? [])
      })
  }, [userId])

  async function createToken(e) {
    e.preventDefault()
    setError('')
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession()
    let session = refreshed?.session
    if (refreshError || !session) {
      const { data: fallback } = await supabase.auth.getSession()
      session = fallback.session
    }
    if (!session?.access_token || !session.user?.id) {
      setError('No hay sesión de Supabase. Sal y entra otra vez con Google.')
      return
    }
    const raw = randomToken()
    const token_hash = await sha256Hex(raw)
    const url = import.meta.env.VITE_SUPABASE_URL
    const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
    const res = await fetch(`${url}/rest/v1/api_tokens?select=*`, {
      method: 'POST',
      headers: {
        apikey: anon,
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        name,
        token_hash,
        user_id: session.user.id,
      }),
    })
    const payload = await res.json().catch(() => null)
    if (!res.ok) {
      const msg = payload?.message || payload?.msg || payload?.error_description || `HTTP ${res.status}`
      setError(msg)
      return
    }
    const row = Array.isArray(payload) ? payload[0] : payload
    setPlain(raw)
    setTokens((curr) => [row, ...curr])
  }

  async function revoke(id) {
    const { error: next } = await supabase.from('api_tokens').update({ revoked_at: new Date().toISOString() }).eq('id', id)
    if (next) setError(next.message)
    else setTokens((curr) => curr.map((t) => (t.id === id ? { ...t, revoked_at: new Date().toISOString() } : t)))
  }

  return (
    <>
      <div className="period">
        <h2>Token para Cursor / Claude</h2>
        <button className="ghost" type="button" onClick={() => navigate('/')}>Volver</button>
      </div>
      <p>El MCP no usa Google. Crea un token, cópialo una vez y pégalo en <code>HOYLOG_TOKEN</code>.</p>
      <form onSubmit={createToken}>
        <label htmlFor="tokname">Nombre</label>
        <input id="tokname" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="row" style={{ justifyContent: 'flex-start' }}>
          <button className="primary" type="submit">Crear token</button>
        </div>
      </form>
      {plain ? (
        <p className="token-box">{plain}</p>
      ) : null}
      {error ? <p className="error">{error}</p> : null}
      <div className="masonry" style={{ marginTop: 24 }}>
        {tokens.map((t) => (
          <article key={t.id} className="sticky peach" style={{ cursor: 'default' }}>
            <h3>{t.name}</h3>
            <p>{t.revoked_at ? 'Revocado' : 'Activo'}</p>
            <time>{t.created_at.slice(0, 10)}</time>
            {!t.revoked_at ? <button className="ghost" type="button" onClick={() => revoke(t.id)}>Revocar</button> : null}
          </article>
        ))}
      </div>
    </>
  )
}
