import Link from "next/link"
import { PenLine } from "lucide-react"

import { CompanyDirectory } from "@/components/company/company-directory"
import { SolidButton } from "@/components/ui/solid-button"

export default function CompaniesPage() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8 sm:py-12">
      <header className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">公司</h1>
        </div>
        <SolidButton asChild variant="primary">
          <Link href="/submit/review">
            <PenLine className="size-4" />
            写评价
          </Link>
        </SolidButton>
      </header>

      <CompanyDirectory />
    </section>
  )
}
