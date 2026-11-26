export type MyReview = {
  id: string
  companyId: string
  companyName: string
  title: string
  score: number
  shortComment: string
  helpful: number
  commentCount: number
  createdAt: string
}

export type MyReviewPage = { reviews: MyReview[]; nextCursor: string | null }
