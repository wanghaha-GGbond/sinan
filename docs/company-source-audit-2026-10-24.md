# Company source audit (2026-10-24)

The local preview now includes the existing 20-company seed plus six researched company profiles. These records contain company identity and business facts only. They do not import social posts, employee claims, ratings, review counts, salaries, or personal information. The optional SQL seed is not a production deployment; the project owner must review it before use.

| Company | Fact checked | Primary source |
| --- | --- | --- |
| DJI | Shenzhen, registered entity, drones and imaging products | [DJI careers](https://careers.dji.com/zh-CN/about) |
| OPPO | Dongguan, registered entity, mobile technology | [OPPO sustainability report](https://www.oppo.com/content/dam/oppo_com/common/mkt/footer/2024-OPPO-Sustainability-Report-CN.pdf) |
| vivo | Dongguan, mobile devices and R&D | [vivo about](https://www.vivo.com.cn/brand/about) |
| BYD | Shenzhen, registered entity, auto/electronics/energy/rail | [BYD about](https://www.byd.com/zh-hk/about-byd) |
| Mindray | Shenzhen, registered entity and medical devices | [Mindray contact](https://www.mindray.com/content/xpace/zh/contact.html), [company overview](https://www.mindray.com/cn/about-us) |
| Lenovo | Beijing operations, legal group name, devices and services | [Lenovo corporate information](https://investor.lenovo.com/sc/about/corpinfo.php), [locations](https://www.lenovo.com/us/en/about/locations/) |

The existing 20 identities come from `apps/web/src/db/seeds/top-20-companies.sql`. Additional descriptions were cross-checked against [ByteDance](https://www.bytedance.com/?lang=en), [Tencent](https://www.tencent.com/zh-cn/who-we-are/), [Alibaba](https://www.alibabagroup.com/zh-HK/about-alibaba), and [Xiaohongshu's own recruiting site](https://job.xiaohongshu.com/campus/theme). Xiaohongshu user posts were not imported: public search did not yield a reliable, permissioned corpus, and isolated posts cannot substantiate a company-wide rating. Any future community-content ingestion needs rights, provenance, moderation, and privacy review.
