// ─── Account model ───────────────────────────────────────────────────────────
export type ModeloCuentas = "dual" | "single" | "custom"
export type TipoCuenta = "ahorro" | "gastos" | "general"

export interface Cuenta {
  id: string
  nombre: string
  tipo: TipoCuenta
  saldoInicial: number
  depositoFijoMensual: number // depósito automático mensual a esta cuenta
  limiteGasto?: number // solo para tipo "general" (single) — todo lo que no se gasta aquí es "ahorro virtual"
}

// ─── Core types ──────────────────────────────────────────────────────────────
export type Prioridad = "Alta" | "Media" | "Baja"

export type ModificadorBase = {
  id: string
  mesInicio: string // YYYY-MM
  mesFin?: string // YYYY-MM
  sueldo: number // Para UI
  cuentas: { cuentaId: string; monto: number }[]
}

export interface Config {
  sueldo: number
  // Legacy fields — kept for dual backward compat, derived from cuentas in dual mode
  ahorroBase: number
  gastoBase: number
  ahorroActual: number
  gastosActual: number
  // Multi-account
  modeloCuentas: ModeloCuentas
  cuentas: Cuenta[]
  // Time
  mesInicio: string
  mesesAProyectar: number
  // Discount
  descuentoActivo: boolean
  descuentoMonto: number
  descuentoMesFin: string
  descuentoCuentaId?: string
  // Misc
  fechaNacimiento: string
  tieneIngresosVariables?: boolean
  modificadoresBase?: ModificadorBase[]
}

export interface Gasto {
  id: string
  concepto: string
  monto: number
  cuentaId: string // which account this expense comes from
}

export interface Ajuste {
  id: string
  concepto: string
  monto: number // positivo = aporte, negativo = retiro
  cuentaId: string
}

export interface DistribucionIngreso {
  cuentaId: string
  monto: number
}

export interface IngresoExtra {
  id: string
  concepto: string
  montoTotal: number
  distribucion: DistribucionIngreso[]
}

export interface Meta {
  id: string
  nombre: string
  categoria: string
  precio: number
  prioridad: Prioridad
  comprado: boolean
  mesComprado: string | null
  cuentaId?: string // which account to debit when purchased (defaults to first "ahorro" account)
}

export interface SaldoCuenta {
  cuentaId: string
  nombre: string
  tipo: TipoCuenta
  saldo: number
  depositoBase: number
  ajustesDelMes: number
  ingresoDelMes: number
  gastoDelMes: number
  comprasDelMes: number
  tieneReal: boolean
  // For single accounts with limiteGasto: show virtual split
  ahorroVirtual?: number
  gastosVirtual?: number
}

export interface Fila {
  mes: string
  label: string
  // Per-account balances
  saldosPorCuenta: SaldoCuenta[]
  // Convenience totals (sum of all accounts)
  totalAhorro: number   // sum of "ahorro" type accounts
  totalGastos: number   // sum of "gastos" type accounts
  totalGeneral: number  // sum of "general" type accounts
  totalNeto: number     // sum of everything
  // Legacy fields for backward compat with existing UI
  ahorroAcumulado: number
  gastosAcumulado: number
  disponibleBase: number
  gastado: number
  sobrante: number
  ajustesDelMes: number
  depositoBase: number
  depositoTotal: number
  deposito: number
  ingresosDelMes: number // <-- NEW
  comprasDelMes: number
  tieneRealAhorro: boolean
  tieneRealGastos: boolean
}

export type GastosPorMes = Record<string, Gasto[]>
export type AjustesAhorro = Record<string, Ajuste[]>
export type SaldosReales = Record<string, string | number>
export type IngresosPorMes = Record<string, IngresoExtra[]>

// ─── Date helpers ─────────────────────────────────────────────────────────────
export const MESES_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
export const MESES_ES_LARGO = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
]

export function keyToParts(key: string) {
  const [y, m] = key.split("-").map(Number)
  return { y, m }
}
export function partsToKey(y: number, m: number) {
  return `${y}-${String(m).padStart(2, "0")}`
}
export function addMonths(key: string, n: number) {
  const { y, m } = keyToParts(key)
  const t = m - 1 + n
  return partsToKey(y + Math.floor(t / 12), ((t % 12) + 12) % 12 + 1)
}
export function monthLabel(key: string, long = false) {
  const { y, m } = keyToParts(key)
  return `${(long ? MESES_ES_LARGO : MESES_ES)[m - 1]} ${y}`
}
export function compareKeys(a: string, b: string) {
  return a.localeCompare(b)
}
export function fmt(n: number) {
  return (Number(n) || 0).toLocaleString("es-EC", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** Parse money/decimal strings that may use comma or period. */
export function parseDecimal(v: string | number | null | undefined): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : NaN
  if (v == null || String(v).trim() === "") return NaN
  const n = Number(String(v).trim().replaceAll(",", "."))
  return Number.isFinite(n) ? n : NaN
}
export function uid() {
  return Math.random().toString(36).slice(2, 10)
}
export function nowKey() {
  const d = new Date()
  return partsToKey(d.getFullYear(), d.getMonth() + 1)
}

// ─── Default accounts ─────────────────────────────────────────────────────────
export const DEFAULT_CUENTA_AHORRO: Cuenta = {
  id: "ahorro",
  nombre: "Ahorro",
  tipo: "ahorro",
  saldoInicial: 0,
  depositoFijoMensual: 0,
}

export const DEFAULT_CUENTA_GASTOS: Cuenta = {
  id: "gastos",
  nombre: "Gastos",
  tipo: "gastos",
  saldoInicial: 0,
  depositoFijoMensual: 0,
}

export const DEFAULT_CUENTA_SINGLE: Cuenta = {
  id: "general",
  nombre: "Mi cuenta",
  tipo: "general",
  saldoInicial: 0,
  depositoFijoMensual: 0,
  limiteGasto: 0,
}

export function defaultCuentasForModelo(modelo: ModeloCuentas): Cuenta[] {
  if (modelo === "dual") return [DEFAULT_CUENTA_AHORRO, DEFAULT_CUENTA_GASTOS]
  if (modelo === "single") return [{ ...DEFAULT_CUENTA_SINGLE }]
  return [] // custom: user creates their own
}

// ─── Config defaults ──────────────────────────────────────────────────────────
export const DEFAULT_CONFIG: Config = {
  sueldo: 0,
  ahorroBase: 0,
  gastoBase: 0,
  ahorroActual: 0,
  gastosActual: 0,
  modeloCuentas: "dual",
  cuentas: [{ ...DEFAULT_CUENTA_AHORRO }, { ...DEFAULT_CUENTA_GASTOS }],
  mesInicio: nowKey(),
  mesesAProyectar: 12,
  descuentoActivo: false,
  descuentoMonto: 50,
  descuentoMesFin: addMonths(nowKey(), 5),
  descuentoCuentaId: "",
  fechaNacimiento: "",
  tieneIngresosVariables: false,
  modificadoresBase: [],
}

export const PRIORIDADES: Prioridad[] = ["Alta", "Media", "Baja"]

// ─── Helpers ──────────────────────────────────────────────────────────────────
/** Returns the first account of tipo "ahorro", falling back to first account */
export function cuentaAhorroId(cuentas: Cuenta[]): string {
  return cuentas.find((c) => c.tipo === "ahorro")?.id ?? cuentas[0]?.id ?? "ahorro"
}

/** Returns the first account of tipo "gastos" or "general", falling back to first account */
export function cuentaGastosId(cuentas: Cuenta[]): string {
  return cuentas.find((c) => c.tipo === "gastos" || c.tipo === "general")?.id ?? cuentas[0]?.id ?? "gastos"
}

// ─── Projection logic ─────────────────────────────────────────────────────────
export function generarProyeccion(
  config: Config,
  gastosPorMes: GastosPorMes = {},
  metas: Meta[] = [],
  ajustesAhorro: AjustesAhorro = {},
  saldosRealesAhorro: SaldosReales = {},
  saldosRealesGastos: SaldosReales = {},
  ingresosPorMes: IngresosPorMes = {},
): Fila[] {
  const meses: string[] = []
  for (let i = 0; i < config.mesesAProyectar; i++) meses.push(addMonths(config.mesInicio, i))

  // Build per-account running balances
  const acum: Record<string, number> = {}
  for (const c of config.cuentas) {
    acum[c.id] = Number(c.saldoInicial) || 0
  }

  // Legacy compat: if dual mode, respect the top-level ahorroActual/gastosActual
  if (config.modeloCuentas === "dual") {
    acum["ahorro"] = Number(config.ahorroActual) || acum["ahorro"] || 0
    acum["gastos"] = Number(config.gastosActual) || acum["gastos"] || 0
  }

  const filas: Fila[] = []

  for (const mesKey of meses) {
    const saldosPorCuenta: SaldoCuenta[] = []

    for (const cuenta of config.cuentas) {
      const cid = cuenta.id

      // --- Deposit base ---
      let depositoBase = Number(cuenta.depositoFijoMensual) || 0

      // Buscamos si existe un Modificador Activo para este mes
      const mod = config.modificadoresBase?.slice().reverse().find(
        (m: ModificadorBase) =>
          compareKeys(mesKey, m.mesInicio) >= 0 &&
          (!m.mesFin || compareKeys(mesKey, m.mesFin) <= 0)
      )

      const modCuenta = mod?.cuentas?.find(c => c.cuentaId === cid)

      if (modCuenta) {
        depositoBase = Number(modCuenta.monto) || 0
      } else {
        // Legacy compat for dual mode (Solo si no hay modificador activo)
        if (config.modeloCuentas === "dual") {
          if (cid === "ahorro") depositoBase = Number(config.ahorroBase) || 0
          if (cid === "gastos") depositoBase = Number(config.gastoBase) || 0
        }
      }

      // ─── Descuento Temporal Universal ───
      const targetDescuentoId = config.descuentoCuentaId || cuentaGastosId(config.cuentas)
      if (cid === targetDescuentoId && config.descuentoActivo) {
        const enRango = compareKeys(mesKey, config.mesInicio) >= 0 && compareKeys(mesKey, config.descuentoMesFin) <= 0
        if (enRango) {
          depositoBase -= Number(config.descuentoMonto) || 0
        }
      }

      // --- Gastos ---
      const gastosDelMes = (gastosPorMes[mesKey] || [])
        .filter((g) => g.cuentaId === cid)
        .reduce((s, g) => s + (Number(g.monto) || 0), 0)

      // --- Ajustes ---
      const ajustesDelMes = (ajustesAhorro[mesKey] || [])
        .filter((a) => a.cuentaId === cid)
        .reduce((s, a) => s + (Number(a.monto) || 0), 0)

      // --- Ingresos extra ---
      const ingresoDelMes = (ingresosPorMes[mesKey] || [])
        .flatMap((i) => i.distribucion)
        .filter((d) => d.cuentaId === cid)
        .reduce((s, d) => s + (Number(d.monto) || 0), 0)

      // --- Compras (metas) — only debit from "ahorro" type accounts ---
      let comprasDelMes = 0
      const metaCuentaId = metas[0] ? (metas[0].cuentaId ?? cuentaAhorroId(config.cuentas)) : "ahorro"
      if (cuenta.tipo === "ahorro" || (config.cuentas.length === 1)) {
        comprasDelMes = metas
          .filter((m) => m.comprado && m.mesComprado === mesKey && (m.cuentaId ?? cuentaAhorroId(config.cuentas)) === cid)
          .reduce((s, m) => s + (Number(m.precio) || 0), 0)
      }

      // --- Real override (saldos reales) ---
      // For dual mode: ahorro → saldosRealesAhorro, gastos → saldosRealesGastos
      let realOverride: number | undefined
      let tieneReal = false
      if (config.modeloCuentas === "dual") {
        if (cid === "ahorro" && saldosRealesAhorro[mesKey] !== undefined && saldosRealesAhorro[mesKey] !== "") {
          realOverride = parseDecimal(saldosRealesAhorro[mesKey]) || 0
          tieneReal = true
        }
        if (cid === "gastos" && saldosRealesGastos[mesKey] !== undefined && saldosRealesGastos[mesKey] !== "") {
          realOverride = parseDecimal(saldosRealesGastos[mesKey]) || 0
          tieneReal = true
        }
      }

      // --- Calculate new balance ---
      if (cuenta.tipo === "gastos" || (cuenta.tipo === "general" && config.modeloCuentas !== "dual")) {
        // Gastos: depositoBase is the available pool, sobrante accumulates
        const sobrante = Math.max(depositoBase - gastosDelMes + ingresoDelMes, 0)
        if (realOverride !== undefined) {
          acum[cid] = realOverride
        } else {
          acum[cid] += sobrante
        }
      } else {
        // Ahorro: deposits + adjustments + income - purchases
        const nuevo = acum[cid] + depositoBase + ajustesDelMes + ingresoDelMes - comprasDelMes
        if (realOverride !== undefined) {
          acum[cid] = realOverride
        } else {
          acum[cid] = nuevo
        }
      }

      // --- Virtual split for single accounts with limiteGasto ---
      let ahorroVirtual: number | undefined
      let gastosVirtual: number | undefined
      if (cuenta.tipo === "general" && (cuenta.limiteGasto ?? 0) > 0) {
        const limite = cuenta.limiteGasto!
        gastosVirtual = Math.min(acum[cid], limite)
        ahorroVirtual = Math.max(acum[cid] - limite, 0)
      }

      saldosPorCuenta.push({
        cuentaId: cid,
        nombre: cuenta.nombre,
        tipo: cuenta.tipo,
        saldo: acum[cid],
        depositoBase,
        ajustesDelMes,
        ingresoDelMes,
        gastoDelMes: gastosDelMes,
        comprasDelMes,
        tieneReal,
        ...(ahorroVirtual !== undefined ? { ahorroVirtual, gastosVirtual } : {}),
      })
    }

    // --- Totals ---
    const totalAhorro = saldosPorCuenta.filter((s) => s.tipo === "ahorro").reduce((sum, s) => sum + s.saldo, 0)
    const totalGastos = saldosPorCuenta.filter((s) => s.tipo === "gastos").reduce((sum, s) => sum + s.saldo, 0)
    const totalGeneral = saldosPorCuenta.filter((s) => s.tipo === "general").reduce((sum, s) => sum + s.saldo, 0)
    const totalNeto = totalAhorro + totalGastos + totalGeneral

    // --- Legacy fields (for backward compat with ResumenTab / ControlTab) ---
    const ahorroRow = saldosPorCuenta.find((s) => s.tipo === "ahorro")
    const gastosRow = saldosPorCuenta.find((s) => s.tipo === "gastos" || s.tipo === "general")

    filas.push({
      mes: mesKey,
      label: monthLabel(mesKey),
      saldosPorCuenta,
      totalAhorro,
      totalGastos,
      totalGeneral,
      totalNeto,
      // Legacy
      ahorroAcumulado: ahorroRow?.saldo ?? totalNeto,
      gastosAcumulado: gastosRow?.saldo ?? 0,
      disponibleBase: gastosRow?.depositoBase ?? 0,
      gastado: gastosRow?.gastoDelMes ?? 0,
      sobrante: Math.max((gastosRow?.depositoBase ?? 0) - (gastosRow?.gastoDelMes ?? 0), 0),
      ajustesDelMes: ahorroRow?.ajustesDelMes ?? 0,
      depositoBase: ahorroRow?.depositoBase ?? 0,
      depositoTotal: (ahorroRow?.depositoBase ?? 0) + (ahorroRow?.ajustesDelMes ?? 0),
      deposito: (ahorroRow?.depositoBase ?? 0) + (ahorroRow?.ajustesDelMes ?? 0),
      ingresosDelMes: saldosPorCuenta.reduce((sum, s) => sum + s.ingresoDelMes, 0),
      comprasDelMes: saldosPorCuenta.reduce((s, sc) => s + sc.comprasDelMes, 0),
      tieneRealAhorro: ahorroRow?.tieneReal ?? false,
      tieneRealGastos: gastosRow?.tieneReal ?? false,
    })
  }

  return filas
}

export function primerMesQueAlcanza(proyeccion: Fila[], objetivo: number): string | null {
  if (objetivo <= 0) return null
  return proyeccion.find((f) => f.ahorroAcumulado >= objetivo)?.mes || null
}
