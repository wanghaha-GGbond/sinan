import { VerificationForm } from "./verification-form"

export default async function CompanyVerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string; companyName?: string }>
}) {
  const params = await searchParams

  return (
    <VerificationForm
      initialCompanyId={params.companyId ?? ""}
      initialCompanyName={params.companyName ?? ""}
    />
  )
}
