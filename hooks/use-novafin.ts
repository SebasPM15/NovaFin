"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
import {
  type SyncMeta,
  LOCAL_SYNC_VER,
  SyncConflictError,
  clearSyncMeta,
  completePairing,
  loadSyncMeta,
  pullBlob,
  pushBlob,
  saveSyncMeta,
  startPairing,
} from "@/lib/sync/client"

const STORAGE_KEY = "novafin-v2"

export interface StoredData {
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

export type SyncStatus = "disabled" | "idle" | "syncing" | "conflict" | "error"

export interface SyncConflict {
  local: StoredData
  remote: StoredData
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildStoredData(partial: Partial<StoredData>): StoredData {
  const loadedConfig: Config = partial.config
    ? { ...DEFAULT_CONFIG, ...partial.config }
    : DEFAULT_CONFIG

  // Migration: legacy single discount → array
  if (loadedConfig.descuentoActivo && (!loadedConfig.descuentos || loadedConfig.descuentos.length === 0)) {
    loadedConfig.descuentos = [{
      id: uid(),
      concepto: "Descuento configurado",
      monto: Number(loadedConfig.descuentoMonto) || 0,
      mesInicio: loadedConfig.mesInicio,
      mesFin: loadedConfig.descuentoMesFin,
      cuentaId: loadedConfig.descuentoCuentaId || (loadedConfig.cuentas.find(c => c.tipo === "gastos")?.id ?? loadedConfig.cuentas[0]?.id ?? ""),
    }]
    loadedConfig.descuentoActivo = false
  }

  return {
    config: loadedConfig,
    gastosPorMes: partial.gastosPorMes ?? {},
    metas: partial.metas ?? [],
    ajustesAhorro: partial.ajustesAhorro ?? {},
    saldosRealesAhorro: partial.saldosRealesAhorro ?? {},
    saldosRealesGastos: partial.saldosRealesGastos ?? {},
    ingresosPorMes: partial.ingresosPorMes ?? {},
    transferenciasPorMes: partial.transferenciasPorMes ?? {},
    onboarded: partial.onboarded ?? false,
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

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

  // ── Sync state ──
  const [syncMeta, setSyncMeta] = useState<SyncMeta | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("disabled")
  const [syncConflict, setSyncConflict] = useState<SyncConflict | null>(null)
  const lastSyncedVersionRef = useRef<number>(0)

  const syncEnabled = syncMeta !== null

  // ── Snapshot helper ──
  const currentSnapshot = useCallback((): StoredData => ({
    config, gastosPorMes, metas, ajustesAhorro,
    saldosRealesAhorro, saldosRealesGastos, ingresosPorMes,
    transferenciasPorMes, onboarded,
  }), [config, gastosPorMes, metas, ajustesAhorro, saldosRealesAhorro, saldosRealesGastos, ingresosPorMes, transferenciasPorMes, onboarded])

  // ── Apply stored data to state ──
  const applyData = useCallback((data: StoredData) => {
    setConfig(data.config)
    setGastosPorMes(data.gastosPorMes)
    setMetas(data.metas)
    setAjustesAhorro(data.ajustesAhorro)
    setSaldosRealesAhorro(data.saldosRealesAhorro)
    setSaldosRealesGastos(data.saldosRealesGastos)
    setIngresosPorMes(data.ingresosPorMes)
    setTransferenciasPorMes(data.transferenciasPorMes)
    setOnboarded(data.onboarded)
  }, [])

  // ── Initial load ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const partial = JSON.parse(raw) as Partial<StoredData>
        const data = buildStoredData(partial)
        applyData(data)
      }
    } catch {
      // ignore corrupt storage
    }

    // Load sync credentials
    const meta = loadSyncMeta()
    if (meta) {
      setSyncMeta(meta)
      const ver = parseInt(localStorage.getItem(LOCAL_SYNC_VER) ?? "0") || 0
      lastSyncedVersionRef.current = ver
    }

    setLoaded(true)
  }, [applyData])

  // ── Pull on load (if sync enabled) ──
  useEffect(() => {
    if (!loaded || !syncMeta) return
    const pull = async () => {
      setSyncStatus("syncing")
      try {
        const result = await pullBlob(syncMeta)
        if (!result) { setSyncStatus("idle"); return }

        if (result.version > lastSyncedVersionRef.current) {
          const remoteData = buildStoredData(JSON.parse(result.data) as Partial<StoredData>)

          // Check if there's local data that would be overwritten
          const raw = localStorage.getItem(STORAGE_KEY)
          const hasLocal = raw && (JSON.parse(raw) as Partial<StoredData>).onboarded

          if (hasLocal) {
            const localData = buildStoredData(JSON.parse(raw!) as Partial<StoredData>)
            // Only conflict if local data is different
            if (JSON.stringify(localData) !== JSON.stringify(remoteData)) {
              setSyncConflict({ local: localData, remote: remoteData })
              setSyncStatus("conflict")
              return
            }
          }

          applyData(remoteData)
          lastSyncedVersionRef.current = result.version
          localStorage.setItem(LOCAL_SYNC_VER, String(result.version))
        }
        setSyncStatus("idle")
      } catch {
        setSyncStatus("error")
      }
    }
    pull()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, syncMeta])

  // ── Autosave + push ──
  useEffect(() => {
    if (!loaded) return
    setSaveState("saving")
    const t = setTimeout(async () => {
      const snapshot: StoredData = {
        config, gastosPorMes, metas, ajustesAhorro,
        saldosRealesAhorro, saldosRealesGastos, ingresosPorMes,
        transferenciasPorMes, onboarded,
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
        setSaveState("saved")
      } catch {
        setSaveState("idle")
      }

      // Push to cloud if sync enabled
      if (syncMeta && syncStatus !== "conflict") {
        try {
          const newVersion = await pushBlob(
            JSON.stringify(snapshot),
            syncMeta,
            lastSyncedVersionRef.current,
          )
          lastSyncedVersionRef.current = newVersion
          localStorage.setItem(LOCAL_SYNC_VER, String(newVersion))
        } catch (err) {
          if (err instanceof SyncConflictError) {
            // Pull remote and let user decide
            setSyncStatus("conflict")
            const result = await pullBlob(syncMeta)
            if (result) {
              setSyncConflict({
                local: snapshot,
                remote: buildStoredData(JSON.parse(result.data) as Partial<StoredData>),
              })
            }
          }
          // Other errors: silent — local save succeeded
        }
      }
    }, 500)
    return () => clearTimeout(t)
  }, [config, gastosPorMes, metas, ajustesAhorro, saldosRealesAhorro, saldosRealesGastos, ingresosPorMes, transferenciasPorMes, onboarded, loaded, syncMeta, syncStatus])

  // ── Sync actions ──────────────────────────────────────────────────────────

  /** Device A: generate a pairing code and activate sync locally. */
  const enableSync = useCallback(async (): Promise<string> => {
    const { pairingCode, meta } = await startPairing()
    saveSyncMeta(meta)
    setSyncMeta(meta)
    setSyncStatus("idle")
    lastSyncedVersionRef.current = 0
    return pairingCode
  }, [])

  /** Device B: pair using a code typed by the user. Returns true on success. */
  const pairWithCode = useCallback(async (rawCode: string): Promise<{ needsConfirm: boolean; remoteData?: StoredData }> => {
    const meta = await completePairing(rawCode)
    const result = await pullBlob(meta)

    const raw = localStorage.getItem(STORAGE_KEY)
    const hasLocal = raw && (JSON.parse(raw) as Partial<StoredData>).onboarded

    if (hasLocal && result) {
      const remoteData = buildStoredData(JSON.parse(result.data) as Partial<StoredData>)
      return { needsConfirm: true, remoteData }
    }

    // No local data: pair silently
    saveSyncMeta(meta)
    setSyncMeta(meta)
    setSyncStatus("idle")
    if (result) {
      const remoteData = buildStoredData(JSON.parse(result.data) as Partial<StoredData>)
      applyData(remoteData)
      lastSyncedVersionRef.current = result.version
      localStorage.setItem(LOCAL_SYNC_VER, String(result.version))
    }
    return { needsConfirm: false }
  }, [applyData])

  /** Called after user confirms overwrite from pairing modal. */
  const confirmPairAndReplace = useCallback(async (rawCode: string, remoteData: StoredData) => {
    const meta = await completePairing(rawCode)
    saveSyncMeta(meta)
    setSyncMeta(meta)
    applyData(remoteData)
    const result = await pullBlob(meta)
    if (result) {
      lastSyncedVersionRef.current = result.version
      localStorage.setItem(LOCAL_SYNC_VER, String(result.version))
    }
    setSyncStatus("idle")
  }, [applyData])

  /** Resolve a sync conflict — keep local or remote data. */
  const resolveConflict = useCallback(async (choice: "local" | "remote") => {
    if (!syncConflict || !syncMeta) return
    const chosen = choice === "local" ? syncConflict.local : syncConflict.remote

    applyData(chosen)
    setSyncConflict(null)
    setSyncStatus("idle")

    // Force push the chosen version
    try {
      // Pull to get the current server version, then overwrite
      const remote = await pullBlob(syncMeta)
      const serverVersion = remote?.version ?? lastSyncedVersionRef.current
      lastSyncedVersionRef.current = serverVersion

      const newVersion = await pushBlob(JSON.stringify(chosen), syncMeta, serverVersion)
      lastSyncedVersionRef.current = newVersion
      localStorage.setItem(LOCAL_SYNC_VER, String(newVersion))
    } catch {
      // Best effort — will retry on next save
    }
  }, [syncConflict, syncMeta, applyData])

  /** Disconnect this device from sync. */
  const disableSync = useCallback(() => {
    clearSyncMeta()
    setSyncMeta(null)
    setSyncStatus("disabled")
    setSyncConflict(null)
  }, [])

  // ── Existing actions ──────────────────────────────────────────────────────

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
    // Data state
    config, setConfig,
    gastosPorMes, setGastosPorMes,
    metas, setMetas,
    ajustesAhorro, setAjustesAhorro,
    saldosRealesAhorro, setSaldosRealesAhorro,
    saldosRealesGastos, setSaldosRealesGastos,
    ingresosPorMes, setIngresosPorMes,
    transferenciasPorMes, setTransferenciasPorMes,
    onboarded, loaded, saveState, proyeccion,
    // App actions
    completeOnboarding, resetAll,
    // Sync state
    syncEnabled, syncStatus, syncConflict,
    // Sync actions
    enableSync, pairWithCode, confirmPairAndReplace, resolveConflict, disableSync,
    currentSnapshot,
  }
}
