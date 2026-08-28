import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyVisibleOrder, nextEndSortOrder, sortByImportance } from './order.js'

test('ordena por sort_order y, si empatan, deja arriba las más nuevas', () => {
  const notes = [
    { id: 'old', sort_order: 0, created_at: '2026-01-01' },
    { id: 'new', sort_order: 0, created_at: '2026-08-01' },
    { id: 'first', sort_order: -1, created_at: '2026-03-01' },
  ]
  assert.deepEqual(sortByImportance(notes).map((n) => n.id), ['first', 'new', 'old'])
})

test('al reordenar las visibles, las ocultas se quedan en su sitio', () => {
  const all = [
    { id: 'a', sort_order: 0 },
    { id: 'b', sort_order: 1 },
    { id: 'c', sort_order: 2 },
    { id: 'd', sort_order: 3 },
  ]
  const next = applyVisibleOrder(all, ['d', 'c', 'a'])
  assert.deepEqual(next.map((n) => n.id), ['d', 'b', 'c', 'a'])
  assert.deepEqual(next.map((n) => n.sort_order), [0, 1, 2, 3])
})

test('la nota nueva va al final de la importancia', () => {
  assert.equal(nextEndSortOrder([]), 0)
  assert.equal(nextEndSortOrder([{ sort_order: 0 }, { sort_order: 4 }]), 5)
})
