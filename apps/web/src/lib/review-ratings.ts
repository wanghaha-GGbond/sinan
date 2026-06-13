import { z } from "zod"

export const reviewRatingDimensionsSchema = z.object({
  pay_worth: z.number().int().min(1).max(5),
  growth: z.number().int().min(1).max(5),
  leader: z.number().int().min(1).max(5),
  overtime_truth: z.number().int().min(1).max(5),
  promise_delivery: z.number().int().min(1).max(5),
})

export type ReviewRatingDimensions = z.infer<typeof reviewRatingDimensionsSchema>

export const REVIEW_RATING_LABELS: Record<keyof ReviewRatingDimensions, string> = {
  pay_worth: "薪酬值得",
  growth: "成长空间",
  leader: "直属领导",
  overtime_truth: "加班真实度",
  promise_delivery: "承诺兑现",
}
