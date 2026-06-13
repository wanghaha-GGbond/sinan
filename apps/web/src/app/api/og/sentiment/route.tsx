import { ImageResponse } from "next/og"

export const runtime = "edge"

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const company = params.get("company")?.slice(0, 50) || "司南公司"
  const score = Math.max(0, Math.min(100, Number(params.get("score") ?? 72)))
  const trend = params.get("trend") === "down" ? "下降" : "上升"
  // M2 T5.2: when an invite code is attached, the share card becomes a
  // growth loop. The watermark reads "用 TA 的邀请码加入" and links to
  // the landing page. K-factor math in 04 §1.4 assumes 50% usage rate,
  // so each share has to remind the viewer to actually use the code.
  const inviteCode = params.get("invite")?.slice(0, 12) ?? null
  const inviterName = params.get("inviter")?.slice(0, 16) ?? null

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#101418",
          color: "#f7faf8",
          padding: "70px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 26, color: "#60d394" }}>司南 · 职场情绪指数</div>
            <div style={{ marginTop: 24, fontSize: 58, fontWeight: 700 }}>{company}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ fontSize: 110, fontWeight: 800 }}>{score.toFixed(1)}</div>
            <div style={{ display: "flex", fontSize: 28, color: trend === "上升" ? "#60d394" : "#ff7b72" }}>
              本周{trend}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "22px", height: "220px" }}>
          {[42, 58, 51, 67, 63, 76, score].map((value, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                flex: 1,
                height: `${Math.max(20, value * 1.8)}px`,
                background: index === 6 ? "#60d394" : "#34413b",
              }}
            />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontSize: 22, color: "#9ca9a2" }}>
          <span style={{ display: "flex", flexDirection: "column" }}>
            <span>基于已审核评价的五维评分、活跃度与有用反馈</span>
            {inviteCode ? (
              <span style={{ marginTop: 8, color: "#f7faf8", fontSize: 26, fontWeight: 600 }}>
                {inviterName ? `${inviterName} 邀请你:` : "邀请你:"}
                <span style={{ marginLeft: 14, color: "#60d394" }}>sinan.app/invite/{inviteCode}</span>
              </span>
            ) : null}
          </span>
          <span>sinan</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
