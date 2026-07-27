"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

type DepartmentStat = { department: string; count: number }
type HiringDay = { date: string; count: number }

type VizData = {
  companyId: string
  departmentStats: DepartmentStat[]
  hiringTrend30d: HiringDay[]
}

/**
 * /visualizations/[companyId] — 公开页(脱敏聚合)
 *
 * 红线(08 §3):
 *   - 永远不卖任何可定位个人的数据
 *   - 只展示聚合洞察(只数 + 百分比 + 趋势)
 */
export default function VisualizationPage() {
  const { companyId } = useParams<{ companyId: string }>()
  const [data, setData] = useState<VizData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!companyId) return
    fetch(`/api/visualizations/${companyId}`)
      .then((r) => {
        if (!r.ok) throw new Error("not_found")
        return r.json()
      })
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => {
        setError("暂无该公司的可视化数据")
        setLoading(false)
      })
  }, [companyId])

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-12 text-sm">加载中…</div>
    )
  }
  if (error || !data) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-12 text-sm">
        {error ?? "暂无数据"}
      </div>
    )
  }

  const maxDeptCount = Math.max(
    1,
    ...data.departmentStats.map((d) => d.count)
  )

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold">公司可视化</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          脱敏聚合洞察 — 不显示个人,只显示群体特征。
        </p>
      </header>

      <section className="bg-card rounded-2xl border p-6 shadow-sm">
        <h2 className="text-foreground text-xl font-semibold">部门热度</h2>
        <ul className="mt-4 space-y-3">
          {data.departmentStats.map((d) => (
            <li key={d.department}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground">{d.department}</span>
                <span className="text-muted-foreground text-xs">
                  {d.count} 人
                </span>
              </div>
              <div className="bg-muted mt-1 h-2 w-full overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full"
                  style={{
                    width: `${Math.round((d.count / maxDeptCount) * 100)}%`,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-card mt-6 rounded-2xl border p-6 shadow-sm">
        <h2 className="text-foreground text-xl font-semibold">
          招聘动向(30 天)
        </h2>
        <ul className="mt-4 space-y-2 text-xs">
          {data.hiringTrend30d.map((d) => (
            <li key={d.date} className="flex items-center gap-3">
              <span className="text-muted-foreground w-24 shrink-0">
                {d.date}
              </span>
              <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full"
                  style={{
                    width: `${Math.min(100, d.count * 10)}%`,
                  }}
                />
              </div>
              <span className="text-muted-foreground w-10 text-right">
                {d.count}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-muted-foreground mt-8 text-xs">
        数据来源:站内验证用户部门分布 + 公开招聘数据(M3.1+ 真接)。
        本期仅 mock。
      </p>
    </div>
  )
}