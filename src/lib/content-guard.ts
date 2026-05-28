export type CompanySubmissionInput = {
  companyName: string
  unifiedSocialCreditCode: string
  registeredAddress: string
  legalRepresentative: string
  city: string
  industry: string
  note?: string
}

export type CompanySubmissionValidation = {
  ok: boolean
  errors: Record<string, string>
  warnings: Record<string, string>
}

export type DiscussionContentValidation = {
  ok: boolean
  message?: string
}

const phonePattern = /1[3-9]\d{9}/
const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
const idCardPattern = /\d{17}[\dXx]/
const creditCodePattern = /^[0-9A-Z]{18}$/
const attackWords = ["垃圾", "傻逼", "黑心", "压榨", "坑人", "骗子", "狗公司", "曝光", "挂人", "爆雷"]

function hasSensitive(value: string) {
  return phonePattern.test(value) || emailPattern.test(value) || idCardPattern.test(value)
}

function hasAttackWord(value: string) {
  return attackWords.some((word) => value.includes(word))
}

function isMostlySymbols(value: string) {
  const text = value.trim()
  if (!text) return false
  const symbolCount = [...text].filter((char) => /[^\p{L}\p{N}]/u.test(char)).length
  return symbolCount / text.length > 0.7
}

export function validateCompanySubmission(input: CompanySubmissionInput): CompanySubmissionValidation {
  const errors: Record<string, string> = {}
  const warnings: Record<string, string> = {}
  const name = input.companyName.trim()
  const code = input.unifiedSocialCreditCode.trim().toUpperCase()
  const address = input.registeredAddress.trim()
  const legalRepresentative = input.legalRepresentative.trim()
  const city = input.city.trim()
  const industry = input.industry.trim()

  if (name.length < 2 || name.length > 80 || isMostlySymbols(name)) {
    errors.companyName = "公司名称需要填写 2-80 个字符的正式注册名称。"
  } else if (hasSensitive(name) || hasAttackWord(name)) {
    errors.companyName = "公司名称包含不适合公开展示的表达，请改为正式注册名称。"
  }

  if (!creditCodePattern.test(code)) {
    errors.unifiedSocialCreditCode = "请输入 18 位统一社会信用代码。"
  }

  if (address.length < 5 || address.length > 120) {
    errors.registeredAddress = "注册地址需要填写 5-120 个字符。"
  } else if (hasSensitive(address) || hasAttackWord(address)) {
    errors.registeredAddress = "注册地址包含不适合公开展示的内容，请使用正式注册地址。"
  }

  if (legalRepresentative.length < 2 || legalRepresentative.length > 20) {
    errors.legalRepresentative = "法定代表人需要填写 2-20 个字符。"
  } else if (hasSensitive(legalRepresentative) || hasAttackWord(legalRepresentative)) {
    errors.legalRepresentative = "法定代表人字段包含不适合公开展示的内容。"
  }

  if (city.length < 2 || city.length > 30) {
    errors.city = "注册城市需要填写 2-30 个字符。"
  }
  if (industry.length < 2 || industry.length > 30) {
    errors.industry = "所属行业需要填写 2-30 个字符。"
  }
  if (input.note && (hasSensitive(input.note) || hasAttackWord(input.note))) {
    warnings.note = "备注中可能包含隐私或不适合公开展示的表达，建议删改后提交。"
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    warnings,
  }
}

export function validateDiscussionContent(content: string): DiscussionContentValidation {
  const text = content.trim()

  if (text.length < 5) {
    return { ok: false, message: "内容至少需要 5 个字。" }
  }

  if (text.length > 300) {
    return { ok: false, message: "请控制在 300 字以内。" }
  }

  if (hasSensitive(text) || hasAttackWord(text)) {
    return { ok: false, message: "内容包含不适合公开展示的信息，请调整后再发布。" }
  }

  return { ok: true }
}

export function maskSensitiveContent(content: string) {
  return content
    .replace(phonePattern, "[手机号已隐藏]")
    .replace(emailPattern, "[邮箱已隐藏]")
    .replace(idCardPattern, "[身份信息已隐藏]")
}
