"use client"

import { useState } from "react"

import { WebButton } from "@/components/ui/web-button"
import { Input } from "@/components/ui/input"

const CONFIRMATION = "DELETE"

export function DeleteAccountForm({ onDeleted }: { onDeleted: () => void }) {
  const [confirmation, setConfirmation] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function deleteAccount() {
    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/me/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      })
      const result = await response.json()

      if (!response.ok || result?.success !== true) {
        setError(result?.error ?? "未能确认注销结果，请重试")
        return
      }

      onDeleted()
    } catch {
      setError("网络异常，请稍后再试")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <label className="block space-y-2 text-sm font-medium" htmlFor="delete-confirmation">
        <span>输入 {CONFIRMATION} 确认永久注销</span>
        <Input
          id="delete-confirmation"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          autoComplete="off"
          aria-describedby={error ? "delete-account-error" : undefined}
        />
      </label>
      {error ? (
        <p id="delete-account-error" className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <WebButton
        variant="dark"
        onClick={deleteAccount}
        disabled={confirmation !== CONFIRMATION || submitting}
      >
        {submitting ? "正在注销…" : "永久注销账号"}
      </WebButton>
    </div>
  )
}
