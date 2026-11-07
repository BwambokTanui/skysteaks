export function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function ksh(value: number) {
  return `KSh ${money(value)}`
}

export function signedMoney(value: number) {
  const formatted = money(Math.abs(value))
  if (value > 0) return `+${formatted}`
  if (value < 0) return `−${formatted}`
  return formatted
}

export function formatTime(iso: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

export function formatClock(date = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .format(date)
    .replace(",", " |")
}

export function toneForCrash(value: number) {
  if (value >= 10) return "high" as const
  if (value >= 2) return "mid" as const
  return "low" as const
}

export function flightPhrase(multiplier: number, status: string) {
  if (status === "crashed") return "FLEW AWAY"
  if (status !== "flying") return ""
  if (multiplier >= 10) return "LEGENDARY"
  if (multiplier >= 5) return "GREAT"
  if (multiplier >= 2) return "NOT BAD"
  return ""
}
