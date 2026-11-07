import { NextResponse } from "next/server"
import { getUserId } from "@/lib/auth"
import { fail, fromError, GameDataError } from "@/lib/game/errors"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST() {
  try {
    const userId = await getUserId()
    if (!userId) return fail("Sign in to add play credits.", 401)
    const supabase = await createClient()
    const { data, error } = await supabase.rpc("topup_play_credit")
    if (error) throw new GameDataError(error.message)
    return NextResponse.json({ balance: Number(data) })
  } catch (error) {
    return fromError(error)
  }
}
