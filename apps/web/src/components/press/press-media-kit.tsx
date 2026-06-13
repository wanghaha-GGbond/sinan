import { SolidCard } from "@/components/ui/solid-card"
import { TagPill } from "@/components/ui/tag-pill"

/**
 * 媒体包 (server component) — 官方措辞 / 品牌资料 / 可引用口径。
 *
 * 不做任何 fetch,纯静态内容。媒体记者 Ctrl-C 一下就能拿走。
 *
 * 全部内容标注 [官方/可改] 标签——这是“我们建议的措辞”,不是
 * “你必须照搬”。M2 阶段媒体关系建立中,我们比任何人都更想看见
 * 真实、有批评的报道。
 */
export function PressMediaKit() {
  return (
    <section className="flex flex-col gap-5">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">媒体包</h2>
          <TagPill tone="match">M2 2026-06</TagPill>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          一份标准媒体包——产品定位、官方措辞、可发引用的数据口径、视觉
          资源链接、所有“请勿引用”的清单。
        </p>
      </header>

      <Block title="一句话定位" tone="elevated">
        <Quote>
          司南是打工人评价公司的社区。我们是 ToC 产品——公司不会出现在
          我们的用户列表里,也不会拿到任何评价数据。司南的价值在于:
          入职前看清方向,不被公司招股书式的话术骗。
        </Quote>
      </Block>

      <Block title="可发引用的数据口径" tone="default">
        <ul className="list-disc space-y-2 pl-5 text-sm text-foreground">
          <li>
            部门级评价 k-匿名:同部门内 trustLevel ≥ 1 的发布者
            <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs">&lt; 5 人</code>
            时,该部门评价归并到公司级,部门 tab 显示“样本不足”(per 08 §2)。
          </li>
          <li>
            验证等级:trustLevel 0/1/2/3。0 = 注册未验证;1 = 邮箱验证
            (work_email);2 = 人工审核通过;3 = 薪资证明(本期预留,
            功能 M3 开放)。身份卡材质按等级变化,但 UI 不出现
            “L1/L2/L3” 字样(per 02 §5)。
          </li>
          <li>
            邀请制:不是阶段,是产品定位(per 04 §1.2)。M2 期间不开放
            公开注册,只走运营定向邀约。每人初始 3 枚配额,被邀请人达
            L2 时返还 1 枚,上限 6。
          </li>
          <li>
            拍卖:M2 期间是“运营级公益专场”,0 抽佣,首季全部出价
            捐赠给具公开募捐资格的基金会,收据公示。M3 才会写竞价引擎
            (per 05 §3,§5)。
          </li>
          <li>
            情绪指数:基于已审核评价的五维评分 + 活跃度 + 有用反馈的
            周聚合,不含 NLP 情感分析(评分代理够用,可解释,不烧钱)。
            <strong className="ml-1">不接 NLP</strong>是公开决议。
          </li>
        </ul>
      </Block>

      <Block title="请勿引用" tone="risk">
        <ul className="space-y-2 text-sm text-foreground">
          <li>
            <strong className="text-destructive">× “司南会推出薪资谈判工具&quot;</strong> —
            我们没规划这个。
          </li>
          <li>
            <strong className="text-destructive">× “司南与某公司有官方合作&quot;</strong> —
            我们不与任何公司建立“官方合作”关系(per 01 §三 利益冲突
            原则)。
          </li>
          <li>
            <strong className="text-destructive">× “司南的薪资数据来自 X 公司&quot;</strong> —
            全部数据来自已验证用户主动提交,无任何爬取 / 第三方采购。
            我们的薪资证明(L3)在 M3 之前不接;即便接,个税代扣 / PIPL
            评估是硬前置。
          </li>
          <li>
            <strong className="text-destructive">× “司南会做匿名版 LinkedIn&quot;</strong> —
            我们不做招聘投递,不做职位匹配,不做“公司推荐的候选人”
            任何形态。
          </li>
          <li>
            <strong className="text-destructive">× “司南不评价 CEO&quot;</strong> 或
            <strong className="ml-1 text-destructive">“司南不评价具体团队&quot;</strong> —
            我们对评价内容的人身攻击 / 隐私泄露 / 谣言 / 网暴有审核,
            但不预设“不能评价谁”。这是审核 SOP 的事,不是平台政策。
          </li>
        </ul>
      </Block>

      <Block title="可引用的官方表述" tone="default">
        <Copyable
          label="品牌 Slogan"
          text="入职前,先看清方向。"
        />
        <Copyable
          label="产品长描述 (press kit 标准 200 字)"
          text="司南(Sinan)是一个匿名公司评价社区,2026 年 M2 阶段。所有评价基于验证身份(L1+) 发布,k-匿名展示,5 维评分结构化,90 天情绪指数由每日 SQL 聚合。司南不与任何公司建立官方合作,公司不会出现在用户列表里,也不会拿到评价数据。"
        />
        <Copyable
          label="一句话投资人 pitch"
          text="打工人评价公司的社区,邀请制 + 验证身份 + 部门级 k-匿名。M2 阶段。"
        />
        <Copyable
          label="一句话用户 pitch"
          text="入职前,先看清方向。司南是打工人评价公司的社区,所有人都是 L1+ 验证身份,公司看不到评价,部门级评分 + 90 天情绪指数。"
        />
      </Block>

      <Block title="视觉资源" tone="default">
        <ul className="space-y-2 text-sm text-foreground">
          <li>
            实时分享卡生成器: <a href="/press" className="text-primary-deep hover:underline">/press</a>(本页)
            填表出 1200×630 PNG
          </li>
          <li>
            Logo 与字体包:M3 之后提供。在那之前,媒体稿请使用
            <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs">“司南&quot;</code>
            中文字符 / <code className="rounded bg-muted px-1.5 py-0.5 text-xs">sinan</code> 拉丁字符
          </li>
          <li>
            产品截图:真实使用截图随邮件请求附带——
            <a
              href="mailto:press@sinan.app?subject=截图请求"
              className="ml-1 text-primary-deep hover:underline"
            >
              press@sinan.app
            </a>
            ,24 小时内回
          </li>
        </ul>
      </Block>

      <Block title="编辑联系" tone="subtle">
        <p className="text-sm text-foreground">
          媒体朋友找我们,一律
          <a
            href="mailto:press@sinan.app"
            className="mx-1 font-semibold text-primary-deep hover:underline"
          >
            press@sinan.app
          </a>
          ,我们 24 小时内回。涉及到具体公司评价案例的引用 / 公司方
          反应的,请在邮件里直接写明“我希望双方都发声”——我们
          会协调,不会私下灭火。
        </p>
      </Block>
    </section>
  )
}

function Block({
  title,
  tone,
  children,
}: {
  title: string
  tone: "elevated" | "default" | "subtle" | "risk"
  children: React.ReactNode
}) {
  return (
    <SolidCard variant={tone} className="p-5">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="mt-3">{children}</div>
    </SolidCard>
  )
}

function Quote({ children }: { children: React.ReactNode }) {
  return (
    <blockquote className="rounded-2xl bg-muted p-4 text-sm leading-6 text-foreground">
      {children}
    </blockquote>
  )
}

function Copyable({ label, text }: { label: string; text: string }) {
  return (
    <div className="mt-3 first:mt-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 flex items-start gap-2 rounded-2xl bg-muted p-3">
        <p className="flex-1 text-sm text-foreground">{text}</p>
        <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-primary-deep">
          {text.length > 80 ? "长描述" : "短描述"}
        </span>
      </div>
    </div>
  )
}
