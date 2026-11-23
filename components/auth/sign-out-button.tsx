"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { useBalance } from "@/components/layout/balance"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/cn"

export function SignOutButton({
  configured = true,
  variant = "ghost",
  size = "md",
  className,
  label = "Log out",
}: {
  configured?: boolean
  variant?: "primary" | "ghost" | "danger"
  size?: "md" | "lg" | "sm"
  className?: string
  label?: string
}) {
  const router = useRouter()
  const { setBalance } = useBalance()
  const [pending, setPending] = useState(false)

  async function signOut() {
    if (!configured || pending) return
    setPending(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      setBalance(null)
      router.replace("/login")
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  if (size === "sm") {
    return (
      <button
        type="button"
        onClick={() => void signOut()}
        disabled={pending || !configured}
        className={cn(
          "inline-flex h-9 cursor-pointer items-center justify-center rounded-full bg-[var(--bg-elevated)] px-3 text-xs font-semibold text-[var(--text)] transition hover:bg-[#e7ebf2] disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      >
        {pending ? "…" : label}
      </button>
    )
  }

  return (
    <Button type="button" variant={variant} size={size} disabled={pending || !configured} onClick={() => void signOut()} className={className}>
      {pending ? "Signing out…" : label}
    </Button>
  )
}
