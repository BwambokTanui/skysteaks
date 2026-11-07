"use client"

import { useEffect, useRef } from "react"
import { drawFlight, flightAccent, makeStars, type Star } from "@/components/game/draw-flight"
import { displayMultiplier } from "@/lib/game/math"
import { publishMultiplier } from "@/lib/game/ticker"
import { flightPhrase } from "@/lib/format"
import type { PublicRound } from "@/lib/game/types"

function multiplierFor(round: PublicRound | null, estimated: number) {
  if (!round) return 1
  if (round.status === "crashed" && round.crashPoint) return round.crashPoint
  if (round.status === "flying" && round.flyingStartedAt && estimated > 1_000_000_000_000) {
    return displayMultiplier(estimated - new Date(round.flyingStartedAt).getTime())
  }
  return 1
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
  const starsRef = useRef<{ round: number; stars: Star[] }>({ round: -1, stars: [] })
  const modelRef = useRef({
    round: null as PublicRound | null,
    serverNowMs: 0,
    clientPerf: 0,
  })
  modelRef.current.round = round

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
      const multiplier = multiplierFor(current, estimated)
      const status = current?.status ?? "idle"
      publishMultiplier(multiplier)
      if (numberRef.current) {
        const accent = flightAccent(multiplier, status === "crashed")
        const mark = status === "crashed" ? accent.hex : status === "flying" ? accent.hex : "#7ecbff"
        numberRef.current.innerHTML = `${multiplier.toFixed(2)}<span style="color:${mark}">x</span>`
        numberRef.current.style.color = status === "flying" || status === "crashed" ? accent.hex : "#ffffff"
        numberRef.current.style.textShadow =
          status === "flying" || status === "crashed" ? `0 0 28px ${accent.rgba(0.55)}` : "none"
      }
      if (phraseRef.current) {
        phraseRef.current.textContent = flightPhrase(multiplier, status)
        if (status === "flying") {
          const accent = flightAccent(multiplier)
          phraseRef.current.style.color = accent.hex
          phraseRef.current.style.textShadow = `0 0 12px ${accent.rgba(0.55)}`
        } else if (status === "crashed") {
          phraseRef.current.style.color = "#ff5d73"
          phraseRef.current.style.textShadow = "0 0 12px rgba(255,93,115,0.55)"
        } else {
          phraseRef.current.style.color = "#9fdfff"
          phraseRef.current.style.textShadow = "0 0 12px rgba(126,203,255,0.55)"
        }
      }
      if (countRef.current && current?.status === "betting" && estimated > 1_000_000_000_000) {
        const left = Math.max(0, new Date(current.bettingEndsAt).getTime() - estimated)
        countRef.current.textContent = (left / 1000).toFixed(1)
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
        const crashAge = current?.status === "crashed" && current.crashedAt ? estimated - new Date(current.crashedAt).getTime() : -1
        drawFlight(ctx, {
          width,
          height,
          status,
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
        <span
          ref={phraseRef}
          className="min-h-5 text-sm font-semibold tracking-[0.2em] text-[#9fdfff]"
          style={{ textShadow: "0 0 12px rgba(126,203,255,0.55)" }}
        />
        <span ref={numberRef} className="font-mono text-[64px] font-bold leading-none tracking-tight text-white sm:text-[72px]">
          1.00x
        </span>
        {round?.status === "betting" && (
          <p className="mt-2 font-mono text-sm text-[#f3c57b]">
            Next round in <span ref={countRef}>6.0</span>s
          </p>
        )}
      </div>
      <div className="absolute bottom-9 right-12 flex items-center gap-3 text-[11px] text-white/70">
        <span className="inline-flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-[#39ff14]">
          <WifiIcon />
          234ms
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5">
          <UserIcon />
          {Math.max(players, 1)}
        </span>
      </div>
    </div>
  )
}

function WifiIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
      <path d="M12 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm-4.2-3.3 1.2 1.2a4.2 4.2 0 0 1 6 0l1.2-1.2a5.9 5.9 0 0 0-8.4 0Zm-2.5-2.5 1.2 1.2a7.7 7.7 0 0 1 11 0l1.2-1.2a9.4 9.4 0 0 0-13.4 0Z" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4 0-7 2-7 4.5V20h14v-1.5C19 16 16 14 12 14Z" />
    </svg>
  )
}
