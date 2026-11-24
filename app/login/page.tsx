import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { AuthForm } from "@/components/auth/auth-form"
import { Page } from "@/components/ui/page"
import { getSessionContext } from "@/lib/auth"

export const metadata: Metadata = { title: "Log in" }

export default async function LoginPage() {
  const session = await getSessionContext()
  if (session.user) redirect("/")
  return (
    <Page width="sm" className="py-10 sm:py-12">
      <AuthForm mode="login" configured={session.configured} />
    </Page>
  )
}
