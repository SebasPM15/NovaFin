import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Captures 10% of sessions for performance profiling (keeps you well within free tier)
  tracesSampleRate: 0.1,

  // Only run in production — no noise in local dev
  enabled: process.env.NODE_ENV === "production",

  // Attach git commit to errors for easy debugging
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  environment: process.env.VERCEL_ENV ?? "development",

  // Ignore common browser-noise errors
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    /^NetworkError/,
    /^AbortError/,
  ],
})

