import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { AuthForm } from "@/components/auth/auth-form"
import { Page } from "@/components/ui/page"
import { getSessionContext } from "@/lib/auth"

export const metadata: Metadata = { title: "Sign up" }

export default async function SignupPage() {
  const session = await getSessionContext()
  if (session.user) redirect("/")
  return (
    <Page width="sm" className="py-10 sm:py-12">
      <AuthForm mode="signup" configured={session.configured} />
    </Page>
  )
}
