/**
 * app/api/pair/route.ts
 * POST /api/pair — Device A creates a pairing session.
 *
 * Body: { pairingCode: string, ciphertext: string, iv: string }
 * Stores in Redis with 5-minute TTL and 5-attempt cap.
 */
import { Redis } from "@upstash/redis"
import { Ratelimit } from "@upstash/ratelimit"
import { NextRequest, NextResponse } from "next/server"

const redis = Redis.fromEnv()

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  prefix: "rl:pair:create",
})

export async function POST(req: NextRequest) {
  // Rate-limit by IP
  const ip = req.headers.get("x-forwarded-for") ?? "unknown"
  const { success } = await ratelimit.limit(ip)
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }

  let body: { pairingCode?: string; ciphertext?: string; iv?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { pairingCode, ciphertext, iv } = body
  if (!pairingCode || !ciphertext || !iv) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  // Validate code format (8 alphanumeric chars)
  if (!/^[A-Z0-9]{8}$/i.test(pairingCode)) {
    return NextResponse.json({ error: "Invalid pairing code format" }, { status: 400 })
  }

  const key = `pair:${pairingCode.toUpperCase()}`
  const record = {
    ciphertext,
    iv,
    attemptsRemaining: 5,
    createdAt: Date.now(),
  }

  // Store with 5-minute TTL (300 seconds)
  await redis.set(key, JSON.stringify(record), { ex: 300 })

  return NextResponse.json({ ok: true }, { status: 201 })
}
