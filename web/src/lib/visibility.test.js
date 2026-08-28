import { test } from 'node:test'
import assert from 'node:assert/strict'
import { filterNotesByActivity } from './visibility.js'

test('por defecto solo deja las notas activas', () => {
  const notes = [
    { id: '1', is_active: true },
    { id: '2', is_active: false },
    { id: '3' },
  ]
  assert.deepEqual(
    filterNotesByActivity(notes, 'active').map((n) => n.id),
    ['1', '3'],
  )
})

test('el archivo solo deja las notas no activas', () => {
  const notes = [
    { id: '1', is_active: true },
    { id: '2', is_active: false },
  ]
  assert.deepEqual(
    filterNotesByActivity(notes, 'inactive').map((n) => n.id),
    ['2'],
  )
})
