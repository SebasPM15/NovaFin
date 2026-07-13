"use client"

import { useState, useEffect, useRef } from "react"
import { Calculator as CalcIcon, X, Delete } from "lucide-react"
import { cn } from "@/lib/utils"

export function CalculatorWidget() {
  const [open, setOpen] = useState(false)
  const [expr, setExpr] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
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
      const sanitized = expr.replace(/[^0-9+\-*/.]/g, "")
      if (!sanitized) return
      // eslint-disable-next-line
      const res = new Function(`return ${sanitized}`)()
      if (Number.isFinite(res)) {
        setExpr(String(Math.round(res * 100) / 100))
      }
    } catch {
      // Ignore evaluation errors
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
      {/* Popover */}
      <div
        className={cn(
          "w-64 transform rounded-2xl border border-border bg-background p-4 shadow-2xl transition-all duration-300 origin-bottom-right",
          open ? "scale-100 opacity-100" : "scale-90 opacity-0 pointer-events-none"
        )}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Calculadora</span>
          <button 
            type="button" 
            onClick={() => setOpen(false)}
            className="rounded-md p-1 text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Display */}
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

        {/* Grid */}
        <div className="grid grid-cols-4 gap-2">
          {/* Row 1 */}
          <Btn onClick={clear} className="col-span-2 text-destructive font-medium bg-destructive/10 hover:bg-destructive/20 border-destructive/20">AC</Btn>
          <Btn onClick={back} className="text-accent hover:bg-accent/10 border-accent/20"><Delete className="size-4 mx-auto" /></Btn>
          <Btn onClick={() => append("/")} className="text-accent font-medium hover:bg-accent/10 border-accent/20">÷</Btn>

          {/* Row 2 */}
          <Btn onClick={() => append("7")}>7</Btn>
          <Btn onClick={() => append("8")}>8</Btn>
          <Btn onClick={() => append("9")}>9</Btn>
          <Btn onClick={() => append("*")} className="text-accent font-medium hover:bg-accent/10 border-accent/20">×</Btn>

          {/* Row 3 */}
          <Btn onClick={() => append("4")}>4</Btn>
          <Btn onClick={() => append("5")}>5</Btn>
          <Btn onClick={() => append("6")}>6</Btn>
          <Btn onClick={() => append("-")} className="text-accent font-medium hover:bg-accent/10 border-accent/20">-</Btn>

          {/* Row 4 */}
          <Btn onClick={() => append("1")}>1</Btn>
          <Btn onClick={() => append("2")}>2</Btn>
          <Btn onClick={() => append("3")}>3</Btn>
          <Btn onClick={() => append("+")} className="text-accent font-medium hover:bg-accent/10 border-accent/20">+</Btn>

          {/* Row 5 */}
          <Btn onClick={() => append("0")} className="col-span-2">0</Btn>
          <Btn onClick={() => append(".")}>.</Btn>
          <Btn onClick={calc} className="bg-primary hover:bg-primary/90 text-primary-foreground border-primary">=</Btn>
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex size-14 items-center justify-center rounded-full text-white shadow-xl transition-all hover:scale-105 active:scale-95",
          open ? "bg-muted-foreground" : "bg-primary"
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
  className 
}: { 
  children: React.ReactNode, 
  onClick: () => void, 
  className?: string 
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-10 items-center justify-center rounded-lg border border-border bg-secondary/30 text-sm transition-all hover:bg-secondary active:scale-95",
        className
      )}
    >
      {children}
    </button>
  )
}
