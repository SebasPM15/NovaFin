"use client"

import type React from "react"
import { cn } from "@/lib/utils"

// ─── Field wrapper ──────────────────────────────────────────────────────────
export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string
  hint?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground/70">{hint}</span> : null}
    </label>
  )
}

// ─── Text / number input ──────────────────────────────────────────────────────
export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  className,
  onEnter,
}: {
  value: string | number
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  className?: string
  onEnter?: () => void
}) {
  return (
    <input
      type={type === "number" ? "text" : type}
      inputMode={type === "number" ? "decimal" : undefined}
      value={value}
      placeholder={placeholder}
      onChange={(e) => {
        if (type === "number") {
          let v = e.target.value.replace(/,/g, ".")
          v = v.replace(/[^0-9.-]/g, "")
          const parts = v.split(".")
          if (parts.length > 2) v = parts[0] + "." + parts.slice(1).join("")
          onChange(v)
        } else {
          onChange(e.target.value)
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229) onEnter?.()
      }}
      className={cn(
        "w-full rounded-lg border border-input bg-background/60 px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-ring focus:ring-2 focus:ring-ring/30",
        className,
      )}
    />
  )
}

// ─── Money input (with $ affix + accent) ──────────────────────────────────────
export function MoneyInput({
  value,
  onChange,
  placeholder,
  tone = "neutral",
  className,
  onEnter,
}: {
  value: string | number
  onChange: (v: string) => void
  placeholder?: string
  tone?: "neutral" | "ahorro" | "gastos"
  className?: string
  onEnter?: () => void
}) {
  const affix =
    tone === "ahorro" ? "text-primary/60" : tone === "gastos" ? "text-accent/70" : "text-muted-foreground/50"
  const focus =
    tone === "gastos"
      ? "focus:border-accent focus:ring-accent/30"
      : "focus:border-primary focus:ring-primary/30"
  return (
    <div className={cn("relative", className)}>
      <span
        className={cn("pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm tnum", affix)}
        aria-hidden
      >
        $
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          let v = e.target.value.replace(/,/g, ".")
          v = v.replace(/[^0-9.-]/g, "")
          const parts = v.split(".")
          if (parts.length > 2) v = parts[0] + "." + parts.slice(1).join("")
          onChange(v)
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229) onEnter?.()
        }}
        className={cn(
          "w-full rounded-lg border border-input bg-background/60 py-2 pl-7 pr-3 text-sm tnum text-foreground outline-none transition-colors placeholder:text-muted-foreground/40 focus:ring-2",
          focus,
        )}
      />
    </div>
  )
}

// ─── Card / Panel ─────────────────────────────────────────────────────────────
export function Panel({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card/60 p-5", className)}>{children}</div>
  )
}

// ─── Section label ────────────────────────────────────────────────────────────
export function SectionLabel({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode
  tone?: "neutral" | "ahorro" | "gastos"
  className?: string
}) {
  const color =
    tone === "ahorro" ? "text-primary" : tone === "gastos" ? "text-accent" : "text-muted-foreground"
  return (
    <div className={cn("text-[11px] font-semibold uppercase tracking-widest", color, className)}>{children}</div>
  )
}

// ─── Segmented control ────────────────────────────────────────────────────────
export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-background/40 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            value === o.value
              ? "bg-secondary text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
