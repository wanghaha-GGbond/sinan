import { notFound } from "next/navigation"
import { connection } from "next/server"
import { pointsServerEnabled } from "@/lib/server/points-feature"
import { MyPoints } from "@/components/dialogue/points-wallet"
export default async function MyPointsPage() {
  // Server feature switches are runtime configuration, not build-time values.
  // Otherwise an opt-in deployment can inherit a prerendered disabled 404.
  await connection()
  if (!pointsServerEnabled()) notFound()
  return <MyPoints />
}
