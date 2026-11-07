export function formatKickoff(iso: string) {
  const date = new Date(iso)
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export function formatOdds(value: number) {
  return value.toFixed(2)
}

export function combineOdds(values: number[]) {
  if (!values.length) return 0
  return Math.round(values.reduce((product, odds) => product * odds, 1) * 10000) / 10000
}
