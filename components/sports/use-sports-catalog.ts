"use client"

import { useCallback, useEffect, useState } from "react"
import type { SportsCatalog } from "@/lib/sports/types"

export function useSportsCatalog(
  initial: SportsCatalog | null,
  options?: { sport?: string | null; live?: boolean; featured?: boolean; intervalMs?: number },
) {
  const [catalog, setCatalog] = useState<SportsCatalog | null>(initial)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    const params = new URLSearchParams()
    if (options?.sport) params.set("sport", options.sport)
    if (options?.live) params.set("live", "1")
    if (options?.featured) params.set("featured", "1")
    setLoading(true)
    try {
      const response = await fetch(`/api/sports/catalog?${params.toString()}`, { cache: "no-store" })
      if (!response.ok) return
      const data = (await response.json()) as SportsCatalog
      setCatalog(data)
    } finally {
      setLoading(false)
    }
  }, [options?.sport, options?.live, options?.featured])

  useEffect(() => {
    setCatalog(initial)
  }, [initial])

  useEffect(() => {
    const intervalMs = options?.intervalMs ?? 15000
    const timer = window.setInterval(() => {
      void refresh()
    }, intervalMs)
    const onFocus = () => void refresh()
    window.addEventListener("focus", onFocus)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener("focus", onFocus)
    }
  }, [refresh, options?.intervalMs])

  return { catalog, loading, refresh }
}
