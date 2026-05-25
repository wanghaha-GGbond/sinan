# AI C-BTI API Contract (Draft)

## Endpoint

`POST /api/ai/cbti/analyze`

## Purpose

根据公司匿名评价、方向分汇总、结构化问卷汇总，生成 C-BTI（公司行为类型指标）标签。

## Request

```json
{
  "companyId": "northstar-tech",
  "reviews": [
    {
      "id": "review-1",
      "score": 7.8,
      "content": "..."
    }
  ],
  "ratingSummary": {
    "directionScore": 7.6,
    "recommendationRate": 61,
    "dimensions": {
      "growth": 8.2,
      "workLifeBalance": 6.1,
      "management": 6.5
    }
  },
  "questionnaireSummary": {
    "companyPace": { "very_fast": 12, "fast": 31, "stable": 8, "very_stable": 2 },
    "managementStyle": { "flexible": 18, "balanced_process": 20, "process_clear": 11, "process_heavy": 4 },
    "growthExperience": { "very_fast": 25, "team_dependent": 19, "average": 7, "limited": 2 },
    "collaborationStyle": { "cross_team": 24, "within_team": 21, "individual": 5, "high_friction": 3 },
    "canteenAvg": 7.2,
    "officeEnvironmentAvg": 7.5,
    "restroomAvg": 6.3,
    "afternoonTeaAvg": 5.1,
    "workstationComfortAvg": 7.4,
    "commuteConvenienceAvg": 7.8,
    "officeEquipmentAvg": 7.6,
    "officeExperienceAvg": 7.1
  }
}
```

## Response

```json
{
  "cbti": {
    "code": "RFGC",
    "title": "快节奏成长型",
    "summary": "评价中高频出现节奏快、成长快、变化多、协作多等信号。",
    "axes": {
      "pace": "R",
      "management": "F",
      "growth": "G",
      "collaboration": "C"
    },
    "confidence": 0.78,
    "evidence": [
      "成长空间评分高",
      "工作生活平衡评分偏低",
      "多条评价提到节奏快",
      "问卷中公司节奏多选择 very_fast / fast"
    ],
    "updatedAt": "2026-05-24"
  },
  "officeExperienceInsight": {
    "score": 7.1,
    "summary": "办公环境和通勤便利度较好，但厕所和下午茶评价一般。",
    "strengths": ["通勤便利", "办公环境较好"],
    "weaknesses": ["厕所维护一般", "下午茶稳定性不足"]
  }
}
```

## Notes

- 当前前端仅使用 mock 推断逻辑 `inferMockCBTI(company)`。
- 办公体验字段是 C-BTI 分析的辅助信号，不直接决定 C-BTI 主类型。
- 本文档是未来真实 AI 服务的 contract 预留，不代表本轮接入真实后端。
