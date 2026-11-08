import { cn } from "@/lib/cn"

const variants = {
  primary: "bg-[var(--sporty)] text-white shadow-[0_8px_18px_rgba(227,27,35,0.28)] hover:brightness-110",
  ghost: "bg-[var(--bg-elevated)] text-[var(--text)] hover:bg-[#e7ebf2]",
  danger: "bg-[#ffe8ea] text-[var(--rose)] hover:bg-[#ffd7db]",
  cash: "bg-[var(--mint)] text-white hover:brightness-110",
}

const sizes = {
  md: "h-11 px-4 text-sm",
  lg: "h-14 px-5 text-base font-semibold",
}

type Variant = keyof typeof variants
type Size = keyof typeof sizes

export function buttonClasses(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-2xl transition disabled:cursor-not-allowed disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  )
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: {
  variant?: Variant
  size?: Size
  className?: string
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={buttonClasses(variant, size, className)} {...props} />
}
