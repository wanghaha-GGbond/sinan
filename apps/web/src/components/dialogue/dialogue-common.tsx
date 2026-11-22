import Link from "next/link"
import { ZaichangIcon } from "@/components/ui/zaichang-icon"
import { WebButton } from "@/components/ui/web-button"
import { dialogueStatusLabels, fundingModes, type DialogueSession } from "@/lib/dialogue"

export const dialogueTime = (value: string) => new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value))
export const dialogueField = "min-h-11 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring"
export function DialogueMoneyNotice() {
  return <p className="rounded-lg border border-border bg-muted px-4 py-3 text-xs leading-6 text-muted-foreground">当前仅开放免费报名，未开放竞拍、收款或捐赠。资金方案与合作机构确认后另行公布。</p>
}
export function DialogueHeading({ title, children }: { title: string; children?: React.ReactNode }) {
  return <header className="mb-6"><Link className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:underline" href="/community">返回社区</Link><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><h1 className="inline-flex items-center gap-2 text-2xl font-semibold"><ZaichangIcon name="conversation" className="size-7 text-primary-deep" />{title}</h1>{children}</div></header>
}
export function DialogueCard({ session }: { session: DialogueSession }) {
  return <article className="border-b border-border py-6" data-testid="dialogue-card">
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>{session.guestName}{session.companyName ? ` · ${session.companyName}` : ""}</span><span className="rounded-md bg-muted px-2 py-1">{dialogueStatusLabels[session.status]}</span></div>
    <Link href={`/community/dialogues/${session.id}`} className="mt-3 block focus-visible:outline-2 focus-visible:outline-ring"><h2 className="break-words text-lg font-semibold leading-7">{session.title}</h2><p className="mt-2 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">{session.description}</p></Link>
    <p className="mt-4 text-xs leading-6 text-muted-foreground">{dialogueTime(session.startsAt)}（北京时间） · {session.durationMinutes} 分钟 · {session.capacity} 个名额</p>
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-muted-foreground">{fundingModes[session.fundingMode]} · 未开启资金交易</span><WebButton asChild variant="quiet" size="sm"><Link href={`/community/dialogues/${session.id}`}>查看活动</Link></WebButton></div>
  </article>
}
export function DialogueErrorState({ message, retry }: { message: string; retry: () => void }) {
  return <div role="alert" className="rounded-lg border border-border p-5"><p className="text-sm">{message}</p><WebButton className="mt-3" variant="secondary" onClick={retry}>重试</WebButton></div>
}
