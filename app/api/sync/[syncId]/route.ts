/**
 * app/api/sync/[syncId]/route.ts
 * GET  /api/sync/:syncId — Pull the encrypted blob.
 * PUT  /api/sync/:syncId — Push (compare-and-swap) the encrypted blob.
 */
import { Redis } from "@upstash/redis"
import { Ratelimit } from "@upstash/ratelimit"
import { NextRequest, NextResponse } from "next/server"

const redis = Redis.fromEnv()

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "1 m"),
  prefix: "rl:sync",
})

interface SyncRecord {
  ciphertext: string
  iv: string
  version: number
}

function syncKey(syncId: string) {
  return `sync:${syncId}`
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ syncId: string }> }
) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown"
  const { success } = await ratelimit.limit(ip)
  if (!success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })

  const { syncId } = await params
  const key = syncKey(syncId)
  const raw = await redis.get<string>(key)

  if (!raw) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const record: SyncRecord = typeof raw === "string" ? JSON.parse(raw) : raw
  return NextResponse.json(record)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ syncId: string }> }
) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown"
  const { success } = await ratelimit.limit(ip)
  if (!success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })

  const { syncId } = await params

  let body: { ciphertext?: string; iv?: string; expectedVersion?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { ciphertext, iv, expectedVersion } = body
  if (!ciphertext || !iv || expectedVersion === undefined) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  const key = syncKey(syncId)
  const raw = await redis.get<string>(key)
  const current: SyncRecord | null = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : null

  const currentVersion = current?.version ?? 0

  // Compare-and-swap: reject if another device already pushed a newer version
  if (currentVersion !== expectedVersion) {
    return NextResponse.json(
      { error: "conflict", currentVersion },
      { status: 409 }
    )
  }

  const newVersion = currentVersion + 1
  const record: SyncRecord = { ciphertext, iv, version: newVersion }

  // Store with no TTL — data persists until explicitly deleted or replaced
  await redis.set(key, JSON.stringify(record))

  return NextResponse.json({ ok: true, version: newVersion })
}
