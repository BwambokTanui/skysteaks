import { NextResponse } from "next/server"
import { getUserId } from "@/lib/auth"
import { fail, fromError, GameDataError } from "@/lib/game/errors"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const userId = await getUserId()
    if (!userId) return fail("Sign in to deposit.", 401)

    let amount = 1000
    try {
      const body = (await request.json()) as { amount?: number }
      if (body.amount != null) amount = Number(body.amount)
    } catch {
      amount = 1000
    }

    if (!Number.isFinite(amount) || amount < 10) return fail("Minimum deposit is USD 10.", 400)
    if (amount > 10000) return fail("Maximum deposit is USD 10,000.", 400)

    const supabase = await createClient()
    const { data, error } = await supabase.rpc("deposit_play_credit", { p_amount: amount })
    if (error) {
      // Fallback if older DB only has topup_play_credit()
      if (amount === 1000) {
        const legacy = await supabase.rpc("topup_play_credit")
        if (legacy.error) throw new GameDataError(legacy.error.message)
        return NextResponse.json({ balance: Number(legacy.data) })
      }
      throw new GameDataError(error.message)
    }
    return NextResponse.json({ balance: Number(data) })
  } catch (error) {
    return fromError(error)
  }
}
