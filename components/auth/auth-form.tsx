"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"
import { SetupNotice } from "@/components/game/setup-notice"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Notice } from "@/components/ui/notice"
import { Panel } from "@/components/ui/panel"
import { createClient } from "@/lib/supabase/client"

export function AuthForm({ mode, configured }: { mode: "login" | "signup"; configured: boolean }) {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [tone, setTone] = useState<"error" | "info">("error")

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!configured) return
    setPending(true)
    setMessage(null)
    try {
      if (password.length < 8) {
        setTone("error")
        setMessage("Use at least 8 characters.")
        return
      }
      const supabase = createClient()
      if (mode === "signup") {
        const name = username.trim().toLowerCase()
        if (!/^[a-z0-9_]{3,16}$/.test(name)) {
          setTone("error")
          setMessage("Username must be 3–16 characters: letters, numbers, underscore.")
          return
        }
        const available = await supabase.rpc("username_available", { p_name: name })
        if (available.error) throw available.error
        if (!available.data) {
          setTone("error")
          setMessage("That username is taken.")
          return
        }
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { username: name },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })
        if (error) throw error
        if (!data.session) {
          setTone("info")
          setMessage("Check your email to confirm the account, then log in. For local play, turn off email confirmation in Supabase Auth.")
          return
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
      }
      router.replace("/")
      router.refresh()
    } catch (caught) {
      setTone("error")
      setMessage(caught instanceof Error ? caught.message : "Authentication failed")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="grid gap-4">
      {!configured && <SetupNotice />}
      <Panel className="grid gap-5 p-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.22em] text-[var(--mint)]">SKYSTEAKS</p>
          <h1 className="mt-2 text-3xl font-semibold">{mode === "login" ? "Log in" : "Create account"}</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {mode === "login" ? "Pick up your play credits for sports and Aviator." : "New accounts start with 1,000 play credits."}
          </p>
        </div>
        <form className="grid gap-4" onSubmit={onSubmit}>
          {mode === "signup" && (
            <Field label="Username" name="username" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required />
          )}
          <Field label="Email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
          <Field
            label="Password"
            name="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
          />
          {message && <Notice tone={tone}>{message}</Notice>}
          <Button type="submit" size="lg" disabled={pending || !configured}>
            {mode === "login" ? "Log in" : "Create account"}
          </Button>
        </form>
        <p className="text-sm text-[var(--muted)]">
          {mode === "login" ? (
            <>
              New here?{" "}
              <Link href="/signup" className="text-white">
                Create an account
              </Link>
            </>
          ) : (
            <>
              Already flying?{" "}
              <Link href="/login" className="text-white">
                Log in
              </Link>
            </>
          )}
        </p>
      </Panel>
    </div>
  )
}
