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
      const flying = stateRef.current?.round.status === "flying"
      timer = window.setTimeout(loop, hidden ? 1500 : flying ? 350 : 700)
    }
    void loop()
    return () => {
      stop = true
      window.clearTimeout(timer)
    }
  }, [refresh])

  return { state, message, code, apply }
}
