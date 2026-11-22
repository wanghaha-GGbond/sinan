import Link from "next/link"
import { ArrowLeft, ArrowUpRight, CalendarDays, LockKeyhole } from "lucide-react"
import { ZaichangIcon } from "@/components/ui/zaichang-icon"
import { WebButton } from "@/components/ui/web-button"
import { dialogueStatusLabels, type DialogueSession } from "@/lib/dialogue"
import { useDeadlinePassed } from "./use-deadline-passed"
import { DialogueRoomArt } from "./dialogue-room-art"
import styles from "./dialogue-design.module.css"

export const dialogueTime = (value: string) => new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value))
export const dialogueField = "min-h-11 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring"
export function DialogueMoneyNotice() {
  return <p className={styles.moneyNotice}><LockKeyhole size={14} aria-hidden="true" /><span>当前仅开放免费报名，未开放竞拍、收款或捐赠。资金方案与合作机构确认后另行公布。</span></p>
}
export function DialogueHeading({ title, children, backHref = "/community", backLabel = "返回社区" }: { title: string; children?: React.ReactNode; backHref?: string; backLabel?: string }) {
  return <header className={styles.heading}><Link className={styles.backLink} href={backHref}><ArrowLeft size={13} aria-hidden="true" />{backLabel}</Link><div className={styles.headingRow}><h1 className={styles.headingTitle}><ZaichangIcon name="conversation" className="size-6 text-primary-deep" />{title}</h1>{children}</div></header>
}
export function DialogueStatusBadge({ session }: { session: Pick<DialogueSession, "status" | "signupEndsAt"> }) {
  const expired = useDeadlinePassed(Date.parse(session.signupEndsAt))
  const active = session.status === "open" && !expired
  return <span className={styles.statusBadge + (active ? " " + styles.statusOpen : "")}><span className={styles.statusDot} aria-hidden="true" />{session.status === "open" && expired ? "报名已截止" : dialogueStatusLabels[session.status]}</span>
}
export function DialogueGuestInitial({ name }: { name: string }) {
  return <span className={styles.guestInitial} aria-hidden="true">{Array.from(name.trim())[0]}</span>
}
export function DialogueCard({ session }: { session: DialogueSession }) {
  return <article className={styles.sessionCard} data-testid="dialogue-card">
    <div className={styles.cardArtwork}><span className={styles.cardEdition} aria-hidden="true">ZAICHANG / A CONVERSATION</span><DialogueRoomArt compact /></div>
    <div className={styles.cardContent}>
      <div className={styles.cardMeta}><div className={styles.guestMini}><DialogueGuestInitial name={session.guestName} /><div className="min-w-0"><p className={styles.guestName}>{session.guestName}</p>{session.companyName ? <p className={styles.guestCompany}>{session.companyName}</p> : null}</div></div><DialogueStatusBadge session={session} /></div>
      <Link href={"/community/dialogues/" + session.id} className={styles.cardTitleLink}><h2 className={styles.cardTitle}>{session.title}</h2></Link>
      <p className={styles.cardDescription}>{session.description}</p>
      <p className={styles.cardSchedule}><CalendarDays size={13} aria-hidden="true" /><time dateTime={session.startsAt}>{dialogueTime(session.startsAt)}（北京时间）</time><span>· {session.durationMinutes} 分钟</span></p>
      <div className={styles.cardFooter}><span className={styles.cardFooterText}>免费报名 · {session.capacity} 个入选名额</span><Link href={"/community/dialogues/" + session.id} className={styles.cardAction}>查看活动<ArrowUpRight size={16} aria-hidden="true" /></Link></div>
    </div>
  </article>
}
export function DialogueErrorState({ message, retry }: { message: string; retry: () => void }) {
  return <div role="alert" className={styles.errorState}><p>{message}</p><WebButton variant="secondary" onClick={retry}>重试</WebButton></div>
}
