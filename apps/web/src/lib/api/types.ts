// All types now live in lib/types.ts. This file re-exports them so that
// import paths that still reference './types' or '@/lib/api/types' remain valid.
export type { CompanyListItem, ApiResponse, ReviewListItem } from '@/lib/types'