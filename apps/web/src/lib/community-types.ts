export type CommunityFeedItem = {
  id: string
  reviewId: string
  companyId: string
  companyName: string
  industry: string
  city: string
  type: "question" | "supplement"
  authorLabel: string
  content: string | null
  usefulCount: number
  tags: string[] | null
  createdAt: string
}

export type CommunityFilters = {
  companyId?: string
  industry?: string
  city?: string
  type?: "question" | "supplement"
  sort?: "useful" | "latest" | "company"
}
