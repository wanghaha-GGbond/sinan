import Link from "next/link"
import { PenLine } from "lucide-react"

import { CompanyDirectory } from "@/components/company/company-directory"
import { SolidButton } from "@/components/ui/solid-button"

export default function CompaniesPage() {
  return (
    <section className="min-h-[calc(100vh-160px)] bg-muted px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto w-full max-w-5xl">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">公司</h1>
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
