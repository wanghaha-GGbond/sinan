// Public email registration is approved for overseas production only.
// Staging and mainland deployments retain their existing invite-only boundary.
export function registrationConfigurationErrors(env) {
  if (env.INVITE_REQUIRED === "true") return []
  if (env.INVITE_REQUIRED === "false" && env.NEXT_PUBLIC_APP_ENV === "production" && env.DEPLOYMENT_REGION === "global") return []
  return ["INVITE_REQUIRED must be true, or explicitly false for global production"]
}
