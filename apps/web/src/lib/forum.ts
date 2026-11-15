import { z } from "zod"

export const forumCategories = { question: "提问", experience: "工作体验", interview: "面试交流", career: "职业发展" } as const
export const forumCategorySchema = z.enum(["question", "experience", "interview", "career"])
export const forumPostInput = z.object({ requestId: z.uuid(), companyId: z.uuid(), category: forumCategorySchema,
  title: z.string().trim().min(4, "标题至少 4 个字").max(100), content: z.string().trim().min(10, "正文至少 10 个字").max(3000),
}).strict()
export const forumReplyInput = z.object({ requestId: z.uuid(), content: z.string().trim().min(2, "回复至少 2 个字").max(1000) }).strict()
export const forumFiltersSchema = z.object({ companyId: z.uuid().optional(), category: forumCategorySchema.optional(),
  feed: z.enum(["all", "following", "mine"]).default("all"), sort: z.enum(["latest", "useful"]).default("latest"),
  cursor: z.string().max(1024).optional(), q: z.string().trim().max(80).optional(),
}).strict()
export type ForumFilters = z.infer<typeof forumFiltersSchema>
export type ForumPost = {
  id: string; companyId: string; companyName: string; category: keyof typeof forumCategories;
  title: string; content: string; status: string; authorLabel: string; isMine: boolean;
  usefulCount: number; replyCount: number; isUseful: boolean; createdAt: string;
}
export type ForumReply = { id: string; content: string; status: string; authorLabel: string; isMine: boolean; isPostAuthor: boolean; createdAt: string }
export type ForumPage = { posts: ForumPost[]; nextCursor: string | null }
export type ForumDetail = { post: ForumPost; replies: ForumReply[]; myReplies: ForumReply[]; nextCursor: string | null }

export class ForumError extends Error {
  constructor(public status: number, message: string) { super(message) }
}
const cursorSchema = z.object({ scope: z.string().max(300), id: z.uuid(), date: z.iso.datetime(), useful: z.number().int().nonnegative() }).strict()
function scope(filters: ForumFilters) {
  const base = [filters.companyId ?? "", filters.category ?? "", filters.feed, filters.sort]
  return JSON.stringify(filters.q ? [...base, filters.q] : base)
}
export function forumSearchPattern(query: string) { return `%${query.replace(/[\\%_]/g, "\\$&")}%` }
export function forumCursor(filters: ForumFilters, row: { id: string; createdAt: Date; usefulCount: number }) {
  return Buffer.from(JSON.stringify({ scope: scope(filters), id: row.id, date: row.createdAt.toISOString(), useful: row.usefulCount })).toString("base64url")
}
export function parseForumCursor(filters: ForumFilters) {
  if (!filters.cursor) return null
  try {
    if (!/^[A-Za-z0-9_-]+$/.test(filters.cursor)) throw Error()
    const value = cursorSchema.parse(JSON.parse(Buffer.from(filters.cursor, "base64url").toString()))
    if (value.scope !== scope(filters)) throw Error()
    return { ...value, date: new Date(value.date) }
  } catch { throw new ForumError(400, "分页已失效，请重新加载") }
}
