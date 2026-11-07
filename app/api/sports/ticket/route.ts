import { NextResponse } from "next/server"
import { getUserId } from "@/lib/auth"
import { fail, fromError } from "@/lib/game/errors"
import { parseAmount, parseUuid } from "@/lib/game/validators"
import { placeSportsTicket } from "@/lib/sports/server"

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
    const stake = parseAmount(payload.stake)
    const rawIds = Array.isArray(payload.selectionIds) ? payload.selectionIds : []
    const selectionIds = rawIds.map((id) => parseUuid(id)).filter((id): id is string => Boolean(id))

    if (stake == null) return fail("Stake must be between 1 and 5,000.")
    if (!selectionIds.length) return fail("Add at least one selection to the betslip.")
    if (selectionIds.length !== rawIds.length) return fail("A selection on the betslip is no longer available.")

    const result = await placeSportsTicket(userId, stake, selectionIds)
    return NextResponse.json(result)
  } catch (error) {
    return fromError(error)
  }
}
