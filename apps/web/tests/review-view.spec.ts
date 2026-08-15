import { expect, test } from "@playwright/test"

import type { reviews } from "../src/db/schema/reviews"
import { toPublicReviewView } from "../src/lib/server/review-view"

function reviewRow(overrides: Partial<typeof reviews.$inferSelect> = {}) {
  return {
    id: "10000000-0000-4000-8000-000000000001",
    companyId: "10000000-0000-4000-8000-000000000002",
    departmentId: null,
    authorUserId: "10000000-0000-4000-8000-000000000003",
    anonymousProfileId: "10000000-0000-4000-8000-000000000004",
    authorFingerprintHash: "private-fingerprint",
    authorRole: "current_employee" as const,
    authorLabel: "匿名在职员工",
    title: "评价标题",
    content: "原始内容",
    summary: null,
    directionScore: "8.0",
    recommendToJoin: true,
    employmentStatus: "current_employee",
    jobTitle: "工程师",
    city: "上海",
    departmentHint: "某小团队",
    questionnaire: null,
    ratingDimensions: null,
    officeExperienceScore: null,
    usefulCount: 12,
    usefulVoteBaseline: 10,
    discussionCount: 2,
    status: "visible" as const,
    moderationReason: null,
    maskedContent: null,
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    updatedAt: new Date("2026-08-01T00:00:00.000Z"),
    reviewedAt: null,
    deletedAt: null,
    ...overrides,
  } satisfies typeof reviews.$inferSelect
}

test("review public view exposes company-scoped L1 without private ids", () => {
  const view = toPublicReviewView(reviewRow(), {
    companyVerificationLevel: 1,
    isUsefulByCurrentUser: true,
  })

  expect(view.publicAuthor).toEqual({
    label: "匿名在职员工",
    role: "current_employee",
    verificationLevel: "L1",
    verifiedForCompany: true,
  })
  expect(view.isUsefulByCurrentUser).toBe(true)
  expect(view).not.toHaveProperty("authorUserId")
  expect(view).not.toHaveProperty("anonymousProfileId")
  expect(view).not.toHaveProperty("authorFingerprintHash")
})

test("review public view caps public verification label at L2", () => {
  expect(
    toPublicReviewView(reviewRow(), { companyVerificationLevel: 3 })
      .publicAuthor.verificationLevel
  ).toBe("L2")
})

test("limited review returns masked content", () => {
  const view = toPublicReviewView(
    reviewRow({ status: "limited_visible", maskedContent: "[信息已隐藏]" })
  )
  expect(view.content).toBe("[信息已隐藏]")
})
