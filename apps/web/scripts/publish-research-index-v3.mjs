import { createHash, randomUUID } from "node:crypto"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, "..")
const indexPath = path.resolve(appRoot, "src/db/seeds/reports/company-indices.json")

function argValue(name) {
  const value = process.argv.find((arg) => arg.startsWith(`${name}=`))
  return value?.slice(name.length + 1)
}

function deterministicUuid(value) {
  const bytes = createHash("sha256").update(String(value)).digest().subarray(0, 16)
  bytes[6] = (bytes[6] & 0x0f) | 0x50
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = bytes.toString("hex")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function fingerprint(document) {
  return createHash("sha256")
    .update(JSON.stringify({
      modelVersion: document.modelVersion,
      dataAsOf: document.dataAsOf,
      sourceCounts: document.sourceCounts,
      companies: document.companies,
      evidenceSignals: document.evidenceSignals,
    }))
    .digest("hex")
}

function asDate(value) {
  const text = String(value ?? "").slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null
}

function asTimestamp(value) {
  const text = String(value ?? "").trim()
  return text && !Number.isNaN(Date.parse(text)) ? text : null
}

function scoreRows(company) {
  const rows = []
  if (company.overallScore !== undefined) {
    rows.push({
      indexKey: "overall",
      indexGroup: "overall",
      scopeType: "company",
      scopeKey: "company",
      score: company.overallScore,
      detail: {
        score: company.overallScore,
        rawScore: company.rawOverallScore,
        confidence: company.confidence,
        evidenceCount: Object.values(company.components).reduce((sum, item) => sum + item.evidenceCount, 0),
        sourceCount: Object.values(company.components).reduce((sum, item) => sum + item.sourceCount, 0),
        effectiveSampleSize: 0,
        reasons: [],
        limitations: [],
        evidenceRefs: [],
        dataAsOf: company.dataAsOf,
      },
    })
  }
  for (const [indexKey, detail] of Object.entries(company.components ?? {})) {
    rows.push({ indexKey, indexGroup: "core", scopeType: "company", scopeKey: "company", score: detail.score, detail })
  }
  for (const [indexKey, detail] of Object.entries(company.funIndices ?? {})) {
    rows.push({ indexKey: `fun_${indexKey}`, indexGroup: "fun", scopeType: "company", scopeKey: "company", score: detail.score, detail })
  }
  for (const slice of company.slices ?? []) {
    rows.push({
      indexKey: slice.indexKey.startsWith("fun_") ? slice.indexKey : (company.funIndices?.[slice.indexKey] ? `fun_${slice.indexKey}` : slice.indexKey),
      indexGroup: company.funIndices?.[slice.indexKey] ? "fun" : "core",
      scopeType: slice.scopeType,
      scopeKey: slice.scopeKey,
      score: slice.score,
      detail: slice,
    })
  }
  return rows
}

async function connect() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required to publish research indices")
  const { Pool } = await import("pg")
  return new Pool({ connectionString: process.env.DATABASE_URL })
}

async function promotePublished(pool, runId, reviewedBy, reviewNote) {
  if (!runId) throw new Error("--run-id is required when --status=published")
  if (!reviewedBy || !/^[0-9a-f-]{36}$/i.test(reviewedBy)) throw new Error("--reviewed-by must be a user UUID when publishing")
  await pool.query("BEGIN")
  try {
    const run = await pool.query(
      "SELECT id, status FROM index_runs WHERE id = $1 FOR UPDATE",
      [runId]
    )
    if (run.rowCount !== 1) throw new Error(`Candidate run not found: ${runId}`)
    if (!['candidate', 'pending_review'].includes(run.rows[0].status)) throw new Error(`Run ${runId} is ${run.rows[0].status}, not publishable`)

    await pool.query(
      "UPDATE index_runs SET status = 'superseded' WHERE status = 'published' AND id <> $1",
      [runId]
    )
    await pool.query(
      "UPDATE company_index_scores SET publish_status = 'superseded' WHERE publish_status = 'published'",
    )
    await pool.query(
      `UPDATE index_runs
       SET status = 'published', reviewed_at = now(), reviewed_by_user_id = $2, review_note = $3
       WHERE id = $1`,
      [runId, reviewedBy, reviewNote ?? null]
    )
    await pool.query(
      "UPDATE company_index_scores SET publish_status = 'published', updated_at = now() WHERE run_id = $1",
      [runId]
    )
    await pool.query(
      `UPDATE research_evidence evidence
       SET review_status = 'approved', updated_at = now()
       WHERE EXISTS (
         SELECT 1
         FROM company_index_evidence_links links
         JOIN company_index_scores scores ON scores.id = links.score_id
         WHERE links.evidence_id = evidence.id AND scores.run_id = $1
       )`,
      [runId]
    )
    await pool.query("COMMIT")
    console.log(`Published research index run ${runId}`)
  } catch (error) {
    await pool.query("ROLLBACK")
    throw error
  }
}

async function createCandidate(pool, document) {
  const runId = randomUUID()
  const runFingerprint = fingerprint(document)
  await pool.query("BEGIN")
  try {
    const existing = await pool.query(
      "SELECT id, status FROM index_runs WHERE fingerprint = $1",
      [runFingerprint]
    )
    if (existing.rowCount) {
      await pool.query("ROLLBACK")
      console.log(`Research index already exists: ${existing.rows[0].id} (${existing.rows[0].status})`)
      return existing.rows[0].id
    }
    await pool.query(
      `INSERT INTO index_runs
       (id, fingerprint, model_version, status, data_as_of, source_counts, generated_at)
       VALUES ($1, $2, $3, 'candidate', $4, $5, $6)`,
      [runId, runFingerprint, document.modelVersion, document.dataAsOf, document.sourceCounts, document.generatedAt]
    )

    const companyRows = await pool.query("SELECT id, name FROM companies WHERE deleted_at IS NULL")
    const companyIds = new Map(companyRows.rows.map((row) => [row.name, row.id]))
    const evidenceIds = new Map()
    for (const signal of document.evidenceSignals ?? []) {
      const companyId = companyIds.get(signal.companyName)
      if (!companyId) continue
      const evidenceId = deterministicUuid(`evidence|${signal.companyName}|${signal.indexKey}|${signal.evidenceHash}|${signal.scopeKey}`)
      evidenceIds.set(signal.id, evidenceId)
      await pool.query(
        `INSERT INTO research_evidence
         (id, company_id, index_key, scope_type, scope_key, department_name, city, job_family,
          source_kind, source_type, source_url, title, excerpt, effect, source_weight,
          freshness_weight, relevance_weight, trust_weight, evidence_hash, cluster_key,
          published_at, collected_at, review_status, raw_json)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                 $16, $17, $18, $19, $20, $21, $22, 'pending', $23)
         ON CONFLICT (company_id, index_key, evidence_hash, scope_key)
         DO UPDATE SET
           effect = EXCLUDED.effect,
           source_weight = EXCLUDED.source_weight,
           freshness_weight = EXCLUDED.freshness_weight,
           relevance_weight = EXCLUDED.relevance_weight,
           trust_weight = EXCLUDED.trust_weight,
           raw_json = EXCLUDED.raw_json,
           updated_at = now()`,
        [
          evidenceId,
          companyId,
          signal.indexKey,
          signal.scopeType,
          signal.scopeKey,
          signal.departmentName ?? null,
          signal.city ?? null,
          signal.jobFamily ?? null,
          signal.sourceKind,
          signal.sourceType,
          signal.sourceUrl ?? null,
          signal.title,
          signal.excerpt,
          signal.effect,
          signal.sourceWeight,
          signal.freshnessWeight,
          signal.relevanceWeight,
          signal.trustWeight,
          signal.evidenceHash,
          signal.clusterKey,
          asDate(signal.publishedAt),
          asTimestamp(signal.collectedAt),
          signal,
        ]
      )
    }

    for (const company of document.companies ?? []) {
      const companyId = companyIds.get(company.name)
      if (!companyId) continue
      for (const row of scoreRows(company)) {
        const scoreId = deterministicUuid(`${runId}|score|${company.name}|${row.indexKey}|${row.scopeType}|${row.scopeKey}`)
        const detail = row.detail
        await pool.query(
          `INSERT INTO company_index_scores
           (id, run_id, company_id, index_key, index_group, scope_type, scope_key, scope_id,
            raw_score, score, confidence, effective_sample_size, source_count, evidence_count,
            reasons, limitations, evidence_refs, publish_status, generated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'candidate', $18)
           ON CONFLICT (run_id, company_id, scope_type, scope_key, index_key)
           DO UPDATE SET
             raw_score = EXCLUDED.raw_score,
             score = EXCLUDED.score,
             confidence = EXCLUDED.confidence,
             effective_sample_size = EXCLUDED.effective_sample_size,
             source_count = EXCLUDED.source_count,
             evidence_count = EXCLUDED.evidence_count,
             reasons = EXCLUDED.reasons,
             limitations = EXCLUDED.limitations,
             evidence_refs = EXCLUDED.evidence_refs,
             updated_at = now()
           RETURNING id`,
          [
            scoreId,
            runId,
            companyId,
            row.indexKey,
            row.indexGroup,
            row.scopeType,
            row.scopeKey,
            null,
            detail.rawScore ?? row.score ?? 50,
            row.score,
            detail.confidence ?? 0,
            detail.effectiveSampleSize ?? 0,
            detail.sourceCount ?? 0,
            detail.evidenceCount ?? 0,
            detail.reasons ?? [],
            detail.limitations ?? [],
            detail.evidenceRefs ?? [],
            document.generatedAt,
          ]
        )
        for (const reference of detail.evidenceRefs ?? []) {
          const evidenceId = evidenceIds.get(reference.evidenceId)
          if (!evidenceId) continue
          await pool.query(
            `INSERT INTO company_index_evidence_links
             (id, score_id, evidence_id, effect, weight, contribution)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (score_id, evidence_id)
             DO UPDATE SET effect = EXCLUDED.effect, weight = EXCLUDED.weight, contribution = EXCLUDED.contribution`,
            [
              deterministicUuid(`${scoreId}|${evidenceId}`),
              scoreId,
              evidenceId,
              reference.effect ?? 0,
              reference.weight ?? 0,
              Number(reference.effect ?? 0) * Number(reference.weight ?? 0),
            ]
          )
        }
      }
    }
    await pool.query("COMMIT")
    console.log(`Created candidate research index run ${runId}`)
    console.log(`Fingerprint: ${runFingerprint}`)
    return runId
  } catch (error) {
    await pool.query("ROLLBACK")
    throw error
  }
}

const status = argValue("--status") ?? "candidate"
const document = JSON.parse(await readFile(argValue("--input") ? path.resolve(appRoot, argValue("--input")) : indexPath, "utf8"))
const pool = await connect()
try {
  if (status === "published") {
    await promotePublished(pool, argValue("--run-id"), argValue("--reviewed-by"), argValue("--review-note"))
  } else if (status === "candidate") {
    await createCandidate(pool, document)
  } else {
    throw new Error(`Unsupported status: ${status}`)
  }
} finally {
  await pool.end()
}
