const UL = /^\s*[*+-]\s+(.*)$/

export function parseBlocks(text) {
  const lines = String(text ?? '').split('\n')
  const blocks = []
  let i = 0
  while (i < lines.length) {
    if (lines[i] === '') {
      let n = 0
      while (i < lines.length && lines[i] === '') {
        n += 1
        i += 1
      }
      if (n > 1) blocks.push({ type: 'gap', lines: n - 1 })
      continue
    }
    if (UL.test(lines[i])) {
      const items = []
      while (i < lines.length && UL.test(lines[i])) {
        items.push(lines[i].match(UL)[1])
        i += 1
      }
      blocks.push({ type: 'ul', items })
      continue
    }
    const para = []
    while (i < lines.length && lines[i] !== '' && !UL.test(lines[i])) {
      para.push(lines[i])
      i += 1
    }
    blocks.push({ type: 'p', text: para.join('\n') })
  }
  return blocks
}

export function inlineTokens(text) {
  const source = String(text ?? '')
  const tokens = []
  const re = /\*\*([^*]+)\*\*|~~([^~]+)~~/g
  let last = 0
  let match
  while ((match = re.exec(source))) {
    if (match.index > last) tokens.push({ t: 'text', v: source.slice(last, match.index) })
    if (match[1] != null) tokens.push({ t: 'b', v: match[1] })
    else tokens.push({ t: 's', v: match[2] })
    last = match.index + match[0].length
  }
  if (last < source.length) tokens.push({ t: 'text', v: source.slice(last) })
  return tokens
}

export function wrapInline(value, start, end, open, close) {
  const selected = value.slice(start, end)
  const inner = selected || 'texto'
  const next = `${value.slice(0, start)}${open}${inner}${close}${value.slice(end)}`
  const selectionStart = start + open.length
  return {
    value: next,
    selectionStart,
    selectionEnd: selectionStart + inner.length,
  }
}

function selectedLineSpan(value, start, end) {
  const from = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1
  const nl = value.indexOf('\n', end)
  const to = nl === -1 ? value.length : nl
  return [from, to]
}

function stripListPrefix(line) {
  const ul = line.match(UL)
  return ul ? ul[1] : line
}

export function applyList(value, start, end) {
  const [from, to] = selectedLineSpan(value, start, end)
  const chunk = value.slice(from, to)
  const lines = chunk.length ? chunk.split('\n') : ['']
  const allListed = lines.every((line) => UL.test(line))
  const nextLines = allListed
    ? lines.map(stripListPrefix)
    : lines.map((line) => `* ${stripListPrefix(line) || 'ítem'}`)
  const nextChunk = nextLines.join('\n')
  const next = `${value.slice(0, from)}${nextChunk}${value.slice(to)}`
  return {
    value: next,
    selectionStart: from,
    selectionEnd: from + nextChunk.length,
  }
}
