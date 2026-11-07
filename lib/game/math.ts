export const GROWTH = 0.00006
export const MAX_CRASH = 1_000_000

function bufferToHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

export function crashPointFromHex(hex: string) {
  const h = BigInt(`0x${hex.slice(0, 13)}`)
  const e = 1n << 52n
  if (h % 33n === 0n) return 1
  const hundred = (100n * e - h) / (e - h)
  if (hundred > 100_000_000n) return MAX_CRASH
  if (hundred < 100n) return 1
  return Number(hundred) / 100
}

export async function crashPoint(serverSeed: string, roundNumber: number) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(serverSeed),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(String(roundNumber)))
  return crashPointFromHex(bufferToHex(signature))
}

export async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))
  return bufferToHex(digest)
}

export function displayMultiplier(elapsedMs: number) {
  if (elapsedMs <= 0) return 1
  const value = Math.exp(GROWTH * elapsedMs)
  return Math.min(MAX_CRASH, Math.max(1, Math.floor(value * 100) / 100))
}
