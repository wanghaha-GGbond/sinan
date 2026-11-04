type MailEnvironment = Record<string, string | undefined>
export function mailConfigurationErrors(env: MailEnvironment): string[]
export function resendSender(env: MailEnvironment): string
