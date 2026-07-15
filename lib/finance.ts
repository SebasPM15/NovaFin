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

// ─── Sobresueldos config ─────────────────────────────────────────────────────
export interface SobresueldosConfig {
  activo: boolean
  confirmado: boolean                              // usuario ha revisado y confirmado los valores
  fechaIngresoTrabajo: string                      // "YYYY-MM-DD"
  sbu: number                                      // SBU vigente (p.ej. 482)
  modalidadDecimoTercero: "acumulado" | "diciembre" // pago en dic único o mensualizado
  modalidadDecimoCuarto: "acumulado" | "agosto" | "abril" // Sierra=agosto
  distribucionDecimoTercero: DistribucionIngreso[]   // a qué cuentas va el D13
  distribucionDecimoCuarto: DistribucionIngreso[]    // a qué cuentas va el D14
  recibirFondosReserva: boolean                    // recibir FR mensualmente tras 1 año
  distribucionFondosReserva: DistribucionIngreso[] // a qué cuentas van los FR
}

export const DEFAULT_SOBRESUELDOS: SobresueldosConfig = {
  activo: false,
  confirmado: false,
  fechaIngresoTrabajo: "",
  sbu: 482,
  modalidadDecimoTercero: "diciembre",
  modalidadDecimoCuarto: "agosto",
  distribucionDecimoTercero: [],
  distribucionDecimoCuarto: [],
  recibirFondosReserva: false,
  distribucionFondosReserva: [],
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
  // IESS
  aportaIESS?: boolean          // si activo, sueldo es bruto; neto = sueldo * 0.9055
  // Sobresueldos (Décimos + Fondos de Reserva) — completamente opt-in
  sobresueldos?: SobresueldosConfig
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
  sobresueldoDelMes: number  // décimos + fondos de reserva aplicados a esta cuenta este mes
  // For single accounts with limiteGasto: show virtual split
  ahorroVirtual?: number
  gastosVirtual?: number
}

export interface SobresueldosDelMes {
  decimoTercero: number   // montos calculados para este mes
  decimoCuarto: number
  fondosReserva: number
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
  ingresosDelMes: number
  comprasDelMes: number
  tieneRealAhorro: boolean
  tieneRealGastos: boolean
  sobresueldosDelMes: SobresueldosDelMes
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
  aportaIESS: false,
  sobresueldos: undefined,
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

// ─── Sobresueldos helpers ─────────────────────────────────────────────────────

/**
 * Parses "YYYY-MM-DD" into a Date at midnight UTC.
 * Returns null if the string is empty or invalid.
 */
export function parseIngresDate(s: string): Date | null {
  if (!s || s.length < 10) return null
  const d = new Date(s + "T00:00:00Z")
  return isNaN(d.getTime()) ? null : d
}

/**
 * Days worked in a calendar month (as a fraction 0..1)
 * given an employment start date.
 * - If the start date is after the month → 0
 * - If 1st of month or before → 1
 * - Otherwise: (daysInMonth - startDay + 1) / daysInMonth
 */
function fraccionMesTrabajado(inicio: Date, y: number, m: number): number {
  const startY = inicio.getUTCFullYear()
  const startM = inicio.getUTCMonth() + 1 // 1-indexed
  const startD = inicio.getUTCDate()
  // Before start month → 0
  if (y < startY || (y === startY && m < startM)) return 0
  // Same year/month → partial
  if (y === startY && m === startM) {
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate()
    return Math.max(0, (daysInMonth - startD + 1) / daysInMonth)
  }
  // After start month → full
  return 1
}

/**
 * Calcula el Décimo Tercero que se paga en el mes de diciembre `dicKey` (YYYY-MM).
 * Período: 1 dic del año anterior → 30 nov del año actual.
 * Fórmula: Σ(sueldoBruto × fraccionMesTrabajado) / 12
 */
export function calcDecimoTercero(inicio: Date, bruto: number, dicKey: string): number {
  const dicY = parseInt(dicKey.substring(0, 4))
  // Period: dec(dicY-1) to nov(dicY)
  let total = 0
  // Months in period: [dec(dicY-1), jan(dicY), ..., nov(dicY)]
  const months: { y: number; m: number }[] = []
  months.push({ y: dicY - 1, m: 12 })
  for (let mo = 1; mo <= 11; mo++) months.push({ y: dicY, m: mo })
  for (const { y, m } of months) total += bruto * fraccionMesTrabajado(inicio, y, m)
  return Math.round((total / 12) * 100) / 100
}

/**
 * Calcula el Décimo Cuarto que se paga en agosto (Sierra) o abril (Costa) del año `pagoKey`.
 * Período Sierra:  1 ago (año anterior) → 31 jul (año actual)
 * Período Costa:   1 ene (año) → 31 dic (año anterior) — aprox. 1 abr→31 mar
 * Fórmula: SBU × (díasTrabajadosEnPeriodo / 360)
 */
export function calcDecimoCuarto(
  inicio: Date,
  sbu: number,
  pagoKey: string,
  modalidad: "agosto" | "abril",
): number {
  const pagoY = parseInt(pagoKey.substring(0, 4))
  // Period months
  let months: { y: number; m: number }[]
  if (modalidad === "agosto") {
    // Aug(pagoY-1) → Jul(pagoY)
    months = []
    months.push(...[8, 9, 10, 11, 12].map((m) => ({ y: pagoY - 1, m })))
    months.push(...[1, 2, 3, 4, 5, 6, 7].map((m) => ({ y: pagoY, m })))
  } else {
    // Apr(pagoY-1) → Mar(pagoY)
    months = []
    months.push(...[4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => ({ y: pagoY - 1, m })))
    months.push(...[1, 2, 3].map((m) => ({ y: pagoY, m })))
  }
  // Sum fractional months as "days" (each full month = 30 days in Ecuador)
  let dias = 0
  for (const { y, m } of months) {
    const frac = fraccionMesTrabajado(inicio, y, m)
    dias += frac * 30 // Ecuador uses 360-day base (30 per month)
  }
  return Math.round((sbu * Math.min(dias, 360)) / 360 * 100) / 100
}

/**
 * Distribuye un monto entre cuentas según la configuración.
 * Si no hay distribución configurada, lo pone todo en la primera cuenta de ahorro.
 */
export function distribuirMonto(
  monto: number,
  distVal: DistribucionIngreso[] | undefined | null,
  cuentas: Cuenta[],
): DistribucionIngreso[] {
  const dist = distVal || []
  if (monto <= 0) return []
  if (dist.length === 0) {
    const cid = cuentaAhorroId(cuentas)
    return [{ cuentaId: cid, monto }]
  }
  const totalPct = dist.reduce((s, d) => s + d.monto, 0)
  if (totalPct <= 0) return [{ cuentaId: cuentaAhorroId(cuentas), monto }]

  const result: DistribucionIngreso[] = []
  let assigned = 0
  
  for (let i = 0; i < dist.length; i++) {
    const isLast = i === dist.length - 1
    if (isLast) {
      result.push({ cuentaId: dist[i].cuentaId, monto: Math.max(Math.round((monto - assigned) * 100) / 100, 0) })
    } else {
      const val = Math.round((monto * dist[i].monto / totalPct) * 100) / 100
      assigned += val
      result.push({ cuentaId: dist[i].cuentaId, monto: val })
    }
  }
  
  return result
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

  // ─── Sobresueldos setup ───
  const ss = config.sobresueldos
  const ssActivo = ss?.activo && ss?.confirmado && !!ss?.fechaIngresoTrabajo
  const inicioLaboral = ssActivo ? parseIngresDate(ss!.fechaIngresoTrabajo) : null
  const bruto = config.sueldo // sueldo siempre almacenado como bruto

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

      // --- Ingresos extra (manuales) ---
      const ingresoDelMes = (ingresosPorMes[mesKey] || [])
        .flatMap((i) => i.distribucion)
        .filter((d) => d.cuentaId === cid)
        .reduce((s, d) => s + (Number(d.monto) || 0), 0)

      // --- Sobresueldos (décimos + fondos de reserva) ---
      let sobresueldoDelMes = 0
      if (ssActivo && inicioLaboral) {
        const { m: mesNum, y: mesYear } = keyToParts(mesKey)

        // Décimo Tercero: en el mes de diciembre
        if (mesNum === 12 && ss!.modalidadDecimoTercero === "diciembre") {
          const d13 = calcDecimoTercero(inicioLaboral, bruto, mesKey)
          const distD13 = distribuirMonto(d13, ss!.distribucionDecimoTercero || [], config.cuentas)
          sobresueldoDelMes += distD13.find((d) => d.cuentaId === cid)?.monto ?? 0
        } else if (ss!.modalidadDecimoTercero === "acumulado") {
          // Acumulado mensual: D13 anual / 12
          const d13anual = calcDecimoTercero(inicioLaboral, bruto, partsToKey(mesYear, 12))
          const d13mensual = Math.round(d13anual / 12 * 100) / 100
          const distD13 = distribuirMonto(d13mensual, ss!.distribucionDecimoTercero || [], config.cuentas)
          sobresueldoDelMes += distD13.find((d) => d.cuentaId === cid)?.monto ?? 0
        }

        // Décimo Cuarto: en el mes de agosto o abril
        const mesD4 = ss!.modalidadDecimoCuarto === "agosto" ? 8 : 4
        if (mesNum === mesD4 && ss!.modalidadDecimoCuarto !== "acumulado") {
          const d14 = calcDecimoCuarto(inicioLaboral, ss!.sbu ?? 482, mesKey, ss!.modalidadDecimoCuarto)
          const distD14 = distribuirMonto(d14, ss!.distribucionDecimoCuarto || [], config.cuentas)
          sobresueldoDelMes += distD14.find((d) => d.cuentaId === cid)?.monto ?? 0
        } else if (ss!.modalidadDecimoCuarto === "acumulado") {
          const refKey = partsToKey(mesYear, ss!.modalidadDecimoCuarto === "acumulado" ? 8 : 8)
          const d14anual = calcDecimoCuarto(inicioLaboral, ss!.sbu ?? 482, refKey, "agosto")
          const d14mensual = Math.round(d14anual / 12 * 100) / 100
          const distD14 = distribuirMonto(d14mensual, ss!.distribucionDecimoCuarto || [], config.cuentas)
          sobresueldoDelMes += distD14.find((d) => d.cuentaId === cid)?.monto ?? 0
        }

        // Fondos de Reserva: desde el mes 13 de empleo, 8.33% del bruto
        if (ss!.recibirFondosReserva) {
          const mesAniversario = (() => {
            const d = new Date(inicioLaboral)
            d.setUTCFullYear(d.getUTCFullYear() + 1)
            d.setUTCMonth(d.getUTCMonth() + 1) // starts the month AFTER anniversary
            return partsToKey(d.getUTCFullYear(), d.getUTCMonth() + 1)
          })()
          if (compareKeys(mesKey, mesAniversario) >= 0) {
            const fr = Math.round(bruto * 0.0833 * 100) / 100
            const distFR = distribuirMonto(fr, ss!.distribucionFondosReserva || [], config.cuentas)
            sobresueldoDelMes += distFR.find((d) => d.cuentaId === cid)?.monto ?? 0
          }
        }
      }

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
        const sobrante = Math.max(depositoBase - gastosDelMes + ingresoDelMes + sobresueldoDelMes, 0)
        if (realOverride !== undefined) {
          acum[cid] = realOverride
        } else {
          acum[cid] += sobrante
        }
      } else {
        // Ahorro: deposits + adjustments + income + sobresueldos - purchases
        const nuevo = acum[cid] + depositoBase + ajustesDelMes + ingresoDelMes + sobresueldoDelMes - comprasDelMes
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
        sobresueldoDelMes,
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
      sobresueldosDelMes: (() => {
        if (!ssActivo || !inicioLaboral) return { decimoTercero: 0, decimoCuarto: 0, fondosReserva: 0 }
        const { m: mesNum, y: mesYear } = keyToParts(mesKey)
        const d13 = (mesNum === 12 && ss!.modalidadDecimoTercero === "diciembre")
          ? calcDecimoTercero(inicioLaboral, bruto, mesKey)
          : ss!.modalidadDecimoTercero === "acumulado"
            ? Math.round(calcDecimoTercero(inicioLaboral, bruto, partsToKey(mesYear, 12)) / 12 * 100) / 100
            : 0
        const mesD4 = ss!.modalidadDecimoCuarto === "agosto" ? 8 : 4
        const d14 = (mesNum === mesD4 && ss!.modalidadDecimoCuarto !== "acumulado")
          ? calcDecimoCuarto(inicioLaboral, ss!.sbu ?? 482, mesKey, ss!.modalidadDecimoCuarto as "agosto" | "abril")
          : ss!.modalidadDecimoCuarto === "acumulado"
            ? Math.round(calcDecimoCuarto(inicioLaboral, ss!.sbu ?? 482, partsToKey(mesYear, 8), "agosto") / 12 * 100) / 100
            : 0
        const mesAniv = (() => {
          const d = new Date(inicioLaboral)
          d.setUTCFullYear(d.getUTCFullYear() + 1)
          d.setUTCMonth(d.getUTCMonth() + 1)
          return partsToKey(d.getUTCFullYear(), d.getUTCMonth() + 1)
        })()
        const fr = (ss!.recibirFondosReserva && compareKeys(mesKey, mesAniv) >= 0)
          ? Math.round(bruto * 0.0833 * 100) / 100
          : 0
        return { decimoTercero: d13, decimoCuarto: d14, fondosReserva: fr }
      })(),
    })
  }

  return filas
}

export function primerMesQueAlcanza(proyeccion: Fila[], objetivo: number): string | null {
  if (objetivo <= 0) return null
  return proyeccion.find((f) => f.ahorroAcumulado >= objetivo)?.mes || null
}
