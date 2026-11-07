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

function drawRocket(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, crashed: boolean) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.fillStyle = crashed ? "#ff5d73" : "#39ff14"
  ctx.shadowColor = crashed ? "rgba(255,93,115,0.7)" : "rgba(57,255,20,0.75)"
  ctx.shadowBlur = 18
  ctx.beginPath()
  ctx.moveTo(26, 0)
  ctx.lineTo(-10, 10)
  ctx.quadraticCurveTo(-18, 0, -10, -10)
  ctx.closePath()
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.fillStyle = "#08140c"
  ctx.beginPath()
  ctx.ellipse(4, 0, 5, 3.2, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = crashed ? "#ff8da0" : "#b9ff9c"
  ctx.beginPath()
  ctx.moveTo(-10, -7)
  ctx.lineTo(-22, -12)
  ctx.lineTo(-14, 0)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(-10, 7)
  ctx.lineTo(-22, 12)
  ctx.lineTo(-14, 0)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function curve(multiplier: number, width: number, height: number, exit: number) {
  const elapsed = Math.log(Math.max(multiplier, 1.0001)) / 0.00006
  const xMax = Math.max(4500, elapsed * 1.28)
  const yMax = Math.max(1.7, multiplier * 1.35)
  const left = 18
  const bottom = height - 28
  const plotW = width - left - 18
  const plotH = bottom - 18
  const points: Array<{ x: number; y: number }> = []
  for (let i = 0; i <= 80; i++) {
    const t = (elapsed * i) / 80
    const value = Math.exp(0.00006 * t)
    points.push({
      x: left + (t / xMax) * plotW,
      y: bottom - ((value - 1) / Math.max(0.4, yMax - 1)) * plotH,
    })
  }
  const last = points[points.length - 1]
  if (last && exit > 0) {
    last.x += exit * 110
    last.y -= exit * 90
  }
  return { points, bottom }
}

export function drawFlight(ctx: CanvasRenderingContext2D, model: DrawModel) {
  const { width, height, status, multiplier, now, crashAge, stars, reduced } = model
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = "#000000"
  ctx.fillRect(0, 0, width, height)

  if (status === "crashed" && crashAge >= 0 && crashAge < 420 && !reduced) {
    ctx.save()
    ctx.translate(Math.sin(crashAge * 0.09) * 4, 0)
  }

  for (const star of stars) {
    ctx.fillStyle = `rgba(255,255,255,${0.18 + star.z * 0.5})`
    ctx.fillRect(star.x * width, star.y * height, star.z * 1.8, star.z * 1.8)
  }

  for (let i = 0; i < 8; i++) {
    const ax = ((i * 97 + (reduced ? 0 : now / 40)) % width)
    const ay = (i * 53) % (height * 0.75)
    drawAlien(ctx, ax, ay + 20, 4 + (i % 3))
  }

  const bottom = height - 28
  const crashed = status === "crashed"
  const active = status === "flying" || crashed

  if (!active) {
    const bob = reduced ? 0 : Math.sin(now / 280) * 5
    ctx.strokeStyle = "rgba(57,255,20,0.35)"
    ctx.setLineDash([5, 8])
    ctx.beginPath()
    ctx.moveTo(18, bottom)
    ctx.lineTo(width - 18, bottom - 24)
    ctx.stroke()
    ctx.setLineDash([])
    drawRocket(ctx, 58, bottom - 18 + bob, -0.22, false)
  } else {
    const exit = crashed ? Math.min(1, Math.max(0, crashAge / 760)) : 0
    const { points } = curve(multiplier, width, height, exit)
    const last = points[points.length - 1]
    const previous = points[points.length - 2]
    if (last && previous) {
      const glow = ctx.createRadialGradient(last.x, last.y, 0, last.x, last.y, 100)
      glow.addColorStop(0, crashed ? "rgba(255,93,115,0.45)" : "rgba(57,255,20,0.45)")
      glow.addColorStop(1, "rgba(0,0,0,0)")
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(last.x, last.y, 100, 0, Math.PI * 2)
      ctx.fill()

      ctx.beginPath()
      points.forEach((point, index) => (index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)))
      ctx.lineTo(last.x, bottom)
      ctx.lineTo(points[0].x, bottom)
      ctx.closePath()
      const fill = ctx.createLinearGradient(0, 0, 0, height)
      fill.addColorStop(0, crashed ? "rgba(255,93,115,0.28)" : "rgba(57,255,20,0.28)")
      fill.addColorStop(1, "rgba(0,0,0,0)")
      ctx.fillStyle = fill
      ctx.fill()

      ctx.beginPath()
      points.forEach((point, index) => (index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)))
      ctx.strokeStyle = crashed ? "#ff5d73" : "#39ff14"
      ctx.lineWidth = 4
      ctx.lineJoin = "round"
      ctx.lineCap = "round"
      ctx.shadowColor = crashed ? "rgba(255,93,115,0.8)" : "rgba(57,255,20,0.9)"
      ctx.shadowBlur = 12
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.globalAlpha = 1 - exit
      drawRocket(ctx, last.x, last.y, Math.atan2(last.y - previous.y, last.x - previous.x), crashed)
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
