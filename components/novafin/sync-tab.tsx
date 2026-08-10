"use client"

import { useRef } from "react"
import { DownloadCloud, MonitorSmartphone, UploadCloud } from "lucide-react"
import { SyncPanel } from "./sync-panel"
import { Panel, SectionLabel } from "./ui-kit"
import type { StoredData, SyncConflict, SyncStatus } from "@/hooks/use-novafin"

// ── Backup helpers ─────────────────────────────────────────────────────────────

function exportBackup() {
  try {
    const raw = localStorage.getItem("novafin-v2")
    if (!raw) { window.alert("No hay datos para exportar."); return }
    const blob = new Blob([raw], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `NovaFin-Backup-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url) }, 100)
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
      raw?.config ? raw
        : (raw?.state as Record<string, unknown> | undefined)?.config
          ? (raw.state as Record<string, unknown>)
          : null
    if (!payload?.config) {
      window.alert("Archivo JSON inválido o de otro formato.\n\nAsegúrate de importar un archivo exportado desde NovaFin.")
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

// ── Main component ─────────────────────────────────────────────────────────────

interface SyncTabProps {
  syncEnabled: boolean
  syncStatus: SyncStatus
  syncConflict: SyncConflict | null
  onEnableSync: () => Promise<string>
  onPairWithCode: (code: string) => Promise<{ needsConfirm: boolean; remoteData?: StoredData }>
  onConfirmPairAndReplace: (code: string, remoteData: StoredData) => Promise<void>
  onResolveConflict: (choice: "local" | "remote") => Promise<void>
  onDisableSync: () => void
}

export function SyncTab({
  syncEnabled, syncStatus, syncConflict,
  onEnableSync, onPairWithCode, onConfirmPairAndReplace, onResolveConflict, onDisableSync,
}: SyncTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* ── Título ── */}
      <div className="mb-2">
        <div className="flex items-center gap-3 mb-1">
          <MonitorSmartphone className="size-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Sincronización y Respaldos</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Mantén tus datos actualizados en todos tus dispositivos. Todo se cifra en tu dispositivo antes de salir — el servidor nunca puede leer tu información.
        </p>
      </div>

      {/* ── Sync entre dispositivos ── */}
      <Panel>
        <div className="mb-4">
          <SectionLabel>Sync entre dispositivos</SectionLabel>
        </div>
        <SyncPanel
          syncEnabled={syncEnabled}
          syncStatus={syncStatus}
          syncConflict={syncConflict}
          onEnable={onEnableSync}
          onPairWithCode={onPairWithCode}
          onConfirmPairAndReplace={onConfirmPairAndReplace}
          onResolveConflict={onResolveConflict}
          onDisable={onDisableSync}
        />
      </Panel>

      {/* ── Respaldos manuales ── */}
      <Panel>
        <div className="mb-4">
          <SectionLabel>Copia de respaldo (JSON)</SectionLabel>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Exporta tu configuración a un archivo local como respaldo manual. Úsalo para migrar entre navegadores o como copia offline.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={exportBackup}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-secondary/20 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary/40 cursor-pointer"
          >
            <DownloadCloud className="size-4 text-primary" />
            Descargar respaldo
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-secondary/20 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary/40 cursor-pointer"
          >
            <UploadCloud className="size-4 text-accent" />
            Importar archivo
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

    </div>
  )
}
