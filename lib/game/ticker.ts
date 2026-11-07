"use client"

let multiplier = 1
const listeners = new Set<() => void>()

export function publishMultiplier(next: number) {
  if (next === multiplier) return
  multiplier = next
  listeners.forEach((listener) => listener())
}

export function getMultiplier() {
  return multiplier
}

export function subscribeMultiplier(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
