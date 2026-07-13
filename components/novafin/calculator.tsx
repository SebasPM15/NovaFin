"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Calculator as CalcIcon, X, Delete } from "lucide-react"
import { cn } from "@/lib/utils"

function evaluateExpression(expr: string): number | null {
  const sanitized = expr.replaceAll(",", ".").replaceAll(/[^0-9+\-*/.]/g, "")
  if (!sanitized) return null
  // Only digits and basic operators remain after sanitize.
  // eslint-disable-next-line no-new-func -- intentional sandbox for calculator expressions
  const res = new Function(`"use strict"; return (${sanitized})`)()
  return typeof res === "number" && Number.isFinite(res) ? res : null
}

export function CalculatorWidget() {
  const [open, setOpen] = useState(false)
  const [expr, setExpr] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      const id = setTimeout(() => inputRef.current?.focus(), 100)
      return () => clearTimeout(id)
    }
  }, [open])

  const append = (c: string) => {
    setExpr((p) => p + c)
    inputRef.current?.focus()
  }
  const back = () => {
    setExpr((p) => p.slice(0, -1))
    inputRef.current?.focus()
  }
  const clear = () => {
    setExpr("")
    inputRef.current?.focus()
  }

  const calc = () => {
    try {
      if (!expr.trim()) return
      const res = evaluateExpression(expr)
      if (res != null) setExpr(String(Math.round(res * 100) / 100))
    } catch {
      // Invalid expression — leave input as-is
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === "=") {
      e.preventDefault()
      calc()
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <div
        className={cn(
          "w-64 origin-bottom-right transform rounded-2xl border border-border bg-background p-4 shadow-2xl transition-all duration-300",
          open ? "scale-100 opacity-100" : "pointer-events-none scale-90 opacity-0",
        )}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Calculadora</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mb-3 rounded-xl border border-input bg-card p-3 shadow-inner">
          <input
            ref={inputRef}
            type="text"
            value={expr}
            onChange={(e) => setExpr(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="0"
            className="w-full bg-transparent text-right text-2xl font-medium tracking-tight text-foreground outline-none placeholder:text-muted-foreground/30"
          />
        </div>

        <div className="grid grid-cols-4 gap-2">
          <Btn onClick={clear} className="col-span-2 border-destructive/20 bg-destructive/10 font-medium text-destructive hover:bg-destructive/20">
            AC
          </Btn>
          <Btn onClick={back} className="border-accent/20 text-accent hover:bg-accent/10">
            <Delete className="mx-auto size-4" />
          </Btn>
          <Btn onClick={() => append("/")} className="border-accent/20 font-medium text-accent hover:bg-accent/10">
            ÷
          </Btn>

          <Btn onClick={() => append("7")}>7</Btn>
          <Btn onClick={() => append("8")}>8</Btn>
          <Btn onClick={() => append("9")}>9</Btn>
          <Btn onClick={() => append("*")} className="border-accent/20 font-medium text-accent hover:bg-accent/10">
            ×
          </Btn>

          <Btn onClick={() => append("4")}>4</Btn>
          <Btn onClick={() => append("5")}>5</Btn>
          <Btn onClick={() => append("6")}>6</Btn>
          <Btn onClick={() => append("-")} className="border-accent/20 font-medium text-accent hover:bg-accent/10">
            -
          </Btn>

          <Btn onClick={() => append("1")}>1</Btn>
          <Btn onClick={() => append("2")}>2</Btn>
          <Btn onClick={() => append("3")}>3</Btn>
          <Btn onClick={() => append("+")} className="border-accent/20 font-medium text-accent hover:bg-accent/10">
            +
          </Btn>

          <Btn onClick={() => append("0")} className="col-span-2">
            0
          </Btn>
          <Btn onClick={() => append(",")}>,</Btn>
          <Btn onClick={calc} className="border-primary bg-primary text-primary-foreground hover:bg-primary/90">
            =
          </Btn>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex size-14 items-center justify-center rounded-full text-white shadow-xl transition-all hover:scale-105 active:scale-95",
          open ? "bg-muted-foreground" : "bg-primary",
        )}
      >
        {open ? <X className="size-6" /> : <CalcIcon className="size-6" />}
      </button>
    </div>
  )
}

function Btn({
  children,
  onClick,
  className,
}: Readonly<{
  children: React.ReactNode
  onClick: () => void
  className?: string
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-10 items-center justify-center rounded-lg border border-border bg-secondary/30 text-sm transition-all hover:bg-secondary active:scale-95",
        className,
      )}
    >
      {children}
    </button>
  )
}
