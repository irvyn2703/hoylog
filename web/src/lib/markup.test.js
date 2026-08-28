import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseBlocks } from './markup.js'

test('los saltos extra después del primero se conservan', () => {
  assert.deepEqual(parseBlocks('uno\n\n\ndos'), [
    { type: 'p', text: 'uno' },
    { type: 'gap', lines: 1 },
    { type: 'p', text: 'dos' },
  ])
})

test('un solo renglón en blanco sigue separando párrafos', () => {
  assert.deepEqual(parseBlocks('uno\n\ndos'), [
    { type: 'p', text: 'uno' },
    { type: 'p', text: 'dos' },
  ])
})
