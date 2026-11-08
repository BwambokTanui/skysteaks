import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function SportsPage({
  searchParams,
}: {
  searchParams: Promise<{ live?: string; sport?: string }>
}) {
  const params = await searchParams
  const query = new URLSearchParams()
  if (params.live === "1") query.set("live", "1")
  if (params.sport) query.set("sport", params.sport)
  const suffix = query.toString()
  redirect(suffix ? `/?${suffix}` : "/")
}
