// Content validation shared between web and iOS
// Pattern rules are identical on both platforms

const PHONE_RE = /1[3-9]\d{9}/
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
const ID_CARD_RE = /\d{17}[\dXx]/
const ATTACK_WORDS = [
  "垃圾", "傻逼", "黑心", "压榨", "坑人", "骗子",
  "狗公司", "曝光", "挂人", "爆雷",
]

export function hasSensitive(value: string): boolean {
  return PHONE_RE.test(value) || EMAIL_RE.test(value) || ID_CARD_RE.test(value)
}

export function hasAttackWord(value: string): boolean {
  return ATTACK_WORDS.some((word) => value.includes(word))
}

export function maskSensitiveContent(content: string): string {
  return content
    .replace(PHONE_RE, "[手机号已隐藏]")
    .replace(EMAIL_RE, "[邮箱已隐藏]")
    .replace(ID_CARD_RE, "[身份信息已隐藏]")
}
