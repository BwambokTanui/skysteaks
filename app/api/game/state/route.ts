import { NextResponse } from "next/server"
import { getUserId } from "@/lib/auth"
import { fromError } from "@/lib/game/errors"
import { loadState } from "@/lib/game/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  try {
    const state = await loadState(await getUserId())
    return NextResponse.json(state)
  } catch (error) {
    return fromError(error)
  }
}
