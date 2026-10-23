import type { CompanyListItem } from "@/lib/types"

type CompanyFact = {
  id: string
  name: string
  city: string
  industry: string
  website: string
  sourceUrl?: string
  registeredName?: string
  description?: string
}

// Company identity and business facts only. Employee sentiment belongs exclusively to reviewed submissions.
export const curatedCompanyFacts: CompanyFact[] = [
  { id: "10000000-0000-4000-8000-000000000001", name: "字节跳动", city: "北京", industry: "互联网 / AI", website: "https://www.bytedance.com", sourceUrl: "https://www.bytedance.com/?lang=en", description: "旗下产品涵盖内容、创作工具与企业协作。" },
  { id: "10000000-0000-4000-8000-000000000002", name: "腾讯", city: "深圳", industry: "互联网 / 游戏", website: "https://www.tencent.com", sourceUrl: "https://www.tencent.com/zh-cn/about.html", description: "业务覆盖社交、数字内容、游戏及企业服务。" },
  { id: "10000000-0000-4000-8000-000000000003", name: "阿里巴巴", city: "杭州", industry: "电商 / 云计算", website: "https://www.alibabagroup.com", sourceUrl: "https://www.alibabagroup.com/zh-HK/about-alibaba", description: "聚焦电商、云计算及人工智能相关业务。" },
  { id: "10000000-0000-4000-8000-000000000004", name: "美团", city: "北京", industry: "本地生活 / 配送", website: "https://www.meituan.com" },
  { id: "10000000-0000-4000-8000-000000000005", name: "拼多多", city: "上海", industry: "电商 / 农业科技", website: "https://www.pddholdings.com" },
  { id: "10000000-0000-4000-8000-000000000006", name: "京东", city: "北京", industry: "电商 / 物流", website: "https://www.jd.com" },
  { id: "10000000-0000-4000-8000-000000000007", name: "百度", city: "北京", industry: "搜索 / AI", website: "https://www.baidu.com" },
  { id: "10000000-0000-4000-8000-000000000008", name: "小米", city: "北京", industry: "消费电子 / IoT", website: "https://www.mi.com" },
  { id: "10000000-0000-4000-8000-000000000009", name: "华为", city: "深圳", industry: "通信 / 云计算", website: "https://www.huawei.com" },
  { id: "10000000-0000-4000-8000-000000000010", name: "网易", city: "杭州", industry: "游戏 / 内容", website: "https://www.163.com" },
  { id: "10000000-0000-4000-8000-000000000011", name: "滴滴", city: "北京", industry: "出行 / 自动驾驶", website: "https://www.didiglobal.com" },
  { id: "10000000-0000-4000-8000-000000000012", name: "快手", city: "北京", industry: "短视频 / 直播", website: "https://www.kuaishou.com" },
  { id: "10000000-0000-4000-8000-000000000013", name: "蚂蚁集团", city: "杭州", industry: "金融科技", website: "https://www.antgroup.com" },
  { id: "10000000-0000-4000-8000-000000000014", name: "小红书", city: "上海", industry: "内容社区 / 电商", website: "https://www.xiaohongshu.com", sourceUrl: "https://job.xiaohongshu.com/campus/theme", registeredName: "行吟信息科技（上海）有限公司", description: "社区业务及搜索、推荐、广告、电商等方向持续招聘。" },
  { id: "10000000-0000-4000-8000-000000000015", name: "哔哩哔哩", city: "上海", industry: "视频 / 内容社区", website: "https://www.bilibili.com" },
  { id: "10000000-0000-4000-8000-000000000016", name: "携程集团", city: "上海", industry: "在线旅游", website: "https://group.trip.com" },
  { id: "10000000-0000-4000-8000-000000000017", name: "蔚来", city: "上海", industry: "新能源汽车", website: "https://www.nio.com" },
  { id: "10000000-0000-4000-8000-000000000018", name: "理想汽车", city: "北京", industry: "新能源汽车", website: "https://www.lixiang.com" },
  { id: "10000000-0000-4000-8000-000000000019", name: "小鹏汽车", city: "广州", industry: "新能源汽车", website: "https://www.xiaopeng.com" },
  { id: "10000000-0000-4000-8000-000000000020", name: "宁德时代", city: "宁德", industry: "新能源 / 电池", website: "https://www.catl.com" },
  { id: "10000000-0000-4000-8000-000000000021", name: "大疆创新", city: "深圳", industry: "无人机 / 影像", website: "https://www.dji.com", sourceUrl: "https://careers.dji.com/zh-CN/about", registeredName: "深圳市大疆创新科技有限公司", description: "产品涵盖无人机系统与手持影像设备。" },
  { id: "10000000-0000-4000-8000-000000000022", name: "OPPO", city: "东莞", industry: "消费电子 / 移动科技", website: "https://www.oppo.com", sourceUrl: "https://www.oppo.com/cn/oppo-sustainability/", registeredName: "OPPO广东移动通信有限公司", description: "面向手机、影像、AI 等方向的移动科技公司。" },
  { id: "10000000-0000-4000-8000-000000000023", name: "vivo", city: "东莞", industry: "消费电子 / 移动科技", website: "https://www.vivo.com.cn", sourceUrl: "https://www.vivo.com.cn/brand/about", description: "业务涉及智能手机、影像、通信及智能终端。" },
  { id: "10000000-0000-4000-8000-000000000024", name: "比亚迪", city: "深圳", industry: "新能源汽车 / 电子", website: "https://www.byd.com", sourceUrl: "https://www.byd.com/zh-hk/about-byd", registeredName: "比亚迪股份有限公司", description: "业务涵盖汽车、电子、新能源与轨道交通。" },
  { id: "10000000-0000-4000-8000-000000000025", name: "迈瑞医疗", city: "深圳", industry: "医疗器械", website: "https://www.mindray.com", sourceUrl: "https://www.mindray.com/content/xpace/zh/contact.html", registeredName: "深圳迈瑞生物医疗电子股份有限公司", description: "医疗器械业务涉及生命信息与支持、体外诊断及医学影像。" },
  { id: "10000000-0000-4000-8000-000000000026", name: "联想", city: "北京", industry: "计算机 / 企业服务", website: "https://www.lenovo.com", sourceUrl: "https://investor.lenovo.com/sc/about/corpinfo.php", registeredName: "联想集团有限公司", description: "业务涵盖个人电脑、基础设施、解决方案及服务。" },
]

export function getCuratedCompany(id: string): CompanyListItem | null {
  const fact = curatedCompanyFacts.find((item) => item.id === id)
  if (!fact) return null
  return {
    id: fact.id,
    name: fact.name,
    registeredName: fact.registeredName ?? null,
    shortName: fact.name,
    englishName: null,
    aliases: null,
    city: fact.city,
    industry: fact.industry,
    size: null,
    financingStage: null,
    website: fact.website,
    logoUrl: null,
    description: fact.description ?? null,
    reviewStatus: "reviewable",
    claimedStatus: "unclaimed",
    verifiedIdentityCount: 0,
    source: "platform_seed",
    businessStatus: null,
    foundedDate: null,
    unifiedSocialCreditCode: null,
    registeredAddress: null,
    legalRepresentative: null,
    createdAt: "2026-10-24",
    updatedAt: "2026-10-24",
    directionScore: 0,
    recommendationRate: 0,
    reviewCount: 0,
    salaryRange: null,
    riskTags: [],
    highlights: [],
  }
}

export function getCompanyFactSource(id: string) {
  const fact = curatedCompanyFacts.find((item) => item.id === id)
  return fact?.sourceUrl ?? fact?.website ?? null
}
