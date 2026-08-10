/**
 * components/novafin/sync-panel.tsx
 * UI component for Zero-Knowledge device sync (PIN pairing).
 */
"use client"

import { useState } from "react"
import { MonitorSmartphone, Link2, Link2Off, RefreshCw, AlertTriangle, CheckCircle2, Loader2, Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { StoredData } from "@/hooks/use-novafin"
import type { SyncStatus, SyncConflict } from "@/hooks/use-novafin"

interface SyncPanelProps {
  syncEnabled: boolean
  syncStatus: SyncStatus
  syncConflict: SyncConflict | null
  onEnable: () => Promise<string>
  onPairWithCode: (code: string) => Promise<{ needsConfirm: boolean; remoteData?: StoredData }>
  onConfirmPairAndReplace: (code: string, remoteData: StoredData) => Promise<void>
  onResolveConflict: (choice: "local" | "remote") => Promise<void>
  onDisable: () => void
}

// ── Small helpers ──────────────────────────────────────────────────────────────

function CodeDisplay({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="flex items-center gap-3 mt-3">
      <div className="flex-1 rounded-xl border border-primary/30 bg-primary/[0.06] px-5 py-4 text-center font-mono text-2xl font-bold tracking-[0.3em] text-primary select-all">
        {code}
      </div>
      <button
        type="button"
        onClick={copy}
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary/40 text-muted-foreground transition-all hover:border-primary/40 hover:text-primary"
        title="Copiar código"
      >
        {copied ? <Check className="size-4 text-green-400" /> : <Copy className="size-4" />}
      </button>
    </div>
  )
}

function PinInput({ onSubmit, loading }: { onSubmit: (v: string) => void; loading: boolean }) {
  const [val, setVal] = useState("")
  // Format as XXXX-XXXX while typing
  const format = (raw: string) => {
    const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8)
    return cleaned.length > 4 ? `${cleaned.slice(0, 4)}-${cleaned.slice(4)}` : cleaned
  }
  const formatted = format(val)
  const isReady = val.replace(/[^A-Z0-9]/gi, "").length === 8

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (isReady) onSubmit(val) }}
      className="flex gap-2 mt-3"
    >
      <input
        value={formatted}
        onChange={(e) => setVal(e.target.value)}
        placeholder="XXXX-XXXX"
        className="flex-1 rounded-xl border border-input bg-background px-4 py-3 font-mono text-xl font-bold tracking-widest text-foreground text-center outline-none focus:border-ring uppercase placeholder:text-muted-foreground/40 placeholder:font-normal placeholder:tracking-normal placeholder:text-base"
        maxLength={9}
        autoComplete="off"
        spellCheck={false}
      />
      <button
        type="submit"
        disabled={!isReady || loading}
        className="flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
        Vincular
      </button>
    </form>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function SyncPanel({
  syncEnabled,
  syncStatus,
  syncConflict,
  onEnable,
  onPairWithCode,
  onConfirmPairAndReplace,
  onResolveConflict,
  onDisable,
}: SyncPanelProps) {
  const [mode, setMode] = useState<"idle" | "device-a" | "device-b">("idle")
  const [pairingCode, setPairingCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmData, setConfirmData] = useState<{ code: string; remoteData: StoredData } | null>(null)

  // Device A: generate code
  const handleEnable = async () => {
    setLoading(true)
    setError(null)
    try {
      const code = await onEnable()
      setPairingCode(code)
      setMode("device-a")
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // Device B: submit code
  const handlePairCode = async (code: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await onPairWithCode(code)
      if (result.needsConfirm && result.remoteData) {
        setConfirmData({ code, remoteData: result.remoteData })
      } else {
        setMode("idle")
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // Device B: confirm overwrite
  const handleConfirmReplace = async () => {
    if (!confirmData) return
    setLoading(true)
    try {
      await onConfirmPairAndReplace(confirmData.code, confirmData.remoteData)
      setConfirmData(null)
      setMode("idle")
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const statusIcon = {
    disabled: null,
    idle: <CheckCircle2 className="size-4 text-green-400" />,
    syncing: <Loader2 className="size-4 animate-spin text-primary" />,
    conflict: <AlertTriangle className="size-4 text-yellow-400" />,
    error: <AlertTriangle className="size-4 text-destructive" />,
  }[syncStatus]

  const statusLabel = {
    disabled: "",
    idle: "Sincronizado",
    syncing: "Sincronizando…",
    conflict: "Conflicto de versiones",
    error: "Error de sincronización",
  }[syncStatus]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MonitorSmartphone className="size-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Sync entre dispositivos</span>
        </div>
        {syncEnabled && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {statusIcon}
            <span>{statusLabel}</span>
          </div>
        )}
      </div>

      {/* Conflict modal */}
      {syncConflict && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2 text-yellow-400 text-sm font-semibold">
            <AlertTriangle className="size-4" />
            Conflicto de versiones
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Este dispositivo y otro tienen cambios distintos. ¿Cuál quieres conservar?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onResolveConflict("local")}
              className="flex-1 rounded-lg border border-border py-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
            >
              Conservar datos de <strong>este dispositivo</strong>
            </button>
            <button
              type="button"
              onClick={() => onResolveConflict("remote")}
              className="flex-1 rounded-lg bg-primary/10 border border-primary/30 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
            >
              Usar datos de la <strong>nube</strong>
            </button>
          </div>
        </div>
      )}

      {/* First-time overwrite confirmation */}
      {confirmData && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2 text-yellow-400 text-sm font-semibold">
            <AlertTriangle className="size-4" />
            Ya tienes datos en este dispositivo
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            ¿Reemplazar los datos locales con los datos de la nube, o cancelar la vinculación?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmData(null)}
              className="flex-1 rounded-lg border border-border py-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
            >
              Cancelar vinculación
            </button>
            <button
              type="button"
              onClick={handleConfirmReplace}
              disabled={loading}
              className="flex-1 rounded-lg bg-primary/10 border border-primary/30 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
            >
              {loading ? <Loader2 className="size-3 animate-spin mx-auto" /> : "Reemplazar con nube"}
            </button>
          </div>
        </div>
      )}

      {/* Not paired yet */}
      {!syncEnabled && !confirmData && (
        <div className="rounded-xl border border-dashed border-border p-4">
          <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
            Sincroniza tus datos entre cel y PC sin servidores que puedan leer tu información. Todo va cifrado con tu llave personal.
          </p>

          {mode === "idle" && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleEnable}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary/10 border border-primary/20 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <MonitorSmartphone className="size-4" />}
                Vincular otro dispositivo
              </button>
              <button
                type="button"
                onClick={() => setMode("device-b")}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                <Link2 className="size-4" />
                Tengo un código
              </button>
            </div>
          )}

          {/* Device A: show code */}
          {mode === "device-a" && pairingCode && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ingresa este código en el otro dispositivo antes de <strong>5 minutos</strong>. Funciona una sola vez.
              </p>
              <CodeDisplay code={pairingCode} />
              <button
                type="button"
                onClick={() => { setMode("idle"); setPairingCode("") }}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                Cancelar
              </button>
            </div>
          )}

          {/* Device B: enter code */}
          {mode === "device-b" && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Ingresa el código de 8 caracteres del otro dispositivo:
              </p>
              <PinInput onSubmit={handlePairCode} loading={loading} />
              <button
                type="button"
                onClick={() => setMode("idle")}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                Cancelar
              </button>
            </div>
          )}

          {error && (
            <p className="mt-2 text-xs text-destructive">{error}</p>
          )}
        </div>
      )}

      {/* Paired — idle */}
      {syncEnabled && !confirmData && mode === "idle" && (
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-green-400" />
              <span className="text-xs font-semibold text-green-400">Dispositivo vinculado</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleEnable}
                disabled={loading}
                title="Vincular otro dispositivo"
                className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-primary hover:border-primary/40 disabled:opacity-50"
              >
                {loading ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
                Nuevo código
              </button>
              <button
                type="button"
                onClick={onDisable}
                title="Desconectar este dispositivo"
                className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-destructive hover:border-destructive/40"
              >
                <Link2Off className="size-3" />
                Desconectar
              </button>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Tus datos se sincronizan automáticamente al guardar. El servidor solo ve datos cifrados.
          </p>
        </div>
      )}

      {/* Paired — showing new pairing code */}
      {syncEnabled && !confirmData && mode === "device-a" && pairingCode && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Ingresa este código en el otro dispositivo antes de <strong>5 minutos</strong>. Funciona una sola vez.
          </p>
          <CodeDisplay code={pairingCode} />
          <button
            type="button"
            onClick={() => { setMode("idle"); setPairingCode("") }}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            Listo, cerrar
          </button>
        </div>
      )}
    </div>
  )
}

