"use client"

import type React from "react"
import { useState } from "react"
import { cn } from "@/lib/utils"

export { parseDecimal } from "@/lib/finance"

export type MoneyTone = "neutral" | "ahorro" | "gastos"

export function toneFromTipo(tipo: string): MoneyTone {
  if (tipo === "ahorro") return "ahorro"
  if (tipo === "gastos") return "gastos"
  return "neutral"
}

function affixClass(tone: MoneyTone) {
  if (tone === "ahorro") return "text-primary/60"
  if (tone === "gastos") return "text-accent/70"
  return "text-muted-foreground/50"
}

function focusClass(tone: MoneyTone) {
  if (tone === "gastos") return "focus:border-accent focus:ring-accent/30"
  return "focus:border-primary focus:ring-primary/30"
}

function sectionToneClass(tone: MoneyTone) {
  if (tone === "ahorro") return "text-primary"
  if (tone === "gastos") return "text-accent"
  return "text-muted-foreground"
}

/**
 * Keeps a single decimal separator visible while typing.
 * Prefers comma (es-EC); a typed period becomes a comma.
 */
export function sanitizeDecimal(raw: string) {
  let v = String(raw).replaceAll(/[^0-9.,-]/g, "")
  const neg = v.startsWith("-")
  v = v.replaceAll("-", "")
  v = v.replaceAll(".", ",")
  const parts = v.split(",")
  if (parts.length > 2) v = `${parts[0]},${parts.slice(1).join("")}`
  return neg ? `-${v}` : v
}

function displayDecimal(value: string | number) {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return ""
    return String(value).replace(".", ",")
  }
  return value
}

function isEnterCommit(e: React.KeyboardEvent) {
  return e.key === "Enter" && !e.nativeEvent.isComposing
}

// ─── Field wrapper ──────────────────────────────────────────────────────────
export function Field({
  label,
  hint,
  children,
  className,
}: Readonly<{
  label: string
  hint?: string
  children: React.ReactNode
  className?: string
}>) {
  return (
    <label className={cn("block min-w-0", className)}>
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
}: Readonly<{
  value: string | number
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  className?: string
  onEnter?: () => void
}>) {
  return (
    <input
      type={type === "number" ? "text" : type}
      autoComplete="off"
      enterKeyHint={onEnter ? "done" : undefined}
      value={type === "number" ? displayDecimal(value) : value}
      placeholder={placeholder}
      onChange={(e) => {
        if (type === "number") onChange(sanitizeDecimal(e.target.value))
        else onChange(e.target.value)
      }}
      onKeyDown={(e) => {
        if (isEnterCommit(e)) onEnter?.()
      }}
      className={cn(
        "min-h-11 min-w-0 w-full rounded-lg border border-input bg-background/60 px-3 py-2.5 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-ring focus:ring-2 focus:ring-ring/30 sm:min-h-0 sm:py-2 sm:text-sm",
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
}: Readonly<{
  value: string | number
  onChange: (v: string) => void
  placeholder?: string
  tone?: MoneyTone
  className?: string
  onEnter?: () => void
}>) {
  // Local draft so trailing "," survives while parent stores Number(...) mid-keystroke.
  const [focused, setFocused] = useState(false)
  const [draft, setDraft] = useState("")
  const shown = focused ? draft : displayDecimal(value)

  return (
    <div className={cn("relative min-w-0", className)}>
      <span
        className={cn(
          "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base tnum sm:text-sm",
          affixClass(tone),
        )}
        aria-hidden
      >
        $
      </span>
      <input
        type="text"
        autoComplete="off"
        enterKeyHint={onEnter ? "done" : undefined}
        lang="es-EC"
        value={shown}
        placeholder={placeholder ?? "0,00"}
        onFocus={() => {
          setFocused(true)
          setDraft(displayDecimal(value))
        }}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          const v = sanitizeDecimal(e.target.value)
          setDraft(v)
          onChange(v)
        }}
        onKeyDown={(e) => {
          if (isEnterCommit(e)) onEnter?.()
        }}
        className={cn(
          "min-h-11 min-w-0 w-full rounded-lg border border-input bg-background/60 py-2.5 pl-7 pr-3 text-base tnum text-foreground outline-none transition-colors placeholder:text-muted-foreground/40 focus:ring-2 sm:min-h-0 sm:py-2 sm:text-sm",
          focusClass(tone),
        )}
      />
    </div>
  )
}

// ─── Card / Panel ─────────────────────────────────────────────────────────────
export function Panel({
  children,
  className,
}: Readonly<{
  children: React.ReactNode
  className?: string
}>) {
  return (
    <div className={cn("rounded-xl border border-border bg-card/60 p-5", className)}>{children}</div>
  )
}

// ─── Section label ────────────────────────────────────────────────────────────
export function SectionLabel({
  children,
  tone = "neutral",
  className,
}: Readonly<{
  children: React.ReactNode
  tone?: MoneyTone
  className?: string
}>) {
  return (
    <div className={cn("text-[11px] font-semibold uppercase tracking-widest", sectionToneClass(tone), className)}>
      {children}
    </div>
  )
}

// ─── Segmented control ────────────────────────────────────────────────────────
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: Readonly<{
  value: T
  onChange: (v: T) => void
  options: ReadonlyArray<{ value: T; label: string }>
  className?: string
}>) {
  return (
    <div className={cn("inline-flex rounded-lg border border-border bg-background/40 p-0.5", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "min-h-10 flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors sm:min-h-0 sm:flex-none sm:py-1.5",
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
