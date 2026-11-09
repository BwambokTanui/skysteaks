import { NextResponse } from "next/server"
import { getUserId } from "@/lib/auth"
import { fail, fromError, GameDataError } from "@/lib/game/errors"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function friendlyWalletError(message: string) {
  const lower = message.toLowerCase()
  if (lower.includes("insufficient")) return "Insufficient balance."
  if (lower.includes("minimum")) return "Minimum withdrawal is USD 10."
  if (lower.includes("not authenticated")) return "Sign in to withdraw."
  if (lower.includes("profile missing")) return "Profile not found. Sign out and sign in again."
  return message
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId()
    if (!userId) return fail("Sign in to withdraw.", 401)
    const body = (await request.json()) as { amount?: number }
    const amount = Number(body.amount)
    if (!Number.isFinite(amount) || amount < 10) return fail("Minimum withdrawal is USD 10.", 400)
    const supabase = await createClient()
    const { data, error } = await supabase.rpc("withdraw_play_credit", { p_amount: amount })
    if (error) throw new GameDataError(friendlyWalletError(error.message))
    return NextResponse.json({ balance: Number(data) })
  } catch (error) {
    return fromError(error)
  }
}
