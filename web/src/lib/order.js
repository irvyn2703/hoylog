export function sortByImportance(notes) {
  return [...(Array.isArray(notes) ? notes : [])].sort((a, b) => {
    const ao = a.sort_order ?? 0
    const bo = b.sort_order ?? 0
    if (ao !== bo) return ao - bo
    return String(b.created_at ?? '').localeCompare(String(a.created_at ?? ''))
  })
}

export function nextEndSortOrder(notes) {
  const list = Array.isArray(notes) ? notes : []
  if (!list.length) return 0
  return Math.max(...list.map((note) => note.sort_order ?? 0)) + 1
}

export function applyVisibleOrder(all, visibleIds) {
  const sorted = sortByImportance(all)
  const byId = new Map(sorted.map((note) => [note.id, note]))
  const queue = visibleIds.map((id) => byId.get(id)).filter(Boolean)
  const visible = new Set(queue.map((note) => note.id))
  const next = []
  for (const note of sorted) {
    next.push(visible.has(note.id) ? queue.shift() : note)
  }
  return next.map((note, i) => ({ ...note, sort_order: i }))
}
