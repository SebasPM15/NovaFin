/**
 * lib/sync/client.ts
 * Client-side API wrappers for the NovaFin ZK sync system.
 */

import {
  type EncryptedBlob,
  deriveKeyFromCode,
  encrypt,
  decrypt,
  generateMasterKey,
  generatePairingCode,
  generateSyncId,
} from "./crypto"

export const LOCAL_SYNC_KEY = "novafin-sync-key"   // hex master key
export const LOCAL_SYNC_ID  = "novafin-sync-id"    // UUID sync identifier
export const LOCAL_SYNC_VER = "novafin-sync-ver"   // last synced version (number)

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SyncMeta {
  masterKey: string
  syncId: string
}

export interface PairingResult {
  pairingCode: string // shown to user on Device A
  meta: SyncMeta
}

export interface PullResult {
  data: string        // decrypted JSON string
  version: number
}

// ── Pairing — Device A ────────────────────────────────────────────────────────

/**
 * Device A: Generate a pairing code and upload an encrypted payload.
 * Returns the code to display to the user.
 * Uses existing masterKey/syncId from localStorage if available (re-sync).
 */
export async function startPairing(): Promise<PairingResult> {
  const existingKey = localStorage.getItem(LOCAL_SYNC_KEY)
  const existingId  = localStorage.getItem(LOCAL_SYNC_ID)

  const masterKey = existingKey ?? generateMasterKey()
  const syncId    = existingId  ?? generateSyncId()
  const pairingCode = generatePairingCode()

  // Derive a temporary key from the pairing code
  const pairingKey = await deriveKeyFromCode(pairingCode)

  // Encrypt the master key + syncId with the pairing key
  const payload = JSON.stringify({ masterKey, syncId })
  const blob = await encrypt(payload, pairingKey)

  const res = await fetch("/api/pair", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pairingCode: pairingCode.replace(/-/g, ""),
      ciphertext: blob.ciphertext,
      iv: blob.iv,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Pairing init failed: ${err}`)
  }

  return { pairingCode, meta: { masterKey, syncId } }
}

// ── Pairing — Device B ────────────────────────────────────────────────────────

/**
 * Device B: Given the code typed by the user, fetch and decrypt the master key + syncId.
 * Returns the SyncMeta without saving anything — caller decides whether to persist.
 */
export async function completePairing(rawCode: string): Promise<SyncMeta> {
  const code = rawCode.replace(/-/g, "").toUpperCase()

  const res = await fetch(`/api/pair/${encodeURIComponent(code)}`)
  if (!res.ok) {
    if (res.status === 404 || res.status === 410) {
      throw new Error("El código expiró o es inválido. Genera uno nuevo en el otro dispositivo.")
    }
    throw new Error(`Error al obtener el código: ${res.status}`)
  }

  const { ciphertext, iv } = (await res.json()) as EncryptedBlob
  const pairingKey = await deriveKeyFromCode(code)

  let payload: { masterKey: string; syncId: string }
  try {
    const plain = await decrypt({ ciphertext, iv }, pairingKey)
    payload = JSON.parse(plain)
  } catch {
    throw new Error("Código incorrecto o datos dañados.")
  }

  return { masterKey: payload.masterKey, syncId: payload.syncId }
}

// ── Sync — push / pull ────────────────────────────────────────────────────────

/**
 * Push the current app state (as JSON string) to the server.
 * Uses compare-and-swap via expectedVersion.
 * Returns the new version on success.
 * Throws a SyncConflictError on 409.
 */
export async function pushBlob(
  dataJson: string,
  meta: SyncMeta,
  expectedVersion: number,
): Promise<number> {
  const blob = await encrypt(dataJson, meta.masterKey)
  const res = await fetch(`/api/sync/${encodeURIComponent(meta.syncId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ciphertext: blob.ciphertext,
      iv: blob.iv,
      expectedVersion,
    }),
  })

  if (res.status === 409) {
    throw new SyncConflictError()
  }
  if (!res.ok) {
    throw new Error(`Push failed: ${res.status}`)
  }

  const { version } = await res.json() as { version: number }
  return version
}

/**
 * Pull the latest state from the server.
 * Returns null if no blob exists yet (first push from the other device hasn't happened).
 */
export async function pullBlob(meta: SyncMeta): Promise<PullResult | null> {
  const res = await fetch(`/api/sync/${encodeURIComponent(meta.syncId)}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Pull failed: ${res.status}`)

  const { ciphertext, iv, version } = await res.json() as EncryptedBlob & { version: number }
  const data = await decrypt({ ciphertext, iv }, meta.masterKey)
  return { data, version }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export class SyncConflictError extends Error {
  constructor() {
    super("sync_conflict")
    this.name = "SyncConflictError"
  }
}

/** Read sync meta from localStorage. Returns null if not yet paired. */
export function loadSyncMeta(): SyncMeta | null {
  const masterKey = localStorage.getItem(LOCAL_SYNC_KEY)
  const syncId    = localStorage.getItem(LOCAL_SYNC_ID)
  if (!masterKey || !syncId) return null
  return { masterKey, syncId }
}

/** Persist sync meta to localStorage. */
export function saveSyncMeta(meta: SyncMeta): void {
  localStorage.setItem(LOCAL_SYNC_KEY, meta.masterKey)
  localStorage.setItem(LOCAL_SYNC_ID, meta.syncId)
}

/** Clear sync meta from localStorage (unpair). */
export function clearSyncMeta(): void {
  localStorage.removeItem(LOCAL_SYNC_KEY)
  localStorage.removeItem(LOCAL_SYNC_ID)
  localStorage.removeItem(LOCAL_SYNC_VER)
}
