import { z } from "zod"

export const dialogueStatuses = ["draft", "open", "closed", "completed", "cancelled", "hidden"] as const
export const applicationStatuses = ["submitted", "selected", "not_selected", "withdrawn"] as const
export const fundingModes = { undecided: "资金方案待确认", all_donated: "拟做公益专场", host_and_donation: "拟做嘉宾报酬与公益分列" } as const
export const dialogueStatusLabels = { draft: "草稿", open: "报名中", closed: "报名已结束", completed: "已结束", cancelled: "已取消", hidden: "暂不可见" } as const
export const applicationStatusLabels = { submitted: "等待审核", selected: "已入选", not_selected: "本次未入选", withdrawn: "已撤回" } as const
export const dialogueMoneyPolicy = { paymentsEnabled: false, biddingEnabled: false, donationStatus: "not_started" } as const
export { dialogueEnabled } from "./dialogue-feature"
export class DialogueError extends Error { constructor(readonly status: number, message: string) { super(message) } }
const text = (min: number, max: number) => z.string().trim().min(min, `至少填写 ${min} 个字`).max(max, `最多填写 ${max} 个字`)
export const dialogueDraftInput = z.object({
  requestId: z.uuid(),
  title: text(4, 100), description: text(20, 2400), guestName: text(2, 80), guestBio: text(10, 1200),
  companyId: z.uuid().nullable().default(null), durationMinutes: z.number().int().min(15).max(120), capacity: z.number().int().min(1).max(20),
  startsAt: z.iso.datetime({ offset: true }), signupEndsAt: z.iso.datetime({ offset: true }),
  fundingMode: z.enum(["undecided", "all_donated", "host_and_donation"]).default("undecided"),
  guestConsentConfirmed: z.boolean(),
}).strict().refine(value => Date.parse(value.signupEndsAt) < Date.parse(value.startsAt), { message: "报名截止必须早于活动开始", path: ["signupEndsAt"] })
export const dialogueApplicationInput = z.object({ question: text(10, 800), requestId: z.uuid() }).strict()
export const dialogueActionInput = z.discriminatedUnion("action", [
  z.object({ action: z.literal("publish") }).strict(),
  z.object({ action: z.literal("close") }).strict(),
  z.object({ action: z.literal("cancel"), reason: text(2, 160) }).strict(),
  z.object({ action: z.literal("hide"), reason: text(2, 160) }).strict(),
  z.object({ action: z.literal("arrangements"), privateInstructions: text(0, 1000) }).strict(),
  z.object({ action: z.literal("complete"), recap: text(0, 4000), recapConsentConfirmed: z.boolean() }).strict()
    .refine(value => !value.recap || value.recapConsentConfirmed, { message: "公开纪要前必须取得嘉宾及相关参与者授权" }),
])
export const dialogueDecisionInput = z.object({ status: z.enum(["selected", "not_selected"]), expectedStatus: z.enum(["submitted", "selected", "not_selected"]), reason: text(2, 160) }).strict()
export const dialoguePageInput = z.object({ companyId: z.uuid().optional(), cursor: z.string().max(600).optional() }).strict()
export type DialogueDraft = z.infer<typeof dialogueDraftInput>
export type DialogueAction = z.infer<typeof dialogueActionInput>
export type DialogueDecision = z.infer<typeof dialogueDecisionInput>
export type DialogueStatus = typeof dialogueStatuses[number]
export type ApplicationStatus = typeof applicationStatuses[number]
export type DialogueSession = {
  id: string; title: string; description: string; guestName: string; guestBio: string; companyId: string | null; companyName: string | null;
  durationMinutes: number; capacity: number; startsAt: string; signupEndsAt: string; fundingMode: keyof typeof fundingModes;
  status: DialogueStatus; recap: string; cancelReason: string | null; createdAt: string;
  paymentsEnabled: false; biddingEnabled: false; donationStatus: "not_started";
}
export type DialogueApplication = { id: string; sessionId: string; question: string; status: ApplicationStatus; decisionNote: string | null; createdAt: string }
export type MyDialogueApplication = DialogueApplication & { sessionTitle: string; sessionStatus: DialogueStatus; startsAt: string; privateInstructions: string | null }
export type DialogueAdminSession = DialogueSession & { guestConsentConfirmed: boolean; privateInstructions: string }

const cursorSchema = z.object({ scope: z.string().max(80), id: z.uuid(), at: z.iso.datetime() }).strict()
export function dialogueCursor(scope: string, row: { id: string; createdAt: Date }) {
  return btoa(JSON.stringify({ scope, id: row.id, at: row.createdAt.toISOString() })).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "")
}
export function parseDialogueCursor(scope: string, cursor?: string) {
  if (!cursor) return null
  try {
    if (cursor.length > 600 || !/^[A-Za-z0-9_-]+$/.test(cursor)) throw new Error()
    const value = cursorSchema.parse(JSON.parse(atob(cursor.replaceAll("-", "+").replaceAll("_", "/"))))
    if (value.scope !== scope) throw new Error()
    return { id: value.id, date: new Date(value.at) }
  } catch { throw new DialogueError(400, "分页链接已失效，请重新打开") }
}
