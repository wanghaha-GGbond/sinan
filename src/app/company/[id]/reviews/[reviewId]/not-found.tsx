import Link from "next/link"

import { EmptyState } from "@/components/common/state-blocks"
import { Button } from "@/components/ui/button"

export default function ReviewNotFound() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-10 sm:px-6">
      <EmptyState
        title="没有找到这条评价。"
        description="它可能已被删除，或正在审核中。"
      />
      <Button nativeButton={false} render={<Link href="/search" />}>
        返回搜索公司
      </Button>
    </section>
  )
}
