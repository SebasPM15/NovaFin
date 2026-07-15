"use client"

import { useRef, type Dispatch, type SetStateAction } from "react"
import {
  Banknote, CalendarRange, Check, PiggyBank, Plus, RotateCcw,
  Settings2, Trash2, User, Wallet, DownloadCloud, UploadCloud
} from "lucide-react"
import {
  type Config, type Cuenta, type ModeloCuentas, type ModificadorBase,
  fmt, uid, defaultCuentasForModelo, DEFAULT_SOBRESUELDOS,
} from "@/lib/finance"
import { Field, MoneyInput, Panel, SectionLabel, TextInput, parseDecimal, toneFromTipo } from "./ui-kit"
import { cn } from "@/lib/utils"

// ── Helpers ───────────────────────────────────────────────────────────────────
function iconCuenta(tipo: Cuenta["tipo"]) {
  if (tipo === "ahorro") return <PiggyBank className="size-4" />
  if (tipo === "gastos") return <Wallet className="size-4" />
  return <Banknote className="size-4" />
}

function borderCuenta(tipo: Cuenta["tipo"]) {
  if (tipo === "ahorro") return "border-primary/25 bg-primary/[0.04] text-primary"
  if (tipo === "gastos") return "border-accent/25 bg-accent/[0.04] text-accent"
  return "border-milestone/25 bg-milestone/[0.04] text-milestone"
}

type ModCuentaMonto = { cuentaId: string; monto: number }

function upsertCuentaMonto(cuentas: ModCuentaMonto[], cuentaId: string, monto: number): ModCuentaMonto[] {
  const next = [...cuentas]
  const idx = next.findIndex((x) => x.cuentaId === cuentaId)
  if (idx >= 0) next[idx] = { ...next[idx], monto }
  else next.push({ cuentaId, monto })
  return next
}

function withResidualRedistribution(
  mCuentas: ModCuentaMonto[],
  cuentas: Cuenta[],
  editedIdx: number,
  sueldo: number,
): ModCuentaMonto[] {
  const lastRefIdx = cuentas.length - 1
  if (editedIdx === lastRefIdx || lastRefIdx <= 0) return mCuentas
  const lastId = cuentas[lastRefIdx].id
  const sumOthers = mCuentas
    .filter((x) => x.cuentaId !== lastId)
    .reduce((s, x) => s + (x.monto || 0), 0)
  return upsertCuentaMonto(mCuentas, lastId, Math.max(sueldo - sumOthers, 0))
}

function exportBackup() {
  try {
    const raw = localStorage.getItem("novafin-v2")
    if (!raw) {
      window.alert("No hay datos para exportar.")
      return
    }
    const blob = new Blob([raw], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `NovaFin-Backup-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    setTimeout(() => {
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    }, 100)
  } catch (err) {
    console.error(err)
    window.alert("Error al exportar los datos")
  }
}

async function importBackup(file: File) {
  try {
    const text = await file.text()
    const raw = JSON.parse(text) as Record<string, unknown>

    const payload: Record<string, unknown> | null =
      raw?.config
        ? raw
        : (raw?.state as Record<string, unknown> | undefined)?.config
          ? (raw.state as Record<string, unknown>)
          : null

    if (!payload?.config) {
      window.alert(
        "Archivo JSON inválido o de otro formato.\n\nAsegúrate de importar un archivo exportado desde NovaFin."
      )
      return
    }

    localStorage.setItem("novafin-v2", JSON.stringify(payload))
    window.alert("✅ Datos restaurados correctamente. La app se recargará ahora.")
    window.location.reload()
  } catch (err) {
    console.error(err)
    window.alert("Error procesando el archivo JSON. El archivo puede estar corrupto.")
  }
}

// ── Profile selector ──────────────────────────────────────────────────────────
const PERFILES: { id: ModeloCuentas; icon: React.ReactNode; label: string; desc: string }[] = [
  {
    id: "dual",
    icon: <PiggyBank className="size-4" />,
    label: "Ahorro + Gastos",
    desc: "Dos cuentas separadas — la clásica.",
  },
  {
    id: "single",
    icon: <Wallet className="size-4" />,
    label: "Una sola cuenta",
    desc: "Con límite de gasto mensual opcional.",
  },
  {
    id: "custom",
    icon: <Settings2 className="size-4" />,
    label: "Cuentas personalizadas",
    desc: "Tú defines N cuentas con nombre y tipo.",
  },
]

function ProfileSelector({
  current,
  onChange,
}: Readonly<{
  current: ModeloCuentas
  onChange: (m: ModeloCuentas) => void
}>) {
  const handleChange = (m: ModeloCuentas) => {
    if (m === current) return
    const ok = window.confirm(
      `Cambiar a "${PERFILES.find((p) => p.id === m)?.label}" creará cuentas nuevas por defecto. ¿Continuar?`,
    )
    if (ok) onChange(m)
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {PERFILES.map((p) => {
        const active = p.id === current
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => handleChange(p.id)}
            className={cn(
              "relative flex items-start gap-3 rounded-xl border p-3 text-left transition-all",
              active
                ? "border-primary bg-primary/10 ring-2 ring-primary"
                : "border-border bg-secondary/30 hover:border-primary/40 hover:bg-secondary/50",
            )}
          >
            <div
              className={cn(
                "mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg",
                active ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground",
              )}
            >
              {p.icon}
            </div>
            <div className="min-w-0">
              <div className="text-[12px] font-semibold text-foreground">{p.label}</div>
              <div className="text-[11px] leading-snug text-muted-foreground">{p.desc}</div>
            </div>
            {active && <Check className="absolute right-2.5 top-2.5 size-3.5 text-primary" />}
          </button>
        )
      })}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function ConfigTab({
  config,
  setConfig,
  onReset,
}: Readonly<{
  config: Config
  setConfig: Dispatch<SetStateAction<Config>>
  onReset: () => void
}>) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const set = (patch: Partial<Config>) => setConfig((c) => ({ ...c, ...patch }))

  // Change account model: rebuild cuentas array from template
  const changeModelo = (m: ModeloCuentas) => {
    const cuentas = defaultCuentasForModelo(m)
    set({ modeloCuentas: m, cuentas })
  }

  const sueldoBruto = Number(config.sueldo) || 0
  const sueldoActivoIESS = config.aportaIESS
  const sueldoEfectivo = sueldoActivoIESS ? Math.round(sueldoBruto * 0.9055 * 100) / 100 : sueldoBruto

  // ── Autocomplete deposit for dual mode ──
  // Gastos is always the "last" / residual account
  const handleAhorroBase = (v: string) => {
    const ahorro = parseDecimal(v) || 0
    const gastos = Math.max(sueldoEfectivo - ahorro, 0)
    set({ ahorroBase: ahorro, gastoBase: gastos })
  }
  const handleGastoBase = (v: string) => {
    const gastos = parseDecimal(v) || 0
    const ahorro = Math.max(sueldoEfectivo - gastos, 0)
    set({ gastoBase: gastos, ahorroBase: ahorro })
  }

  // ── Autocomplete deposit for custom mode ──
  // The LAST account always gets the remainder
  const handleDepositoCuenta = (idx: number, v: string) => {
    const nuevasCuentas = [...config.cuentas]
    const monto = Math.max(parseDecimal(v) || 0, 0)
    nuevasCuentas[idx] = { ...nuevasCuentas[idx], depositoFijoMensual: monto }

    const lastIdx = nuevasCuentas.length - 1
    if (idx !== lastIdx) {
      // Sum all except last
      const sumOthers = nuevasCuentas
        .slice(0, lastIdx)
        .reduce((s, c) => s + (Number(c.depositoFijoMensual) || 0), 0)
      const restante = Math.max(sueldoEfectivo - sumOthers, 0)
      nuevasCuentas[lastIdx] = { ...nuevasCuentas[lastIdx], depositoFijoMensual: restante }
    }

    set({ cuentas: nuevasCuentas })
  }

  const patchCuenta = (id: string, patch: Partial<Cuenta>) =>
    set({ cuentas: config.cuentas.map((c) => (c.id === id ? { ...c, ...patch } : c)) })
  const removeCuenta = (id: string) =>
    set({ cuentas: config.cuentas.filter((c) => c.id !== id) })
  const addCuenta = () =>
    set({
      cuentas: [
        ...config.cuentas,
        { id: uid(), nombre: "", tipo: "general", saldoInicial: 0, depositoFijoMensual: 0 },
      ],
    })

  const reparto = config.modeloCuentas === "dual"
    ? (Number(config.ahorroBase) || 0) + (Number(config.gastoBase) || 0)
    : config.cuentas.reduce((s, c) => s + (Number(c.depositoFijoMensual) || 0), 0)
  
  const libre = Math.max(sueldoEfectivo - reparto, 0)
  const excede = sueldoEfectivo > 0 && reparto > sueldoEfectivo + 0.001

  const lastIdx = config.cuentas.length - 1

  return (
    <div className="max-w-2xl space-y-5">
      {/* ── Modelo de cuentas ── */}
      <Panel>
        <div className="mb-3 flex items-center gap-2">
          <Settings2 className="size-4 text-muted-foreground" />
          <SectionLabel>Modelo de cuentas</SectionLabel>
        </div>
        <ProfileSelector current={config.modeloCuentas} onChange={changeModelo} />
      </Panel>

      {/* ── Sueldo ── */}
      <Panel>
        <div className="mb-4 flex items-center gap-2">
          <User className="size-4 text-muted-foreground" />
          <SectionLabel>Ingreso mensual</SectionLabel>
        </div>

        <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-secondary/20">
          <input
            type="checkbox"
            checked={sueldoActivoIESS}
            onChange={(e) => set({ aportaIESS: e.target.checked })}
            className="mt-0.5 size-4 rounded accent-primary cursor-pointer"
          />
          <div className="flex flex-col">
            <span className="text-[13px] font-medium text-foreground">Aporto al IESS (9.45%)</span>
            <span className="text-[11px] text-muted-foreground/80 mt-0.5 leading-relaxed">
              Ingresa el sueldo bruto y NovaFin calculará automáticamente tu sueldo neto para la distribución.
            </span>
          </div>
        </label>

        <Field label={sueldoActivoIESS ? "Sueldo bruto mensual" : "Sueldo mensual"}>
          <MoneyInput value={config.sueldo || ""} onChange={(v) => set({ sueldo: parseDecimal(v) || 0 })} placeholder="0,00" />
        </Field>

        {sueldoActivoIESS && sueldoBruto > 0 && (
          <div className="mt-2 text-[11px] font-medium text-primary bg-primary/10 px-3 py-2 rounded-lg border border-primary/20 flex items-center gap-2">
            <span className="opacity-70 line-through">${fmt(sueldoBruto)}</span> → Neto efectivo: <strong>${fmt(sueldoEfectivo)}</strong>
          </div>
        )}

        {sueldoEfectivo > 0 && config.cuentas.length > 1 && (
          <div className={cn(
            "mt-3 flex items-center justify-between rounded-lg border px-3 py-2 text-[12px]",
            excede
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-border bg-secondary/40 text-muted-foreground",
          )}>
            <span>Distribuido: <span className="tnum font-medium text-foreground">${fmt(reparto)}</span></span>
            <span>Libre: <span className={cn("tnum font-semibold", excede ? "text-destructive" : "text-primary")}>${fmt(libre)}</span></span>
          </div>
        )}
      </Panel>

      {/* ── Dual ── */}
      {config.modeloCuentas === "dual" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-primary/25 bg-primary/[0.04] p-5">
            <div className="mb-4 flex items-center gap-2 text-primary">
              <PiggyBank className="size-4" />
              <SectionLabel tone="ahorro">Cuenta Ahorro</SectionLabel>
            </div>
            <div className="space-y-4">
              <Field label="Depósito fijo mensual" hint={sueldoEfectivo > 0 ? "El resto va automáticamente a Gastos." : undefined}>
                <MoneyInput
                  tone="ahorro"
                  value={config.ahorroBase || ""}
                  onChange={handleAhorroBase}
                  placeholder="0,00"
                />
              </Field>
              <Field label="Saldo inicial">
                <MoneyInput
                  tone="ahorro"
                  value={config.ahorroActual || ""}
                  onChange={(v) => set({ ahorroActual: parseDecimal(v) || 0 })}
                  placeholder="0,00"
                />
              </Field>
            </div>
          </div>

          <div className="rounded-xl border border-accent/25 bg-accent/[0.04] p-5">
            <div className="mb-4 flex items-center gap-2 text-accent">
              <Wallet className="size-4" />
              <SectionLabel tone="gastos">Cuenta Gastos</SectionLabel>
            </div>
            <div className="space-y-4">
              <Field label="Disponible mensual base" hint={sueldoEfectivo > 0 ? "Cambia el de Ahorro para ajustar automáticamente." : undefined}>
                <MoneyInput
                  tone="gastos"
                  value={config.gastoBase || ""}
                  onChange={handleGastoBase}
                  placeholder="0,00"
                />
              </Field>
              <Field label="Sobrante inicial">
                <MoneyInput
                  tone="gastos"
                  value={config.gastosActual || ""}
                  onChange={(v) => set({ gastosActual: parseDecimal(v) || 0 })}
                  placeholder="0,00"
                />
              </Field>
            </div>
          </div>
        </div>
      )}

      {/* ── Single ── */}
      {config.modeloCuentas === "single" && config.cuentas.length > 0 && (
        <div className="rounded-xl border border-milestone/25 bg-milestone/[0.04] p-5">
          <div className="mb-4 flex items-center gap-2 text-milestone">
            <Wallet className="size-4" />
            <SectionLabel>Mi cuenta</SectionLabel>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Saldo actual">
              <MoneyInput
                value={config.cuentas[0]?.saldoInicial || ""}
                onChange={(v) => patchCuenta(config.cuentas[0].id, { saldoInicial: parseDecimal(v) || 0 })}
                placeholder="0,00"
              />
            </Field>
            <Field label="Límite de gasto / mes" hint="Lo que sobra de tu sueldo por encima de este límite es tu ahorro virtual.">
              <MoneyInput
                value={config.cuentas[0]?.limiteGasto || ""}
                onChange={(v) => patchCuenta(config.cuentas[0].id, { limiteGasto: parseDecimal(v) || 0 })}
                placeholder="0,00"
              />
            </Field>
          </div>
        </div>
      )}

      {/* ── Custom ── */}
      {config.modeloCuentas === "custom" && (
        <Panel>
          <div className="mb-4 flex items-center gap-2">
            <Settings2 className="size-4 text-muted-foreground" />
            <SectionLabel>Mis cuentas</SectionLabel>
          </div>
          {sueldoEfectivo > 0 && config.cuentas.length > 1 && (
            <p className="mb-3 text-[11px] text-muted-foreground">
              💡 La <strong className="text-foreground">última cuenta</strong> se autocompletará con el saldo restante del sueldo.
            </p>
          )}
          <div className="space-y-3">
            {config.cuentas.map((cuenta, idx) => {
              const isLast = idx === lastIdx && config.cuentas.length > 1
              return (
                <div key={cuenta.id} className={cn("rounded-xl border p-4", borderCuenta(cuenta.tipo))}>
                  <div className="mb-3 flex items-center gap-2">
                    {iconCuenta(cuenta.tipo)}
                    <TextInput
                      value={cuenta.nombre}
                      onChange={(v) => patchCuenta(cuenta.id, { nombre: v })}
                      placeholder="Nombre (ej. Banco Pichincha)"
                      className="flex-1 text-sm"
                    />
                    <select
                      value={cuenta.tipo}
                      onChange={(e) => patchCuenta(cuenta.id, { tipo: e.target.value as Cuenta["tipo"] })}
                      className="rounded-md border border-input bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-ring"
                    >
                      <option value="ahorro">Ahorro</option>
                      <option value="gastos">Gastos</option>
                      <option value="general">General</option>
                    </select>
                    {config.cuentas.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCuenta(cuenta.id)}
                        className="text-muted-foreground transition-colors hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                  <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Saldo actual (Opcional)" hint="Dinero que ya tienes ahorrado hoy en esta cuenta.">
                      <MoneyInput
                        tone={toneFromTipo(cuenta.tipo)}
                        value={cuenta.saldoInicial || ""}
                        onChange={(v) => patchCuenta(cuenta.id, { saldoInicial: parseDecimal(v) || 0 })}
                        placeholder="0,00"
                      />
                    </Field>
                    <Field
                      label={isLast ? "Aporte a esta cuenta (Auto)" : "Aporte a esta cuenta (Obligatorio)"}
                      hint={isLast ? "Se calcula solo con lo sobrante de tu sueldo." : "Parte exacta de tu sueldo que irá aquí."}
                    >
                      <MoneyInput
                        tone={toneFromTipo(cuenta.tipo)}
                        value={cuenta.depositoFijoMensual || ""}
                        onChange={(v) => handleDepositoCuenta(idx, v)}
                        placeholder={isLast && sueldoEfectivo > 0 ? `Automático: ${fmt(Math.max(sueldoEfectivo - config.cuentas.slice(0, idx).reduce((s, c) => s + (Number(c.depositoFijoMensual) || 0), 0), 0))}` : "0,00"}
                      />
                    </Field>
                  </div>
                  {cuenta.tipo === "general" && (
                    <div className="mt-3">
                      <Field label="Límite de gasto / mes" hint="El saldo por encima de este límite es ahorro virtual.">
                        <MoneyInput
                          value={cuenta.limiteGasto || ""}
                          onChange={(v) => patchCuenta(cuenta.id, { limiteGasto: parseDecimal(v) || 0 })}
                          placeholder="0,00"
                        />
                      </Field>
                    </div>
                  )}
                </div>
              )
            })}
            <button
              type="button"
              onClick={addCuenta}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
            >
              <Plus className="size-4" />
              Agregar cuenta
            </button>
          </div>
        </Panel>
      )}

      {/* ── Sobresueldos (Décimos y Fondos de Reserva) ── */}
      <Panel>
        <div className="mb-4 flex items-center gap-2">
          <Banknote className="size-4 text-muted-foreground" />
          <SectionLabel>Beneficios de Ley y Sobresueldos</SectionLabel>
        </div>

        <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-secondary/20">
          <input
            type="checkbox"
            checked={!!config.sobresueldos?.activo}
            onChange={(e) => {
              const prev = config.sobresueldos || DEFAULT_SOBRESUELDOS
              set({ sobresueldos: { ...prev, activo: e.target.checked } })
            }}
            className="mt-0.5 size-4 rounded accent-primary cursor-pointer"
          />
          <div className="flex flex-col">
            <span className="text-[13px] font-medium text-foreground">Incluir Décimos y Fondos de Reserva en la proyección</span>
            <span className="text-[11px] text-muted-foreground/80 mt-0.5 leading-relaxed">
              Exclusivo si estás afiliado en relación de dependencia. El motor calculará los proporcionales automáticamente con confirmación previa.
            </span>
          </div>
        </label>

        {config.sobresueldos?.activo && (
          <div className="mt-5 border-t border-border/60 pt-5 space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Fecha de ingreso al trabajo" hint="Obligatorio para cálculo proporcional y 1er año de FR">
                <TextInput
                  type="date"
                  value={config.sobresueldos.fechaIngresoTrabajo}
                  onChange={(v) => set({ sobresueldos: { ...config.sobresueldos!, fechaIngresoTrabajo: v } })}
                />
              </Field>
              <Field label="Salario Básico Unificado (SBU)" hint="Valor para el cálculo del Décimo Cuarto ($482 actual)">
                <TextInput
                  type="number"
                  value={String(config.sobresueldos.sbu)}
                  onChange={(v) => set({ sobresueldos: { ...config.sobresueldos!, sbu: parseDecimal(v) || 0 } })}
                />
              </Field>
            </div>
            
            {/* Modalidades */}
            <div className="grid grid-cols-1 gap-5 rounded-lg border border-primary/10 bg-primary/[0.02] p-4 sm:grid-cols-2">
              <Field label="Décimo Tercero (Navideño)">
                <select
                  value={config.sobresueldos.modalidadDecimoTercero}
                  onChange={(e) => set({ sobresueldos: { ...config.sobresueldos!, modalidadDecimoTercero: e.target.value as any } })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
                >
                  <option value="diciembre">Se acumula para Diciembre</option>
                  <option value="acumulado">Recibo mensualizado</option>
                </select>
              </Field>
              <Field label="Décimo Cuarto (Escolar)">
                <select
                  value={config.sobresueldos.modalidadDecimoCuarto}
                  onChange={(e) => set({ sobresueldos: { ...config.sobresueldos!, modalidadDecimoCuarto: e.target.value as any } })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
                >
                  <option value="agosto">Agosto (Sierra / Amazonía)</option>
                  <option value="abril">Abril (Costa / Galápagos)</option>
                  <option value="acumulado">Recibo mensualizado</option>
                </select>
              </Field>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-secondary/20">
              <input
                type="checkbox"
                checked={config.sobresueldos.recibirFondosReserva}
                onChange={(e) => set({ sobresueldos: { ...config.sobresueldos!, recibirFondosReserva: e.target.checked } })}
                className="mt-0.5 size-4 rounded accent-primary cursor-pointer"
              />
              <div className="flex flex-col">
                <span className="text-[13px] font-medium text-foreground">Retiro Fondos de Reserva (Mensualizado)</span>
                <span className="text-[11px] text-muted-foreground/80 mt-0.5 leading-relaxed">
                  Aplica a partir del mes consecutivo al de haber cumplido tu primer año. Es el 8.33% de tu bruto.
                </span>
              </div>
            </label>

            {config.cuentas.length > 1 && (
              <div className="rounded-lg border border-border bg-secondary/10 p-4">
                <div className="mb-4">
                  <div className="text-[12px] font-semibold text-foreground uppercase tracking-wider">Distribución a cuentas (Porcentajes)</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">La última cuenta se rellena automáticamente (100% - resto).</div>
                </div>
                <div className="space-y-6">
                  <DistribucionSobresueldo
                    label="Décimo Tercero"
                    distribucion={config.sobresueldos.distribucionDecimoTercero}
                    onChange={(d) => set({ sobresueldos: { ...config.sobresueldos!, distribucionDecimoTercero: d }})}
                    cuentas={config.cuentas}
                  />
                  <DistribucionSobresueldo
                    label="Décimo Cuarto"
                    distribucion={config.sobresueldos.distribucionDecimoCuarto}
                    onChange={(d) => set({ sobresueldos: { ...config.sobresueldos!, distribucionDecimoCuarto: d }})}
                    cuentas={config.cuentas}
                  />
                  {config.sobresueldos.recibirFondosReserva && (
                    <DistribucionSobresueldo
                      label="Fondos de Reserva"
                      distribucion={config.sobresueldos.distribucionFondosReserva}
                      onChange={(d) => set({ sobresueldos: { ...config.sobresueldos!, distribucionFondosReserva: d }})}
                      cuentas={config.cuentas}
                    />
                  )}
                </div>
              </div>
            )}
            
            <label className="flex cursor-pointer items-start gap-4 rounded-xl border border-primary/40 bg-primary/[0.04] p-4 transition-colors hover:bg-primary/10">
              <input
                type="checkbox"
                checked={config.sobresueldos.confirmado}
                onChange={(e) => set({ sobresueldos: { ...config.sobresueldos!, confirmado: e.target.checked } })}
                className="mt-0.5 size-5 rounded accent-primary cursor-pointer border-primary/50"
              />
              <div className="flex flex-col">
                <span className="text-[14px] font-bold text-primary">Confirmo que quiero agregar estos ingresos a la proyección</span>
                <span className="text-[11px] text-primary/80 mt-1 leading-relaxed font-medium">Solo cuando marcas esta casilla, NovaFin empezará a sumar automáticamente los montos a tus cuentas en los meses correspondientes.</span>
              </div>
            </label>
          </div>
        )}
      </Panel>

      {/* ── Horizonte ── */}
      <Panel>
        <div className="mb-4 flex items-center gap-2">
          <CalendarRange className="size-4 text-muted-foreground" />
          <SectionLabel>Horizonte y milestones</SectionLabel>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Mes de inicio">
            <TextInput type="month" value={config.mesInicio} onChange={(v) => set({ mesInicio: v })} />
          </Field>
          <Field label="Meses a proyectar">
            <TextInput
              type="number"
              value={config.mesesAProyectar}
              onChange={(v) => set({ mesesAProyectar: Math.max(1, Math.min(120, parseDecimal(v) || 1)) })}
            />
          </Field>
        </div>
        <Field className="mt-4" label="Fecha de nacimiento (opcional)" hint="Verás un recordatorio en tu tabla cuando llegue tu mes de cumpleaños.">
          <TextInput type="date" value={config.fechaNacimiento || ""} onChange={(v) => set({ fechaNacimiento: v })} />
        </Field>
      </Panel>

      {/* ── Periodos Variables (Modificadores) ── */}
      <Panel>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={config.tieneIngresosVariables}
            onChange={(e) => set({ tieneIngresosVariables: e.target.checked })}
            className="mt-0.5 size-4 accent-milestone"
          />
          <span className="text-sm text-foreground flex-1">
            Periodos con ingresos / saldos variables
            {" "}
            <span className="mt-0.5 block text-xs text-muted-foreground leading-relaxed">
              Útil si prevees un cambio temporal o permanente en tus finanzas (ej. de julio a sep ganas distinto, o un ascenso permanente en enero).
            </span>
          </span>
        </label>
        
        {config.tieneIngresosVariables && (
          <div className="mt-5 border-t border-border/60 pt-5 space-y-4">
            {(config.modificadoresBase || []).map((mod, idx) => {
              const cuentasM = mod.cuentas || []
              const cuentasRestantesExcluyendoUltima = cuentasM.slice(0, -1).reduce((s, c) => s + (c.monto || 0), 0)
              
              return (
                <div key={mod.id} className="rounded-xl border border-border bg-secondary/10 p-4 sm:p-5">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-xs font-semibold text-primary uppercase tracking-widest flex items-center gap-1.5">
                      <CalendarRange className="size-3" /> Periodo Financiero Temporal
                    </span>
                    <button 
                      type="button" 
                      onClick={() => set({ modificadoresBase: (config.modificadoresBase || []).filter(m => m.id !== mod.id) })}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-4 pb-4 border-b border-border/50">
                    <Field label="Sueldo / Ingreso en este periodo">
                      <MoneyInput
                        tone="neutral"
                        value={mod.sueldo || ""}
                        onChange={(v) => {
                          const updated = [...(config.modificadoresBase || [])]
                          updated[idx] = { ...updated[idx], sueldo: parseDecimal(v) || 0 }
                          
                          const mCuentas = [...(updated[idx].cuentas || [])]
                          const lastRefIdx = config.cuentas.length - 1
                          if (lastRefIdx > 0) {
                            const sumOthers = mCuentas.filter(x => x.cuentaId !== config.cuentas[lastRefIdx].id).reduce((s, x) => s + (x.monto || 0), 0)
                            const restante = Math.max((parseDecimal(v) || 0) - sumOthers, 0)
                            const exLastIdx = mCuentas.findIndex(x => x.cuentaId === config.cuentas[lastRefIdx].id)
                            if (exLastIdx >= 0) mCuentas[exLastIdx].monto = restante
                            else mCuentas.push({ cuentaId: config.cuentas[lastRefIdx].id, monto: restante })
                          }
                          updated[idx].cuentas = mCuentas
                          
                          set({ modificadoresBase: updated })
                        }}
                        placeholder="Ej. 1000.00"
                      />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Mes de inicio (Desde)">
                        <TextInput 
                          type="month" 
                          value={mod.mesInicio} 
                          onChange={(v) => {
                            const updated = [...(config.modificadoresBase || [])]
                            updated[idx] = { ...updated[idx], mesInicio: v }
                            set({ modificadoresBase: updated })
                          }} 
                        />
                      </Field>
                      <Field label="Mes final (Hasta)" hint="Vacío = Permanente">
                        <TextInput 
                          type="month" 
                          value={mod.mesFin || ""} 
                          onChange={(v) => {
                            const updated = [...(config.modificadoresBase || [])]
                            updated[idx] = { ...updated[idx], mesFin: v }
                            set({ modificadoresBase: updated })
                          }} 
                        />
                      </Field>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-xs font-medium text-muted-foreground mb-2">Reorganización de cuentas para el periodo:</div>
                    {config.cuentas.map((cuentaRef, cIdx) => {
                       const isLast = cIdx === config.cuentas.length - 1 && config.cuentas.length > 1
                       const cVal = cuentasM.find(c => c.cuentaId === cuentaRef.id)?.monto || 0
                       return (
                         <div key={cuentaRef.id} className="flex items-center gap-3">
                           <div className="w-1/3 truncate text-sm text-foreground flex items-center gap-2">
                             {iconCuenta(cuentaRef.tipo)} {cuentaRef.nombre}
                           </div>
                           <div className="w-2/3">
                             <MoneyInput
                               tone={toneFromTipo(cuentaRef.tipo)}
                               value={cVal || ""}
                               onChange={(v) => {
                                 const updated = [...(config.modificadoresBase || [])]
                                 let mCuentas = upsertCuentaMonto(
                                   [...(updated[idx].cuentas || [])],
                                   cuentaRef.id,
                                   parseDecimal(v) || 0,
                                 )
                                 mCuentas = withResidualRedistribution(
                                   mCuentas,
                                   config.cuentas,
                                   cIdx,
                                   mod.sueldo || 0,
                                 )
                                 updated[idx] = { ...updated[idx], cuentas: mCuentas }
                                 set({ modificadoresBase: updated })
                               }}
                               placeholder={isLast && mod.sueldo > 0 ? `Auto residual: ${fmt(Math.max(mod.sueldo - cuentasRestantesExcluyendoUltima, 0))}` : "0,00"}
                             />
                           </div>
                         </div>
                       )
                    })}
                  </div>
                </div>
              )
            })}
            
            <button
              type="button"
              onClick={() => {
                const cuentasInit = config.cuentas.map(c => ({ cuentaId: c.id, monto: c.depositoFijoMensual || 0 }))
                // Para dual compat
                if (config.modeloCuentas === "dual") {
                   const cAhorro = cuentasInit.find(x => x.cuentaId === "ahorro")
                   if (cAhorro) cAhorro.monto = config.ahorroBase || 0
                   const cGastos = cuentasInit.find(x => x.cuentaId === "gastos")
                   if (cGastos) cGastos.monto = config.gastoBase || 0
                }
                const nuevo: ModificadorBase = {
                  id: uid(),
                  mesInicio: config.mesInicio,
                  sueldo: config.sueldo || 0,
                  cuentas: cuentasInit
                }
                set({ modificadoresBase: [...(config.modificadoresBase || []), nuevo] })
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-transparent py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary hover:bg-primary/5"
            >
              <Plus className="size-4" />
              Añadir un nuevo periodo de cambio
            </button>
          </div>
        )}
      </Panel>

      {/* ── Descuento temporal ── */}
      <Panel>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={config.descuentoActivo}
            onChange={(e) => set({ descuentoActivo: e.target.checked })}
            className="mt-0.5 size-4 accent-[var(--color-accent)]"
          />
          <span className="text-sm text-foreground">
            Descuento temporal del disponible mensual
            {" "}
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Por ejemplo, ayuda a un familiar durante algunos meses.
            </span>
          </span>
        </label>
        {config.descuentoActivo && (
          <div className="mt-4 grid grid-cols-1 gap-4 border-t border-border/60 pt-4 sm:grid-cols-3">
            <Field label="Afectar directamente a">
              <select
                value={config.descuentoCuentaId}
                onChange={(e) => set({ descuentoCuentaId: e.target.value })}
                className="w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
              >
                <option value="">A la cuenta de Gastos (Automático)</option>
                {config.cuentas.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </Field>
            <Field label="Monto del descuento / mes">
              <MoneyInput
                tone="gastos"
                value={config.descuentoMonto || ""}
                onChange={(v) => set({ descuentoMonto: parseDecimal(v) || 0 })}
                placeholder="0,00"
              />
            </Field>
            <Field label="Último mes del descuento">
              <TextInput type="month" value={config.descuentoMesFin} onChange={(v) => set({ descuentoMesFin: v })} />
            </Field>
          </div>
        )}
      </Panel>

      {/* ── Portabilidad de Datos (Backups) ── */}
      <Panel>
        <div className="mb-4">
          <div className="text-sm font-medium text-foreground">Portabilidad y Respaldos (JSON)</div>
          <div className="text-xs text-muted-foreground mt-1">Exporta tu configuración a un archivo para tener un respaldo o para cargarlo en otro dispositivo.</div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => exportBackup()}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-secondary/20 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary/40 cursor-pointer"
          >
            <DownloadCloud className="size-4 text-primary" />
            Descargar Respaldo
          </button>
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-secondary/20 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary/40 cursor-pointer"
          >
            <UploadCloud className="size-4 text-accent" />
            Importar Archivo
          </button>
          <input 
            ref={fileInputRef}
            type="file" 
            accept=".json" 
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              void importBackup(file)
              e.target.value = ""
            }}
          />
        </div>
      </Panel>

      {/* ── Reset ── */}
      <div className="flex items-center justify-between rounded-xl border border-destructive/25 bg-destructive/[0.04] px-4 py-3">
        <div>
          <div className="text-sm font-medium text-foreground">Reiniciar todo</div>
          <div className="text-xs text-muted-foreground">Borra tu configuración, gastos y metas de este dispositivo.</div>
        </div>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("¿Seguro que quieres borrar todos tus datos? Esta acción no se puede deshacer.")) onReset()
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 cursor-pointer"
        >
          <RotateCcw className="size-4" />
          Reiniciar
        </button>
      </div>
    </div>
  )
}

function DistribucionSobresueldo({
  label,
  distribucion,
  onChange,
  cuentas,
}: Readonly<{
  label: string
  distribucion: { cuentaId: string; monto: number }[]
  onChange: (d: { cuentaId: string; monto: number }[]) => void
  cuentas: Cuenta[]
}>) {
  if (cuentas.length <= 1) return null
  const lastIdx = cuentas.length - 1
  const dist = distribucion || []

  return (
    <div className="space-y-2.5">
      <div className="text-[11px] font-medium text-primary uppercase tracking-wider">{label}</div>
      <div className="space-y-2 border-l-2 border-primary/20 pl-3">
        {cuentas.map((c, i) => {
          const isLast = i === lastIdx
          const val = isLast
            ? Math.max(100 - cuentas.slice(0, lastIdx).reduce((s, acc) => s + (dist.find(d => d.cuentaId === acc.id)?.monto ?? (cuentas.findIndex(x=>x.id===acc.id)===0?100:0)), 0), 0)
            : dist.find(d => d.cuentaId === c.id)?.monto ?? (i === 0 ? 100 : 0)
            
          return (
            <div key={c.id} className="flex items-center gap-3">
              <span className="flex-1 truncate text-[12px] text-foreground font-medium">{c.nombre}</span>
              <div className="relative flex items-center">
                <input
                  type="number" min="0" max="100"
                  value={val}
                  disabled={isLast}
                  readOnly={isLast}
                  onChange={(e) => {
                    const raw = Math.min(100, Math.max(0, parseDecimal(e.target.value) || 0))
                    let mdist = [...dist]
                    // Clean up 0 defaults logic implicitly
                    for (const acc of cuentas) {
                      if (!mdist.find(x => x.cuentaId === acc.id)) {
                         mdist.push({ cuentaId: acc.id, monto: cuentas.findIndex(x=>x.id===acc.id)===0?100:0 })
                      }
                    }
                    
                    const cIdx = mdist.findIndex(x => x.cuentaId === c.id)
                    if (cIdx >= 0) mdist[cIdx].monto = raw
                    
                    const currentSumOthers = cuentas.slice(0, lastIdx).reduce((s, acc) => s + (mdist.find(d => d.cuentaId === acc.id)?.monto ?? 0), 0)
                    const residual = Math.max(100 - currentSumOthers, 0)
                    const lastCid = cuentas[lastIdx].id
                    const lastDistIdx = mdist.findIndex(x => x.cuentaId === lastCid)
                    if (lastDistIdx >= 0) mdist[lastDistIdx].monto = residual
                    
                    onChange(mdist)
                  }}
                  className={cn(
                    "w-24 rounded-md border border-input pl-3 pr-8 py-1.5 text-sm outline-none focus:border-ring transition-colors",
                    isLast ? "bg-secondary/40 text-muted-foreground border-transparent shadow-none" : "bg-background"
                  )}
                />
                <span className={cn("absolute right-3 text-[11px] font-medium select-none cursor-default", isLast ? "text-muted-foreground/30" : "text-muted-foreground/60")}>%</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
