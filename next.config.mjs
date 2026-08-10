import { withSentryConfig } from "@sentry/nextjs"

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Upload source maps so stack traces show original code (not minified)
  sourcemaps: {
    disable: false,
  },

  // Don't print Sentry CLI output during builds
  silent: true,

  // Disable Sentry telemetry about your build (meta!)
  telemetry: false,
})

