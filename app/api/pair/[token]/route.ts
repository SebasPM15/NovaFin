/**
 * app/api/pair/[token]/route.ts
 * GET /api/pair/:token — Device B consumes the pairing session.
 *
 * Returns { ciphertext, iv } and decrements the attempt counter.
 * Deletes the record when attemptsRemaining hits 0 (burn-after-read).
 */
import { Redis } from "@upstash/redis"
import { Ratelimit } from "@upstash/ratelimit"
import { NextRequest, NextResponse } from "next/server"

const redis = Redis.fromEnv()

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 m"),
  prefix: "rl:pair:consume",
})

interface PairRecord {
  ciphertext: string
  iv: string
  attemptsRemaining: number
  createdAt: number
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  // Rate-limit by IP
  const ip = req.headers.get("x-forwarded-for") ?? "unknown"
  const { success } = await ratelimit.limit(ip)
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }

  const { token } = await params
  const code = token.toUpperCase().replace(/-/g, "")

  if (!/^[A-Z0-9]{8}$/.test(code)) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 })
  }

  const key = `pair:${code}`
  const raw = await redis.get<string>(key)

  if (!raw) {
    return NextResponse.json({ error: "Code not found or expired" }, { status: 404 })
  }

  const record: PairRecord = typeof raw === "string" ? JSON.parse(raw) : raw

  // Check if attempts are exhausted
  if (record.attemptsRemaining <= 0) {
    await redis.del(key)
    return NextResponse.json({ error: "Code expired" }, { status: 410 })
  }

  // Decrement attempts
  const remaining = record.attemptsRemaining - 1

  if (remaining <= 0) {
    // Last attempt — burn the record
    await redis.del(key)
  } else {
    // Update remaining attempts
    await redis.set(key, JSON.stringify({ ...record, attemptsRemaining: remaining }), { keepTtl: true })
  }

  return NextResponse.json({
    ciphertext: record.ciphertext,
    iv: record.iv,
  })
}
