import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { AuthForm } from "@/components/auth/auth-form"
import { getSessionContext } from "@/lib/auth"

export const metadata: Metadata = { title: "Log in" }

export default async function LoginPage() {
  const session = await getSessionContext()
  if (session.user) redirect("/")
  return (
    <div className="mx-auto w-full max-w-md px-4 py-12">
      <AuthForm mode="login" configured={session.configured} />
    </div>
  )
}
