import { NextResponse } from "next/server"
import { getUserId } from "@/lib/auth"
import { fail, fromError } from "@/lib/game/errors"
import { loadState, mutate } from "@/lib/game/server"
import { parseUuid } from "@/lib/game/validators"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const userId = await getUserId()
    if (!userId) return fail("Sign in to bet.", 401)
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return fail("Invalid request.")
    }
    const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : {}
    const betId = parseUuid(payload.betId)
    if (!betId) return fail("That bet is no longer available.")
    await mutate("cancel_bet", { p_user: userId, p_bet: betId })
    return NextResponse.json(await loadState(userId))
  } catch (error) {
    return fromError(error)
  }
}
