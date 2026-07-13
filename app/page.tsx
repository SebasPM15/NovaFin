"use client"

import { useState } from "react"
import { Check, HelpCircle, LayoutDashboard, Loader2, Settings2, Sliders, Target } from "lucide-react"
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
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-8 sm:px-6">
      {/* Header */}
      <header className="flex items-end justify-between border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
            <span className="font-display text-lg font-extrabold">N</span>
          </span>
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              NovaFin
            </h1>
            <p className="text-sm text-muted-foreground">Simulador de finanzas y metas</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {nf.saveState === "saving" ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              guardando
            </>
          ) : nf.saveState === "saved" ? (
            <>
              <Check className="size-3.5 text-primary" />
              guardado
            </>
          ) : null}
        </div>
      </header>

      {/* Tabs */}
      <nav className="scrollbar-none -mb-px mt-4 flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
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

      {/* Content */}
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
      <footer className="mt-10 border-t border-border pt-6 pb-4 text-center">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
          Diseñado y desarrollado por <strong className="text-foreground">Ing. Mateo Pilco</strong>
        </p>
      </footer>

      {/* Floating Global Widgets */}
      <CalculatorWidget />
    </main>
  )
}
