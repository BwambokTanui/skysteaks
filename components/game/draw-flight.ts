export type Star = { x: number; y: number; z: number }

export type DrawModel = {
  width: number
  height: number
  status: "idle" | "betting" | "flying" | "crashed"
  multiplier: number
  now: number
  crashAge: number
  stars: Star[]
  reduced: boolean
}

export type FlightAccent = {
  hex: string
  rgba: (alpha: number) => string
}

const GROWTH = 0.00006

/** Trail stays Aviator-red; brightens slightly as the multiplier climbs. */
export function flightAccent(multiplier: number, crashed = false): FlightAccent {
  if (crashed) {
    return { hex: "#ff3b4e", rgba: (a) => `rgba(255,59,78,${a})` }
  }
  if (multiplier >= 10) {
    return { hex: "#ff6a3d", rgba: (a) => `rgba(255,106,61,${a})` }
  }
  if (multiplier >= 5) {
    return { hex: "#ff4d55", rgba: (a) => `rgba(255,77,85,${a})` }
  }
  if (multiplier >= 2) {
    return { hex: "#e31b23", rgba: (a) => `rgba(227,27,35,${a})` }
  }
  return { hex: "#d0121a", rgba: (a) => `rgba(208,18,26,${a})` }
}

function mulberry32(seed: number) {
  let value = seed
  return () => {
    value |= 0
    value = (value + 0x6d2b79f5) | 0
    let t = Math.imul(value ^ (value >>> 15), 1 | value)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function makeStars(roundNumber: number) {
  const random = mulberry32(roundNumber * 9973 + 17)
  return Array.from({ length: 56 }, () => ({
    x: random(),
    y: random(),
    z: 0.25 + random() * 0.75,
  }))
}

/** Classic Aviator red propeller plane — nose points along +x before rotation. */
function drawPlane(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  accent: FlightAccent,
  crashed: boolean,
  scale = 1,
  now = 0,
) {
  const s = Math.max(0.55, Math.min(0.95, scale * 0.78))
  const red = crashed ? "#ff6b7a" : "#e31b23"
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.scale(s, s)
  ctx.shadowColor = accent.rgba(0.85)
  ctx.shadowBlur = 18

  // Lower wing
  ctx.fillStyle = red
  ctx.beginPath()
  ctx.moveTo(-2, 2)
  ctx.lineTo(-18, 16)
  ctx.lineTo(-8, 16)
  ctx.lineTo(10, 3)
  ctx.closePath()
  ctx.fill()

  // Fuselage
  ctx.beginPath()
  ctx.moveTo(30, 0)
  ctx.quadraticCurveTo(22, -5.5, 8, -6)
  ctx.lineTo(-16, -4.5)
  ctx.quadraticCurveTo(-24, -3, -26, 0)
  ctx.quadraticCurveTo(-24, 3, -16, 4.5)
  ctx.lineTo(8, 6)
  ctx.quadraticCurveTo(22, 5.5, 30, 0)
  ctx.closePath()
  ctx.fill()

  // Upper wing
  ctx.beginPath()
  ctx.moveTo(-4, -1)
  ctx.lineTo(-22, -15)
  ctx.lineTo(-10, -15)
  ctx.lineTo(12, -2)
  ctx.closePath()
  ctx.fill()

  // Tail fin
  ctx.beginPath()
  ctx.moveTo(-18, -3)
  ctx.lineTo(-28, -14)
  ctx.lineTo(-22, -3)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(-18, 3)
  ctx.lineTo(-26, 11)
  ctx.lineTo(-20, 3)
  ctx.closePath()
  ctx.fill()

  ctx.shadowBlur = 0

  // Cockpit
  ctx.fillStyle = crashed ? "rgba(255,200,210,0.85)" : "rgba(255,255,255,0.92)"
  ctx.beginPath()
  ctx.ellipse(10, -1.2, 5.5, 2.6, -0.15, 0, Math.PI * 2)
  ctx.fill()

  // White X mark on fuselage
  ctx.strokeStyle = "rgba(255,255,255,0.9)"
  ctx.lineWidth = 1.6
  ctx.lineCap = "round"
  ctx.beginPath()
  ctx.moveTo(-2, -2.2)
  ctx.lineTo(4, 2.2)
  ctx.moveTo(4, -2.2)
  ctx.lineTo(-2, 2.2)
  ctx.stroke()

  // Propeller hub + spinning blades
  ctx.fillStyle = "#1a1a1a"
  ctx.beginPath()
  ctx.arc(30, 0, 2.4, 0, Math.PI * 2)
  ctx.fill()
  if (!crashed) {
    const spin = (now / 40) % (Math.PI * 2)
    ctx.save()
    ctx.translate(30, 0)
    ctx.rotate(spin)
    ctx.strokeStyle = "rgba(255,255,255,0.75)"
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(0, -9)
    ctx.lineTo(0, 9)
    ctx.moveTo(-8, -4)
    ctx.lineTo(8, 4)
    ctx.moveTo(-8, 4)
    ctx.lineTo(8, -4)
    ctx.stroke()
    ctx.restore()
  }

  ctx.restore()
}

type Plot = {
  left: number
  top: number
  right: number
  bottom: number
  plotW: number
  plotH: number
  axisMax: number
  timeMaxMs: number
}

function elapsedMs(multiplier: number) {
  return Math.log(Math.max(multiplier, 1.0001)) / GROWTH
}

function plotFor(width: number, height: number, multiplier: number): Plot {
  const left = Math.max(28, Math.min(40, width * 0.08))
  const top = Math.max(14, height * 0.06)
  const right = width - Math.max(46, Math.min(58, width * 0.14))
  const bottom = height - Math.max(36, Math.min(48, height * 0.14))
  const plotW = Math.max(40, right - left)
  const plotH = Math.max(40, bottom - top)
  const axisMax = Math.min(50, Math.max(5, Math.ceil(Math.max(multiplier, 1) + 0.75)))
  const timeMaxMs = Math.max(8_000, elapsedMs(Math.max(multiplier, 1.5)) * 1.15)
  return { left, top, right, bottom, plotW, plotH, axisMax, timeMaxMs }
}

function yAt(value: number, plot: Plot) {
  const t = (Math.max(1, value) - 1) / Math.max(0.0001, plot.axisMax - 1)
  const eased = Math.pow(Math.min(1.12, Math.max(0, t)), 0.82)
  return plot.bottom - Math.min(plot.plotH, eased * plot.plotH)
}

function xAt(ms: number, plot: Plot) {
  const u = Math.min(1, Math.max(0, ms / plot.timeMaxMs))
  // Ease so the path curls more as it continues
  const eased = 1 - Math.pow(1 - u, 1.15)
  return plot.left + eased * plot.plotW
}

function yTicks(axisMax: number) {
  const ticks: number[] = []
  const step = axisMax <= 6 ? 1 : axisMax <= 12 ? 1 : axisMax <= 25 ? 2 : 5
  for (let m = 1; m <= axisMax; m += step) ticks.push(m)
  if (ticks[ticks.length - 1] !== axisMax) ticks.push(axisMax)
  return ticks
}

function xTicks(timeMaxMs: number) {
  const totalSec = timeMaxMs / 1000
  const step = totalSec <= 10 ? 1 : totalSec <= 20 ? 2 : totalSec <= 40 ? 5 : 10
  const ticks: number[] = []
  for (let s = 0; s <= totalSec + 0.001; s += step) ticks.push(Number(s.toFixed(0)))
  return ticks
}

function fillLabelPill(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  align: "left" | "right" | "center",
  color: string,
) {
  ctx.save()
  ctx.font = "700 11px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
  ctx.textAlign = align
  ctx.textBaseline = "middle"
  const width = ctx.measureText(text).width
  const padX = 5
  const boxW = width + padX * 2
  const boxH = 15
  const boxX = align === "right" ? x - boxW : align === "center" ? x - boxW / 2 : x
  const boxY = y - boxH / 2
  ctx.fillStyle = "rgba(4, 8, 14, 0.82)"
  ctx.strokeStyle = "rgba(255,255,255,0.12)"
  ctx.lineWidth = 1
  ctx.beginPath()
  const r = 5
  ctx.moveTo(boxX + r, boxY)
  ctx.lineTo(boxX + boxW - r, boxY)
  ctx.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + r)
  ctx.lineTo(boxX + boxW, boxY + boxH - r)
  ctx.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - r, boxY + boxH)
  ctx.lineTo(boxX + r, boxY + boxH)
  ctx.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - r)
  ctx.lineTo(boxX, boxY + r)
  ctx.quadraticCurveTo(boxX, boxY, boxX + r, boxY)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = color
  ctx.fillText(text, align === "right" ? x - padX : align === "center" ? x : x + padX, y)
  ctx.restore()
}

/** Draws X (time, bottom) and Y (multiplier, right) axes. */
function drawAxes(ctx: CanvasRenderingContext2D, plot: Plot, current: number, crashed: boolean) {
  ctx.save()

  // Chart frame
  ctx.strokeStyle = "rgba(255,255,255,0.22)"
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(plot.left, plot.top)
  ctx.lineTo(plot.left, plot.bottom)
  ctx.lineTo(plot.right, plot.bottom)
  ctx.stroke()

  // Y-axis (multiplier) — right side
  for (const tick of yTicks(plot.axisMax)) {
    const y = yAt(tick, plot)
    const reached = current >= tick
    const accent = flightAccent(Math.max(tick, 1.01), crashed && reached)

    ctx.strokeStyle = reached ? accent.rgba(0.22) : "rgba(255,255,255,0.08)"
    ctx.lineWidth = 1
    ctx.setLineDash(tick === 1 ? [] : [4, 5])
    ctx.beginPath()
    ctx.moveTo(plot.left, y)
    ctx.lineTo(plot.right, y)
    ctx.stroke()
    ctx.setLineDash([])

    // tick mark on right spine
    ctx.strokeStyle = reached ? accent.hex : "rgba(200,208,224,0.75)"
    ctx.beginPath()
    ctx.moveTo(plot.right, y)
    ctx.lineTo(plot.right + 6, y)
    ctx.stroke()

    fillLabelPill(ctx, `×${tick}`, plot.right + 38, y, "right", reached ? accent.hex : "rgba(220,226,238,0.95)")
  }

  // X-axis (time) — bottom
  for (const sec of xTicks(plot.timeMaxMs)) {
    const x = xAt(sec * 1000, plot)
    if (x < plot.left - 1 || x > plot.right + 1) continue

    ctx.strokeStyle = "rgba(255,255,255,0.08)"
    ctx.setLineDash([3, 5])
    ctx.beginPath()
    ctx.moveTo(x, plot.bottom)
    ctx.lineTo(x, plot.top)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.strokeStyle = "rgba(200,208,224,0.75)"
    ctx.beginPath()
    ctx.moveTo(x, plot.bottom)
    ctx.lineTo(x, plot.bottom + 6)
    ctx.stroke()

    fillLabelPill(ctx, `${sec}s`, x, plot.bottom + 18, "center", "rgba(220,226,238,0.95)")
  }

  // Axis titles
  ctx.font = "600 9px ui-sans-serif, system-ui, sans-serif"
  ctx.fillStyle = "rgba(155,164,184,0.9)"
  ctx.textAlign = "right"
  ctx.textBaseline = "bottom"
  ctx.fillText("MULT", plot.right + 38, plot.top - 4)
  ctx.textAlign = "left"
  ctx.textBaseline = "top"
  ctx.fillText("TIME", plot.left, plot.bottom + 22)

  ctx.restore()
}

function curve(multiplier: number, plot: Plot, exit: number) {
  const end = elapsedMs(multiplier)
  const samples = 140
  const points: Array<{ x: number; y: number }> = []
  const curl = Math.min(1, Math.max(0, (multiplier - 1.1) / 5))

  for (let i = 0; i <= samples; i++) {
    const u = i / samples
    const t = end * u
    const value = Math.exp(GROWTH * t)
    let x = xAt(t, plot)
    let y = yAt(value, plot)

    // Extra tip bend as flight continues
    const tip = Math.pow(Math.max(0, (u - 0.55) / 0.45), 1.8) * curl
    y -= tip * plot.plotH * 0.06
    x = Math.min(plot.right - 4, x + tip * 10)

    if (exit > 0 && i === samples) {
      x += exit * 120
      y -= exit * (80 + curl * 35)
    }
    points.push({ x, y })
  }
  return points
}

function strokeCurve(ctx: CanvasRenderingContext2D, points: Array<{ x: number; y: number }>) {
  if (points.length < 2) return
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length - 1; i++) {
    const current = points[i]
    const next = points[i + 1]
    ctx.quadraticCurveTo(current.x, current.y, (current.x + next.x) / 2, (current.y + next.y) / 2)
  }
  const last = points[points.length - 1]
  const prev = points[points.length - 2]
  ctx.quadraticCurveTo(prev.x, prev.y, last.x, last.y)
}

export function drawFlight(ctx: CanvasRenderingContext2D, model: DrawModel) {
  const { width, height, status, multiplier, now, crashAge, stars, reduced } = model
  ctx.clearRect(0, 0, width, height)

  // Dark stage + purple sunburst (Odi-style)
  ctx.fillStyle = "#07070c"
  ctx.fillRect(0, 0, width, height)
  const cx = width * 0.55
  const cy = height * 0.58
  const burst = ctx.createRadialGradient(cx, cy, 8, cx, cy, Math.max(width, height) * 0.75)
  burst.addColorStop(0, "rgba(88, 40, 120, 0.55)")
  burst.addColorStop(0.35, "rgba(40, 18, 70, 0.28)")
  burst.addColorStop(1, "rgba(0,0,0,0)")
  ctx.fillStyle = burst
  ctx.fillRect(0, 0, width, height)

  ctx.save()
  ctx.translate(cx, cy)
  ctx.strokeStyle = "rgba(140, 90, 180, 0.08)"
  ctx.lineWidth = 1
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(Math.cos(a) * width, Math.sin(a) * height)
    ctx.stroke()
  }
  ctx.restore()

  if (status === "crashed" && crashAge >= 0 && crashAge < 420 && !reduced) {
    ctx.save()
    ctx.translate(Math.sin(crashAge * 0.09) * 4, 0)
  }

  for (const star of stars) {
    ctx.fillStyle = `rgba(255,255,255,${0.1 + star.z * 0.35})`
    ctx.fillRect(star.x * width, star.y * height, star.z * 1.5, star.z * 1.5)
  }

  const crashed = status === "crashed"
  const active = status === "flying" || crashed
  const accent = flightAccent(multiplier, crashed)
  const plot = plotFor(width, height, active ? Math.max(multiplier, 5) : 5)

  // Light axes only — keep focus on the plane path
  drawAxes(ctx, plot, active ? multiplier : 1, crashed)

  const planeScale = Math.min(width, height) / 460

  if (!active) {
    const bob = reduced ? 0 : Math.sin(now / 280) * 5
    const idle = flightAccent(1)
    ctx.strokeStyle = idle.rgba(0.35)
    ctx.setLineDash([5, 8])
    ctx.beginPath()
    ctx.moveTo(plot.left, plot.bottom)
    ctx.quadraticCurveTo(plot.left + plot.plotW * 0.45, plot.bottom - 10, plot.left + plot.plotW * 0.7, yAt(1.4, plot))
    ctx.stroke()
    ctx.setLineDash([])
    drawPlane(ctx, plot.left + Math.min(52, plot.plotW * 0.2), plot.bottom - 18 + bob, -0.28, idle, false, planeScale, now)
  } else {
    const exit = crashed ? Math.min(1, Math.max(0, crashAge / 760)) : 0
    const points = curve(multiplier, plot, exit)
    const last = points[points.length - 1]
    const previous = points[Math.max(0, points.length - 10)]
    if (last && previous) {
      strokeCurve(ctx, points)
      ctx.lineTo(last.x, plot.bottom)
      ctx.lineTo(points[0].x, plot.bottom)
      ctx.closePath()
      const fill = ctx.createLinearGradient(0, last.y, 0, plot.bottom)
      fill.addColorStop(0, accent.rgba(0.38))
      fill.addColorStop(0.55, accent.rgba(0.12))
      fill.addColorStop(1, "rgba(0,0,0,0)")
      ctx.fillStyle = fill
      ctx.fill()

      strokeCurve(ctx, points)
      ctx.strokeStyle = accent.hex
      ctx.lineWidth = Math.max(3.5, Math.min(5.5, width / 90))
      ctx.lineJoin = "round"
      ctx.lineCap = "round"
      ctx.shadowColor = accent.rgba(0.9)
      ctx.shadowBlur = 14
      ctx.stroke()
      ctx.shadowBlur = 0

      ctx.globalAlpha = 1 - exit
      drawPlane(
        ctx,
        last.x,
        last.y,
        Math.atan2(last.y - previous.y, last.x - previous.x),
        accent,
        crashed,
        planeScale,
        now,
      )
      ctx.globalAlpha = 1
    }
  }

  if (crashed) {
    const alpha = Math.max(0, 0.2 - Math.max(0, crashAge) / 1400)
    ctx.fillStyle = `rgba(255, 59, 78, ${alpha})`
    ctx.fillRect(0, 0, width, height)
  }

  if (status === "crashed" && crashAge >= 0 && crashAge < 420 && !reduced) ctx.restore()
}
