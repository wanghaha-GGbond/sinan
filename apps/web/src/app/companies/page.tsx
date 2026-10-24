import Link from "next/link"
import { PenLine } from "lucide-react"

import { CompanyDirectory } from "@/components/company/company-directory"
import { SolidButton } from "@/components/ui/solid-button"

export default function CompaniesPage() {
  return (
    <section className="min-h-[calc(100vh-160px)] bg-[#f5f6f7] px-4 py-8 dark:bg-background sm:px-8 sm:py-12">
      <div className="mx-auto w-full max-w-5xl">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold text-[#197354]">在场公司库</p>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">公司</h1>
          <p className="mt-2 text-sm text-muted-foreground">看评价，了解真实的工作体验。</p>
        </div>
        <SolidButton asChild variant="primary">
          <Link href="/submit/review">
            <PenLine className="size-4" />
            写评价
          </Link>
        </SolidButton>
      </header>

      <CompanyDirectory />
      </div>
    </section>
  )
}
