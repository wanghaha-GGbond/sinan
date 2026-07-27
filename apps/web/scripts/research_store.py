#!/usr/bin/env python3
import argparse
import hashlib
import json
import re
import sqlite3
from datetime import datetime
from pathlib import Path


APP_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB = APP_ROOT / "src/db/seeds/research-store.sqlite"
DEFAULT_TARGETS = APP_ROOT / "src/db/seeds/research-targets.json"
DEFAULT_OBSERVATIONS = APP_ROOT / "src/db/seeds/research-observations.json"
DEFAULT_INSIGHTS = APP_ROOT / "src/db/seeds/reports/company-insight-cards.json"
DEFAULT_INDICES = APP_ROOT / "src/db/seeds/reports/company-indices.json"
DEFAULT_EXTERNAL = APP_ROOT / "src/db/seeds/research-external-evidence.json"
DEFAULT_THEME_EVIDENCE = APP_ROOT / "src/db/seeds/research-theme-evidence.json"

PLATFORM_LABELS = {
  "Boss 直聘": "boss_zhipin",
  "小红书": "xiaohongshu",
  "微博": "weibo",
  "知乎": "zhihu",
}


SCHEMA = """
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  city TEXT,
  industry TEXT,
  raw_json TEXT NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL,
  platform TEXT NOT NULL,
  query TEXT NOT NULL DEFAULT '',
  access TEXT NOT NULL,
  status INTEGER,
  title TEXT,
  requested_url TEXT,
  final_url TEXT,
  visible_text TEXT,
  screenshot_path TEXT,
  collected_at TEXT,
  query_suffix TEXT,
  latest_published_date TEXT,
  freshness_status TEXT NOT NULL DEFAULT 'baseline',
  raw_json TEXT NOT NULL,
  quality_score REAL NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_name, platform, query)
);

CREATE TABLE IF NOT EXISTS evidence_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  observation_id INTEGER NOT NULL REFERENCES observations(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  platform TEXT NOT NULL,
  evidence_type TEXT NOT NULL,
  source_text TEXT,
  title TEXT,
  url TEXT,
  access TEXT NOT NULL,
  excerpt TEXT,
  screenshot_path TEXT,
  collected_at TEXT,
  raw_json TEXT NOT NULL,
  quality_score REAL NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(observation_id, evidence_type, url, title)
);

CREATE TABLE IF NOT EXISTS insight_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL UNIQUE,
  recommendation_tier TEXT,
  sentiment_score REAL,
  confidence TEXT,
  one_line TEXT,
  departments_json TEXT,
  opportunity_json TEXT,
  risk_json TEXT,
  raw_json TEXT NOT NULL,
  generated_at TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS company_departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL,
  department_name TEXT NOT NULL,
  rank_order INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'insight_card',
  generated_at TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_name, department_name)
);

CREATE TABLE IF NOT EXISTS sentiment_components (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL,
  platform TEXT NOT NULL,
  score REAL NOT NULL,
  access TEXT,
  evidence_usable INTEGER NOT NULL DEFAULT 0,
  generated_at TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_name, platform)
);

CREATE TABLE IF NOT EXISTS company_indices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL UNIQUE,
  overall_score REAL NOT NULL,
  raw_overall_score REAL NOT NULL,
  confidence REAL NOT NULL,
  model_version TEXT NOT NULL,
  raw_json TEXT NOT NULL,
  generated_at TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS company_index_components (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL,
  index_key TEXT NOT NULL,
  score REAL NOT NULL,
  weight REAL NOT NULL,
  confidence REAL NOT NULL,
  evidence_count INTEGER NOT NULL DEFAULT 0,
  reasons_json TEXT NOT NULL,
  limitations_json TEXT NOT NULL,
  generated_at TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_name, index_key)
);

CREATE TABLE IF NOT EXISTS index_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fingerprint TEXT NOT NULL UNIQUE,
  model_version TEXT NOT NULL,
  generated_at TEXT,
  observation_count INTEGER NOT NULL DEFAULT 0,
  external_evidence_count INTEGER NOT NULL DEFAULT 0,
  theme_evidence_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS company_index_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL REFERENCES index_runs(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  index_key TEXT NOT NULL,
  index_group TEXT NOT NULL CHECK(index_group IN ('overall', 'core', 'fun')),
  score REAL NOT NULL,
  confidence REAL NOT NULL,
  evidence_count INTEGER NOT NULL DEFAULT 0,
  raw_json TEXT NOT NULL,
  recorded_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(run_id, company_name, index_key)
);

CREATE TABLE IF NOT EXISTS company_index_evidence (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL,
  index_key TEXT NOT NULL,
  source_kind TEXT NOT NULL,
  source_key TEXT NOT NULL,
  title TEXT,
  url TEXT,
  effect REAL,
  weight REAL,
  generated_at TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_name, index_key, source_kind, source_key)
);

CREATE TABLE IF NOT EXISTS company_signals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL,
  signal_type TEXT NOT NULL CHECK(signal_type IN ('opportunity', 'risk')),
  signal TEXT NOT NULL,
  basis TEXT,
  source_kind TEXT NOT NULL DEFAULT 'none',
  source_platform TEXT,
  source_url TEXT,
  evidence_usable INTEGER NOT NULL DEFAULT 0,
  generated_at TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_name, signal_type, signal)
);

CREATE TABLE IF NOT EXISTS external_evidence (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  excerpt TEXT,
  collected_at TEXT,
  raw_json TEXT NOT NULL,
  quality_score REAL NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_name, source_type, url)
);

CREATE TABLE IF NOT EXISTS theme_evidence (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  excerpt TEXT,
  confidence TEXT NOT NULL,
  effects_json TEXT NOT NULL,
  caveat TEXT,
  published_at TEXT,
  collected_at TEXT,
  raw_json TEXT NOT NULL,
  quality_score REAL NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_name, source_type, url)
);

CREATE TABLE IF NOT EXISTS research_gaps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL,
  platform TEXT,
  gap_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK(severity IN ('high', 'medium', 'low')),
  reason TEXT NOT NULL,
  next_action TEXT NOT NULL,
  detected_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_name, platform, gap_type)
);

CREATE TABLE IF NOT EXISTS analyst_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL UNIQUE,
  company_profile TEXT,
  job_opportunity TEXT,
  main_risks TEXT,
  suitable_candidates TEXT,
  publish_decision TEXT NOT NULL DEFAULT 'pending',
  review_status TEXT NOT NULL DEFAULT 'pending',
  reviewer TEXT,
  reviewed_at TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS search_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL,
  source_kind TEXT NOT NULL,
  source_id INTEGER NOT NULL,
  title TEXT,
  body TEXT,
  url TEXT,
  quality_score REAL NOT NULL DEFAULT 0,
  evidence_usable INTEGER NOT NULL DEFAULT 0,
  collected_at TEXT,
  UNIQUE(source_kind, source_id)
);

CREATE TABLE IF NOT EXISTS collection_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_file TEXT NOT NULL,
  source_generated_at TEXT,
  observation_count INTEGER NOT NULL DEFAULT 0,
  ok_count INTEGER NOT NULL DEFAULT 0,
  synced_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_observations_company_platform
  ON observations(company_name, platform, access);

CREATE INDEX IF NOT EXISTS idx_evidence_company_platform
  ON evidence_items(company_name, platform, access);

CREATE INDEX IF NOT EXISTS idx_insight_tier
  ON insight_cards(recommendation_tier, sentiment_score);

CREATE INDEX IF NOT EXISTS idx_departments_name
  ON company_departments(department_name, company_name);

CREATE INDEX IF NOT EXISTS idx_sentiment_platform_score
  ON sentiment_components(platform, score);

CREATE INDEX IF NOT EXISTS idx_company_indices_score
  ON company_indices(overall_score, confidence);

CREATE INDEX IF NOT EXISTS idx_index_history_company_key
  ON company_index_history(company_name, index_key, run_id);

CREATE INDEX IF NOT EXISTS idx_index_evidence_company_key
  ON company_index_evidence(company_name, index_key, source_kind);

CREATE INDEX IF NOT EXISTS idx_signals_type_company
  ON company_signals(signal_type, company_name);

CREATE INDEX IF NOT EXISTS idx_external_company_type
  ON external_evidence(company_name, source_type);

CREATE INDEX IF NOT EXISTS idx_theme_company_type
  ON theme_evidence(company_name, source_type);

CREATE INDEX IF NOT EXISTS idx_gaps_severity_company
  ON research_gaps(severity, company_name);

CREATE INDEX IF NOT EXISTS idx_search_company_kind
  ON search_documents(company_name, source_kind);

DROP VIEW IF EXISTS company_research_overview;
CREATE VIEW company_research_overview AS
SELECT
  c.name AS company_name,
  c.city,
  c.industry,
  i.recommendation_tier,
  i.sentiment_score,
  i.confidence,
  i.one_line,
  ci.overall_score AS sinan_index,
  ci.confidence AS index_confidence,
  (SELECT score FROM company_index_components x WHERE x.company_name = c.name AND x.index_key = 'fun_afternoonTea') AS afternoon_tea_index,
  (SELECT score FROM company_index_components x WHERE x.company_name = c.name AND x.index_key = 'fun_canteen') AS canteen_index,
  (SELECT score FROM company_index_components x WHERE x.company_name = c.name AND x.index_key = 'fun_overtime') AS overtime_index,
  (SELECT score FROM company_index_components x WHERE x.company_name = c.name AND x.index_key = 'fun_weekend') AS weekend_index,
  (SELECT score FROM company_index_components x WHERE x.company_name = c.name AND x.index_key = 'fun_layoffAnxiety') AS layoff_anxiety_index,
  (SELECT COUNT(*) FROM company_departments d WHERE d.company_name = c.name) AS department_count,
  (SELECT COUNT(*) FROM observations o WHERE o.company_name = c.name AND o.access = 'ok') AS readable_observation_count,
  (SELECT COUNT(*) FROM sentiment_components s WHERE s.company_name = c.name AND s.evidence_usable = 1) AS usable_platform_count,
  (SELECT COUNT(*) FROM evidence_items e WHERE e.company_name = c.name AND e.access = 'ok') AS platform_evidence_count,
  (SELECT COUNT(*) FROM external_evidence x WHERE x.company_name = c.name) AS external_evidence_count,
  (SELECT COUNT(*) FROM theme_evidence t WHERE t.company_name = c.name) AS theme_evidence_count,
  (SELECT COUNT(*) FROM company_signals s WHERE s.company_name = c.name AND s.signal_type = 'opportunity') AS opportunity_count,
  (SELECT COUNT(*) FROM company_signals s WHERE s.company_name = c.name AND s.signal_type = 'risk') AS risk_count,
  (SELECT COUNT(*) FROM research_gaps g WHERE g.company_name = c.name) AS open_gap_count,
  COALESCE(r.review_status, 'pending') AS analyst_review_status,
  COALESCE(r.publish_decision, 'pending') AS publish_decision
FROM companies c
LEFT JOIN insight_cards i ON i.company_name = c.name
LEFT JOIN company_indices ci ON ci.company_name = c.name
LEFT JOIN analyst_reviews r ON r.company_name = c.name;

DROP VIEW IF EXISTS evidence_catalog;
CREATE VIEW evidence_catalog AS
SELECT
  'platform' AS source_kind,
  e.id AS source_id,
  e.company_name,
  e.platform AS source_type,
  e.evidence_type,
  e.title,
  e.url,
  e.excerpt,
  e.access,
  e.quality_score,
  CASE
    WHEN e.access = 'ok'
      AND LENGTH(TRIM(COALESCE(e.excerpt, ''))) >= 80
      AND COALESCE(s.evidence_usable, 0) = 1
    THEN 1
    ELSE 0
  END AS evidence_usable,
  e.collected_at
FROM evidence_items e
LEFT JOIN sentiment_components s
  ON s.company_name = e.company_name AND s.platform = e.platform
UNION ALL
SELECT
  'external' AS source_kind,
  x.id AS source_id,
  x.company_name,
  x.source_type,
  'external_evidence' AS evidence_type,
  x.title,
  x.url,
  x.excerpt,
  'ok' AS access,
  x.quality_score,
  1 AS evidence_usable,
  x.collected_at
FROM external_evidence x;

DROP VIEW IF EXISTS research_backlog;
CREATE VIEW research_backlog AS
SELECT
  company_name,
  platform,
  gap_type,
  severity,
  reason,
  next_action,
  detected_at
FROM research_gaps
ORDER BY
  CASE severity WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
  company_name,
  platform;

"""

RECENT_OBSERVATIONS_VIEW = """
DROP VIEW IF EXISTS recent_observations;
CREATE VIEW recent_observations AS
SELECT
  company_name,
  platform,
  query,
  access,
  query_suffix,
  latest_published_date,
  freshness_status,
  title,
  final_url,
  collected_at,
  quality_score
FROM observations
WHERE query_suffix IS NOT NULL AND query_suffix != ''
ORDER BY
  CASE freshness_status
    WHEN 'fresh_180d' THEN 1
    WHEN 'fresh_365d' THEN 2
    WHEN 'unknown' THEN 3
    ELSE 4
  END,
  latest_published_date DESC,
  company_name,
  platform;
"""


def load_json(path: Path, required: bool = True):
  if not path.exists():
    if required:
      raise FileNotFoundError(path)
    return None
  return json.loads(path.read_text(encoding="utf-8"))


def json_dump(value) -> str:
  return json.dumps(value, ensure_ascii=False, sort_keys=True)


def quality_for_access(access: str) -> float:
  return {
    "ok": 1000,
    "login_required": 300,
    "verification_required": 250,
    "manual_required": 200,
    "limited_or_failed": 100,
    "unsupported_platform": 0,
  }.get(access or "", 0)


def observation_quality(item: dict) -> float:
  detail_ok = sum(1 for detail in item.get("details", []) if detail.get("access") == "ok")
  text_len = min(len(item.get("visibleText") or ""), 3000) / 100
  return quality_for_access(item.get("access")) + detail_ok * 100 + text_len


def best_observations_by_platform(items: list[dict]) -> dict[str, dict]:
  best = {}
  for item in items:
    platform = item.get("platform")
    current = best.get(platform)
    if current is None or observation_quality(item) > observation_quality(current):
      best[platform] = item
  return best


def evidence_quality(item: dict) -> float:
  text_len = min(len(item.get("visibleText") or item.get("excerpt") or ""), 3000) / 100
  return quality_for_access(item.get("access")) + text_len


def normalized_text(value) -> str:
  return " ".join(str(value or "").split())


def observation_is_usable(item: dict) -> bool:
  if item.get("access") != "ok":
    return False

  text = normalized_text(item.get("visibleText"))
  company_name = normalized_text(item.get("companyName"))
  platform = item.get("platform")

  if len(text) < 120:
    return False
  if company_name and company_name not in text:
    return False
  if platform == "xiaohongshu" and "沪ICP备" in text and "筛选" not in text:
    return False
  if platform == "zhihu" and len(text) < 300:
    return False
  if text in {"加载中，请稍候", "BOSS直聘"}:
    return False
  return True


def observation_freshness(item: dict) -> tuple[str | None, str]:
  query_suffix = str(item.get("querySuffix") or "").strip()
  if not query_suffix:
    return None, "baseline"

  collected_raw = str(item.get("collectedAt") or "")
  try:
    collected = datetime.fromisoformat(collected_raw.replace("Z", "+00:00"))
  except ValueError:
    collected = datetime.now().astimezone()

  texts = [str(item.get("visibleText") or "")]
  for detail in item.get("details") or []:
    texts.extend([
      str(detail.get("sourceText") or ""),
      str(detail.get("title") or ""),
      str(detail.get("visibleText") or ""),
    ])
  text = " ".join(texts)
  candidates = []

  for year, month, day in re.findall(r"(20\d{2})年(\d{1,2})月(\d{1,2})日", text):
    try:
      candidates.append(datetime(int(year), int(month), int(day), tzinfo=collected.tzinfo))
    except ValueError:
      pass
  for month, day in re.findall(r"(?<!\d)(\d{1,2})月(\d{1,2})日", text):
    try:
      candidates.append(datetime(collected.year, int(month), int(day), tzinfo=collected.tzinfo))
    except ValueError:
      pass

  candidates = [candidate for candidate in candidates if candidate <= collected]
  if not candidates:
    return None, "unknown"

  latest = max(candidates)
  age_days = (collected - latest).days
  if age_days <= 180:
    status = "fresh_180d"
  elif age_days <= 365:
    status = "fresh_365d"
  else:
    status = "stale"
  return latest.date().isoformat(), status


def platform_from_basis(basis: str | None) -> str | None:
  value = normalized_text(basis)
  for label, platform in PLATFORM_LABELS.items():
    if value.startswith(f"{label}：") or value.startswith(f"{label}详情页："):
      return platform
  return None


def ensure_column(conn, table: str, column: str, definition: str):
  columns = {
    row[1] for row in conn.execute(f"PRAGMA table_info({table})")
  }
  if column not in columns:
    conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")


def init_db(db_path: Path):
  db_path.parent.mkdir(parents=True, exist_ok=True)
  with sqlite3.connect(db_path) as conn:
    conn.executescript(SCHEMA)
    ensure_column(conn, "observations", "query_suffix", "TEXT")
    ensure_column(conn, "observations", "latest_published_date", "TEXT")
    ensure_column(conn, "observations", "freshness_status", "TEXT NOT NULL DEFAULT 'baseline'")
    conn.executescript(RECENT_OBSERVATIONS_VIEW)
    ensure_column(conn, "company_signals", "source_kind", "TEXT NOT NULL DEFAULT 'none'")
    ensure_column(conn, "company_signals", "evidence_usable", "INTEGER NOT NULL DEFAULT 0")
    ensure_column(conn, "search_documents", "evidence_usable", "INTEGER NOT NULL DEFAULT 0")


def upsert_company(conn, company: dict):
  conn.execute(
    """
    INSERT INTO companies (name, city, industry, raw_json, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(name) DO UPDATE SET
      city=excluded.city,
      industry=excluded.industry,
      raw_json=excluded.raw_json,
      updated_at=CURRENT_TIMESTAMP
    """,
    (
      company.get("name"),
      company.get("city"),
      company.get("industry"),
      json_dump(company),
    ),
  )


def upsert_observation(conn, item: dict) -> int:
  quality = observation_quality(item)
  latest_published_date, freshness_status = observation_freshness(item)
  key = (item.get("companyName"), item.get("platform"), item.get("query") or "")
  existing = conn.execute(
    "SELECT id, quality_score FROM observations WHERE company_name=? AND platform=? AND query=?",
    key,
  ).fetchone()

  values = (
    item.get("companyName"),
    item.get("platform"),
    item.get("query") or "",
    item.get("access") or "unknown",
    item.get("status"),
    item.get("title"),
    item.get("requestedUrl"),
    item.get("finalUrl"),
    item.get("visibleText"),
    item.get("screenshotPath"),
    item.get("collectedAt"),
    item.get("querySuffix"),
    latest_published_date,
    freshness_status,
    json_dump(item),
    quality,
  )

  if existing and existing[1] > quality:
    return existing[0]

  conn.execute(
    """
    INSERT INTO observations (
      company_name, platform, query, access, status, title, requested_url,
      final_url, visible_text, screenshot_path, collected_at, query_suffix,
      latest_published_date, freshness_status, raw_json, quality_score, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(company_name, platform, query) DO UPDATE SET
      access=excluded.access,
      status=excluded.status,
      title=excluded.title,
      requested_url=excluded.requested_url,
      final_url=excluded.final_url,
      visible_text=excluded.visible_text,
      screenshot_path=excluded.screenshot_path,
      collected_at=excluded.collected_at,
      query_suffix=excluded.query_suffix,
      latest_published_date=excluded.latest_published_date,
      freshness_status=excluded.freshness_status,
      raw_json=excluded.raw_json,
      quality_score=excluded.quality_score,
      updated_at=CURRENT_TIMESTAMP
    """,
    values,
  )
  return conn.execute(
    "SELECT id FROM observations WHERE company_name=? AND platform=? AND query=?",
    key,
  ).fetchone()[0]


def upsert_evidence(conn, observation_id: int, observation: dict, detail: dict | None = None):
  if detail is None:
    evidence_type = "search_result"
    source_text = observation.get("query")
    title = observation.get("title")
    url = observation.get("finalUrl") or observation.get("requestedUrl")
    access = observation.get("access") or "unknown"
    excerpt = observation.get("visibleText")
    screenshot_path = observation.get("screenshotPath")
    collected_at = observation.get("collectedAt")
    raw = observation
  else:
    evidence_type = "detail_page"
    source_text = detail.get("sourceText")
    title = detail.get("title")
    url = detail.get("finalUrl") or detail.get("requestedUrl")
    access = detail.get("access") or "unknown"
    excerpt = detail.get("visibleText")
    screenshot_path = detail.get("screenshotPath")
    collected_at = detail.get("collectedAt")
    raw = detail

  quality = evidence_quality({"access": access, "visibleText": excerpt})
  existing = conn.execute(
    """
    SELECT id, quality_score FROM evidence_items
    WHERE observation_id=? AND evidence_type=? AND COALESCE(url, '')=COALESCE(?, '') AND COALESCE(title, '')=COALESCE(?, '')
    """,
    (observation_id, evidence_type, url, title),
  ).fetchone()
  if existing and existing[1] > quality:
    return

  conn.execute(
    """
    INSERT INTO evidence_items (
      observation_id, company_name, platform, evidence_type, source_text, title,
      url, access, excerpt, screenshot_path, collected_at, raw_json, quality_score, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(observation_id, evidence_type, url, title) DO UPDATE SET
      source_text=excluded.source_text,
      access=excluded.access,
      excerpt=excluded.excerpt,
      screenshot_path=excluded.screenshot_path,
      collected_at=excluded.collected_at,
      raw_json=excluded.raw_json,
      quality_score=excluded.quality_score,
      updated_at=CURRENT_TIMESTAMP
    """,
    (
      observation_id,
      observation.get("companyName"),
      observation.get("platform"),
      evidence_type,
      source_text,
      title,
      url,
      access,
      excerpt,
      screenshot_path,
      collected_at,
      json_dump(raw),
      quality,
    ),
  )


def upsert_insight(conn, card: dict):
  sentiment = card.get("sentiment") or {}
  conn.execute(
    """
    INSERT INTO insight_cards (
      company_name, recommendation_tier, sentiment_score, confidence, one_line,
      departments_json, opportunity_json, risk_json, raw_json, generated_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(company_name) DO UPDATE SET
      recommendation_tier=excluded.recommendation_tier,
      sentiment_score=excluded.sentiment_score,
      confidence=excluded.confidence,
      one_line=excluded.one_line,
      departments_json=excluded.departments_json,
      opportunity_json=excluded.opportunity_json,
      risk_json=excluded.risk_json,
      raw_json=excluded.raw_json,
      generated_at=excluded.generated_at,
      updated_at=CURRENT_TIMESTAMP
    """,
    (
      card.get("name"),
      card.get("recommendationTier"),
      sentiment.get("score"),
      sentiment.get("confidence"),
      card.get("oneLine"),
      json_dump(card.get("departments") or []),
      json_dump(card.get("opportunityDetails") or card.get("opportunitySignals") or []),
      json_dump(card.get("riskDetails") or card.get("riskSignals") or []),
      json_dump(card),
      card.get("generatedAt"),
    ),
  )


def upsert_company_index(conn, company_index: dict, weights: dict, generated_at: str | None):
  company_name = company_index.get("name")
  conn.execute(
    """
    INSERT INTO company_indices (
      company_name, overall_score, raw_overall_score, confidence,
      model_version, raw_json, generated_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(company_name) DO UPDATE SET
      overall_score=excluded.overall_score,
      raw_overall_score=excluded.raw_overall_score,
      confidence=excluded.confidence,
      model_version=excluded.model_version,
      raw_json=excluded.raw_json,
      generated_at=excluded.generated_at,
      updated_at=CURRENT_TIMESTAMP
    """,
    (
      company_name,
      company_index.get("overallScore"),
      company_index.get("rawOverallScore"),
      company_index.get("confidence"),
      company_index.get("modelVersion"),
      json_dump(company_index),
      generated_at,
    ),
  )
  for index_key, component in (company_index.get("components") or {}).items():
    conn.execute(
      """
      INSERT INTO company_index_components (
        company_name, index_key, score, weight, confidence, evidence_count,
        reasons_json, limitations_json, generated_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(company_name, index_key) DO UPDATE SET
        score=excluded.score,
        weight=excluded.weight,
        confidence=excluded.confidence,
        evidence_count=excluded.evidence_count,
        reasons_json=excluded.reasons_json,
        limitations_json=excluded.limitations_json,
        generated_at=excluded.generated_at,
        updated_at=CURRENT_TIMESTAMP
      """,
      (
        company_name,
        index_key,
        component.get("score"),
        weights.get(index_key, 0),
        component.get("confidence"),
        component.get("evidenceCount", 0),
        json_dump(component.get("reasons") or []),
        json_dump(component.get("limitations") or []),
        generated_at,
      ),
    )
  for index_key, component in (company_index.get("funIndices") or {}).items():
    conn.execute(
      """
      INSERT INTO company_index_components (
        company_name, index_key, score, weight, confidence, evidence_count,
        reasons_json, limitations_json, generated_at, updated_at
      )
      VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(company_name, index_key) DO UPDATE SET
        score=excluded.score,
        weight=0,
        confidence=excluded.confidence,
        evidence_count=excluded.evidence_count,
        reasons_json=excluded.reasons_json,
        limitations_json=excluded.limitations_json,
        generated_at=excluded.generated_at,
        updated_at=CURRENT_TIMESTAMP
      """,
      (
        company_name,
        f"fun_{index_key}",
        component.get("score"),
        component.get("confidence"),
        component.get("evidenceCount", 0),
        json_dump(component.get("reasons") or []),
        json_dump(component.get("limitations") or []),
        generated_at,
      ),
    )
    for evidence in component.get("evidenceRefs") or []:
      conn.execute(
        """
        INSERT INTO company_index_evidence (
          company_name, index_key, source_kind, source_key, title, url,
          effect, weight, generated_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(company_name, index_key, source_kind, source_key) DO UPDATE SET
          title=excluded.title,
          url=excluded.url,
          effect=excluded.effect,
          weight=excluded.weight,
          generated_at=excluded.generated_at,
          updated_at=CURRENT_TIMESTAMP
        """,
        (
          company_name,
          f"fun_{index_key}",
          evidence.get("sourceKind") or "unknown",
          evidence.get("sourceKey") or evidence.get("url") or evidence.get("title"),
          evidence.get("title"),
          evidence.get("url"),
          evidence.get("effect"),
          evidence.get("weight"),
          generated_at,
        ),
      )


def snapshot_company_indices(
  conn,
  indices_doc: dict,
  observation_count: int,
  external_count: int,
  theme_count: int,
):
  companies = indices_doc.get("companies") or []
  model_version = indices_doc.get("modelVersion") or "unknown"
  fingerprint_payload = {"modelVersion": model_version, "companies": companies}
  fingerprint = hashlib.sha256(
    json.dumps(fingerprint_payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf8")
  ).hexdigest()
  cursor = conn.execute(
    """
    INSERT OR IGNORE INTO index_runs (
      fingerprint, model_version, generated_at, observation_count,
      external_evidence_count, theme_evidence_count
    )
    VALUES (?, ?, ?, ?, ?, ?)
    """,
    (
      fingerprint,
      model_version,
      indices_doc.get("generatedAt"),
      observation_count,
      external_count,
      theme_count,
    ),
  )
  if cursor.rowcount == 0:
    return False
  run_id = cursor.lastrowid
  for company in companies:
    company_name = company.get("name")
    rows = [
      ("overall", "overall", company.get("overallScore"), company.get("confidence"), 0, company),
      *[("core", key, value.get("score"), value.get("confidence"), value.get("evidenceCount", 0), value) for key, value in (company.get("components") or {}).items()],
      *[("fun", f"fun_{key}", value.get("score"), value.get("confidence"), value.get("evidenceCount", 0), value) for key, value in (company.get("funIndices") or {}).items()],
    ]
    for index_group, index_key, score, confidence, evidence_count, raw in rows:
      conn.execute(
        """
        INSERT INTO company_index_history (
          run_id, company_name, index_key, index_group, score,
          confidence, evidence_count, raw_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (run_id, company_name, index_key, index_group, score, confidence, evidence_count, json_dump(raw)),
      )
  return True


def populate_card_derivatives(conn, card: dict, company_observations: list[dict]):
  company_name = card.get("name")
  generated_at = card.get("generatedAt")
  observations_by_platform = best_observations_by_platform(company_observations)

  for rank_order, department in enumerate(card.get("departments") or [], start=1):
    conn.execute(
      """
      INSERT INTO company_departments (
        company_name, department_name, rank_order, source, generated_at, updated_at
      )
      VALUES (?, ?, ?, 'insight_card', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(company_name, department_name) DO UPDATE SET
        rank_order=excluded.rank_order,
        generated_at=excluded.generated_at,
        updated_at=CURRENT_TIMESTAMP
      """,
      (company_name, department, rank_order, generated_at),
    )

  sentiment = card.get("sentiment") or {}
  for platform, score in (sentiment.get("components") or {}).items():
    observation = observations_by_platform.get(platform, {})
    conn.execute(
      """
      INSERT INTO sentiment_components (
        company_name, platform, score, access, evidence_usable, generated_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(company_name, platform) DO UPDATE SET
        score=excluded.score,
        access=excluded.access,
        evidence_usable=excluded.evidence_usable,
        generated_at=excluded.generated_at,
        updated_at=CURRENT_TIMESTAMP
      """,
      (
        company_name,
        platform,
        score,
        observation.get("access"),
        int(observation_is_usable(observation)),
        generated_at,
      ),
    )

  for signal_type, details_key in [
    ("opportunity", "opportunityDetails"),
    ("risk", "riskDetails"),
  ]:
    for detail in card.get(details_key) or []:
      basis = detail.get("basis")
      source_kind = detail.get("sourceKind") or "platform"
      source_platform = detail.get("sourcePlatform") or platform_from_basis(basis)
      source_observation = observations_by_platform.get(source_platform, {})
      if "evidenceUsable" in detail:
        evidence_usable = bool(detail.get("evidenceUsable"))
      elif source_platform:
        evidence_usable = observation_is_usable(source_observation)
      else:
        evidence_usable = (
          normalized_text(basis).startswith("已有")
          and sum(observation_is_usable(item) for item in company_observations) >= 2
        )
      conn.execute(
        """
        INSERT INTO company_signals (
          company_name, signal_type, signal, basis, source_kind, source_platform,
          source_url, evidence_usable, generated_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(company_name, signal_type, signal) DO UPDATE SET
          basis=excluded.basis,
          source_kind=excluded.source_kind,
          source_platform=excluded.source_platform,
          source_url=excluded.source_url,
          evidence_usable=excluded.evidence_usable,
          generated_at=excluded.generated_at,
          updated_at=CURRENT_TIMESTAMP
        """,
        (
          company_name,
          signal_type,
          detail.get("signal"),
          basis,
          source_kind,
          source_platform,
          detail.get("sourceUrl")
          or source_observation.get("finalUrl")
          or source_observation.get("requestedUrl"),
          int(evidence_usable),
          generated_at,
        ),
      )

  conn.execute(
    """
    INSERT INTO analyst_reviews (company_name)
    VALUES (?)
    ON CONFLICT(company_name) DO NOTHING
    """,
    (company_name,),
  )


def upsert_external_evidence(conn, item: dict):
  quality = 1200 if (item.get("sourceType") or "").startswith("official") else 900
  quality += min(len(item.get("excerpt") or ""), 1000) / 100
  conn.execute(
    """
    INSERT INTO external_evidence (
      company_name, source_type, title, url, excerpt, collected_at,
      raw_json, quality_score, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(company_name, source_type, url) DO UPDATE SET
      title=excluded.title,
      excerpt=excluded.excerpt,
      collected_at=excluded.collected_at,
      raw_json=excluded.raw_json,
      quality_score=excluded.quality_score,
      updated_at=CURRENT_TIMESTAMP
    """,
    (
      item.get("companyName"),
      item.get("sourceType") or "external",
      item.get("title"),
      item.get("url"),
      item.get("excerpt"),
      item.get("collectedAt"),
      json_dump(item),
      quality,
    ),
  )


def upsert_theme_evidence(conn, item: dict):
  confidence = item.get("confidence") or "low"
  quality = {"high": 1200, "medium": 800, "low": 400}.get(confidence, 400)
  quality += min(len(item.get("excerpt") or ""), 1000) / 100
  conn.execute(
    """
    INSERT INTO theme_evidence (
      company_name, source_type, title, url, excerpt, confidence,
      effects_json, caveat, published_at, collected_at, raw_json,
      quality_score, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(company_name, source_type, url) DO UPDATE SET
      title=excluded.title,
      excerpt=excluded.excerpt,
      confidence=excluded.confidence,
      effects_json=excluded.effects_json,
      caveat=excluded.caveat,
      published_at=excluded.published_at,
      collected_at=excluded.collected_at,
      raw_json=excluded.raw_json,
      quality_score=excluded.quality_score,
      updated_at=CURRENT_TIMESTAMP
    """,
    (
      item.get("companyName"),
      item.get("sourceType") or "theme_external",
      item.get("title"),
      item.get("url"),
      item.get("excerpt"),
      confidence,
      json_dump(item.get("effects") or {}),
      item.get("caveat"),
      item.get("publishedAt"),
      item.get("collectedAt"),
      json_dump(item),
      quality,
    ),
  )


def insert_gap(
  conn,
  company_name: str,
  gap_type: str,
  severity: str,
  reason: str,
  next_action: str,
  platform: str | None = None,
):
  conn.execute(
    """
    INSERT INTO research_gaps (
      company_name, platform, gap_type, severity, reason, next_action
    )
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(company_name, platform, gap_type) DO UPDATE SET
      severity=excluded.severity,
      reason=excluded.reason,
      next_action=excluded.next_action,
      detected_at=CURRENT_TIMESTAMP
    """,
    (company_name, platform, gap_type, severity, reason, next_action),
  )


def populate_research_gaps(
  conn,
  targets: dict,
  observations: list[dict],
  cards: list[dict],
  external_items: list[dict],
):
  observations_by_company = {}
  for observation in observations:
    observations_by_company.setdefault(observation.get("companyName"), []).append(observation)
  cards_by_company = {card.get("name"): card for card in cards}
  external_by_company = {}
  for item in external_items:
    external_by_company.setdefault(item.get("companyName"), []).append(item)

  default_platforms = targets.get("defaults", {}).get(
    "platforms", ["boss_zhipin", "xiaohongshu", "weibo", "zhihu"]
  )
  for company in targets.get("companies", []):
    company_name = company.get("name")
    company_observations = observations_by_company.get(company_name, [])
    by_platform = best_observations_by_platform(company_observations)
    expected_platforms = company.get("platforms") or default_platforms

    for platform in expected_platforms:
      observation = by_platform.get(platform)
      if observation is None:
        insert_gap(
          conn,
          company_name,
          "missing_platform",
          "high",
          "目标平台没有 observation。",
          f"定向补采 {platform}。",
          platform,
        )
        continue
      if observation.get("access") != "ok":
        insert_gap(
          conn,
          company_name,
          "platform_access",
          "high",
          f"平台访问状态为 {observation.get('access')}。",
          observation.get("nextAction") or f"重新登录并定向补采 {platform}。",
          platform,
        )
      elif not observation_is_usable(observation):
        insert_gap(
          conn,
          company_name,
          "thin_evidence",
          "medium",
          "页面标记为可访问，但正文为空、仅有导航/页脚或未出现公司名称。",
          f"人工检查截图并重新补采 {platform} 的有效结果或详情页。",
          platform,
        )

      detail_summary = observation.get("detailSummary") or {}
      attempted = detail_summary.get("attempted") or 0
      ok_count = detail_summary.get("ok") or 0
      if attempted > ok_count:
        insert_gap(
          conn,
          company_name,
          "detail_verification",
          "low",
          f"二级详情尝试 {attempted} 条，成功 {ok_count} 条。",
          f"平台冷却后重试 {platform} 二级详情，或人工核对截图。",
          platform,
        )

    company_external = external_by_company.get(company_name, [])
    if not company_external:
      insert_gap(
        conn,
        company_name,
        "official_source",
        "high",
        "没有官方或半官方校准源。",
        "补充官网招聘、公告或投资者关系来源。",
      )
    elif not any(item.get("confidence") == "high" for item in company_external):
      insert_gap(
        conn,
        company_name,
        "official_source_verification",
        "medium",
        "当前只有中等置信度的半官方/第三方来源。",
        "找到公司官方招聘或公告入口并替换。",
      )

    card = cards_by_company.get(company_name, {})
    if (card.get("sentiment") or {}).get("confidence") == "low":
      insert_gap(
        conn,
        company_name,
        "low_confidence",
        "medium",
        "洞察卡情绪置信度仍为 low。",
        "补充至少一个可用招聘证据，并人工复核平台情绪分项。",
      )

    unsupported_signal_count = conn.execute(
      """
      SELECT COUNT(*)
      FROM company_signals
      WHERE company_name=? AND evidence_usable=0
      """,
      (company_name,),
    ).fetchone()[0]
    if unsupported_signal_count:
      insert_gap(
        conn,
        company_name,
        "unsupported_signal",
        "medium",
        f"有 {unsupported_signal_count} 条机会/风险观点尚未连接到可用证据。",
        "补采对应平台，或在分析师复核时删除、改写该观点。",
      )

    review = conn.execute(
      "SELECT review_status FROM analyst_reviews WHERE company_name=?",
      (company_name,),
    ).fetchone()
    if not review or review[0] != "completed":
      insert_gap(
        conn,
        company_name,
        "analyst_review",
        "medium",
        "公司画像、机会、风险和发布决定尚未完成分析师复核。",
        "使用 research:db:review 填写并标记 completed。",
      )


def populate_theme_gaps(conn, company_indices: list[dict]):
  labels = {
    "afternoonTea": "下午茶/零食/饮品",
    "canteen": "食堂/餐补/三餐",
    "overtime": "加班时长/下班时间",
    "weekend": "双休/周末加班/调休",
    "layoffAnxiety": "裁员/组织调整/员工净变化",
  }
  for company in company_indices:
    company_name = company.get("name")
    for key, component in (company.get("funIndices") or {}).items():
      confidence = component.get("confidence") or 0
      if confidence >= 35:
        continue
      label = labels.get(key, key)
      insert_gap(
        conn,
        company_name,
        f"theme_evidence_{key}",
        "medium" if confidence < 15 else "low",
        f"{label}指数可信度仅 {confidence}，缺少独立可复核样本。",
        f"定向检索 {company_name} 2026 {label}，优先补员工原帖、制度说明或权威报道。",
      )


def rebuild_search_documents(conn):
  conn.execute("DELETE FROM search_documents")
  conn.execute(
    """
    INSERT INTO search_documents (
      company_name, source_kind, source_id, title, body, url,
      quality_score, evidence_usable, collected_at
    )
    SELECT
      e.company_name,
      'platform',
      e.source_id,
      e.title,
      e.excerpt,
      e.url,
      CASE WHEN e.evidence_usable = 1 THEN e.quality_score ELSE MIN(e.quality_score, 200) END,
      e.evidence_usable,
      e.collected_at
    FROM evidence_catalog e
    WHERE e.source_kind = 'platform'
    """
  )
  conn.execute(
    """
    INSERT INTO search_documents (
      company_name, source_kind, source_id, title, body, url,
      quality_score, evidence_usable, collected_at
    )
    SELECT
      company_name, 'external', id, title, excerpt, url, quality_score, 1, collected_at
    FROM external_evidence
    """
  )
  conn.execute(
    """
    INSERT INTO search_documents (
      company_name, source_kind, source_id, title, body, url,
      quality_score, evidence_usable, collected_at
    )
    SELECT company_name, 'theme', id, title,
           excerpt || CASE WHEN caveat IS NOT NULL THEN ' 限制：' || caveat ELSE '' END,
           url, quality_score, 1, collected_at
    FROM theme_evidence
    """
  )


def sync(args):
  init_db(args.db)
  targets = load_json(args.targets, required=False) or {"companies": []}
  observations_doc = load_json(args.observations)
  insights_doc = load_json(args.insights, required=False) or {"cards": []}
  indices_doc = load_json(args.indices, required=False) or {"companies": []}
  external_doc = load_json(args.external, required=False) or {"evidence": []}
  theme_doc = load_json(args.theme_evidence, required=False) or {"evidence": []}
  observations = observations_doc.get("observations", [])
  cards = insights_doc.get("cards", [])
  company_indices = indices_doc.get("companies", [])
  index_weights = (indices_doc.get("methodology") or {}).get("weights", {})
  external_items = external_doc.get("evidence", [])
  theme_items = theme_doc.get("evidence", [])
  observations_by_company = {}
  for observation in observations:
    observations_by_company.setdefault(observation.get("companyName"), []).append(observation)

  with sqlite3.connect(args.db) as conn:
    conn.execute("PRAGMA foreign_keys=ON")
    for table in [
      "search_documents",
      "research_gaps",
      "company_signals",
      "sentiment_components",
      "company_index_evidence",
      "company_index_components",
      "company_indices",
      "company_departments",
      "evidence_items",
      "observations",
      "insight_cards",
      "theme_evidence",
      "external_evidence",
      "companies",
    ]:
      conn.execute(f"DELETE FROM {table}")
    for company in targets.get("companies", []):
      upsert_company(conn, company)
    for observation in observations:
      observation_id = upsert_observation(conn, observation)
      upsert_evidence(conn, observation_id, observation)
      for detail in observation.get("details", []):
        upsert_evidence(conn, observation_id, observation, detail)
    for card in cards:
      upsert_insight(conn, card)
      populate_card_derivatives(
        conn,
        card,
        observations_by_company.get(card.get("name"), []),
      )
    for company_index in company_indices:
      upsert_company_index(
        conn,
        company_index,
        index_weights,
        indices_doc.get("generatedAt"),
      )
    for item in external_items:
      upsert_external_evidence(conn, item)
    for item in theme_items:
      upsert_theme_evidence(conn, item)
    snapshot_company_indices(
      conn,
      indices_doc,
      len(observations),
      len(external_items),
      len(theme_items),
    )
    populate_research_gaps(conn, targets, observations, cards, external_items)
    populate_theme_gaps(conn, company_indices)
    rebuild_search_documents(conn)
    conn.execute(
      """
      INSERT INTO collection_runs (source_file, source_generated_at, observation_count, ok_count)
      VALUES (?, ?, ?, ?)
      """,
      (
        str(args.observations.relative_to(APP_ROOT) if args.observations.is_relative_to(APP_ROOT) else args.observations),
        observations_doc.get("generatedAt"),
        len(observations),
        sum(1 for item in observations if item.get("access") == "ok"),
      ),
    )


def summary(args):
  init_db(args.db)
  with sqlite3.connect(args.db) as conn:
    conn.row_factory = sqlite3.Row
    print(f"database: {args.db}")
    for name, query in [
      ("companies", "SELECT COUNT(*) AS count FROM companies"),
      ("observations", "SELECT COUNT(*) AS count FROM observations"),
      ("evidence_items", "SELECT COUNT(*) AS count FROM evidence_items"),
      ("external_evidence", "SELECT COUNT(*) AS count FROM external_evidence"),
      ("theme_evidence", "SELECT COUNT(*) AS count FROM theme_evidence"),
      ("insight_cards", "SELECT COUNT(*) AS count FROM insight_cards"),
      ("company_departments", "SELECT COUNT(*) AS count FROM company_departments"),
      ("sentiment_components", "SELECT COUNT(*) AS count FROM sentiment_components"),
      ("company_indices", "SELECT COUNT(*) AS count FROM company_indices"),
      ("company_index_components", "SELECT COUNT(*) AS count FROM company_index_components"),
      ("company_index_evidence", "SELECT COUNT(*) AS count FROM company_index_evidence"),
      ("index_runs", "SELECT COUNT(*) AS count FROM index_runs"),
      ("company_index_history", "SELECT COUNT(*) AS count FROM company_index_history"),
      ("company_signals", "SELECT COUNT(*) AS count FROM company_signals"),
      ("research_gaps", "SELECT COUNT(*) AS count FROM research_gaps"),
      ("analyst_reviews", "SELECT COUNT(*) AS count FROM analyst_reviews"),
      ("search_documents", "SELECT COUNT(*) AS count FROM search_documents"),
    ]:
      print(f"{name}: {conn.execute(query).fetchone()['count']}")

    print("\nobservations by platform/access")
    for row in conn.execute(
      """
      SELECT platform, access, COUNT(*) AS count
      FROM observations
      GROUP BY platform, access
      ORDER BY platform, access
      """
    ):
      print(f"{row['platform']}\t{row['access']}\t{row['count']}")

    print("\nevidence by platform/type/access")
    for row in conn.execute(
      """
      SELECT platform, evidence_type, access, COUNT(*) AS count
      FROM evidence_items
      GROUP BY platform, evidence_type, access
      ORDER BY platform, evidence_type, access
      """
    ):
      print(f"{row['platform']}\t{row['evidence_type']}\t{row['access']}\t{row['count']}")

    print("\nexternal evidence by source_type")
    for row in conn.execute(
      """
      SELECT source_type, COUNT(*) AS count
      FROM external_evidence
      GROUP BY source_type
      ORDER BY source_type
      """
    ):
      print(f"{row['source_type']}\t{row['count']}")

    print("\nusable evidence by platform")
    for row in conn.execute(
      """
      SELECT platform, SUM(evidence_usable) AS usable, COUNT(*) AS total
      FROM sentiment_components
      GROUP BY platform
      ORDER BY platform
      """
    ):
      print(f"{row['platform']}\t{row['usable']}/{row['total']}")

    print("\nrecent observations by platform/freshness")
    for row in conn.execute(
      """
      SELECT platform, freshness_status, COUNT(*) AS count
      FROM recent_observations
      GROUP BY platform, freshness_status
      ORDER BY platform, freshness_status
      """
    ):
      print(f"{row['platform']}\t{row['freshness_status']}\t{row['count']}")

    print("\nresearch gaps by severity/type")
    for row in conn.execute(
      """
      SELECT severity, gap_type, COUNT(*) AS count
      FROM research_gaps
      GROUP BY severity, gap_type
      ORDER BY CASE severity WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, gap_type
      """
    ):
      print(f"{row['severity']}\t{row['gap_type']}\t{row['count']}")


def rows_as_dicts(rows):
  return [dict(row) for row in rows]


def company_detail(args):
  init_db(args.db)
  with sqlite3.connect(args.db) as conn:
    conn.row_factory = sqlite3.Row
    overview = conn.execute(
      "SELECT * FROM company_research_overview WHERE company_name=?",
      (args.name,),
    ).fetchone()
    if overview is None:
      raise SystemExit(f"Company not found: {args.name}")

    result = {
      "overview": dict(overview),
      "departments": rows_as_dicts(
        conn.execute(
          """
          SELECT department_name, rank_order, source
          FROM company_departments
          WHERE company_name=?
          ORDER BY rank_order, department_name
          """,
          (args.name,),
        )
      ),
      "sentimentComponents": rows_as_dicts(
        conn.execute(
          """
          SELECT platform, score, access, evidence_usable
          FROM sentiment_components
          WHERE company_name=?
          ORDER BY platform
          """,
          (args.name,),
        )
      ),
      "indices": rows_as_dicts(
        conn.execute(
          """
          SELECT index_key, score, weight, confidence, evidence_count,
                 reasons_json, limitations_json
          FROM company_index_components
          WHERE company_name=?
          ORDER BY weight DESC, index_key
          """,
          (args.name,),
        )
      ),
      "themeEvidence": rows_as_dicts(
        conn.execute(
          """
          SELECT source_type, title, url, excerpt, confidence, effects_json,
                 caveat, published_at, collected_at
          FROM theme_evidence
          WHERE company_name=?
          ORDER BY quality_score DESC, published_at DESC
          """,
          (args.name,),
        )
      ),
      "indexEvidence": rows_as_dicts(
        conn.execute(
          """
          SELECT index_key, source_kind, title, url, effect, weight
          FROM company_index_evidence
          WHERE company_name=?
          ORDER BY index_key, ABS(COALESCE(effect, 0) * COALESCE(weight, 0)) DESC
          """,
          (args.name,),
        )
      ),
      "indexHistory": rows_as_dicts(
        conn.execute(
          """
          SELECT h.index_key, h.index_group, h.score, h.confidence,
                 h.evidence_count, r.model_version, r.generated_at
          FROM company_index_history h
          JOIN index_runs r ON r.id = h.run_id
          WHERE h.company_name=?
          ORDER BY r.id DESC, h.index_group, h.index_key
          LIMIT 33
          """,
          (args.name,),
        )
      ),
      "signals": rows_as_dicts(
        conn.execute(
          """
          SELECT signal_type, signal, basis, source_kind, source_platform, source_url, evidence_usable
          FROM company_signals
          WHERE company_name=?
          ORDER BY signal_type, id
          """,
          (args.name,),
        )
      ),
      "gaps": rows_as_dicts(
        conn.execute(
          """
          SELECT platform, gap_type, severity, reason, next_action
          FROM research_backlog
          WHERE company_name=?
          """,
          (args.name,),
        )
      ),
      "analystReview": dict(
        conn.execute(
          "SELECT * FROM analyst_reviews WHERE company_name=?",
          (args.name,),
        ).fetchone()
      ),
      "evidence": rows_as_dicts(
        conn.execute(
          """
          SELECT source_kind, source_type, evidence_type, title, url, excerpt,
                 access, quality_score, evidence_usable, collected_at
          FROM evidence_catalog
          WHERE company_name=?
          ORDER BY evidence_usable DESC, quality_score DESC, collected_at DESC
          LIMIT ?
          """,
          (args.name, args.evidence_limit),
        )
      ),
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))


def list_index_history(args):
  init_db(args.db)
  clauses = []
  values = []
  if args.company:
    clauses.append("h.company_name=?")
    values.append(args.company)
  if args.index:
    index_key = args.index if args.index == "overall" or args.index.startswith("fun_") else args.index
    clauses.append("h.index_key=?")
    values.append(index_key)
  where_clause = f"WHERE {' AND '.join(clauses)}" if clauses else ""
  values.append(args.limit)
  with sqlite3.connect(args.db) as conn:
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
      f"""
      SELECT h.company_name, h.index_key, h.index_group, h.score,
             h.confidence, h.evidence_count, r.model_version,
             r.generated_at, r.observation_count, r.theme_evidence_count
      FROM company_index_history h
      JOIN index_runs r ON r.id = h.run_id
      {where_clause}
      ORDER BY r.id DESC, h.company_name, h.index_group, h.index_key
      LIMIT ?
      """,
      values,
    )
    print(json.dumps(rows_as_dicts(rows), ensure_ascii=False, indent=2))


def list_gaps(args):
  init_db(args.db)
  clauses = []
  values = []
  if args.company:
    clauses.append("company_name=?")
    values.append(args.company)
  if args.severity:
    clauses.append("severity=?")
    values.append(args.severity)
  where_clause = f"WHERE {' AND '.join(clauses)}" if clauses else ""

  with sqlite3.connect(args.db) as conn:
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
      f"""
      SELECT company_name, platform, gap_type, severity, reason, next_action
      FROM research_backlog
      {where_clause}
      """,
      values,
    )
    for row in rows:
      print(
        "\t".join(
          [
            row["severity"],
            row["company_name"],
            row["platform"] or "-",
            row["gap_type"],
            row["reason"],
            row["next_action"],
          ]
        )
      )


def search_evidence(args):
  init_db(args.db)
  pattern = f"%{args.keyword}%"
  clauses = ["(company_name LIKE ? OR title LIKE ? OR body LIKE ?)"]
  values = [pattern, pattern, pattern]
  if args.company:
    clauses.append("company_name=?")
    values.append(args.company)
  values.append(args.limit)

  with sqlite3.connect(args.db) as conn:
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
      f"""
      SELECT company_name, source_kind, title, url, quality_score, evidence_usable, collected_at,
             substr(COALESCE(body, ''), 1, 240) AS excerpt
      FROM search_documents
      WHERE {' AND '.join(clauses)}
      ORDER BY evidence_usable DESC, quality_score DESC, collected_at DESC
      LIMIT ?
      """,
      values,
    )
    print(json.dumps(rows_as_dicts(rows), ensure_ascii=False, indent=2))


def list_recent_observations(args):
  init_db(args.db)
  clauses = []
  values = []
  if args.company:
    clauses.append("company_name=?")
    values.append(args.company)
  if args.platform:
    clauses.append("platform=?")
    values.append(args.platform)
  if args.fresh_only:
    clauses.append("freshness_status IN ('fresh_180d', 'fresh_365d')")
  where_clause = f"WHERE {' AND '.join(clauses)}" if clauses else ""
  values.append(args.limit)

  with sqlite3.connect(args.db) as conn:
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
      f"""
      SELECT company_name, platform, query, access, latest_published_date,
             freshness_status, final_url, collected_at
      FROM recent_observations
      {where_clause}
      LIMIT ?
      """,
      values,
    )
    print(json.dumps(rows_as_dicts(rows), ensure_ascii=False, indent=2))


def update_analyst_review(args):
  init_db(args.db)
  field_values = {
    "company_profile": args.profile,
    "job_opportunity": args.opportunity,
    "main_risks": args.risks,
    "suitable_candidates": args.candidates,
    "publish_decision": args.decision,
    "review_status": args.status,
    "reviewer": args.reviewer,
  }
  updates = [(field, value) for field, value in field_values.items() if value is not None]
  if not updates:
    raise SystemExit("No review fields supplied.")

  with sqlite3.connect(args.db) as conn:
    exists = conn.execute(
      "SELECT 1 FROM companies WHERE name=?",
      (args.company,),
    ).fetchone()
    if not exists:
      raise SystemExit(f"Company not found: {args.company}")
    conn.execute(
      """
      INSERT INTO analyst_reviews (company_name)
      VALUES (?)
      ON CONFLICT(company_name) DO NOTHING
      """,
      (args.company,),
    )
    assignments = [f"{field}=?" for field, _ in updates]
    values = [value for _, value in updates]
    assignments.append("updated_at=CURRENT_TIMESTAMP")
    if args.status == "completed":
      assignments.append("reviewed_at=CURRENT_TIMESTAMP")
    conn.execute(
      f"UPDATE analyst_reviews SET {', '.join(assignments)} WHERE company_name=?",
      [*values, args.company],
    )
  print(f"Updated analyst review: {args.company}")


def main():
  parser = argparse.ArgumentParser(description="Maintain Sinan research evidence in SQLite.")
  parser.add_argument("--db", type=Path, default=DEFAULT_DB)
  subparsers = parser.add_subparsers(dest="command", required=True)

  init_parser = subparsers.add_parser("init")
  init_parser.set_defaults(func=lambda args: init_db(args.db))

  sync_parser = subparsers.add_parser("sync")
  sync_parser.add_argument("--targets", type=Path, default=DEFAULT_TARGETS)
  sync_parser.add_argument("--observations", type=Path, default=DEFAULT_OBSERVATIONS)
  sync_parser.add_argument("--insights", type=Path, default=DEFAULT_INSIGHTS)
  sync_parser.add_argument("--indices", type=Path, default=DEFAULT_INDICES)
  sync_parser.add_argument("--external", type=Path, default=DEFAULT_EXTERNAL)
  sync_parser.add_argument("--theme-evidence", type=Path, default=DEFAULT_THEME_EVIDENCE)
  sync_parser.set_defaults(func=sync)

  summary_parser = subparsers.add_parser("summary")
  summary_parser.set_defaults(func=summary)

  company_parser = subparsers.add_parser("company")
  company_parser.add_argument("--name", required=True)
  company_parser.add_argument("--evidence-limit", type=int, default=20)
  company_parser.set_defaults(func=company_detail)

  history_parser = subparsers.add_parser("history")
  history_parser.add_argument("--company")
  history_parser.add_argument("--index")
  history_parser.add_argument("--limit", type=int, default=100)
  history_parser.set_defaults(func=list_index_history)

  gaps_parser = subparsers.add_parser("gaps")
  gaps_parser.add_argument("--company")
  gaps_parser.add_argument("--severity", choices=["high", "medium", "low"])
  gaps_parser.set_defaults(func=list_gaps)

  search_parser = subparsers.add_parser("search")
  search_parser.add_argument("keyword")
  search_parser.add_argument("--company")
  search_parser.add_argument("--limit", type=int, default=20)
  search_parser.set_defaults(func=search_evidence)

  recent_parser = subparsers.add_parser("recent")
  recent_parser.add_argument("--company")
  recent_parser.add_argument("--platform", choices=["boss_zhipin", "xiaohongshu", "weibo", "zhihu"])
  recent_parser.add_argument("--fresh-only", action="store_true")
  recent_parser.add_argument("--limit", type=int, default=50)
  recent_parser.set_defaults(func=list_recent_observations)

  review_parser = subparsers.add_parser("review")
  review_parser.add_argument("--company", required=True)
  review_parser.add_argument("--profile")
  review_parser.add_argument("--opportunity")
  review_parser.add_argument("--risks")
  review_parser.add_argument("--candidates")
  review_parser.add_argument("--decision")
  review_parser.add_argument("--status", choices=["pending", "in_review", "completed"])
  review_parser.add_argument("--reviewer")
  review_parser.set_defaults(func=update_analyst_review)

  args = parser.parse_args()
  args.func(args)


if __name__ == "__main__":
  main()
