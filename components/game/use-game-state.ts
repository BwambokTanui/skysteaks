"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useBalance } from "@/components/layout/balance"
import type { GameState } from "@/lib/game/types"

type Problem = "config" | "schema" | "error" | null

export function useGameState() {
  const { setBalance } = useBalance()
  const [state, setState] = useState<GameState | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [code, setCode] = useState<Problem>(null)
  const stateRef = useRef<GameState | null>(null)
  const inFlightRef = useRef(false)

  const apply = useCallback(
    (next: GameState) => {
      stateRef.current = next
      setState(next)
      setMessage(null)
      setCode(null)
      if (typeof next.balance === "number") setBalance(next.balance)
    },
    [setBalance],
  )

  const refresh = useCallback(async () => {
    if (inFlightRef.current) return stateRef.current
    inFlightRef.current = true
    try {
      const response = await fetch("/api/game/state", { cache: "no-store" })
      const data = await response.json()
      if (!response.ok) {
        const nextCode = data.code === "config" || data.code === "schema" ? data.code : "error"
        setMessage(data.message || "Unable to reach the table.")
        setCode(nextCode)
        return nextCode === "config" ? "halt" : null
      }
      apply(data)
      return data as GameState
    } finally {
      inFlightRef.current = false
    }
  }, [apply])

  useEffect(() => {
    let stop = false
    let timer = 0

    const loop = async () => {
      if (!stop) {
        try {
          const result = await refresh()
          if (result === "halt") return
        } catch {
          if (!stop) {
            setMessage("Unable to reach the table.")
            setCode("error")
          }
        }
      }
      if (stop) return
      const hidden = document.hidden
      const status = stateRef.current?.round.status
      // Keep every device on the same server round clock
      const delay = hidden ? 1200 : status === "flying" ? 200 : status === "betting" ? 400 : 600
      timer = window.setTimeout(loop, delay)
    }

    const kick = () => {
      if (document.hidden || stop) return
      void refresh()
    }

    void loop()
    window.addEventListener("focus", kick)
    document.addEventListener("visibilitychange", kick)
    return () => {
      stop = true
      window.clearTimeout(timer)
      window.removeEventListener("focus", kick)
      document.removeEventListener("visibilitychange", kick)
    }
  }, [refresh])

  return { state, message, code, apply }
}
