export type PulseFeatureEnv = {
  NEXT_PUBLIC_APP_ENV?: string
  NEXT_PUBLIC_PULSE_ENABLED?: string
}

/**
 * Production requires an explicit switch. Real APIs enforce aggregation/privacy;
 * false remains an emergency kill switch in every environment.
 */
export function isPulseEnabled(env: PulseFeatureEnv): boolean {
  if (env.NEXT_PUBLIC_APP_ENV === "production") {
    return env.NEXT_PUBLIC_PULSE_ENABLED === "true"
  }
  return env.NEXT_PUBLIC_PULSE_ENABLED !== "false"
}
