"use client"

import { useEffect, useState } from "react"

function formatCountdown(ms: number): string {
  if (ms <= 0) return "已截拍"
  const totalSeconds = Math.floor(ms / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (days > 0) return `${days} 天 ${hours} 小时后截拍`
  if (hours > 0) return `${hours} 小时 ${minutes} 分钟后截拍`
  if (minutes > 0) return `${minutes} 分 ${String(seconds).padStart(2, "0")} 秒后截拍`
  return `${seconds} 秒后截拍`
}

export function Countdown({ endsAt, className = "" }: { endsAt: string; className?: string }) {
  const [remaining, setRemaining] = useState(() => new Date(endsAt).getTime() - Date.now())

  useEffect(() => {
    const tick = () => setRemaining(new Date(endsAt).getTime() - Date.now())
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [endsAt])

  return (
    <span className={className} aria-live="off">
      {formatCountdown(remaining)}
    </span>
  )
}
