import { NextResponse } from "next/server"
import { getUserId } from "@/lib/auth"
import { fail, fromError, GameDataError } from "@/lib/game/errors"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId()
    if (!userId) return fail("Sign in required.", 401)
    const { id } = await context.params
    const supabase = await createClient()
    const { error } = await supabase.rpc("mark_deposit_address_copied", { p_id: id })
    if (error) throw new GameDataError(error.message)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return fromError(error)
  }
}
