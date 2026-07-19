"use client"

import { useState } from "react"
import { Check, HelpCircle, LayoutDashboard, Loader2, Settings2, Sliders, Target, Bell } from "lucide-react"
import { useNovaFin } from "@/hooks/use-novafin"
import { OnboardingWizard } from "@/components/novafin/onboarding-wizard"
import { ResumenTab } from "@/components/novafin/resumen-tab"
import { ConfigTab } from "@/components/novafin/config-tab"
import { ControlTab } from "@/components/novafin/control-tab"
import { MetasTab } from "@/components/novafin/metas-tab"
import { AyudaTab } from "@/components/novafin/ayuda-tab"
import { CalculatorWidget } from "@/components/novafin/calculator"
import { cn } from "@/lib/utils"

type TabId = "resumen" | "config" | "control" | "metas" | "ayuda"

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "resumen", label: "Resumen", icon: <LayoutDashboard className="size-4" /> },
  { id: "config", label: "Configuración", icon: <Settings2 className="size-4" /> },
  { id: "control", label: "Control mensual", icon: <Sliders className="size-4" /> },
  { id: "metas", label: "Metas", icon: <Target className="size-4" /> },
  { id: "ayuda", label: "Ayuda", icon: <HelpCircle className="size-4" /> },
]

export default function Page() {
  const nf = useNovaFin()
  const [tab, setTab] = useState<TabId>("resumen")

  if (!nf.loaded) {
    return (
      <main className="grid min-h-screen place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    )
  }

  if (!nf.onboarded) {
    return <OnboardingWizard onComplete={nf.completeOnboarding} />
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header Edge-to-Edge */}
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-20 w-full max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
          
          {/* Left: Branding Logo */}
          <div className="flex items-center gap-3">
            <img 
              src="/logo-novafin.png" 
              alt="NovaFin Simulador" 
              className="h-12 w-auto object-contain sm:h-14 lg:h-16" 
            />
          </div>

          {/* Center: Tabs Desktop */}
          <nav className="hidden scrollbar-none md:flex items-center gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "inline-flex h-20 items-center gap-1.5 whitespace-nowrap border-b-2 px-4 text-sm font-medium transition-colors",
                  tab === t.id
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </nav>

          {/* Right: Usuario y Status */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-semibold text-foreground">Admin</span>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                {nf.saveState === "saving" ? (
                  <>
                    <Loader2 className="size-3 animate-spin" /> guardando
                  </>
                ) : nf.saveState === "saved" ? (
                  <>
                    guardado <Check className="size-3 text-primary" />
                  </>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-3 border-l border-border/50 pl-4">
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                <Bell className="size-5" />
              </button>
              <img 
                src="/logo-perfil.png" 
                alt="Perfil" 
                className="size-9 rounded-full object-cover ring-2 ring-primary/20 aspect-square" 
              />
            </div>
          </div>
        </div>
      </header>

      {/* Tabs Mobile */}
      <nav className="md:hidden flex scrollbar-none overflow-x-auto border-b border-border bg-background/50 px-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "inline-flex h-12 items-center gap-1.5 whitespace-nowrap border-b-2 px-4 text-xs font-medium transition-colors",
              tab === t.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </nav>

      {/* Main Container para el body */}
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 flex-1">
      <section className="py-6">
        {tab === "resumen" && <ResumenTab config={nf.config} proyeccion={nf.proyeccion} metas={nf.metas} />}
        {tab === "config" && <ConfigTab config={nf.config} setConfig={nf.setConfig} onReset={nf.resetAll} />}
        {tab === "control" && (
          <ControlTab
            config={nf.config}
            proyeccion={nf.proyeccion}
            gastosPorMes={nf.gastosPorMes}
            setGastosPorMes={nf.setGastosPorMes}
            ajustesAhorro={nf.ajustesAhorro}
            setAjustesAhorro={nf.setAjustesAhorro}
            saldosRealesAhorro={nf.saldosRealesAhorro}
            setSaldosRealesAhorro={nf.setSaldosRealesAhorro}
            saldosRealesGastos={nf.saldosRealesGastos}
            setSaldosRealesGastos={nf.setSaldosRealesGastos}
            ingresosPorMes={nf.ingresosPorMes}
            setIngresosPorMes={nf.setIngresosPorMes}
            transferenciasPorMes={nf.transferenciasPorMes}
            setTransferenciasPorMes={nf.setTransferenciasPorMes}
          />
        )}
        {tab === "metas" && (
          <MetasTab
            config={nf.config}
            proyeccion={nf.proyeccion}
            metas={nf.metas}
            setMetas={nf.setMetas}
            gastosPorMes={nf.gastosPorMes}
          />
        )}
        {tab === "ayuda" && <AyudaTab />}
      </section>

      {/* Footer */}
      <footer className="mt-auto w-full border-t border-border pt-6 pb-4 text-center">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
          Diseñado y desarrollado por <strong className="text-foreground">Ing. Mateo Pilco</strong>
        </p>
      </footer>

      {/* Floating Global Widgets */}
      <CalculatorWidget />
    </main>
    </div>
  )
}
