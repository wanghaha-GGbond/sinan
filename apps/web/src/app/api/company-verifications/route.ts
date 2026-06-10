import { NextResponse } from "next/server"
import { z } from "zod"

import { requireAuthUser } from "@/lib/server/auth"

const PUBLIC_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "hotmail.com",
  "icloud.com",
  "outlook.com",
  "qq.com",
  "163.com",
  "126.com",
])

const requestSchema = z.object({
  companyId: z.string().trim().min(1, "请选择公司").max(120),
  companyName: z.string().trim().min(2, "请填写公司名称").max(120),
  applicantName: z.string().trim().min(2, "请填写申请人姓名").max(60),
  workEmail: z.email("请填写有效的企业邮箱").max(160),
  jobTitle: z.string().trim().min(2, "请填写你的职务").max(80),
  proofType: z.enum(["work_email", "business_document"]),
  note: z.string().trim().max(500, "补充说明不能超过 500 字").optional(),
})

export async function POST(request: Request) {
  let user
  try {
    user = await requireAuthUser()
  } catch (error) {
    if (error instanceof Response) return error
    throw error
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "提交内容格式不正确" }, { status: 400 })
  }

  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "请检查认证信息" },
      { status: 400 }
    )
  }

  const data = parsed.data
  const emailDomain = data.workEmail.split("@")[1]?.toLowerCase()
  if (
    data.proofType === "work_email" &&
    (!emailDomain || PUBLIC_EMAIL_DOMAINS.has(emailDomain))
  ) {
    return NextResponse.json(
      { error: "企业邮箱验证需要使用公司域名；个人邮箱可改用任职证明方式" },
      { status: 400 }
    )
  }

  try {
    const [{ db }, { companyVerifications }] = await Promise.all([
      import("@/db/client"),
      import("@/db/schema/company-verifications"),
    ])
    const [verification] = await db
      .insert(companyVerifications)
      .values({
        ...data,
        note: data.note || null,
        applicantUserId: user.userId,
      })
      .returning({
        id: companyVerifications.id,
        status: companyVerifications.status,
        createdAt: companyVerifications.createdAt,
      })

    return NextResponse.json({ verification }, { status: 201 })
  } catch (error) {
    if (process.env.DATABASE_URL) {
      console.error("POST /api/company-verifications failed:", error)
      return NextResponse.json(
        { error: "认证申请暂时无法提交，请稍后重试" },
        { status: 503 }
      )
    }

    return NextResponse.json(
      {
        verification: {
          id: `local-verification-${Date.now()}`,
          status: "submitted",
          createdAt: new Date().toISOString(),
        },
      },
      { status: 201 }
    )
  }
}
