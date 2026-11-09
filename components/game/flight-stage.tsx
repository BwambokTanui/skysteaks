"use client"

import { useEffect, useRef } from "react"
import { drawFlight, flightAccent, makeStars, type Star } from "@/components/game/draw-flight"
import { displayMultiplier } from "@/lib/game/math"
import { publishMultiplier } from "@/lib/game/ticker"
import { flightPhrase } from "@/lib/format"
import type { PublicRound, RoundStatus } from "@/lib/game/types"

function flightView(round: PublicRound | null, estimated: number) {
  if (!round) {
    return { multiplier: 1, status: "idle" as RoundStatus | "idle", crashAge: -1 }
  }

  if (round.status === "crashed") {
    const crashPoint = round.crashPoint ?? 1
    const crashAge =
      round.crashedAt && estimated > 1_000_000_000_000
        ? estimated - new Date(round.crashedAt).getTime()
        : 0
    return { multiplier: crashPoint, status: "crashed" as const, crashAge }
  }

  if (round.status === "flying" && round.flyingStartedAt && estimated > 1_000_000_000_000) {
    const elapsed = Math.max(0, estimated - new Date(round.flyingStartedAt).getTime())
    const flyMs = round.flyMs
    const stopAt = round.crashPoint
    const raw = displayMultiplier(flyMs != null ? Math.min(elapsed, flyMs) : elapsed)
    const capped = stopAt != null ? Math.min(raw, stopAt) : raw
    const reachedStop =
      (flyMs != null && elapsed >= flyMs) || (stopAt != null && raw >= stopAt - 0.0001)

    if (reachedStop) {
      const exact = stopAt ?? capped
      const crashAge = flyMs != null ? Math.max(0, elapsed - flyMs) : 0
      return { multiplier: exact, status: "crashed" as const, crashAge }
    }

    return { multiplier: capped, status: "flying" as const, crashAge: -1 }
  }

  return { multiplier: 1, status: round.status, crashAge: -1 }
}

export function FlightStage({
  round,
  serverNow,
  players,
  className,
}: {
  round: PublicRound | null
  serverNow: string | null
  players: number
  className?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const numberRef = useRef<HTMLSpanElement>(null)
  const phraseRef = useRef<HTMLSpanElement>(null)
  const countRef = useRef<HTMLSpanElement>(null)
  const playersRef = useRef<HTMLSpanElement>(null)
  const starsRef = useRef<{ round: number; stars: Star[] }>({ round: -1, stars: [] })
  const modelRef = useRef({
    round: null as PublicRound | null,
    serverNowMs: 0,
    clientPerf: 0,
    players: 1,
  })
  modelRef.current.round = round
  modelRef.current.players = players

  useEffect(() => {
    if (!serverNow) return
    modelRef.current.serverNowMs = new Date(serverNow).getTime()
    modelRef.current.clientPerf = performance.now()
  }, [serverNow])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let frame = 0
    const loop = (now: number) => {
      const ctx = canvas.getContext("2d")
      const current = modelRef.current.round
      const roundNumber = current?.roundNumber ?? 0
      if (starsRef.current.round !== roundNumber) {
        starsRef.current = { round: roundNumber, stars: makeStars(roundNumber) }
      }
      const estimated = modelRef.current.serverNowMs
        ? modelRef.current.serverNowMs + (now - modelRef.current.clientPerf)
        : 0
      const view = flightView(current, estimated)
      const { multiplier, status, crashAge } = view
      publishMultiplier(multiplier)
      if (numberRef.current) {
        const accent = flightAccent(multiplier, status === "crashed")
        const mark = status === "crashed" ? "#ff4d5e" : "#ffffff"
        numberRef.current.innerHTML = `${multiplier.toFixed(2)}<span style="color:${mark}">x</span>`
        numberRef.current.style.color = status === "crashed" ? "#ff4d5e" : "#ffffff"
        numberRef.current.style.textShadow =
          status === "flying" || status === "crashed" ? `0 0 28px ${accent.rgba(0.45)}` : "none"
      }
      if (phraseRef.current) {
        phraseRef.current.textContent = flightPhrase(multiplier, status === "idle" ? "betting" : status)
        phraseRef.current.style.color = status === "crashed" ? "#ff4d5e" : "#ffffff"
        phraseRef.current.style.textShadow =
          status === "crashed" ? "0 0 12px rgba(255,77,94,0.55)" : "0 0 12px rgba(255,255,255,0.25)"
      }
      if (countRef.current && current?.status === "betting" && estimated > 1_000_000_000_000) {
        const left = Math.max(0, new Date(current.bettingEndsAt).getTime() - estimated)
        countRef.current.textContent = (left / 1000).toFixed(1)
      }
      if (playersRef.current) {
        playersRef.current.textContent = String(Math.max(modelRef.current.players, 1))
      }
      if (ctx) {
        const rect = canvas.getBoundingClientRect()
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const width = Math.max(1, rect.width)
        const height = Math.max(1, rect.height)
        if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
          canvas.width = Math.floor(width * dpr)
          canvas.height = Math.floor(height * dpr)
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        drawFlight(ctx, {
          width,
          height,
          status: status === "idle" ? "betting" : status,
          multiplier,
          now,
          crashAge,
          stars: starsRef.current.stars,
          reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        })
      }
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div className={className ?? "relative h-full min-h-[220px] overflow-hidden bg-black"}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-label="Aviator flight" />
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
        <span ref={phraseRef} className="min-h-5 text-sm font-semibold tracking-[0.2em] text-white/80" />
        <span ref={numberRef} className="font-mono text-[clamp(48px,14vw,78px)] font-bold leading-none tracking-tight text-white">
          1.00x
        </span>
        {round?.status === "betting" && (
          <p className="mt-2 font-mono text-sm text-[#f3c57b]">
            Next round in <span ref={countRef}>6.0</span>s
          </p>
        )}
      </div>
      <div className="absolute bottom-3 right-3 flex items-center gap-2 text-[11px] text-white/70">
        <span className="inline-flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5">
          <UserIcon />
          <span ref={playersRef}>{Math.max(players, 1)}</span>
        </span>
      </div>
    </div>
  )
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4 0-7 2-7 4.5V20h14v-1.5C19 16 16 14 12 14Z" />
    </svg>
  )
}
