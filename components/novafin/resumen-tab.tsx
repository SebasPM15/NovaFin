"use client"

import { useMemo } from "react"
import { Banknote, Cake, PiggyBank, ShoppingBag, Target, TrendingUp, Wallet } from "lucide-react"
import {
  type Config,
  type Cuenta,
  type Fila,
  type Meta,
  compareKeys,
  fmt,
  monthLabel,
  nowKey,
  primerMesQueAlcanza,
} from "@/lib/finance"
import { ProjectionChart } from "./projection-chart"
import { Panel } from "./ui-kit"
import { cn } from "@/lib/utils"

function iconForCuenta(tipo: Cuenta["tipo"]) {
  if (tipo === "ahorro") return <PiggyBank className="size-4" />
  if (tipo === "gastos") return <Wallet className="size-4" />
  return <Banknote className="size-4" />
}

function toneForCuenta(tipo: Cuenta["tipo"]) {
  if (tipo === "ahorro") return "ahorro" as const
  if (tipo === "gastos") return "gastos" as const
  return "general" as const
}

export function ResumenTab({
  config,
  proyeccion,
  metas,
}: {
  config: Config
  proyeccion: Fila[]
  metas: Meta[]
}) {
  const ultimaFila = proyeccion[proyeccion.length - 1]
  const currentMonthKey = nowKey()

  let filaActual = proyeccion.find((f) => f.mes === currentMonthKey)
  if (!filaActual) {
    if (compareKeys(currentMonthKey, config.mesInicio) < 0) {
      filaActual = {
        mes: config.mesInicio,
        ahorroAcumulado: config.ahorroActual,
        gastosAcumulado: config.gastosActual,
        label: "Inicio",
      } as Fila
    } else {
      filaActual = ultimaFila
    }
  }

  const metasPendientes = metas.filter((m) => !m.comprado)

  const proximaMeta = useMemo(() => {
    let mejor: { meta: Meta; mes: string } | null = null
    for (const m of metasPendientes) {
      const mes = primerMesQueAlcanza(proyeccion, m.precio)
      if (mes && (!mejor || compareKeys(mes, mejor.mes) < 0)) mejor = { meta: m, mes }
    }
    return mejor
  }, [metasPendientes, proyeccion])

  const metasAlcanzablesPorMes: Record<string, Meta[]> = {}
  metasPendientes.forEach((m) => {
    const mes = primerMesQueAlcanza(proyeccion, m.precio)
    if (mes) (metasAlcanzablesPorMes[mes] ||= []).push(m)
  })

  const metasCompradasPorMes: Record<string, Meta[]> = {}
  metas
    .filter((m) => m.comprado && m.mesComprado)
    .forEach((m) => (metasCompradasPorMes[m.mesComprado as string] ||= []).push(m))

  const disponibleMes = config.gastoBase - (config.descuentoActivo ? config.descuentoMonto : 0)

  return (
    <div className="space-y-6">
      {/* Account cards — dynamic per cuenta */}
      <div className={cn("grid grid-cols-1 gap-4", config.cuentas.length > 1 ? "sm:grid-cols-2" : "")}>
        {config.cuentas.map((cuenta) => {
          const saldoCuenta = filaActual?.saldosPorCuenta?.find((s) => s.cuentaId === cuenta.id)
          const saldoActual = saldoCuenta?.saldo ?? (
            cuenta.tipo === "ahorro" ? config.ahorroActual : config.gastosActual
          )
          const ultimaSaldo = ultimaFila?.saldosPorCuenta?.find((s) => s.cuentaId === cuenta.id)
          const tone = toneForCuenta(cuenta.tipo)
          const stats: { label: string; value: number; highlight?: boolean }[] = [
            { label: "Depósito / mes", value: cuenta.depositoFijoMensual || (cuenta.tipo === "ahorro" ? config.ahorroBase : cuenta.tipo === "gastos" ? config.gastoBase : 0) },
            {
              label: `Proyectado (${monthLabel(ultimaFila?.mes || config.mesInicio)})`,
              value: ultimaSaldo?.saldo ?? 0,
              highlight: true,
            },
          ]
          return (
            <AccountCard
              key={cuenta.id}
              tone={tone}
              icon={iconForCuenta(cuenta.tipo)}
              title={cuenta.nombre}
              bigLabel="Saldo actual"
              bigValue={saldoActual}
              stats={stats}
              ahorroVirtual={saldoCuenta?.ahorroVirtual}
              gastosVirtual={saldoCuenta?.gastosVirtual}
              limiteGasto={cuenta.limiteGasto}
            />
          )
        })}
      </div>

      {/* Next goal banner */}
      {proximaMeta && (
        <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
          <Target className="mt-0.5 size-5 shrink-0 text-primary" />
          <p className="text-sm leading-relaxed text-foreground">
            Tu próxima meta alcanzable es <strong>{proximaMeta.meta.nombre}</strong> (
            <span className="tnum">${fmt(proximaMeta.meta.precio)}</span>) — la tendrías cubierta en{" "}
            <strong className="text-primary">{monthLabel(proximaMeta.mes, true)}</strong>.
          </p>
        </div>
      )}

      {/* Chart */}
      <Panel>
        <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
          <TrendingUp className="size-4" />
          Saldo proyectado por cuenta
        </div>
        <ProjectionChart proyeccion={proyeccion} />
      </Panel>

      {/* Ledger table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm tnum min-w-[900px]">
          <thead>
            <tr className="border-b border-border text-left text-[11px] text-muted-foreground">
              <th className="px-3 py-2.5 font-medium">Mes</th>
              <th className="px-3 py-2.5 text-right font-medium text-primary/70">+ Base</th>
              <th className="px-3 py-2.5 text-right font-medium text-primary/70">Ajuste ±</th>
              <th className="px-3 py-2.5 text-right font-medium text-milestone/90">Ingresos</th>
              <th className="px-3 py-2.5 text-right font-medium text-primary/70">- Compras</th>
              <th className="px-3 py-2.5 text-right font-medium text-primary">Saldo Ahorro</th>
              <th className="px-3 py-2.5 text-right font-medium text-accent/70">+ Disp.</th>
              <th className="px-3 py-2.5 text-right font-medium text-destructive/80">- Gastado</th>
              <th className="px-3 py-2.5 text-right font-medium text-accent">Sobrante</th>
            </tr>
          </thead>
          <tbody>
            {proyeccion.map((f, i) => {
              const alcances = metasAlcanzablesPorMes[f.mes] || []
              const compras = metasCompradasPorMes[f.mes] || []
              const esCumple =
                config.fechaNacimiento &&
                config.fechaNacimiento.length >= 7 &&
                f.mes.substring(5, 7) === config.fechaNacimiento.substring(5, 7)
                
              const ingresosAhorro = f.saldosPorCuenta.filter(s => s.ingresoDelMes > 0 && config.cuentas.find(c => c.id === s.cuentaId)?.tipo === "ahorro")
              const ingresosGastos = f.saldosPorCuenta.filter(s => s.ingresoDelMes > 0 && ["gastos", "general"].includes(config.cuentas.find(c => c.id === s.cuentaId)?.tipo || ""))

              return (
                <tr
                  key={f.mes}
                  className={cn(
                    "transition-colors hover:bg-secondary/40",
                    i % 2 === 1 && "bg-secondary/20",
                  )}
                >
                  <td className="whitespace-nowrap px-3 py-2 align-top">
                    <div className="flex items-center gap-1 font-sans capitalize text-foreground">
                      {f.label}
                      {f.tieneRealAhorro && (
                        <span title="Saldo real registrado (Ahorro)" className="text-[10px] text-primary">
                          ★
                        </span>
                      )}
                      {f.tieneRealGastos && (
                        <span title="Sobrante real registrado (Gastos)" className="text-[10px] text-accent">
                          ★
                        </span>
                      )}
                    </div>
                    {(esCumple || alcances.length > 0 || compras.length > 0) && (
                      <div className="mt-1.5 flex flex-col gap-1">
                        {esCumple && (
                          <Tag tone="milestone" icon={<Cake className="size-3" />}>
                            Cumples {Number(f.mes.substring(0, 4)) - Number(config.fechaNacimiento.substring(0, 4))} años
                          </Tag>
                        )}
                        {compras.map((m) => (
                          <Tag key={m.id} tone="neutral" icon={<ShoppingBag className="size-3" />}>
                            Compra: {m.nombre}
                          </Tag>
                        ))}
                        {alcances.map((m) => (
                          <Tag key={m.id} tone="ahorro" icon={<Target className="size-3" />}>
                            Alcanzable: {m.nombre}
                          </Tag>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right align-top text-xs text-primary/50">{fmt(f.depositoBase)}</td>
                  <td
                    className={cn(
                      "px-3 py-2 text-right align-top",
                      f.ajustesDelMes < 0 ? "text-destructive" : f.ajustesDelMes > 0 ? "text-accent" : "text-muted-foreground",
                    )}
                  >
                    {f.ajustesDelMes !== 0 ? fmt(f.ajustesDelMes) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right align-top text-milestone/90 font-medium">
                    {f.ingresosDelMes ? `+${fmt(f.ingresosDelMes)}` : "—"}
                  </td>
                  <td className="px-3 py-2 text-right align-top text-muted-foreground">
                    {f.comprasDelMes ? `-${fmt(f.comprasDelMes)}` : "—"}
                  </td>
                  <td className="border-x border-border/60 bg-primary/[0.06] px-3 py-2 text-right align-top font-medium text-primary">
                    <div>{fmt(f.ahorroAcumulado)}</div>
                    {ingresosAhorro.length > 0 && config.cuentas.length > 1 && (
                      <div className="mt-1 flex flex-col items-end gap-0.5 text-[9px] font-normal leading-[1.1] text-primary/70">
                        {ingresosAhorro.map(s => (
                           <span key={s.cuentaId}>Extra {config.cuentas.find(x => x.id === s.cuentaId)?.nombre}: +{fmt(s.ingresoDelMes)}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right align-top text-xs text-accent/50">{fmt(f.disponibleBase)}</td>
                  <td className="px-3 py-2 text-right align-top text-destructive/90">
                    {f.gastado ? `-${fmt(f.gastado)}` : "—"}
                  </td>
                  <td className="border-l border-border/60 bg-accent/[0.06] px-3 py-2 text-right align-top font-medium text-accent">
                    <div>{fmt(f.gastosAcumulado)}</div>
                    {ingresosGastos.length > 0 && config.cuentas.length > 1 && (
                      <div className="mt-1 flex flex-col items-end gap-0.5 text-[9px] font-normal leading-[1.1] text-accent/70">
                        {ingresosGastos.map(s => (
                           <span key={s.cuentaId}>Extra {config.cuentas.find(x => x.id === s.cuentaId)?.nombre}: +{fmt(s.ingresoDelMes)}</span>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AccountCard({
  tone,
  icon,
  title,
  bigLabel,
  bigValue,
  stats,
  ahorroVirtual,
  gastosVirtual,
  limiteGasto,
}: {
  tone: "ahorro" | "gastos" | "general"
  icon: React.ReactNode
  title: string
  bigLabel: string
  bigValue: number
  stats: { label: string; value: number; highlight?: boolean }[]
  ahorroVirtual?: number
  gastosVirtual?: number
  limiteGasto?: number
}) {
  const colorMap = {
    ahorro: { border: "border-primary/30 bg-primary/[0.04]", text: "text-primary", big: "text-primary" },
    gastos: { border: "border-accent/30 bg-accent/[0.04]", text: "text-accent", big: "text-accent" },
    general: { border: "border-milestone/30 bg-milestone/[0.04]", text: "text-milestone", big: "text-milestone" },
  }[tone]

  return (
    <div className={cn("rounded-xl border p-5", colorMap.border)}>
      <div className={cn("flex items-center gap-2", colorMap.text)}>
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-widest">{title}</span>
      </div>
      <div className="mt-3">
        <div className="text-xs text-muted-foreground">{bigLabel}</div>
        <div className={cn("mt-0.5 font-display text-3xl font-bold tnum", colorMap.big)}>
          ${fmt(bigValue)}
        </div>
      </div>
      {/* Virtual split for single accounts */}
      {ahorroVirtual !== undefined && limiteGasto && limiteGasto > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-border/60 bg-background/30 p-2">
          <div>
            <div className="text-[10px] text-muted-foreground">Ahorro virtual</div>
            <div className="mt-0.5 text-sm font-medium tnum text-primary">${fmt(ahorroVirtual)}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground">Gastable (lím. ${fmt(limiteGasto)})</div>
            <div className="mt-0.5 text-sm font-medium tnum text-accent">${fmt(gastosVirtual ?? 0)}</div>
          </div>
        </div>
      )}
      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/60 pt-3">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="text-[11px] text-muted-foreground">{s.label}</div>
            <div
              className={cn(
                "mt-0.5 text-sm font-medium tnum",
                s.highlight ? colorMap.big : "text-foreground",
              )}
            >
              ${fmt(s.value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Tag({
  tone,
  icon,
  children,
}: {
  tone: "ahorro" | "milestone" | "neutral"
  icon: React.ReactNode
  children: React.ReactNode
}) {
  const styles = {
    ahorro: "border-primary/25 bg-primary/10 text-primary",
    milestone: "border-milestone/30 bg-milestone/10 text-milestone",
    neutral: "border-border bg-secondary/60 text-foreground",
  }[tone]
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-sans font-medium",
        styles,
      )}
    >
      {icon}
      {children}
    </span>
  )
}
