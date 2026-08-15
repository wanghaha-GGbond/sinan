import type { Review, ReviewListItem } from "@/lib/types"

export function mapPublicReview(item: ReviewListItem): Review {
  const relationMap: Record<string, Review["relation"]> = {
    在职员工: "在职员工",
    离职员工: "离职员工",
    面试者: "面试者",
    实习生: "实习生",
    "外包 / 派遣": "外包 / 派遣",
    current_employee: "在职员工",
    former_employee: "离职员工",
    interviewee: "面试者",
    intern: "实习生",
    contractor: "外包 / 派遣",
  }
  const relation = relationMap[item.employmentStatus ?? item.authorRole] ?? "面试者"

  return {
    id: item.id,
    companyId: item.companyId,
    role: item.authorLabel || "匿名评价者",
    relation,
    tenure: "",
    score: Number(item.directionScore),
    title: item.title,
    content: item.content ?? item.summary ?? item.title,
    tags: item.tags ?? [],
    helpful: item.usefulCount,
    commentCount: item.discussionCount,
    shortComment: item.title,
    jobCategory: item.jobTitle ?? "",
    employmentStatus: relation,
    trustLevel:
      item.publicAuthor?.verificationLevel === "L2"
        ? 2
        : item.publicAuthor?.verificationLevel === "L1"
          ? 1
          : 0,
    city: item.city ?? "未知",
    comments: [],
    createdAt: item.createdAt,
    verifiedHint: item.publicAuthor?.verifiedForCompany
      ? `${item.publicAuthor.verificationLevel} 公司身份已核验`
      : "身份未核验",
    verified: Boolean(item.publicAuthor?.verifiedForCompany),
    isUsefulByCurrentUser: item.isUsefulByCurrentUser,
  }
}
