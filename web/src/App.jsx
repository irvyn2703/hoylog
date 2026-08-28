import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { supabase } from "./lib/supabase";
import {
  isoWeekInfo,
  periodDates,
  periodHeading,
  periodRange,
  shiftCursor,
  todayInTz,
  weekdayLabel,
} from "./lib/dates";
import { applyList, inlineTokens, parseBlocks, wrapInline } from "./lib/markup";
import { randomToken, sha256Hex } from "./lib/token";
import {
  applyVisibleOrder,
  nextEndSortOrder,
  sortByImportance,
} from "./lib/order";
import { filterNotesByActivity } from "./lib/visibility";

const COLORS = ["yellow", "pink", "mint", "lilac", "peach"];
const pinSpring = { type: "spring", stiffness: 420, damping: 28, mass: 0.7 };

function stickyTilt(id) {
  const n = String(id ?? "x")
    .split("")
    .reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return [-1.4, 1.1, -0.4][n % 3];
}

export default function App() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session ?? null));
    const { data } = supabase.auth.onAuthStateChange((_e, next) =>
      setSession(next),
    );
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined)
    return (
      <div className="board-shell">
        <p className="empty">Cargando el pizarrón…</p>
      </div>
    );
  if (!session) return <Login />;

  return (
    <div className="board-shell">
      <div className="board">
        <header className="tray">
          <p className="brand">Hoylog</p>
          <nav className="nav">
            <NavLink to="/" end>
              Avances
            </NavLink>
            <NavLink to="/notas">Notas</NavLink>
            <NavLink to="/mcp">MCP</NavLink>
            <button
              className="ghost"
              type="button"
              onClick={() => supabase.auth.signOut()}
            >
              Salir
            </button>
          </nav>
        </header>
        <Routes>
          <Route
            path="/"
            element={<ProgressBoard userId={session.user.id} />}
          />
          <Route
            path="/notas"
            element={<NotesBoard userId={session.user.id} />}
          />
          <Route path="/mcp" element={<McpPage userId={session.user.id} />} />
        </Routes>
      </div>
    </div>
  );
}

function Login() {
  const [error, setError] = useState("");

  async function enter() {
    setError("");
    const { error: next } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
      },
    });
    if (next) setError(next.message);
  }

  return (
    <div className="login">
      <motion.div
        className="login-card"
        initial={{ opacity: 0, y: 18, rotate: -8, scale: 0.94 }}
        animate={{ opacity: 1, y: [0, -6, 0], rotate: [-1, 1, -1] }}
        transition={{
          opacity: { duration: 0.35 },
          scale: { type: "spring", stiffness: 260, damping: 18 },
          y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: 4, repeat: Infinity, ease: "easeInOut" },
        }}
      >
        <h1>Hoylog</h1>
        <p>Tu pizarrón de avances diarios y notas que no caducan.</p>
        <div className="row" style={{ justifyContent: "flex-start" }}>
          <button className="primary" type="button" onClick={enter}>
            Entrar con Google
          </button>
        </div>
        {error ? <p className="error">{error}</p> : null}
        <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
          Si Google no está activado en Supabase Auth, el botón devolverá un
          error de provider.
        </p>
      </motion.div>
    </div>
  );
}

function ActivityFilter({ value, onChange }) {
  return (
    <div className="chip-row">
      {[
        ["active", "Activas"],
        ["inactive", "No activas"],
      ].map(([id, label]) => (
        <button
          key={id}
          className={`chip${value === id ? " active" : ""}`}
          type="button"
          onClick={() => onChange(id)}
        >
          {value === id ? (
            <motion.span className="chip-pill" layoutId="activity-pill" />
          ) : null}
          {label}
        </button>
      ))}
    </div>
  );
}

function ProgressBoard({ userId }) {
  const [mode, setMode] = useState("week");
  const [cursor, setCursor] = useState(todayInTz());
  const [notes, setNotes] = useState([]);
  const [activity, setActivity] = useState("active");
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const range = useMemo(() => periodRange(mode, cursor), [mode, cursor]);
  const visible = useMemo(
    () => filterNotesByActivity(notes, activity),
    [notes, activity],
  );

  useEffect(() => {
    let live = true;
    (async () => {
      const { data, error: next } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", userId)
        .eq("type", "progress")
        .gte("occurred_on", range.from)
        .lte("occurred_on", range.to)
        .order("occurred_on", { ascending: true })
        .order("created_at", { ascending: true });
      if (!live) return;
      if (next) setError(next.message);
      else {
        setError("");
        setNotes(data ?? []);
      }
    })();
    return () => {
      live = false;
    };
  }, [userId, range.from, range.to]);

  const days = useMemo(() => {
    if (mode !== "week") return null;
    const { monday } = isoWeekInfo(cursor);
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDaysSafe(monday, i);
      return { date, items: visible.filter((n) => n.occurred_on === date) };
    });
  }, [mode, cursor, visible]);

  return (
    <>
      <LayoutGroup>
      <div className="period">
        <div className="period-row">
          <ActivityFilter value={activity} onChange={setActivity} />
        </div>
        <div className="period-row period-cal">
          <button
            className="ghost"
            type="button"
            onClick={() => setCursor(shiftCursor(mode, cursor, -1))}
          >
            ←
          </button>
          <div className="period-title">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${mode}-${cursor}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
              >
                <h2>{periodHeading(mode, cursor)}</h2>
                <p className="period-dates">{periodDates(mode, cursor)}</p>
              </motion.div>
            </AnimatePresence>
          </div>
          <button
            className="ghost"
            type="button"
            onClick={() => setCursor(shiftCursor(mode, cursor, 1))}
          >
            →
          </button>
        </div>

        <div className="period-row chip-row">
          <button
            className="chip"
            type="button"
            onClick={() => setCursor(todayInTz())}
          >
            Hoy
          </button>
          {["day", "week", "month"].map((m) => (
            <button
              key={m}
              className={`chip${mode === m ? " active" : ""}`}
              type="button"
              onClick={() => setMode(m)}
            >
              {mode === m ? (
                <motion.span className="chip-pill" layoutId="mode-pill" />
              ) : null}
              {m === "day" ? "Día" : m === "week" ? "Semana" : "Mes"}
            </button>
          ))}
        </div>
      </div>
      </LayoutGroup>
      {error ? <p className="error">{error}</p> : null}
      {mode === "week" && days ? (
        <div className="week-grid">
          {days.map((col, ci) => (
            <motion.section
              key={col.date}
              className={`week-col${col.items.length ? "" : " empty-day"}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...pinSpring, delay: ci * 0.045 }}
            >
              <h3>{weekdayLabel(col.date)}</h3>
              {col.items.length ? (
                <div className="week-notes">
                  <AnimatePresence>
                    {col.items.map((note, i) => (
                      <Sticky
                        key={note.id}
                        note={note}
                        index={i}
                        onClick={() => setEditing(note)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              ) : null}
            </motion.section>
          ))}
        </div>
      ) : visible.length ? (
        <div className="masonry">
          <AnimatePresence mode="popLayout">
            {visible.map((note, i) => (
              <Sticky
                key={note.id}
                note={note}
                index={i}
                onClick={() => setEditing(note)}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <p className="empty">
          {activity === "inactive"
            ? "No hay avances en archivo en este periodo."
            : "Este periodo está en blanco. Pega el primer avance."}
        </p>
      )}
      {editing ? null : (
        <Fab
          label="Nuevo avance"
          onClick={() =>
            setEditing({
              type: "progress",
              body: "",
              title: "",
              color: "yellow",
              is_active: true,
              occurred_on:
                range.from > todayInTz() || range.to < todayInTz()
                  ? range.from
                  : todayInTz(),
            })
          }
        />
      )}
      <EditorHost
        note={editing}
        type="progress"
        onClose={() => setEditing(null)}
        onSaved={(saved) => {
          setNotes((curr) => upsert(curr, saved));
          setActivity(saved.is_active === false ? "inactive" : "active");
          setEditing(null);
        }}
        onDeleted={(id) => {
          setNotes((curr) => curr.filter((n) => n.id !== id));
          setEditing(null);
        }}
      />
    </>
  );
}

function addDaysSafe(iso, n) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function NotesBoard({ userId }) {
  const [notes, setNotes] = useState([]);
  const [q, setQ] = useState("");
  const [activity, setActivity] = useState("active");
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const dragId = useRef(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const { data, error: next } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", userId)
        .eq("type", "evergreen");
      if (!live) return;
      if (next) setError(next.message);
      else {
        setError("");
        setNotes(sortByImportance(data ?? []));
      }
    })();
    return () => {
      live = false;
    };
  }, [userId]);

  const shown = filterNotesByActivity(notes, activity).filter((n) => {
    const hay = `${n.title ?? ""} ${n.body}`.toLowerCase();
    return hay.includes(q.trim().toLowerCase());
  });
  const canRank = !q.trim() && shown.length > 1;

  async function persistOrder(next) {
    const prev = new Map(notes.map((n) => [n.id, n.sort_order]));
    setNotes(next);
    const changed = next.filter((n) => n.sort_order !== prev.get(n.id));
    if (!changed.length) return;
    const results = await Promise.all(
      changed.map((n) =>
        supabase
          .from("notes")
          .update({ sort_order: n.sort_order })
          .eq("id", n.id),
      ),
    );
    const fail = results.find((r) => r.error);
    if (fail) setError(fail.error.message);
    else setError("");
  }

  function moveShown(from, to) {
    if (from < 0 || to < 0 || from === to || to >= shown.length) return;
    const ids = shown.map((n) => n.id);
    const [id] = ids.splice(from, 1);
    ids.splice(to, 0, id);
    persistOrder(applyVisibleOrder(notes, ids));
  }

  return (
    <>
      <div className="period">
        <div className="period-row">
          <ActivityFilter value={activity} onChange={setActivity} />
          <input
            className="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar"
          />
        </div>
      </div>
      {error ? <p className="error">{error}</p> : null}
      {shown.length ? (
        <div className="masonry">
          <AnimatePresence mode="popLayout">
            {shown.map((note, i) => (
              <Sticky
                key={note.id}
                note={note}
                index={i}
                rank={canRank ? i + 1 : null}
                onClick={() => setEditing(note)}
                onMove={canRank ? (delta) => moveShown(i, i + delta) : null}
                onDragStart={
                  canRank
                    ? () => {
                        dragId.current = note.id;
                      }
                    : null
                }
                onDrop={
                  canRank
                    ? () => {
                        const from = shown.findIndex(
                          (n) => n.id === dragId.current,
                        );
                        moveShown(from, i);
                        dragId.current = null;
                      }
                    : null
                }
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <p className="empty">
          {activity === "inactive"
            ? "No hay notas en archivo."
            : "Todavía no hay notas pegadas."}
        </p>
      )}
      {editing ? null : (
        <Fab
          label="Nueva nota"
          onClick={() =>
            setEditing({
              type: "evergreen",
              body: "",
              title: "",
              color: "mint",
              is_active: true,
              occurred_on: null,
              sort_order: nextEndSortOrder(notes),
            })
          }
        />
      )}
      <EditorHost
        note={editing}
        type="evergreen"
        onClose={() => setEditing(null)}
        onSaved={(saved) => {
          setNotes((curr) => sortByImportance(upsert(curr, saved)));
          setActivity(saved.is_active === false ? "inactive" : "active");
          setEditing(null);
        }}
        onDeleted={(id) => {
          setNotes((curr) => curr.filter((n) => n.id !== id));
          setEditing(null);
        }}
      />
    </>
  );
}

function Fab({ label, onClick }) {
  const reduce = useReducedMotion();
  return createPortal(
    <motion.button
      className="fab"
      type="button"
      aria-label={label}
      onClick={onClick}
      initial={reduce ? false : { scale: 0.4, rotate: -40, opacity: 0 }}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      whileHover={reduce ? undefined : { scale: 1.1, rotate: -12 }}
      whileTap={{ scale: 0.92 }}
      transition={pinSpring}
    >
      +
    </motion.button>,
    document.body,
  );
}

function Inline({ text }) {
  return inlineTokens(text).map((tok, i) => {
    if (tok.t === "b") return <strong key={i}>{tok.v}</strong>;
    if (tok.t === "s") return <s key={i}>{tok.v}</s>;
    return <span key={i}>{tok.v}</span>;
  });
}

function NoteBody({ text }) {
  const blocks = parseBlocks(text);
  if (!blocks.length) return null;
  return (
    <div className="note-body">
      {blocks.map((block, i) => {
        if (block.type === "ul") {
          return (
            <ul key={i}>
              {block.items.map((item, j) => (
                <li key={j}>
                  <Inline text={item} />
                </li>
              ))}
            </ul>
          );
        }
        if (block.type === "gap") {
          return (
            <span key={i} className="note-gap">
              {Array.from({ length: block.lines }, (_, j) => (
                <br key={j} />
              ))}
            </span>
          );
        }
        return (
          <p key={i}>
            <Inline text={block.text} />
          </p>
        );
      })}
    </div>
  );
}

function Sticky({
  note,
  onClick,
  rank,
  index = 0,
  onMove,
  onDragStart,
  onDrop,
}) {
  const reduce = useReducedMotion();
  const archived = note.is_active === false;
  const tilt = stickyTilt(note.id);
  return (
    <motion.article
      layout="position"
      className={`sticky ${note.color}${archived ? " archived" : ""}`}
      role="button"
      tabIndex={0}
      style={{ originX: 0.5, originY: 0 }}
      initial={
        reduce
          ? false
          : { opacity: 0, y: -28, rotate: tilt - 10, scale: 0.88 }
      }
      animate={{
        opacity: archived ? 0.78 : 1,
        y: 0,
        rotate: tilt,
        scale: 1,
      }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.86 }}
      whileHover={
        reduce
          ? undefined
          : {
              y: -8,
              rotate: tilt * 1.5,
              zIndex: 2,
              boxShadow: "6px 10px 0 rgba(28, 40, 52, 0.14)",
            }
      }
      whileTap={{ y: -2, rotate: tilt }}
      transition={{
        ...pinSpring,
        delay: reduce ? 0 : Math.min(index, 7) * 0.04,
      }}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      onDragOver={onDrop ? (e) => e.preventDefault() : undefined}
      onDrop={
        onDrop
          ? (e) => {
              e.preventDefault();
              onDrop();
            }
          : undefined
      }
    >
      {rank != null && onMove ? (
        <div className="rank-bar" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="ghost"
            aria-label="Más importante"
            onClick={() => onMove(-1)}
          >
            ↑
          </button>
          <span
            className="rank"
            draggable
            onDragStart={onDragStart}
            title="Arrastra para cambiar la importancia"
          >
            {rank}
          </span>
          <button
            type="button"
            className="ghost"
            aria-label="Menos importante"
            onClick={() => onMove(1)}
          >
            ↓
          </button>
        </div>
      ) : null}
      <h3>{note.title || (note.type === "progress" ? "Avance" : "Nota")}</h3>
      <NoteBody text={note.body} />
      {archived ? <span className="file-stamp">archivo</span> : null}
      {note.occurred_on ? <time>{note.occurred_on}</time> : null}
    </motion.article>
  );
}

function EditorHost(props) {
  return createPortal(
    <AnimatePresence>
      {props.note ? (
        <Editor key={props.note.id ?? "new"} {...props} />
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

function Editor({ note, type, onClose, onSaved, onDeleted }) {
  const [title, setTitle] = useState(note.title ?? "");
  const [body, setBody] = useState(note.body ?? "");
  const [color, setColor] = useState(note.color ?? "yellow");
  const [isActive, setIsActive] = useState(note.is_active !== false);
  const [occurredOn, setOccurredOn] = useState(note.occurred_on ?? todayInTz());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [canDismiss, setCanDismiss] = useState(false);
  const bodyRef = useRef(null);

  function formatBody(mutator) {
    const el = bodyRef.current;
    const start = el?.selectionStart ?? body.length;
    const end = el?.selectionEnd ?? start;
    const next = mutator(body, start, end);
    setBody(next.value);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(next.selectionStart, next.selectionEnd);
    });
  }

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const payload = {
      type,
      title: title.trim() || null,
      body: body.trim(),
      color,
      is_active: isActive,
      occurred_on: type === "progress" ? occurredOn : null,
    };
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;
    const query = note.id
      ? supabase
          .from("notes")
          .update(payload)
          .eq("id", note.id)
          .select()
          .single()
      : supabase
          .from("notes")
          .insert({
            ...payload,
            user_id: userId,
            sort_order: note.sort_order ?? 0,
          })
          .select()
          .single();
    const { data, error: next } = await query;
    setBusy(false);
    if (next) setError(next.message);
    else onSaved(data);
  }

  async function remove() {
    if (!note.id) return onClose();
    setBusy(true);
    const { error: next } = await supabase
      .from("notes")
      .delete()
      .eq("id", note.id);
    setBusy(false);
    if (next) setError(next.message);
    else onDeleted(note.id);
  }

  return (
    <motion.div
      className="sheet"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      onAnimationComplete={() => setCanDismiss(true)}
      onClick={() => {
        if (canDismiss) onClose();
      }}
      role="presentation"
    >
      <motion.form
        className="sticky-editor"
        initial={{ y: 56, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={pinSpring}
        onClick={(e) => e.stopPropagation()}
        onSubmit={save}
      >
        <label htmlFor="title">Título</label>
        <input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <label htmlFor="body">Texto</label>
        <div className="mark-bar" onMouseDown={(e) => e.preventDefault()}>
          <button
            type="button"
            className="ghost"
            aria-label="Negrita"
            onClick={() =>
              formatBody((v, s, e) => wrapInline(v, s, e, "**", "**"))
            }
          >
            N
          </button>
          <button
            type="button"
            className="ghost"
            aria-label="Tachado"
            onClick={() =>
              formatBody((v, s, e) => wrapInline(v, s, e, "~~", "~~"))
            }
          >
            <s>abc</s>
          </button>
          <button
            type="button"
            className="ghost"
            aria-label="Lista"
            onClick={() => formatBody((v, s, e) => applyList(v, s, e))}
          >
            •
          </button>
        </div>
        <textarea
          id="body"
          ref={bodyRef}
          required
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        {type === "progress" ? (
          <>
            <label htmlFor="when">Día del avance</label>
            <input
              id="when"
              type="date"
              value={occurredOn}
              onChange={(e) => setOccurredOn(e.target.value)}
              required
            />
          </>
        ) : null}
        <label>Color</label>
        <div className="colors">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`swatch ${c}${color === c ? " on" : ""}`}
              style={{ background: `var(--${c})` }}
              onClick={() => setColor(c)}
              aria-label={c}
            />
          ))}
        </div>
        <label className="toggle" htmlFor="active">
          <input
            id="active"
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Activa en el pizarrón
        </label>
        <p className="hint">
          Si la quitas, sigue en la bitácora. Ábrela con el filtro No activas.
        </p>
        {error ? <p className="error">{error}</p> : null}
        <div className="row">
          {note.id ? (
            <button
              className="ghost"
              type="button"
              onClick={remove}
              disabled={busy}
            >
              Borrar
            </button>
          ) : null}
          <button className="ghost" type="button" onClick={onClose}>
            Cerrar
          </button>
          <button className="primary" type="submit" disabled={busy}>
            Guardar
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

function upsert(list, row) {
  const i = list.findIndex((n) => n.id === row.id);
  if (i === -1) return [row, ...list];
  const next = list.slice();
  next[i] = row;
  return next;
}

function McpPage({ userId }) {
  const [tokens, setTokens] = useState([]);
  const [plain, setPlain] = useState("");
  const [name, setName] = useState("Cursor");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    supabase
      .from("api_tokens")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data, error: next }) => {
        if (next) setError(next.message);
        else setTokens(data ?? []);
      });
  }, [userId]);

  async function createToken(e) {
    e.preventDefault();
    setError("");
    const { data: refreshed, error: refreshError } =
      await supabase.auth.refreshSession();
    let session = refreshed?.session;
    if (refreshError || !session) {
      const { data: fallback } = await supabase.auth.getSession();
      session = fallback.session;
    }
    if (!session?.access_token || !session.user?.id) {
      setError("No hay sesión de Supabase. Sal y entra otra vez con Google.");
      return;
    }
    const raw = randomToken();
    const token_hash = await sha256Hex(raw);
    const url = import.meta.env.VITE_SUPABASE_URL;
    const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const res = await fetch(`${url}/rest/v1/api_tokens?select=*`, {
      method: "POST",
      headers: {
        apikey: anon,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        name,
        token_hash,
        user_id: session.user.id,
      }),
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      const msg =
        payload?.message ||
        payload?.msg ||
        payload?.error_description ||
        `HTTP ${res.status}`;
      setError(msg);
      return;
    }
    const row = Array.isArray(payload) ? payload[0] : payload;
    setPlain(raw);
    setTokens((curr) => [row, ...curr]);
  }

  async function revoke(id) {
    const { error: next } = await supabase
      .from("api_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id);
    if (next) setError(next.message);
    else
      setTokens((curr) =>
        curr.map((t) =>
          t.id === id ? { ...t, revoked_at: new Date().toISOString() } : t,
        ),
      );
  }

  return (
    <>
      <div className="period">
        <div className="period-row">
          <h2>Token para Cursor / Claude</h2>
          <button className="ghost" type="button" onClick={() => navigate("/")}>
            Volver
          </button>
        </div>
      </div>
      <p>
        El MCP no usa Google. Crea un token, cópialo una vez y pégalo en{" "}
        <code>HOYLOG_TOKEN</code>.
      </p>
      <form onSubmit={createToken}>
        <label htmlFor="tokname">Nombre</label>
        <input
          id="tokname"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="row" style={{ justifyContent: "flex-start" }}>
          <button className="primary" type="submit">
            Crear token
          </button>
        </div>
      </form>
      {plain ? <p className="token-box">{plain}</p> : null}
      {error ? <p className="error">{error}</p> : null}
      <div className="masonry" style={{ marginTop: 24 }}>
        {tokens.map((t) => (
          <article
            key={t.id}
            className="sticky peach"
            style={{ cursor: "default" }}
          >
            <h3>{t.name}</h3>
            <p>{t.revoked_at ? "Revocado" : "Activo"}</p>
            <time>{t.created_at.slice(0, 10)}</time>
            {!t.revoked_at ? (
              <button
                className="ghost"
                type="button"
                onClick={() => revoke(t.id)}
              >
                Revocar
              </button>
            ) : null}
          </article>
        ))}
      </div>
    </>
  );
}
