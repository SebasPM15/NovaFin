"use client"

import { useState } from "react"
import {
  ArrowLeft, ArrowRight, Check, PiggyBank, Plus, Sparkles, Wallet,
  CalendarRange, Banknote, Settings2, Trash2
} from "lucide-react"
import {
  type Config, type Cuenta, type ModeloCuentas,
  DEFAULT_CONFIG, DEFAULT_CUENTA_AHORRO, DEFAULT_CUENTA_GASTOS, DEFAULT_CUENTA_SINGLE,
  addMonths, fmt, monthLabel, nowKey, uid, defaultCuentasForModelo,
} from "@/lib/finance"
import { Field, MoneyInput, TextInput } from "./ui-kit"
import { cn } from "@/lib/utils"

// ── Step definitions ──────────────────────────────────────────────────────────
// Step 0: Choose account model (always)
// Step 1: If custom → create accounts; else → reparto mensual
// Step 2: Saldos actuales
// Step 3: Horizonte

type TipoCuentaOption = "ahorro" | "gastos" | "general"

const TIPO_LABEL: Record<TipoCuentaOption, string> = {
  ahorro: "Ahorro",
  gastos: "Gastos",
  general: "General",
}

// ── Profile card ──────────────────────────────────────────────────────────────
function ProfileCard({
  selected,
  onSelect,
  icon,
  title,
  description,
  badge,
}: {
  selected: boolean
  onSelect: () => void
  icon: React.ReactNode
  title: string
  description: string
  badge?: string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative w-full rounded-xl border p-4 text-left transition-all",
        selected
          ? "border-primary bg-primary/10 ring-2 ring-primary"
          : "border-border bg-secondary/30 hover:border-primary/40 hover:bg-secondary/60",
      )}
    >
      {badge && (
        <span className="absolute right-3 top-3 rounded-full bg-milestone/20 px-2 py-0.5 text-[10px] font-semibold text-milestone">
          {badge}
        </span>
      )}
      <div className={cn("mb-2 flex size-9 items-center justify-center rounded-lg", selected ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground")}>
        {icon}
      </div>
      <div className="font-display text-sm font-bold text-foreground">{title}</div>
      <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{description}</p>
      {selected && <Check className="absolute right-3 bottom-3 size-4 text-primary" />}
    </button>
  )
}

// ── Custom account editor ─────────────────────────────────────────────────────
function CustomAccountEditor({
  cuentas,
  onChange,
}: {
  cuentas: Cuenta[]
  onChange: (cuentas: Cuenta[]) => void
}) {
  const add = () =>
    onChange([
      ...cuentas,
      { id: uid(), nombre: "", tipo: "general", saldoInicial: 0, depositoFijoMensual: 0 },
    ])

  const remove = (id: string) => onChange(cuentas.filter((c) => c.id !== id))

  const patch = (id: string, patch: Partial<Cuenta>) =>
    onChange(cuentas.map((c) => (c.id === id ? { ...c, ...patch } : c)))

  return (
    <div className="space-y-3">
      {cuentas.map((c) => (
        <div key={c.id} className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <TextInput
              value={c.nombre}
              onChange={(v) => patch(c.id, { nombre: v })}
              placeholder="Nombre (ej. Banco Pichincha)"
              className="flex-1"
            />
            <select
              value={c.tipo}
              onChange={(e) => patch(c.id, { tipo: e.target.value as TipoCuentaOption })}
              className="rounded-lg border border-input bg-background px-2 py-2 text-sm text-foreground outline-none focus:border-ring"
            >
              {(["ahorro", "gastos", "general"] as TipoCuentaOption[]).map((t) => (
                <option key={t} value={t}>{TIPO_LABEL[t]}</option>
              ))}
            </select>
            {cuentas.length > 1 && (
              <button
                type="button"
                onClick={() => remove(c.id)}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Saldo inicial">
              <MoneyInput
                tone={c.tipo === "ahorro" ? "ahorro" : c.tipo === "gastos" ? "gastos" : "neutral"}
                value={c.saldoInicial || ""}
                onChange={(v) => patch(c.id, { saldoInicial: Number(v) })}
                placeholder="0.00"
              />
            </Field>
            <Field label="Depósito mensual">
              <MoneyInput
                tone={c.tipo === "ahorro" ? "ahorro" : c.tipo === "gastos" ? "gastos" : "neutral"}
                value={c.depositoFijoMensual || ""}
                onChange={(v) => patch(c.id, { depositoFijoMensual: Number(v) })}
                placeholder="0.00"
              />
            </Field>
          </div>
          {c.tipo === "general" && (
            <Field
              label="Límite de gasto mensual (opcional)"
              hint="El saldo por encima de este límite se considera tu ahorro virtual."
            >
              <MoneyInput
                value={c.limiteGasto || ""}
                onChange={(v) => patch(c.id, { limiteGasto: Number(v) })}
                placeholder="0.00"
              />
            </Field>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
      >
        <Plus className="size-4" />
        Agregar cuenta
      </button>
    </div>
  )
}

// ── Main wizard ───────────────────────────────────────────────────────────────
export function OnboardingWizard({ onComplete }: { onComplete: (config: Config) => void }) {
  const [modelo, setModelo] = useState<ModeloCuentas>("dual")
  const [cuentasCustom, setCuentasCustom] = useState<Cuenta[]>([
    { id: uid(), nombre: "", tipo: "ahorro", saldoInicial: 0, depositoFijoMensual: 0 },
    { id: uid(), nombre: "", tipo: "gastos", saldoInicial: 0, depositoFijoMensual: 0 },
  ])
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<Config>({ ...DEFAULT_CONFIG, mesInicio: nowKey() })

  const set = (patch: Partial<Config>) => setDraft((d) => ({ ...d, ...patch }))

  // Total steps depends on model
  const totalSteps = modelo === "custom" ? 5 : 4 // 0: modelo, 1?: cuentas, 2: reparto, 3: saldos, 4: horizonte

  const STEPS_DUAL_SINGLE = ["Modelo", "Reparto mensual", "Saldos actuales", "Horizonte"]
  const STEPS_CUSTOM = ["Modelo", "Tus cuentas", "Reparto mensual", "Saldos actuales", "Horizonte"]
  const STEPS = modelo === "custom" ? STEPS_CUSTOM : STEPS_DUAL_SINGLE

  const repartoTotal = (Number(draft.ahorroBase) || 0) + (Number(draft.gastoBase) || 0)
  const excedeSueldo = draft.sueldo > 0 && modelo === "dual" && repartoTotal > draft.sueldo + 0.001

  const canNext = (() => {
    if (step === 0) return true
    if (modelo === "custom" && step === 1) {
      return cuentasCustom.length > 0 && cuentasCustom.every((c) => c.nombre.trim().length > 0)
    }
    const repartoStep = modelo === "custom" ? 2 : 1
    if (step === repartoStep) return !excedeSueldo
    return true
  })()

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1)
    } else {
      // Build final cuentas
      let cuentas: Cuenta[]
      if (modelo === "dual") {
        cuentas = [
          { ...DEFAULT_CUENTA_AHORRO, saldoInicial: draft.ahorroActual, depositoFijoMensual: draft.ahorroBase },
          { ...DEFAULT_CUENTA_GASTOS, saldoInicial: draft.gastosActual, depositoFijoMensual: draft.gastoBase },
        ]
      } else if (modelo === "single") {
        cuentas = [{ ...DEFAULT_CUENTA_SINGLE, saldoInicial: draft.ahorroActual, limiteGasto: draft.gastoBase }]
      } else {
        cuentas = cuentasCustom
      }
      onComplete({ ...draft, modeloCuentas: modelo, cuentas })
    }
  }
  const back = () => setStep((s) => Math.max(0, s - 1))

  const repartoStep = modelo === "custom" ? 2 : 1
  const saldosStep = modelo === "custom" ? 3 : 2
  const horizonteStep = modelo === "custom" ? 4 : 3

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        {/* Brand */}
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </span>
          <span className="font-display text-xl font-extrabold tracking-tight text-foreground">NovaFin</span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
          {/* Progress */}
          <div className="flex items-center gap-2 border-b border-border px-6 py-4">
            {STEPS.map((label, i) => (
              <div key={label} className="flex flex-1 items-center gap-2">
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold transition-colors",
                    i < step
                      ? "bg-primary text-primary-foreground"
                      : i === step
                        ? "bg-primary/20 text-primary ring-2 ring-primary"
                        : "bg-secondary text-muted-foreground",
                  )}
                >
                  {i < step ? <Check className="size-3.5" /> : i + 1}
                </span>
                {i < STEPS.length - 1 && (
                  <span className={cn("h-px flex-1", i < step ? "bg-primary" : "bg-border")} />
                )}
              </div>
            ))}
          </div>

          <div className="px-6 py-7">
            {/* ── Step 0: Choose account model ── */}
            {step === 0 && (
              <div className="space-y-4">
                <div>
                  <h1 className="font-display text-xl font-bold text-foreground">¿Cómo manejas tu dinero?</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Elige el modelo que mejor describe tu situación actual.
                  </p>
                </div>
                <div className="space-y-3">
                  <ProfileCard
                    selected={modelo === "dual"}
                    onSelect={() => setModelo("dual")}
                    icon={<PiggyBank className="size-5" />}
                    title="Tengo cuenta de ahorro y de gastos"
                    description="Separo mi dinero en dos cuentas distintas. El ahorro crece solo y los gastos circulan aparte."
                    badge="Recomendado"
                  />
                  <ProfileCard
                    selected={modelo === "single"}
                    onSelect={() => setModelo("single")}
                    icon={<Wallet className="size-5" />}
                    title="Tengo una sola cuenta"
                    description="Todo mi dinero está en un mismo lugar. Puedo definir un límite de gasto mensual para separar virtualmente mi ahorro."
                  />
                  <ProfileCard
                    selected={modelo === "custom"}
                    onSelect={() => setModelo("custom")}
                    icon={<Settings2 className="size-5" />}
                    title="Quiero configurar mis propias cuentas"
                    description="Tengo múltiples cuentas, inversiones o un esquema propio que quiero reflejar exactamente."
                  />
                </div>

                {/* Motivational banner for single */}
                {modelo === "single" && (
                  <div className="rounded-xl border border-milestone/30 bg-milestone/5 px-4 py-3">
                    <div className="flex items-start gap-2">
                      <PiggyBank className="mt-0.5 size-4 shrink-0 text-milestone" />
                      <p className="text-[12px] leading-relaxed text-muted-foreground">
                        <strong className="text-milestone">¿Sabías que?</strong> Abrir una cuenta de ahorro separada —
                        aunque sea con $10 — es el primer paso para separar tu dinero psicológicamente y acelerar
                        tus metas. NovaFin te permite empezar con una sola cuenta y migrar cuando estés listo.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Step custom 1: Create accounts ── */}
            {modelo === "custom" && step === 1 && (
              <div className="space-y-4">
                <div>
                  <h2 className="font-display text-lg font-bold text-foreground">Define tus cuentas</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Crea cada cuenta con su nombre, tipo y saldo actual. Puedes editarlas después desde Configuración.
                  </p>
                </div>
                <CustomAccountEditor cuentas={cuentasCustom} onChange={setCuentasCustom} />
              </div>
            )}

            {/* ── Step: Reparto mensual ── */}
            {step === repartoStep && (
              <div className="space-y-5">
                <div>
                  <h2 className="font-display text-lg font-bold text-foreground">
                    {modelo === "single" ? "¿Cuánto ganas y cuánto gastas?" : "¿Cómo repartes tu mes?"}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {modelo === "single"
                      ? "Define tu sueldo y el límite de gasto mensual. Lo que sobra es tu ahorro virtual."
                      : "Define cuánto ganas y cuánto va a cada cuenta cada mes."}
                  </p>
                </div>
                <Field label="Sueldo mensual">
                  <MoneyInput value={draft.sueldo || ""} onChange={(v) => set({ sueldo: Number(v) })} placeholder="0.00" />
                </Field>
                {modelo === "dual" && (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Depósito a Ahorro / mes">
                      <MoneyInput
                        tone="ahorro"
                        value={draft.ahorroBase || ""}
                        onChange={(v) => set({ ahorroBase: Number(v) })}
                        placeholder="0.00"
                      />
                    </Field>
                    <Field label="Disponible para Gastos / mes">
                      <MoneyInput
                        tone="gastos"
                        value={draft.gastoBase || ""}
                        onChange={(v) => set({ gastoBase: Number(v) })}
                        placeholder="0.00"
                      />
                    </Field>
                  </div>
                )}
                {modelo === "single" && (
                  <Field
                    label="Límite de gasto mensual"
                    hint="Lo que gastes por encima de este límite afectará tu ahorro virtual."
                  >
                    <MoneyInput
                      value={draft.gastoBase || ""}
                      onChange={(v) => set({ gastoBase: Number(v) })}
                      placeholder="0.00"
                    />
                  </Field>
                )}
                {draft.sueldo > 0 && modelo === "dual" && (
                  <div className={cn(
                    "rounded-lg border px-3 py-2 text-xs",
                    excedeSueldo
                      ? "border-destructive/40 bg-destructive/10 text-destructive"
                      : "border-border bg-secondary/50 text-muted-foreground",
                  )}>
                    {excedeSueldo ? (
                      <>El reparto (${fmt(repartoTotal)}) supera tu sueldo (${fmt(draft.sueldo)}). Ajusta los montos.</>
                    ) : (
                      <>
                        Repartes <span className="tnum text-foreground">${fmt(repartoTotal)}</span> de{" "}
                        <span className="tnum text-foreground">${fmt(draft.sueldo)}</span> · libre:{" "}
                        <span className="tnum text-primary">${fmt(draft.sueldo - repartoTotal)}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Step: Saldos actuales ── */}
            {step === saldosStep && (
              <div className="space-y-5">
                <div>
                  <h2 className="font-display text-lg font-bold text-foreground">¿Con cuánto empiezas?</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {modelo === "single"
                      ? "El saldo actual de tu cuenta. Si empiezas de cero, déjalo en 0."
                      : "Tus saldos de arranque. Si empiezas de cero, déjalos en 0."}
                  </p>
                </div>
                {modelo === "dual" && (
                  <>
                    <Field label="Saldo inicial en Ahorro" hint="Lo que ya tienes guardado.">
                      <MoneyInput
                        tone="ahorro"
                        value={draft.ahorroActual || ""}
                        onChange={(v) => set({ ahorroActual: Number(v) })}
                        placeholder="0.00"
                      />
                    </Field>
                    <Field label="Sobrante inicial en Gastos" hint="Dinero disponible que traes del mes anterior.">
                      <MoneyInput
                        tone="gastos"
                        value={draft.gastosActual || ""}
                        onChange={(v) => set({ gastosActual: Number(v) })}
                        placeholder="0.00"
                      />
                    </Field>
                  </>
                )}
                {modelo === "single" && (
                  <Field label="Saldo actual de tu cuenta" hint="El balance total que tienes ahora mismo.">
                    <MoneyInput
                      value={draft.ahorroActual || ""}
                      onChange={(v) => set({ ahorroActual: Number(v) })}
                      placeholder="0.00"
                    />
                  </Field>
                )}
                <Field label="Fecha de nacimiento (opcional)" hint="Verás un recordatorio de cumpleaños en tu tabla.">
                  <TextInput
                    type="date"
                    value={draft.fechaNacimiento || ""}
                    onChange={(v) => set({ fechaNacimiento: v })}
                  />
                </Field>
              </div>
            )}

            {/* ── Step: Horizonte ── */}
            {step === horizonteStep && (
              <div className="space-y-5">
                <div>
                  <h2 className="font-display text-lg font-bold text-foreground">¿Qué horizonte quieres ver?</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Elige desde cuándo y cuántos meses proyectar.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Mes de inicio">
                    <TextInput type="month" value={draft.mesInicio} onChange={(v) => set({ mesInicio: v || nowKey() })} />
                  </Field>
                  <Field label="Meses a proyectar">
                    <TextInput
                      type="number"
                      value={draft.mesesAProyectar}
                      onChange={(v) => set({ mesesAProyectar: Math.max(1, Math.min(120, Number(v) || 1)) })}
                    />
                  </Field>
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-border bg-secondary/40 p-4">
                  <CalendarRange className="mt-0.5 size-5 shrink-0 text-primary" />
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Proyectaremos desde{" "}
                    <strong className="text-foreground">{monthLabel(draft.mesInicio, true)}</strong> hasta{" "}
                    <strong className="text-foreground">
                      {monthLabel(addMonths(draft.mesInicio, draft.mesesAProyectar - 1), true)}
                    </strong>
                    . Podrás cambiar todo esto luego en Configuración.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border px-6 py-4">
            <button
              type="button"
              onClick={back}
              disabled={step === 0}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-0"
            >
              <ArrowLeft className="size-4" />
              Atrás
            </button>
            <span className="text-xs text-muted-foreground">
              {step + 1} / {STEPS.length}
            </span>
            <button
              type="button"
              onClick={next}
              disabled={!canNext}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {step === STEPS.length - 1 ? "Empezar" : "Siguiente"}
              {step === STEPS.length - 1 ? <Check className="size-4" /> : <ArrowRight className="size-4" />}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onComplete({ ...draft, modeloCuentas: modelo, cuentas: defaultCuentasForModelo(modelo) })}
          className="mx-auto mt-4 block text-xs text-muted-foreground/70 transition-colors hover:text-foreground"
        >
          Omitir y configurar después
        </button>
      </div>
    </div>
  )
}
