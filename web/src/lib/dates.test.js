import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatDmY, periodDates, periodHeading } from './dates.js'

test('pasa ISO a día-mes-año', () => {
  assert.equal(formatDmY('2026-08-24'), '24-08-2026')
})

test('el encabezado de semana es número y año', () => {
  assert.equal(periodHeading('week', '2026-08-28'), 'Semana 35 · 2026')
})

test('el rango de semana va en día-mes-año', () => {
  assert.equal(periodDates('week', '2026-08-28'), '24-08-2026 → 30-08-2026')
})
