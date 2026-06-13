import type { InferSelectModel } from "drizzle-orm"

import type { promiseRecords } from "@/db/schema/promise-records"

export type PublicPromiseRecord = {
  id: string
  companyId: string
  departmentId: string | null
  promiseCategory: string
  promiseText: string
  promiseDate: string
  outcomeText: string
  outcomeStatus: "kept" | "partial" | "broken"
  evidenceType: string
  createdAt: string
}

export function toPublicPromiseRecord(
  row: InferSelectModel<typeof promiseRecords>
): PublicPromiseRecord {
  return {
    id: row.id,
    companyId: row.companyId,
    departmentId: row.departmentId,
    promiseCategory: row.promiseCategory,
    promiseText: row.promiseText,
    promiseDate: row.promiseDate,
    outcomeText: row.outcomeText,
    outcomeStatus: row.outcomeStatus,
    evidenceType: row.evidenceType,
    createdAt: row.createdAt.toISOString(),
  }
}
