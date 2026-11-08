import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { AdminDashboard } from "@/components/admin/admin-dashboard"
import { Panel } from "@/components/ui/panel"
import { AdminForbiddenError, loadAdminOverview } from "@/lib/admin"
import { getSessionContext } from "@/lib/auth"
import { ConfigError, GameDataError } from "@/lib/game/errors"

export const metadata: Metadata = { title: "Admin" }
export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const session = await getSessionContext()
  if (!session.user) redirect("/login?next=/admin")

  try {
    const overview = await loadAdminOverview()
    return <AdminDashboard initial={overview} />
  } catch (error) {
    if (error instanceof AdminForbiddenError) {
      return (
        <div className="mx-auto max-w-lg px-3 py-10">
          <Panel className="grid gap-3 p-6">
            <h1 className="text-2xl font-bold">Admin only</h1>
            <p className="text-sm text-[var(--muted)]">Your account is signed in, but it is not marked as admin yet.</p>
            <Link href="/" className="text-sm font-semibold text-[var(--sporty)]">
              Back home
            </Link>
          </Panel>
        </div>
      )
    }
    if (error instanceof ConfigError || error instanceof GameDataError) {
      return (
        <div className="mx-auto max-w-lg px-3 py-10">
          <Panel className="grid gap-3 p-6">
            <h1 className="text-2xl font-bold">Admin setup needed</h1>
            <p className="text-sm text-[var(--muted)]">{error.message}</p>
            <p className="text-sm text-[var(--muted)]">Run supabase/admin.sql on the project, then mark your profile is_admin = true.</p>
          </Panel>
        </div>
      )
    }
    throw error
  }
}
