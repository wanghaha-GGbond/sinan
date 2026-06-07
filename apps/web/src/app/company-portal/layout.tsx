import Link from "next/link"
import { Building2, ChevronLeft, ShieldCheck } from "lucide-react"

export default function CompanyPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-card">
      {/* Sticky banner — makes it impossible to forget you're in company mode. */}
      <div className="sticky top-12 z-sticky border-b border-border bg-foreground text-white">
        <div className="mx-auto flex max-w-hero flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-xs sm:px-6">
          <div className="flex items-center gap-2">
            <Building2 className="size-3.5" />
            <span className="font-semibold">公司控制台</span>
            <span className="hidden text-white/60 sm:inline">你正在以公司身份查看</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1 text-white/70 md:inline-flex">
              <ShieldCheck className="size-3.5" />
              司南保留所有匿名与原始评价
            </span>
            <Link
              href="/"
              className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-white hover:bg-white/20"
            >
              <ChevronLeft className="size-3.5" />
              退出公司视角
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-hero px-4 py-6 sm:px-6">{children}</div>

      <footer className="border-t border-border bg-white">
        <div className="mx-auto max-w-hero px-4 py-6 text-xs text-muted-foreground sm:px-6">
          <p className="font-semibold text-foreground">公司端权限边界</p>
          <p className="mt-1 flex flex-wrap gap-x-2.5 gap-y-1">公司账号只能查看公开数据、提交基础信息修正、对明显违规内容提交申诉。</p>
          <p className="mt-1">
            <strong className="text-foreground">公司不能</strong>:删除评价、修改评分、购买排名、获取评价用户身份、私信评价用户、影响榜单排序。
          </p>
        </div>
      </footer>
    </div>
  )
}
