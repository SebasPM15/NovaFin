/**
 * lib/sync/crypto.ts
 * Zero-Knowledge sync — all crypto done in-browser via Web Crypto API.
 * No external crypto libraries — uses SubtleCrypto only.
 */

const ENC = "AES-GCM"
const HASH = "SHA-256"
const KEY_USAGE_ENC: KeyUsage[] = ["encrypt", "decrypt"]

// ── Key generation ────────────────────────────────────────────────────────────

/** Generate a cryptographically random 256-bit master key. */
export function generateMasterKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return bufToHex(bytes)
}

/** Generate a random syncId (UUID v4). */
export function generateSyncId(): string {
  return crypto.randomUUID()
}

/**
 * Generate an 8-character alphanumeric pairing code (uppercase).
 * Space: 36^8 ≈ 2.8 trillion combinations. With server 5-attempt cap, offline brute force is infeasible.
 * Format: XXXX-XXXX for readability.
 */
export function generatePairingCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // removed confusing chars: 0O, 1I
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  const raw = Array.from(bytes).map((b) => chars[b % chars.length]).join("")
  return `${raw.slice(0, 4)}-${raw.slice(4)}`
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function bufToHex(buf: ArrayBuffer | Uint8Array): string {
  return Array.from(buf instanceof Uint8Array ? buf : new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

function hexToBuf(hex: string): Uint8Array {
  const clean = hex.replace(/-/g, "")
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

function strToBuf(str: string): Uint8Array {
  return new TextEncoder().encode(str)
}

function bufToStr(buf: ArrayBuffer): string {
  return new TextDecoder().decode(buf)
}

// ── AES-256-GCM encrypt / decrypt ─────────────────────────────────────────────

export interface EncryptedBlob {
  ciphertext: string // hex
  iv: string         // hex
}

async function importRawKey(keyBytes: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", keyBytes, { name: ENC }, false, KEY_USAGE_ENC)
}

/**
 * Encrypt a plain-text string with a 256-bit hex key.
 * Returns { ciphertext, iv } as hex strings.
 */
export async function encrypt(plaintext: string, hexKey: string): Promise<EncryptedBlob> {
  const keyBytes = hexToBuf(hexKey)
  const key = await importRawKey(keyBytes)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cipherBuf = await crypto.subtle.encrypt({ name: ENC, iv }, key, strToBuf(plaintext))
  return { ciphertext: bufToHex(cipherBuf), iv: bufToHex(iv) }
}

/**
 * Decrypt a blob produced by `encrypt`.
 * Throws if the key or ciphertext is invalid.
 */
export async function decrypt(blob: EncryptedBlob, hexKey: string): Promise<string> {
  const keyBytes = hexToBuf(hexKey)
  const key = await importRawKey(keyBytes)
  const plainBuf = await crypto.subtle.decrypt(
    { name: ENC, iv: hexToBuf(blob.iv) },
    key,
    hexToBuf(blob.ciphertext),
  )
  return bufToStr(plainBuf)
}

// ── PIN-based key derivation ──────────────────────────────────────────────────

/**
 * Derive a 256-bit AES key from a pairing code using HKDF + SHA-256.
 * The context string "novafin-pairing-v1" acts as domain separation.
 * Returns hex-encoded key material.
 */
export async function deriveKeyFromCode(pairingCode: string): Promise<string> {
  const context = "novafin-pairing-v1"
  const ikm = strToBuf(pairingCode.replace(/-/g, "").toUpperCase())
  const salt = strToBuf(context)

  const baseKey = await crypto.subtle.importKey("raw", ikm, { name: "HKDF" }, false, ["deriveKey"])
  const derived = await crypto.subtle.deriveKey(
    { name: "HKDF", hash: HASH, salt, info: new Uint8Array() },
    baseKey,
    { name: ENC, length: 256 },
    true,
    KEY_USAGE_ENC,
  )
  const rawBuf = await crypto.subtle.exportKey("raw", derived)
  return bufToHex(rawBuf)
}
