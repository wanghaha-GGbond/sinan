/**
 * Mail service abstraction.
 *
 * Anti-fingerprint design: sender domain, subject, and body are deliberately
 * neutral — no product name, no "职场/评价/社区" wording — so the email does
 * not appear suspicious in a corporate mail gateway or leave a trail that
 * identifies the user as a member of a workplace-review platform.
 *
 * Backed by Resend (MAIL_PROVIDER=resend) or a no-op dev stub. Swap the
 * provider by implementing the sendMail interface below and routing via
 * MAIL_PROVIDER. The caller never touches provider specifics.
 */

export interface MailMessage {
  to: string
  subject: string
  text: string
}

async function sendViaResend(msg: MailMessage): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const fromDomain = process.env.MAIL_FROM_DOMAIN ?? "notifications.example.com"
  if (!apiKey) throw new Error("RESEND_API_KEY is not set")

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `no-reply@${fromDomain}`,
      to: [msg.to],
      subject: msg.subject,
      text: msg.text,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`Resend API error ${res.status}: ${body}`)
  }
}

export async function sendMail(msg: MailMessage): Promise<void> {
  if (!process.env.DATABASE_URL) {
    // Dev: just log, don't fail the flow
    console.log("[mail:dev] would send to:", msg.to, "| subject:", msg.subject)
    console.log("[mail:dev] body:", msg.text)
    return
  }

  const provider = process.env.MAIL_PROVIDER ?? "resend"
  if (provider === "resend") {
    await sendViaResend(msg)
    return
  }

  throw new Error(`Unknown MAIL_PROVIDER: ${provider}`)
}

/** Build a neutral verification code email body. */
export function buildVerificationCodeEmail(code: string): MailMessage["text"] {
  return [
    `您的验证码：${code}`,
    "",
    "有效期 15 分钟，请勿转发给他人。",
  ].join("\n")
}
