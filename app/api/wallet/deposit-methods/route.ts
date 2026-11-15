import { NextResponse } from "next/server"
import { getUserId } from "@/lib/auth"
import { fail, fromError } from "@/lib/game/errors"
import { listDepositMethods } from "@/lib/deposits"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  try {
    const userId = await getUserId()
    if (!userId) return fail("Sign in required.", 401)
    const methods = await listDepositMethods()
    return NextResponse.json({ methods })
  } catch (error) {
    return fromError(error)
  }
}
