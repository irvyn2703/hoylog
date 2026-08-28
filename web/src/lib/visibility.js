export function noteIsActive(note) {
  return note?.is_active !== false
}

export function filterNotesByActivity(notes, show) {
  const list = Array.isArray(notes) ? notes : []
  if (show === 'inactive') return list.filter((note) => !noteIsActive(note))
  return list.filter(noteIsActive)
}
