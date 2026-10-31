// Shared by the runtime and release preflight. Never return credential values.
const domainPattern = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i
const addressPattern = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i

export function mailConfigurationErrors(env) {
  const errors = []
  const staging = env.NEXT_PUBLIC_APP_ENV === "staging"
  const provider = env.MAIL_PROVIDER ?? "aliyun-direct-mail"
  const domain = env.MAIL_FROM_DOMAIN?.trim() ?? ""
  const from = env.MAIL_FROM_ADDRESS?.trim() || `no-reply@${domain}`
  const testRecipient = env.MAIL_TEST_RECIPIENT?.trim() ?? ""
  if (!domainPattern.test(domain)) errors.push("MAIL_FROM_DOMAIN must be a valid domain")
  if ((env.MAIL_FROM_ADDRESS?.trim() || testRecipient) && provider !== "resend") {
    errors.push("MAIL_FROM_ADDRESS and MAIL_TEST_RECIPIENT require Resend")
  }
  if (testRecipient && !staging) errors.push("MAIL_TEST_RECIPIENT is staging-only")
  if (provider === "resend") {
    if (!env.RESEND_API_KEY?.trim()) errors.push("RESEND_API_KEY is required for Resend")
    if (!addressPattern.test(from) || from.split("@")[1]?.toLowerCase() !== domain.toLowerCase()) {
      errors.push("MAIL_FROM_ADDRESS must be an address on MAIL_FROM_DOMAIN")
    }
    if (testRecipient && !addressPattern.test(testRecipient)) errors.push("MAIL_TEST_RECIPIENT must be a valid address")
    // Resend's shared sender can only deliver to the account owner's address.
    // It must never make a public production signup look available.
    if (/(?:^|\.)resend\.dev$/i.test(domain) &&
      (!staging || from.toLowerCase() !== "onboarding@resend.dev" || !testRecipient)) {
      errors.push("resend.dev requires staging, onboarding@resend.dev and MAIL_TEST_RECIPIENT")
    }
  } else if (provider === "aliyun-direct-mail") {
    for (const name of ["ALIYUN_DM_ACCOUNT_NAME", "ALIYUN_DM_REGION"]) {
      if (!env[name]?.trim()) errors.push(`${name} is required for Aliyun DirectMail`)
    }
  } else if (provider !== "disabled" || !staging) {
    errors.push("MAIL_PROVIDER must be aliyun-direct-mail or resend (disabled is staging-only)")
  }
  return errors
}

export function resendSender(env) {
  return env.MAIL_FROM_ADDRESS?.trim() || `no-reply@${env.MAIL_FROM_DOMAIN?.trim()}`
}
