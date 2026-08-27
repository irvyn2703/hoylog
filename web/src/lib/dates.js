export const TZ = 'America/Mexico_City'

export function todayInTz(timeZone = TZ) {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date())
}

function parseIso(isoDate) {
  return new Date(`${isoDate}T12:00:00`)
}

export function toIsoDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(isoDate, days) {
  const d = parseIso(isoDate)
  d.setDate(d.getDate() + days)
  return toIsoDate(d)
}

export function startOfIsoWeek(isoDate) {
  const d = parseIso(isoDate)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return toIsoDate(d)
}

export function isoWeekInfo(isoDate) {
  const monday = parseIso(startOfIsoWeek(isoDate))
  const thursday = new Date(monday)
  thursday.setDate(monday.getDate() + 3)
  const year = thursday.getFullYear()
  const jan4 = toIsoDate(new Date(year, 0, 4, 12))
  const week1 = parseIso(startOfIsoWeek(jan4))
  const week = 1 + Math.round((monday - week1) / 604800000)
  return { year, week, monday: toIsoDate(monday), sunday: addDays(toIsoDate(monday), 6) }
}

export function monthRange(isoDate) {
  const d = parseIso(isoDate)
  const from = toIsoDate(new Date(d.getFullYear(), d.getMonth(), 1, 12))
  const to = toIsoDate(new Date(d.getFullYear(), d.getMonth() + 1, 0, 12))
  return { from, to, year: d.getFullYear(), month: d.getMonth() + 1 }
}

export function periodRange(mode, cursor) {
  if (mode === 'day') return { from: cursor, to: cursor }
  if (mode === 'week') {
    const { monday, sunday } = isoWeekInfo(cursor)
    return { from: monday, to: sunday }
  }
  const { from, to } = monthRange(cursor)
  return { from, to }
}

export function shiftCursor(mode, cursor, dir) {
  if (mode === 'day') return addDays(cursor, dir)
  if (mode === 'week') return addDays(cursor, dir * 7)
  const d = parseIso(cursor)
  d.setMonth(d.getMonth() + dir)
  return toIsoDate(d)
}

export function periodLabel(mode, cursor) {
  const d = parseIso(cursor)
  if (mode === 'day') {
    return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }
  if (mode === 'week') {
    const { week, year, monday, sunday } = isoWeekInfo(cursor)
    return `Semana ${week} · ${year}  (${monday} → ${sunday})`
  }
  return d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
}

export function weekdayLabel(isoDate) {
  return parseIso(isoDate).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' })
}
