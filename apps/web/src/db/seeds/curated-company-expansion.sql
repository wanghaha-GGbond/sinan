-- Optional, review-before-running seed. Adds company identity only; never creates reviews or scores.
-- Existing rows, including pending user submissions, are left untouched.
INSERT INTO companies (
  id, name, registered_name, short_name, city, industry, website, description, source, review_status
)
SELECT seed.id::uuid, seed.name, seed.registered_name, seed.name, seed.city,
  seed.industry, seed.website, seed.description,
  'platform_seed'::company_source, 'reviewable'::company_review_status
FROM (VALUES
  ('10000000-0000-4000-8000-000000000021', '大疆创新', '深圳市大疆创新科技有限公司', '深圳', '无人机 / 影像', 'https://www.dji.com', '产品涵盖无人机系统与手持影像设备。'),
  ('10000000-0000-4000-8000-000000000022', 'OPPO', 'OPPO广东移动通信有限公司', '东莞', '消费电子 / 移动科技', 'https://www.oppo.com', '面向手机、影像、AI 等方向的移动科技公司。'),
  ('10000000-0000-4000-8000-000000000023', 'vivo', NULL, '东莞', '消费电子 / 移动科技', 'https://www.vivo.com.cn', '业务涉及智能手机、影像、通信及智能终端。'),
  ('10000000-0000-4000-8000-000000000024', '比亚迪', '比亚迪股份有限公司', '深圳', '新能源汽车 / 电子', 'https://www.byd.com', '业务涵盖汽车、电子、新能源与轨道交通。'),
  ('10000000-0000-4000-8000-000000000025', '迈瑞医疗', '深圳迈瑞生物医疗电子股份有限公司', '深圳', '医疗器械', 'https://www.mindray.com', '医疗器械业务涉及生命信息与支持、体外诊断及医学影像。'),
  ('10000000-0000-4000-8000-000000000026', '联想', '联想集团有限公司', '北京', '计算机 / 企业服务', 'https://www.lenovo.com', '业务涵盖个人电脑、基础设施、解决方案及服务。')
) AS seed(id, name, registered_name, city, industry, website, description)
WHERE NOT EXISTS (
  SELECT 1 FROM companies existing
  WHERE existing.deleted_at IS NULL
    AND (lower(existing.name) = lower(seed.name)
      OR (seed.registered_name IS NOT NULL AND existing.registered_name = seed.registered_name))
)
ON CONFLICT DO NOTHING;
