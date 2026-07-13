"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  type AjustesAhorro,
  type Config,
  type GastosPorMes,
  type IngresosPorMes,
  type Meta,
  type SaldosReales,
  DEFAULT_CONFIG,
  generarProyeccion,
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
  const [onboarded, setOnboarded] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>("idle")

  // Initial load
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const data = JSON.parse(raw) as Partial<StoredData>
        if (data.config) setConfig({ ...DEFAULT_CONFIG, ...data.config })
        if (data.gastosPorMes) setGastosPorMes(data.gastosPorMes)
        if (data.metas) setMetas(data.metas)
        if (data.ajustesAhorro) setAjustesAhorro(data.ajustesAhorro)
        if (data.saldosRealesAhorro) setSaldosRealesAhorro(data.saldosRealesAhorro)
        if (data.saldosRealesGastos) setSaldosRealesGastos(data.saldosRealesGastos)
        if (data.ingresosPorMes) setIngresosPorMes(data.ingresosPorMes)
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
            onboarded,
          }),
        )
        setSaveState("saved")
      } catch {
        setSaveState("idle")
      }
    }, 500)
    return () => clearTimeout(t)
  }, [config, gastosPorMes, metas, ajustesAhorro, saldosRealesAhorro, saldosRealesGastos, ingresosPorMes, onboarded, loaded])

  const proyeccion = useMemo(
    () => generarProyeccion(config, gastosPorMes, metas, ajustesAhorro, saldosRealesAhorro, saldosRealesGastos, ingresosPorMes),
    [config, gastosPorMes, metas, ajustesAhorro, saldosRealesAhorro, saldosRealesGastos, ingresosPorMes],
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
    onboarded,
    loaded,
    saveState,
    proyeccion,
    completeOnboarding,
    resetAll,
  }
}
