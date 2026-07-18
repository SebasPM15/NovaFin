"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  type AjustesAhorro,
  type Config,
  type GastosPorMes,
  type IngresosPorMes,
  type Meta,
  type SaldosReales,
  type TransferenciasPorMes,
  DEFAULT_CONFIG,
  generarProyeccion,
  uid,
} from "@/lib/finance"

const STORAGE_KEY = "novafin-v2"

interface StoredData {
  config: Config
  gastosPorMes: GastosPorMes
  metas: Meta[]
  ajustesAhorro: AjustesAhorro
  saldosRealesAhorro: SaldosReales
  saldosRealesGastos: SaldosReales
  ingresosPorMes: IngresosPorMes
  transferenciasPorMes: TransferenciasPorMes
  onboarded: boolean
}

type SaveState = "idle" | "saving" | "saved"

export function useNovaFin() {
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG)
  const [gastosPorMes, setGastosPorMes] = useState<GastosPorMes>({})
  const [metas, setMetas] = useState<Meta[]>([])
  const [ajustesAhorro, setAjustesAhorro] = useState<AjustesAhorro>({})
  const [saldosRealesAhorro, setSaldosRealesAhorro] = useState<SaldosReales>({})
  const [saldosRealesGastos, setSaldosRealesGastos] = useState<SaldosReales>({})
  const [ingresosPorMes, setIngresosPorMes] = useState<IngresosPorMes>({})
  const [transferenciasPorMes, setTransferenciasPorMes] = useState<TransferenciasPorMes>({})
  const [onboarded, setOnboarded] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>("idle")

  // Initial load
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const data = JSON.parse(raw) as Partial<StoredData>
        if (data.config) {
          const loadedConfig = { ...DEFAULT_CONFIG, ...data.config }
          
          // Migration: Convert legacy single discount to multiple discounts array
          if (loadedConfig.descuentoActivo && (!loadedConfig.descuentos || loadedConfig.descuentos.length === 0)) {
            loadedConfig.descuentos = [{
              id: uid(),
              concepto: "Descuento configurado",
              monto: Number(loadedConfig.descuentoMonto) || 0,
              mesInicio: loadedConfig.mesInicio,
              mesFin: loadedConfig.descuentoMesFin,
              cuentaId: loadedConfig.descuentoCuentaId || (loadedConfig.cuentas.find(c => c.tipo === "gastos")?.id ?? loadedConfig.cuentas[0].id),
            }]
            loadedConfig.descuentoActivo = false // Disable legacy field
          }
          
          setConfig(loadedConfig)
        }
        if (data.gastosPorMes) setGastosPorMes(data.gastosPorMes)
        if (data.metas) setMetas(data.metas)
        if (data.ajustesAhorro) setAjustesAhorro(data.ajustesAhorro)
        if (data.saldosRealesAhorro) setSaldosRealesAhorro(data.saldosRealesAhorro)
        if (data.saldosRealesGastos) setSaldosRealesGastos(data.saldosRealesGastos)
        if (data.ingresosPorMes) setIngresosPorMes(data.ingresosPorMes)
        if (data.transferenciasPorMes) setTransferenciasPorMes(data.transferenciasPorMes)
        if (data.onboarded) setOnboarded(true)
      }
    } catch {
      // ignore corrupt storage
    }
    setLoaded(true)
  }, [])

  // Autosave
  useEffect(() => {
    if (!loaded) return
    setSaveState("saving")
    const t = setTimeout(() => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            config,
            gastosPorMes,
            metas,
            ajustesAhorro,
            saldosRealesAhorro,
            saldosRealesGastos,
            ingresosPorMes,
            transferenciasPorMes,
            onboarded,
          }),
        )
        setSaveState("saved")
      } catch {
        setSaveState("idle")
      }
    }, 500)
    return () => clearTimeout(t)
  }, [config, gastosPorMes, metas, ajustesAhorro, saldosRealesAhorro, saldosRealesGastos, ingresosPorMes, transferenciasPorMes, onboarded, loaded])

  const proyeccion = useMemo(
    () => generarProyeccion(config, gastosPorMes, metas, ajustesAhorro, saldosRealesAhorro, saldosRealesGastos, ingresosPorMes, transferenciasPorMes),
    [config, gastosPorMes, metas, ajustesAhorro, saldosRealesAhorro, saldosRealesGastos, ingresosPorMes, transferenciasPorMes],
  )

  const completeOnboarding = useCallback((nuevaConfig: Config) => {
    setConfig(nuevaConfig)
    setOnboarded(true)
  }, [])

  const resetAll = useCallback(() => {
    setConfig(DEFAULT_CONFIG)
    setGastosPorMes({})
    setMetas([])
    setAjustesAhorro({})
    setSaldosRealesAhorro({})
    setSaldosRealesGastos({})
    setIngresosPorMes({})
    setTransferenciasPorMes({})
    setOnboarded(false)
  }, [])

  return {
    config,
    setConfig,
    gastosPorMes,
    setGastosPorMes,
    metas,
    setMetas,
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
    onboarded,
    loaded,
    saveState,
    proyeccion,
    completeOnboarding,
    resetAll,
  }
}
