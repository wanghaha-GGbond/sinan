import { expect, test } from "@playwright/test"

import { submitReviewData } from "../src/lib/data/reviews"

test("review submission never reports local success after a network failure", async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => {
    throw new Error("offline")
  }

  try {
    const result = await submitReviewData({
      companyId: "00000000-0000-0000-0000-000000000000",
      authorRole: "current_employee",
      title: "不会假成功",
      content: "网络错误时必须明确告诉用户评价并未写入数据库，不能生成本地评价冒充成功。",
      directionScore: 8,
      ratingDimensions: {
        pay_worth: 4,
        growth: 4,
        leader: 4,
        overtime_truth: 3,
        promise_delivery: 4,
      },
    })
    expect(result).toEqual({ ok: false, error: "网络连接失败，评价尚未提交，请重试" })
  } finally {
    globalThis.fetch = originalFetch
  }
})
