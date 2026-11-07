const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function parseUuid(value: unknown) {
  if (typeof value !== "string" || !uuidPattern.test(value)) return null
  return value
}

export function parseAmount(value: unknown) {
  const numeric = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN
  if (!Number.isFinite(numeric)) return null
  const rounded = Math.round(numeric * 100) / 100
  if (rounded < 1 || rounded > 5000) return null
  return rounded
}

export function parseSlot(value: unknown) {
  if (value === 0 || value === 1) return value
  return null
}

export function parseAuto(value: unknown) {
  if (value == null || value === "") return { ok: true as const, value: null }
  const numeric = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN
  if (!Number.isFinite(numeric)) return { ok: false as const }
  const rounded = Math.round(numeric * 100) / 100
  if (rounded < 1.1 || rounded > 1000) return { ok: false as const }
  return { ok: true as const, value: rounded }
}
