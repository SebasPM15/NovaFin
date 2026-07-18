"use client"

import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from "react"
import { Plus, Trash2, Wallet, PiggyBank, Banknote, TrendingUp, ArrowRightLeft, AlertTriangle } from "lucide-react"
import {
  type AjustesAhorro,
  type Config,
  type Cuenta,
  type Fila,
  type GastosPorMes,
  type IngresoExtra,
  type IngresosPorMes,
  type SaldosReales,
  type TransferenciasPorMes,
  fmt, monthLabel, uid, cuentaGastosId, cuentaAhorroId,
} from "@/lib/finance"
import { Field, MoneyInput, Segmented, TextInput, parseDecimal, toneFromTipo } from "./ui-kit"
import { cn } from "@/lib/utils"

// ── Helpers ───────────────────────────────────────────────────────────────────
function cuentaColor(cuenta: Cuenta) {
  if (cuenta.tipo === "ahorro") return "text-primary border-primary/30 bg-primary/5"
  if (cuenta.tipo === "gastos") return "text-accent border-accent/30 bg-accent/5"
  return "text-milestone border-milestone/30 bg-milestone/5"
}

function cuentaIcon(cuenta: Cuenta) {
  if (cuenta.tipo === "ahorro") return <PiggyBank className="size-4" />
  if (cuenta.tipo === "gastos") return <Wallet className="size-4" />
  return <Banknote className="size-4" />
}

// ── Income panel ─────────────────────────────────────────────────────────────
function IngresosPanel({
  mes,
  cuentas,
  ingresosPorMes,
  setIngresosPorMes,
}: {
  mes: string
  cuentas: Cuenta[]
  ingresosPorMes: IngresosPorMes
  setIngresosPorMes: Dispatch<SetStateAction<IngresosPorMes>>
}) {
  const ingresos = ingresosPorMes[mes] || []

  const [concepto, setConcepto] = useState("")
  const [montoTotal, setMontoTotal] = useState("")
  const [distribucion, setDistribucion] = useState<Record<string, string>>(() => {
    const d: Record<string, string> = {}
    cuentas.forEach((c) => (d[c.id] = ""))
    return d
  })
  const [error, setError] = useState("")

  // Reset distribucion keys when cuentas change
  useEffect(() => {
    setDistribucion((prev: Record<string, string>) => {
      const d: Record<string, string> = {}
      cuentas.forEach((c) => (d[c.id] = prev[c.id] ?? ""))
      return d
    })
  }, [cuentas])

  const total = parseDecimal(montoTotal) || 0
  const sumaDist = Object.values(distribucion).reduce((sum, val) => sum + (parseDecimal(val) || 0), 0)
  const distribOk = total > 0 && Math.abs(sumaDist - total) < 0.01

  const agregar = () => {
    if (!concepto.trim()) return setError("Ponle un nombre al ingreso.")
    if (!total || total <= 0) return setError("El monto total debe ser mayor a 0.")
    if (!distribOk) return setError(`La distribución (${fmt(sumaDist)}) debe sumar exactamente ${fmt(total)}.`)

    const isSingle = cuentas.length === 1
    const dist = isSingle 
      ? [{ cuentaId: cuentas[0].id, monto: total }]
      : cuentas
          .map((c) => ({ cuentaId: c.id, monto: parseDecimal(distribucion[c.id]) || 0 }))
          .filter((d) => d.monto !== 0)

    const nuevo: IngresoExtra = { id: uid(), concepto: concepto.trim(), montoTotal: total, distribucion: dist }
    setIngresosPorMes((prev: IngresosPorMes) => ({ ...prev, [mes]: [...(prev[mes] || []), nuevo] }))
    setConcepto("")
    setMontoTotal("")
    setDistribucion(Object.fromEntries(cuentas.map((c) => [c.id, ""])))
    setError("")
  }

  const borrar = (id: string) =>
    setIngresosPorMes((prev: IngresosPorMes) => ({ ...prev, [mes]: (prev[mes] || []).filter((i: IngresoExtra) => i.id !== id) }))

  return (
    <div className="space-y-4 rounded-xl border border-milestone/25 bg-milestone/[0.03] p-5">
      <div className="flex flex-col gap-1 items-start">
        <div className="flex items-center gap-2 text-milestone">
          <TrendingUp className="size-4" />
          <span className="text-[11px] font-semibold uppercase tracking-widest">
            Ingresos extra del mes ({monthLabel(mes, true)})
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground/70">
          {cuentas.length === 1 ? "(Se sumará directamente a tu cuenta)" : "(distribuibles entre tus cuentas)"}
        </span>
      </div>

      {/* List */}
      <div className="min-h-[72px] divide-y divide-border rounded-lg border border-border">
        {ingresos.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground/60">Sin ingresos extra registrados</div>
        )}
        {ingresos.map((ing) => (
          <div key={ing.id} className="flex items-start justify-between px-3 py-2.5 text-sm hover:bg-secondary/30 transition-colors">
            <div>
              <div className="font-medium text-foreground/90">{ing.concepto}</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {ing.distribucion.map((d) => {
                  const cuenta = cuentas.find((c) => c.id === d.cuentaId)
                  return (
                    <span
                      key={d.cuentaId}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
                        cuenta ? cuentaColor(cuenta) : "text-muted-foreground border-border",
                      )}
                    >
                      {cuenta?.nombre ?? d.cuentaId}: +${fmt(d.monto)}
                    </span>
                  )
                })}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3 pl-2">
              <span className="tnum text-milestone font-medium">+${fmt(ing.montoTotal)}</span>
              <button
                type="button"
                onClick={() => borrar(ing.id)}
                aria-label={`Borrar ${ing.concepto}`}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Form */}
      <div className="space-y-3 rounded-lg border border-border bg-background/50 p-3">
        <TextInput
          value={concepto}
          onChange={setConcepto}
          placeholder="Concepto (ej. Décimo tercero)"
          onEnter={agregar}
        />
        <Field label="Monto total del ingreso">
          <MoneyInput
            value={montoTotal}
            onChange={(v) => {
              setMontoTotal(v)
              const newTotal = parseDecimal(v) || 0
              if (cuentas.length > 1) {
                setDistribucion((prev: Record<string, string>) => {
                  const next = { ...prev }
                  const lastIdx = cuentas.length - 1
                  const sumOthers = cuentas
                    .slice(0, lastIdx)
                    .reduce((s, x) => s + (parseDecimal(next[x.id]) || 0), 0)
                  const restante = Math.max(newTotal - sumOthers, 0)
                  next[cuentas[lastIdx].id] = restante > 0 ? String(restante) : ""
                  return next
                })
              }
            }}
            placeholder="0,00"
            onEnter={agregar}
          />
        </Field>

        {total > 0 && cuentas.length > 1 && (
          <div className="space-y-2 pt-2 border-t border-border/50">
            <div className="text-[11px] text-muted-foreground font-medium">
              Distribución entre cuentas — quedan: <span className={cn("tnum font-semibold", distribOk ? "text-primary" : "text-destructive")}>${fmt(total - sumaDist)}</span>
            </div>
            {cuentas.map((c) => (
              <div key={c.id} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                <span className={cn("flex max-w-full items-center gap-1.5 truncate rounded-md border px-2 py-1.5 text-[11px] font-medium sm:max-w-[40%] sm:shrink-0 sm:min-w-28", cuentaColor(c))}>
                  {cuentaIcon(c)}
                  <span className="truncate">{c.nombre || "General"}</span>
                </span>
                <MoneyInput
                  tone={toneFromTipo(c.tipo)}
                  className="w-full sm:flex-1"
                  value={distribucion[c.id] ?? ""}
                  onChange={(v) => {
                    const idx = cuentas.findIndex((x) => x.id === c.id)
                    const lastIdx = cuentas.length - 1
                    setDistribucion((prev: Record<string, string>) => {
                      const next = { ...prev, [c.id]: v }
                      if (idx !== lastIdx && lastIdx >= 0) {
                        const sumOthers = cuentas
                          .slice(0, lastIdx)
                          .reduce((s, x) => s + (parseDecimal(next[x.id]) || 0), 0)
                        const restante = Math.max(total - sumOthers, 0)
                        next[cuentas[lastIdx].id] = restante > 0 ? String(restante) : ""
                      }
                      return next
                    })
                  }}
                  placeholder="0,00"
                  onEnter={agregar}
                />
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-xs text-destructive mt-1">{error}</p>}

        <button
          type="button"
          onClick={agregar}
          disabled={total > 0 && cuentas.length > 1 && !distribOk}
          className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg bg-milestone px-3 py-2 text-sm font-medium text-black/80 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="size-4" />
          Registrar ingreso
        </button>
      </div>
    </div>
  )
}

// ── Transfers panel ──────────────────────────────────────────────────────────
function TransferenciasPanel({
  mes,
  cuentas,
  transferenciasPorMes,
  setTransferenciasPorMes,
  saldosRealesAhorro,
  saldosRealesGastos,
  fila,
}: {
  mes: string
  cuentas: Cuenta[]
  transferenciasPorMes: TransferenciasPorMes
  setTransferenciasPorMes: Dispatch<SetStateAction<TransferenciasPorMes>>
  saldosRealesAhorro: SaldosReales
  saldosRealesGastos: SaldosReales
  fila: Fila | undefined
}) {
  const transferencias = transferenciasPorMes[mes] || []

  const [origen, setOrigen] = useState(cuentas[0]?.id ?? "")
  const [destino, setDestino] = useState(cuentas[1]?.id ?? cuentas[0]?.id ?? "")
  const [concepto, setConcepto] = useState("")
  const [monto, setMonto] = useState("")
  const [error, setError] = useState("")

  // Ensure destino != origen when origen changes
  useEffect(() => {
    if (destino === origen) {
      const alt = cuentas.find((c) => c.id !== origen)
      if (alt) setDestino(alt.id)
    }
  }, [origen, cuentas, destino])

  const agregar = () => {
    const m = parseDecimal(monto)
    if (!m || m <= 0) return setError("El monto debe ser mayor a 0.")
    if (origen === destino) return setError("Origen y destino deben ser distintos.")
    setTransferenciasPorMes((prev) => ({
      ...prev,
      [mes]: [
        ...(prev[mes] || []),
        {
          id: uid(),
          concepto: concepto.trim() || "Transferencia",
          monto: m,
          cuentaOrigenId: origen,
          cuentaDestinoId: destino,
        },
      ],
    }))
    setConcepto("")
    setMonto("")
    setError("")
  }
  const borrar = (id: string) =>
    setTransferenciasPorMes((prev) => ({ ...prev, [mes]: (prev[mes] || []).filter((t) => t.id !== id) }))

  // Cierre Real warning (scoped to dual mode only per spec §3a)
  const cierreOrigenSellado = origen === "ahorro" && saldosRealesAhorro[mes] !== undefined && saldosRealesAhorro[mes] !== ""
  const cierreDestinoSellado = destino === "gastos" && saldosRealesGastos[mes] !== undefined && saldosRealesGastos[mes] !== ""
  const cierreDestinoSellado2 = destino === "ahorro" && saldosRealesAhorro[mes] !== undefined && saldosRealesAhorro[mes] !== ""
  const cierreOrigenSellado2 = origen === "gastos" && saldosRealesGastos[mes] !== undefined && saldosRealesGastos[mes] !== ""
  const hasCierreWarning = cierreOrigenSellado || cierreDestinoSellado || cierreDestinoSellado2 || cierreOrigenSellado2

  const cuentaSellada = cierreOrigenSellado || cierreOrigenSellado2
    ? cuentas.find((c) => c.id === origen)?.nombre ?? origen
    : cuentas.find((c) => c.id === destino)?.nombre ?? destino

  return (
    <div className="space-y-4 rounded-xl border border-milestone/25 bg-milestone/[0.03] p-5">
      <div className="flex flex-col gap-1 items-start">
        <div className="flex items-center gap-2 text-milestone">
          <ArrowRightLeft className="size-4" />
          <span className="text-[11px] font-semibold uppercase tracking-widest">Transferencias</span>
        </div>
        <span className="text-[10px] text-muted-foreground/70">Mueve dinero entre tus cuentas sin salirte del sistema.</span>
      </div>

      {/* List */}
      <div className="min-h-[64px] divide-y divide-border rounded-lg border border-border">
        {transferencias.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground/60">Sin transferencias</div>
        )}
        {transferencias.map((t) => {
          const cOrig = cuentas.find((c) => c.id === t.cuentaOrigenId)
          const cDest = cuentas.find((c) => c.id === t.cuentaDestinoId)
          return (
            <div key={t.id} className="flex items-center justify-between px-3 py-2.5 text-sm hover:bg-secondary/30 transition-colors">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium shrink-0", cOrig ? cuentaColor(cOrig) : "text-muted-foreground border-border")}>
                  {cOrig?.nombre ?? t.cuentaOrigenId}
                </span>
                <span className="text-muted-foreground text-xs">→</span>
                <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium shrink-0", cDest ? cuentaColor(cDest) : "text-muted-foreground border-border")}>
                  {cDest?.nombre ?? t.cuentaDestinoId}
                </span>
                {t.concepto !== "Transferencia" && (
                  <span className="text-muted-foreground/70 text-xs truncate ml-1">({t.concepto})</span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-3 pl-2">
                <span className="tnum text-milestone font-medium">${fmt(t.monto)}</span>
                <button
                  type="button"
                  onClick={() => borrar(t.id)}
                  aria-label={`Borrar transferencia ${t.concepto}`}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Form */}
      <div className="space-y-3 rounded-lg border border-border bg-background/50 p-3">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Origen">
            <select
              value={origen}
              onChange={(e) => setOrigen(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-ring min-w-0"
            >
              {cuentas.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </Field>
          <Field label="Destino">
            <select
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-ring min-w-0"
            >
              {cuentas.filter((c) => c.id !== origen).map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </Field>
        </div>
        <TextInput
          value={concepto}
          onChange={setConcepto}
          placeholder="Concepto (opcional)"
          onEnter={agregar}
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <MoneyInput
            className="w-full sm:flex-1"
            value={monto}
            onChange={setMonto}
            placeholder="Monto"
            onEnter={agregar}
          />
          <button
            type="button"
            onClick={agregar}
            className="inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-lg bg-milestone px-3 py-2.5 text-sm font-medium text-black/80 transition-opacity hover:opacity-90 sm:min-h-0 sm:w-auto sm:py-2"
          >
            <ArrowRightLeft className="size-4" />
            Transferir
          </button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}

        {hasCierreWarning && (
          <div className="flex items-start gap-2 rounded-md border border-yellow-600/30 bg-yellow-600/5 px-3 py-2">
            <AlertTriangle className="size-4 shrink-0 text-yellow-500 mt-0.5" />
            <p className="text-[11px] leading-relaxed text-yellow-200/80">
              Este mes ya tiene un <strong>Cierre Real</strong> sellado en <strong>{cuentaSellada}</strong>. La transferencia se registrará, pero no cambiará el saldo mostrado de {monthLabel(mes)} hasta que ajustes o borres ese cierre.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main ControlTab ───────────────────────────────────────────────────────────
export function ControlTab({
  config,
  proyeccion,
  gastosPorMes,
  setGastosPorMes,
  ajustesAhorro,
  setAjustesAhorro,
  saldosRealesAhorro,
  setSaldosRealesAhorro,
  saldosRealesGastos,
  setSaldosRealesGastos,
  ingresosPorMes,
  setIngresosPorMes,
  transferenciasPorMes,
  setTransferenciasPorMes,
}: {
  config: Config
  proyeccion: Fila[]
  gastosPorMes: GastosPorMes
  setGastosPorMes: Dispatch<SetStateAction<GastosPorMes>>
  ajustesAhorro: AjustesAhorro
  setAjustesAhorro: Dispatch<SetStateAction<AjustesAhorro>>
  saldosRealesAhorro: SaldosReales
  setSaldosRealesAhorro: Dispatch<SetStateAction<SaldosReales>>
  saldosRealesGastos: SaldosReales
  setSaldosRealesGastos: Dispatch<SetStateAction<SaldosReales>>
  ingresosPorMes: IngresosPorMes
  setIngresosPorMes: Dispatch<SetStateAction<IngresosPorMes>>
  transferenciasPorMes: TransferenciasPorMes
  setTransferenciasPorMes: Dispatch<SetStateAction<TransferenciasPorMes>>
}) {
  const [mes, setMes] = useState(config.mesInicio)
  useEffect(() => {
    if (!proyeccion.find((f) => f.mes === mes)) setMes(config.mesInicio)
  }, [proyeccion, config.mesInicio, mes])

  const fila = useMemo(() => proyeccion.find((f) => f.mes === mes) || proyeccion[0], [proyeccion, mes])

  // Determine which accounts to use for gastos/ajustes panels
  const cuentaGastosDefault = cuentaGastosId(config.cuentas)
  const cuentaAhorroDefault = cuentaAhorroId(config.cuentas)

  const isSingle = config.cuentas.length === 1

  // ── Gastos ──
  const [cuentaGastosSeleccionada, setCuentaGastosSeleccionada] = useState(cuentaGastosDefault)
  const gastos = (gastosPorMes[mes] || []).filter((g) => g.cuentaId === cuentaGastosSeleccionada)
  const saldoCuenta = fila?.saldosPorCuenta.find((s) => s.cuentaId === cuentaGastosSeleccionada)
  
  // El disponible real es TODO el dinero en la cuenta antes de restarle los gastos del mes.
  const usado = saldoCuenta ? saldoCuenta.gastoDelMes : gastos.reduce((s: number, g) => s + (Number(g.monto) || 0), 0)
  const restante = saldoCuenta ? saldoCuenta.saldo : (fila?.disponibleBase ?? 0) - usado
  const disponible = restante + usado

  const [nuevoGasto, setNuevoGasto] = useState({ concepto: "", monto: "" })
  const [errorGasto, setErrorGasto] = useState("")

  const agregarGasto = () => {
    const monto = parseDecimal(nuevoGasto.monto)
    if (!nuevoGasto.concepto.trim()) return setErrorGasto("Ponle un nombre al gasto.")
    if (!monto || monto <= 0) return setErrorGasto("El monto debe ser mayor a 0.")
    if (usado + monto > disponible + 0.001)
      return setErrorGasto(`Te pasas del disponible de ${monthLabel(mes)}. Quedan $${fmt(restante)}.`)
    setGastosPorMes((prev: GastosPorMes) => ({
      ...prev,
      [mes]: [...(prev[mes] || []), { id: uid(), concepto: nuevoGasto.concepto.trim(), monto, cuentaId: cuentaGastosSeleccionada }],
    }))
    setNuevoGasto({ concepto: "", monto: "" })
    setErrorGasto("")
  }
  const borrarGasto = (id: string) =>
    setGastosPorMes((prev: GastosPorMes) => ({ ...prev, [mes]: (prev[mes] || []).filter((g) => g.id !== id) }))

  // ── Ajustes ──
  const [cuentaAjusteSeleccionada, setCuentaAjusteSeleccionada] = useState(cuentaAhorroDefault)
  const ajustes = (ajustesAhorro[mes] || []).filter((a) => a.cuentaId === cuentaAjusteSeleccionada)
  const [nuevoAjuste, setNuevoAjuste] = useState<{ concepto: string; monto: string; tipo: "retiro" | "aporte" }>({
    concepto: "", monto: "", tipo: "retiro",
  })
  const [errorAjuste, setErrorAjuste] = useState("")

  const agregarAjuste = () => {
    const abs = parseDecimal(nuevoAjuste.monto)
    if (!nuevoAjuste.concepto.trim()) return setErrorAjuste("Ponle un nombre al retiro/aporte.")
    if (!abs || abs <= 0) return setErrorAjuste("El monto debe ser mayor a 0.")
    const monto = nuevoAjuste.tipo === "retiro" ? -abs : abs
    setAjustesAhorro((prev: AjustesAhorro) => ({
      ...prev,
      [mes]: [...(prev[mes] || []), { id: uid(), concepto: nuevoAjuste.concepto.trim(), monto, cuentaId: cuentaAjusteSeleccionada }],
    }))
    setNuevoAjuste({ concepto: "", monto: "", tipo: "retiro" })
    setErrorAjuste("")
  }
  const borrarAjuste = (id: string) =>
    setAjustesAhorro((prev: AjustesAhorro) => ({ ...prev, [mes]: (prev[mes] || []).filter((g) => g.id !== id) }))

  const cuentasGastosOpciones = config.cuentas.filter((c) => c.tipo === "gastos" || c.tipo === "general")
  const cuentasAhorroOpciones = config.cuentas.filter((c) => c.tipo === "ahorro" || c.tipo === "general")
  const cuentaGastosActiva = config.cuentas.find((c) => c.id === cuentaGastosSeleccionada) ?? config.cuentas[0]
  const cuentaAjusteActiva = config.cuentas.find((c) => c.id === cuentaAjusteSeleccionada) ?? config.cuentas[0]

  return (
    <div className="space-y-6">
      {/* Month selector */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card/60 px-4 py-3">
        <span className="text-sm text-muted-foreground">Registrando el mes de:</span>
        <select
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-medium capitalize text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        >
          {proyeccion.map((f) => (
            <option key={f.mes} value={f.mes}>{f.label}</option>
          ))}
        </select>
      </div>

      <div className={cn("grid grid-cols-1 gap-6", isSingle ? "lg:grid-cols-1 max-w-xl mx-auto" : "lg:grid-cols-2")}>
        {/* ── Gastos panel ── */}
        <div className="space-y-4 rounded-xl border border-accent/25 bg-accent/[0.03] p-5">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1 items-start">
              <div className="flex items-center gap-2 text-accent">
                <Wallet className="size-4" />
                <span className="text-[11px] font-semibold uppercase tracking-widest">Gastos del mes</span>
              </div>
              <span className="text-[10px] text-muted-foreground/70">Registra compras habituales y pagos.</span>
            </div>
            {config.cuentas.length > 1 && cuentasGastosOpciones.length > 1 && (
              <select
                value={cuentaGastosSeleccionada}
                onChange={(e) => setCuentaGastosSeleccionada(e.target.value)}
                className="rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-ring"
              >
                {cuentasGastosOpciones.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3">
            <MiniStat label="Restante" value={restante} tone={restante < 0 ? "danger" : "gastos"} />
          </div>

          <div className="min-h-[96px] divide-y divide-border rounded-lg border border-border">
            {gastos.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground/60">Sin gastos registrados</div>
            )}
            {gastos.map((g) => (
              <Row key={g.id} concepto={g.concepto} monto={`-$${fmt(g.monto)}`} tone="danger" onDelete={() => borrarGasto(g.id)} />
            ))}
          </div>

          {/* Read-only transfer chips */}
          <TransferChips cuentaId={cuentaGastosSeleccionada} mes={mes} transferenciasPorMes={transferenciasPorMes} cuentas={config.cuentas} />

          <div className="space-y-2 rounded-lg border border-border bg-background/50 p-3">
            <TextInput
              value={nuevoGasto.concepto}
              onChange={(v) => setNuevoGasto({ ...nuevoGasto, concepto: v })}
              placeholder="Concepto (ej. mercado)"
              onEnter={agregarGasto}
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <MoneyInput
                tone="gastos"
                className="w-full sm:flex-1"
                value={nuevoGasto.monto}
                onChange={(v) => setNuevoGasto({ ...nuevoGasto, monto: v })}
                placeholder="Monto"
                onEnter={agregarGasto}
              />
              <button
                type="button"
                onClick={agregarGasto}
                className="inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-lg bg-accent px-3 py-2.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 sm:min-h-0 sm:w-auto sm:py-2"
              >
                <Plus className="size-4" />
                Añadir
              </button>
            </div>
            {errorGasto && <p className="text-xs text-destructive">{errorGasto}</p>}
          </div>

          <CierreReal
            tone="gastos"
            value={saldosRealesGastos[mes]}
            proyectado={fila?.gastosAcumulado || 0}
            onChange={(v) => setSaldosRealesGastos({ ...saldosRealesGastos, [mes]: v })}
            onClear={() => {
              const ns = { ...saldosRealesGastos }
              delete ns[mes]
              setSaldosRealesGastos(ns)
            }}
            hint="Si registras el sobrante real con el que cerraste, corrige la proyección de Gastos desde el mes siguiente."
          />
        </div>

        {/* ── Ajustes panel ── */}
        {!isSingle && (
        <div className="space-y-4 rounded-xl border border-primary/25 bg-primary/[0.03] p-5">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1 items-start">
              <div className="flex items-center gap-2 text-primary">
                <PiggyBank className="size-4" />
                <span className="text-[11px] font-semibold uppercase tracking-widest">Retiros y Emergencias</span>
              </div>
              <span className="text-[10px] text-muted-foreground/70">Ajustes directos a tu capital o ahorros.</span>
            </div>
            {config.cuentas.length > 1 && cuentasAhorroOpciones.length > 1 && (
              <select
                value={cuentaAjusteSeleccionada}
                onChange={(e) => setCuentaAjusteSeleccionada(e.target.value)}
                className="rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-ring"
              >
                {cuentasAhorroOpciones.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3">
            <MiniStat label="Total del mes" value={fila?.saldosPorCuenta.find(s => s.cuentaId === cuentaAjusteSeleccionada)?.saldo ?? fila?.ahorroAcumulado ?? 0} tone="ahorro" />
          </div>

          <div className="min-h-[96px] divide-y divide-border rounded-lg border border-border">
            {ajustes.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground/60">Sin retiros ni aportes extra</div>
            )}
            {ajustes.map((g) => (
              <Row
                key={g.id}
                concepto={g.concepto}
                monto={`${g.monto > 0 ? "+" : ""}$${fmt(Math.abs(g.monto))}`}
                tone={g.monto < 0 ? "danger" : "ahorro"}
                onDelete={() => borrarAjuste(g.id)}
              />
            ))}
          </div>

          {/* Read-only transfer chips */}
          <TransferChips cuentaId={cuentaAjusteSeleccionada} mes={mes} transferenciasPorMes={transferenciasPorMes} cuentas={config.cuentas} />

          <div className="space-y-2 rounded-lg border border-border bg-background/50 p-3">
            <TextInput
              value={nuevoAjuste.concepto}
              onChange={(v) => setNuevoAjuste({ ...nuevoAjuste, concepto: v })}
              placeholder="Motivo (ej. Navidad)"
              onEnter={agregarAjuste}
            />
            <div className="flex flex-col gap-2">
              <Segmented
                className="flex w-full"
                value={nuevoAjuste.tipo}
                onChange={(t) => setNuevoAjuste({ ...nuevoAjuste, tipo: t })}
                options={[
                  { value: "retiro", label: "Retiro" },
                  { value: "aporte", label: "Aporte" },
                ]}
              />
              <div className="flex gap-2">
                <MoneyInput
                  tone="ahorro"
                  className="min-w-0 flex-1"
                  value={nuevoAjuste.monto}
                  onChange={(v) => setNuevoAjuste({ ...nuevoAjuste, monto: v })}
                  placeholder="Monto"
                  onEnter={agregarAjuste}
                />
                <button
                  type="button"
                  onClick={agregarAjuste}
                  aria-label="Registrar ajuste"
                  className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1 rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 sm:min-h-0 sm:py-2"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>
            {errorAjuste && <p className="text-xs text-destructive">{errorAjuste}</p>}
          </div>

          <CierreReal
            tone="ahorro"
            value={saldosRealesAhorro[mes]}
            proyectado={fila?.ahorroAcumulado || 0}
            onChange={(v) => setSaldosRealesAhorro({ ...saldosRealesAhorro, [mes]: v })}
            onClear={() => {
              const ns = { ...saldosRealesAhorro }
              delete ns[mes]
              setSaldosRealesAhorro(ns)
            }}
            hint="Si defines el cierre real de Ahorro, será el punto de partida del mes siguiente."
          />
        </div>
        )}

        {/* ── Row 2 ── */}
        <IngresosPanel
          mes={mes}
          cuentas={config.cuentas}
          ingresosPorMes={ingresosPorMes}
          setIngresosPorMes={setIngresosPorMes}
        />

        {!isSingle && (
          <TransferenciasPanel
            mes={mes}
            cuentas={config.cuentas}
            transferenciasPorMes={transferenciasPorMes}
            setTransferenciasPorMes={setTransferenciasPorMes}
            saldosRealesAhorro={saldosRealesAhorro}
            saldosRealesGastos={saldosRealesGastos}
            fila={fila}
          />
        )}
      </div>
    </div>
  )
}

// ── Transfer chips (read-only, inside Gastos / Ahorro panels) ────────────────
function TransferChips({
  cuentaId,
  mes,
  transferenciasPorMes,
  cuentas,
}: {
  cuentaId: string
  mes: string
  transferenciasPorMes: TransferenciasPorMes
  cuentas: Cuenta[]
}) {
  const transfers = (transferenciasPorMes[mes] || []).filter(
    (t) => t.cuentaOrigenId === cuentaId || t.cuentaDestinoId === cuentaId,
  )
  if (transfers.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {transfers.map((t) => {
        const isOutgoing = t.cuentaOrigenId === cuentaId
        const otherAccountId = isOutgoing ? t.cuentaDestinoId : t.cuentaOrigenId
        const otherAccount = cuentas.find((c) => c.id === otherAccountId)
        const arrow = isOutgoing ? "→" : "←"
        const sign = isOutgoing ? "-" : "+"
        const color = isOutgoing
          ? "text-destructive/80 border-destructive/20 bg-destructive/5"
          : "text-primary/80 border-primary/20 bg-primary/5"
        return (
          <span
            key={t.id}
            className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium", color)}
          >
            {arrow} {otherAccount?.nombre ?? otherAccountId}: {sign}${fmt(t.monto)}
          </span>
        )
      })}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────
function MiniStat({ label, value, tone }: { label: string; value: number; tone: "ahorro" | "gastos" | "danger" }) {
  const color = tone === "danger" ? "text-destructive" : tone === "ahorro" ? "text-primary" : "text-accent"
  return (
    <div className="rounded-lg border border-border bg-background/40 px-3 py-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 text-lg font-medium tnum", color)}>${fmt(value)}</div>
    </div>
  )
}

function Row({
  concepto, monto, tone, onDelete,
}: {
  concepto: string
  monto: string
  tone: "danger" | "ahorro"
  onDelete: () => void
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-secondary/30">
      <span className="truncate pr-2 text-foreground/90">{concepto}</span>
      <div className="flex shrink-0 items-center gap-3">
        <span className={cn("tnum", tone === "danger" ? "text-destructive" : "text-primary")}>{monto}</span>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Borrar ${concepto}`}
          className="text-muted-foreground transition-colors hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

function CierreReal({
  tone, value, proyectado, onChange, onClear, hint,
}: {
  tone: "ahorro" | "gastos"
  value: string | number | undefined
  proyectado: number
  onChange: (v: string) => void
  onClear: () => void
  hint: string
}) {
  const has = value !== undefined && value !== ""
  return (
    <div className="border-t border-border/60 pt-4">
      <Field label="Cierre real del mes">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <MoneyInput
            tone={tone}
            className="w-full sm:flex-1"
            value={value ?? ""}
            onChange={onChange}
            placeholder={`Proyectado: ${fmt(proyectado)}`}
          />
          {has && (
            <button
              type="button"
              onClick={onClear}
              className="min-h-11 shrink-0 rounded-lg border border-destructive/30 px-3 text-xs text-destructive transition-colors hover:bg-destructive/10 sm:min-h-0"
            >
              Usar proy.
            </button>
          )}
        </div>
      </Field>
      <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground/70">{hint}</p>
    </div>
  )
}
