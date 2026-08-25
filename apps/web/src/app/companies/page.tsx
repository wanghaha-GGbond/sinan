import Link from "next/link"
import { Building2, PenLine } from "lucide-react"

import { CompanyDirectory } from "@/components/company/company-directory"
import { SolidButton } from "@/components/ui/solid-button"

export default function CompaniesPage() {
  return (
    <section className="mx-auto w-full max-w-page px-4 py-6 sm:px-6">
      <header className="mb-6 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
            <Building2 className="size-4" />
            公司广场
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">从公司开始了解真实工作体验</h1>
          <p className="mt-2 text-sm text-muted-foreground">数据来自已审核入库的公司与公开评价，不使用演示公司兜底。</p>
        </div>
        <SolidButton asChild variant="primary">
          <Link href="/submit/review">
            <PenLine className="size-4" />
            测评现公司 / 前公司
          </Link>
        </SolidButton>
      </header>

      <CompanyDirectory />
    </section>
  )
}
