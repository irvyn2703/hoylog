export function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return `hyl_${[...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')}`
}

export async function sha256Hex(text) {
  const data = new TextEncoder().encode(text)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
