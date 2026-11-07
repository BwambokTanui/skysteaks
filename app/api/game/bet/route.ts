import { NextResponse } from "next/server"
import { getUserId } from "@/lib/auth"
import { fail, fromError } from "@/lib/game/errors"
import { loadState, mutate } from "@/lib/game/server"
import { parseAmount, parseAuto, parseSlot, parseUuid } from "@/lib/game/validators"

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
    const roundId = parseUuid(payload.roundId)
    const amount = parseAmount(payload.amount)
    const slot = parseSlot(payload.slot)
    const auto = parseAuto(payload.autoCashout)
    if (!roundId) return fail("That round is no longer open.")
    if (amount == null) return fail("Stake must be between 1 and 5,000.")
    if (slot == null) return fail("Choose bet A or bet B.")
    if (!auto.ok) return fail("Auto cash out must be between 1.10 and 1,000.")

    await mutate("place_bet", {
      p_user: userId,
      p_round: roundId,
      p_amount: amount,
      p_slot: slot,
      p_auto: auto.value,
    })
    return NextResponse.json(await loadState(userId))
  } catch (error) {
    return fromError(error)
  }
}
