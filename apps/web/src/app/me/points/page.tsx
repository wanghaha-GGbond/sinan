import { notFound } from "next/navigation"
import { pointsServerEnabled } from "@/lib/server/points-feature"
import { MyPoints } from "@/components/dialogue/points-wallet"
export default function MyPointsPage() {
  if (!pointsServerEnabled()) notFound()
  return <MyPoints />
}
