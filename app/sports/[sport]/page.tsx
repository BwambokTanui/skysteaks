import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function SportPage({
  params,
}: {
  params: Promise<{ sport: string }>
}) {
  const { sport } = await params
  redirect(`/?sport=${encodeURIComponent(sport)}`)
}
