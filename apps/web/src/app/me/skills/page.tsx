"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

const NAME_MAX = 40
const DESC_MAX = 280
const EVIDENCE_MAX = 280

export default function MySkillsPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [evidenceNote, setEvidenceNote] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [endorsements, setEndorsements] = useState<
    Array<{ id: string; name: string; endorserCount: number; status: string }>
  >([])

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) router.push("/login?next=/me/skills")
      })
    fetch("/api/me/skills")
      .then((r) => r.json())
      .then((data) => setEndorsements(data.skills ?? []))
      .catch(() => {})
  }, [router])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)
    const res = await fetch("/api/skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim(),
        evidenceNote: evidenceNote.trim(),
      }),
    })
    setSubmitting(false)
    if (res.ok) {
      setName("")
      setDescription("")
      setEvidenceNote("")
      setMessage("已提交,等待审核 + 背书")
      // 刷新我的列表
      fetch("/api/me/skills")
        .then((r) => r.json())
        .then((data) => setEndorsements(data.skills ?? []))
    } else {
      const data = await res.json().catch(() => ({}))
      setMessage(data.error ?? "提交失败")
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-semibold">提交一技</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        其他人可背书你的技能,满 3 个背书即上榜公开流。
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={NAME_MAX}
          placeholder="技能名 (≤40 字)"
          className="bg-background w-full rounded-2xl border p-3 text-sm"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={DESC_MAX}
          placeholder="说明这个技能是干什么的"
          className="bg-background w-full rounded-2xl border p-3 text-sm"
        />
        <textarea
          value={evidenceNote}
          onChange={(e) => setEvidenceNote(e.target.value)}
          rows={2}
          maxLength={EVIDENCE_MAX}
          placeholder="证据 / 案例"
          className="bg-background w-full rounded-2xl border p-3 text-sm"
        />
        <button
          type="submit"
          disabled={submitting}
          className="bg-primary text-primary-foreground rounded-full px-5 py-2 text-sm disabled:opacity-50"
        >
          {submitting ? "提交中…" : "提交"}
        </button>
        {message && (
          <div className="text-muted-foreground text-xs">{message}</div>
        )}
      </form>

      {endorsements.length > 0 && (
        <section className="mt-12">
          <h2 className="text-foreground text-xl font-semibold">我的技能</h2>
          <ul className="mt-4 space-y-3">
            {endorsements.map((s) => (
              <li
                key={s.id}
                className="bg-card flex items-center justify-between rounded-2xl border p-4"
              >
                <div>
                  <div className="text-foreground font-medium">{s.name}</div>
                  <div className="text-muted-foreground text-xs">
                    状态:{s.status} · 背书 {s.endorserCount} / 3
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}