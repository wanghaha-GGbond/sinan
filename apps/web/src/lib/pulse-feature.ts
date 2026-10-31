export type PulseFeatureEnv = {
  NEXT_PUBLIC_APP_ENV?: string
  NEXT_PUBLIC_PULSE_ENABLED?: string
}

/**
 * Pulse is a staging-only experience until its server-side aggregation and
 * privacy threshold are implemented. Local development stays enabled unless
 * explicitly disabled so the UI can still be reviewed.
 */
export function isPulseEnabled(env: PulseFeatureEnv): boolean {
  if (env.NEXT_PUBLIC_APP_ENV === "production") {
    return env.NEXT_PUBLIC_PULSE_ENABLED === "true"
  }
  return env.NEXT_PUBLIC_PULSE_ENABLED !== "false"
}
