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

/** Color shifts at each whole multiplier milestone while flying. */
export function flightAccent(multiplier: number, crashed = false): FlightAccent {
  if (crashed) {
    return { hex: "#ff5d73", rgba: (a) => `rgba(255,93,115,${a})` }
  }
  if (multiplier >= 10) {
    return { hex: "#c77dff", rgba: (a) => `rgba(199,125,255,${a})` }
  }
  if (multiplier >= 5) {
    return { hex: "#ff6b9d", rgba: (a) => `rgba(255,107,157,${a})` }
  }
  if (multiplier >= 4) {
    return { hex: "#ff9f1c", rgba: (a) => `rgba(255,159,28,${a})` }
  }
  if (multiplier >= 3) {
    return { hex: "#ffd60a", rgba: (a) => `rgba(255,214,10,${a})` }
  }
  if (multiplier >= 2) {
    return { hex: "#2de2e6", rgba: (a) => `rgba(45,226,230,${a})` }
  }
  return { hex: "#39ff14", rgba: (a) => `rgba(57,255,20,${a})` }
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

function drawAlien(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = "#5ec8ff"
  ctx.beginPath()
  ctx.ellipse(0, 0, size * 0.7, size, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = "#0a1020"
  ctx.beginPath()
  ctx.ellipse(-size * 0.22, -size * 0.1, size * 0.18, size * 0.28, 0, 0, Math.PI * 2)
  ctx.ellipse(size * 0.22, -size * 0.1, size * 0.18, size * 0.28, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawRocket(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  accent: FlightAccent,
  crashed: boolean,
  scale = 1,
) {
  const s = Math.max(0.72, Math.min(1.15, scale))
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.scale(s, s)
  ctx.fillStyle = accent.hex
  ctx.shadowColor = accent.rgba(0.8)
  ctx.shadowBlur = 20
  ctx.beginPath()
  ctx.moveTo(28, 0)
  ctx.lineTo(-11, 11)
  ctx.quadraticCurveTo(-20, 0, -11, -11)
  ctx.closePath()
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.fillStyle = "#08140c"
  ctx.beginPath()
  ctx.ellipse(5, 0, 5.2, 3.3, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = crashed ? "#ff8da0" : "#ffffff"
  ctx.globalAlpha = crashed ? 1 : 0.9
  ctx.beginPath()
  ctx.moveTo(-11, -8)
  ctx.lineTo(-24, -13)
  ctx.lineTo(-15, 0)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(-11, 8)
  ctx.lineTo(-24, 13)
  ctx.lineTo(-15, 0)
  ctx.closePath()
  ctx.fill()
  ctx.globalAlpha = 1
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

  const sky = ctx.createLinearGradient(0, 0, 0, height)
  sky.addColorStop(0, "#0a1020")
  sky.addColorStop(0.45, "#070b14")
  sky.addColorStop(1, "#030508")
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, width, height)

  if (status === "crashed" && crashAge >= 0 && crashAge < 420 && !reduced) {
    ctx.save()
    ctx.translate(Math.sin(crashAge * 0.09) * 4, 0)
  }

  for (const star of stars) {
    ctx.fillStyle = `rgba(255,255,255,${0.16 + star.z * 0.45})`
    ctx.fillRect(star.x * width, star.y * height, star.z * 1.7, star.z * 1.7)
  }

  for (let i = 0; i < 7; i++) {
    const ax = (i * 97 + (reduced ? 0 : now / 40)) % width
    const ay = (i * 53) % (height * 0.72)
    drawAlien(ctx, ax, ay + 18, 4 + (i % 3))
  }

  const crashed = status === "crashed"
  const active = status === "flying" || crashed
  const accent = flightAccent(multiplier, crashed)
  const plot = plotFor(width, height, active ? Math.max(multiplier, 5) : 5)

  // Axes under the flight path so the curve reads on top of the grid
  drawAxes(ctx, plot, active ? multiplier : 1, crashed)

  const rocketScale = Math.min(width, height) / 360

  if (!active) {
    const bob = reduced ? 0 : Math.sin(now / 280) * 5
    const idle = flightAccent(1)
    ctx.strokeStyle = idle.rgba(0.4)
    ctx.setLineDash([5, 8])
    ctx.beginPath()
    ctx.moveTo(plot.left, plot.bottom)
    ctx.quadraticCurveTo(plot.left + plot.plotW * 0.45, plot.bottom - 10, plot.left + plot.plotW * 0.7, yAt(1.4, plot))
    ctx.stroke()
    ctx.setLineDash([])
    drawRocket(ctx, plot.left + Math.min(48, plot.plotW * 0.18), plot.bottom - 16 + bob, -0.3, idle, false, rocketScale)
  } else {
    const exit = crashed ? Math.min(1, Math.max(0, crashAge / 760)) : 0
    const points = curve(multiplier, plot, exit)
    const last = points[points.length - 1]
    const previous = points[Math.max(0, points.length - 10)]
    if (last && previous) {
      const glowR = Math.min(120, Math.max(70, plot.plotW * 0.22))
      const glow = ctx.createRadialGradient(last.x, last.y, 0, last.x, last.y, glowR)
      glow.addColorStop(0, accent.rgba(0.5))
      glow.addColorStop(1, "rgba(0,0,0,0)")
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(last.x, last.y, glowR, 0, Math.PI * 2)
      ctx.fill()

      strokeCurve(ctx, points)
      ctx.lineTo(last.x, plot.bottom)
      ctx.lineTo(points[0].x, plot.bottom)
      ctx.closePath()
      const fill = ctx.createLinearGradient(0, last.y, 0, plot.bottom)
      fill.addColorStop(0, accent.rgba(0.34))
      fill.addColorStop(0.55, accent.rgba(0.1))
      fill.addColorStop(1, "rgba(0,0,0,0)")
      ctx.fillStyle = fill
      ctx.fill()

      strokeCurve(ctx, points)
      ctx.strokeStyle = accent.hex
      ctx.lineWidth = Math.max(3.5, Math.min(5.5, width / 90))
      ctx.lineJoin = "round"
      ctx.lineCap = "round"
      ctx.shadowColor = accent.rgba(0.95)
      ctx.shadowBlur = 16
      ctx.stroke()
      ctx.shadowBlur = 0

      strokeCurve(ctx, points)
      ctx.strokeStyle = "rgba(255,255,255,0.4)"
      ctx.lineWidth = 1.6
      ctx.stroke()

      ctx.globalAlpha = 1 - exit
      drawRocket(ctx, last.x, last.y, Math.atan2(last.y - previous.y, last.x - previous.x), accent, crashed, rocketScale)
      ctx.globalAlpha = 1
    }
  }

  if (crashed) {
    const alpha = Math.max(0, 0.22 - Math.max(0, crashAge) / 1400)
    ctx.fillStyle = `rgba(255, 93, 115, ${alpha})`
    ctx.fillRect(0, 0, width, height)
  }

  if (status === "crashed" && crashAge >= 0 && crashAge < 420 && !reduced) ctx.restore()
}
