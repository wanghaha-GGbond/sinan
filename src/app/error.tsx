"use client"

import { ErrorState } from "@/components/common/state-blocks"

export default function Error() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <ErrorState />
    </section>
  )
}
