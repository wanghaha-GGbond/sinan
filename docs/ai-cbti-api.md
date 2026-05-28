# AI Company Vibe + C-BTI API Contract (Draft)

## Positioning

- 前台主展示：公司体感标签（例如：仓鼠笼公司、火箭发射台公司）。
- 内部结构字段：C-BTI（用于结构化分析与可解释信号）。
- 当前前端仅使用 mock 推导，不接真实 AI 后端。

## Endpoint 1

`POST /api/ai/company-vibe/analyze`

### Purpose

基于匿名评价、评分汇总、问卷汇总，生成前台展示的公司体感标签。

### Request

```json
{
  "companyId": "northstar-tech",
  "ratingSummary": {
    "directionScore": 7.6,
    "recommendationRate": 61,
    "dimensions": {
      "growth": 8.2,
      "workLifeBalance": 6.1,
      "management": 6.5
    }
  },
  "reviewTexts": ["..."],
  "questionnaireSummary": {
    "canteenAvg": 7.2,
    "officeEnvironmentAvg": 7.5,
    "restroomAvg": 6.3,
    "afternoonTeaAvg": 5.1,
    "officeExperienceAvg": 7.1,
    "paceDistribution": { "very_fast": 12, "fast": 31, "stable": 8, "very_stable": 2 },
    "managementStyleDistribution": { "flexible": 18, "balanced_process": 20, "process_clear": 11, "process_heavy": 4 },
    "growthExperienceDistribution": { "very_fast": 25, "team_dependent": 19, "average": 7, "limited": 2 },
    "collaborationStyleDistribution": { "cross_team": 24, "within_team": 21, "individual": 5, "high_friction": 3 }
  },
  "cbtiProfile": {
    "code": "RFGC",
    "confidence": 0.78
  }
}
```

### Response

```json
{
  "vibeTag": {
    "id": "hamster_cage",
    "name": "仓鼠笼公司",
    "shortName": "仓鼠笼",
    "summary": "公司不大，事情很多，节奏密集，容易一直转。",
    "signals": ["节奏快", "事务碎", "变化多", "平衡偏低"],
    "riskLevel": "high",
    "tone": "caution",
    "confidence": 0.79,
    "generatedBy": "ai",
    "updatedAt": "2026-05-25"
  }
}
```

## Endpoint 2

`POST /api/ai/cbti/analyze`

保留为内部结构化分析接口，产出 C-BTI 字段，不作为前台主品牌文案。

## Notes

- 办公体验字段是辅助信号，不直接决定 C-BTI 主类型。
- 公司体感标签用于求职判断参考，不是平台主观定性或攻击性结论。
