import { RatingsClient } from "@/app/company/[id]/ratings/ratings-client"

export default async function CompanyRatingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return <RatingsClient id={id} />
}
