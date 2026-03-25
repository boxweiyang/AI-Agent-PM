/**
 * 迭代需求文档版本链（按 projectId + iterationId），规则与 requirementDocStore 一致：
 * 仅 latest 可 PATCH / 作为 based_on 追加；删除最新后上一版成为 latest。
 */
export type IterationReqDocVersionRow = {
  id: string
  version_no: number
  markdown: string
  created_at: string
}

function key(projectId: string, iterationId: string) {
  return `${projectId}\t${iterationId}`
}

const byKey = new Map<string, IterationReqDocVersionRow[]>()

export const EMPTY_ITERATION_REQ_DOC_TEMPLATE = `# 本迭代需求说明

## 目标

（本迭代要达成的可验收目标）

## 范围

（包含 / 不包含的边界）

## 验收标准

- 

`

function rows(projectId: string, iterationId: string): IterationReqDocVersionRow[] {
  const k = key(projectId, iterationId)
  if (!byKey.has(k)) byKey.set(k, [])
  return byKey.get(k)!
}

function sortedCopy(projectId: string, iterationId: string): IterationReqDocVersionRow[] {
  return [...rows(projectId, iterationId)].sort((a, b) => a.version_no - b.version_no)
}

function latestRow(projectId: string, iterationId: string): IterationReqDocVersionRow | null {
  const arr = sortedCopy(projectId, iterationId)
  return arr.length ? arr[arr.length - 1]! : null
}

function previewOf(md: string): string {
  const line = md.split('\n').find((l) => l.trim())?.trim() ?? ''
  return line.length > 120 ? `${line.slice(0, 120)}…` : line
}

function nextId() {
  return `irdv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function listIterationRequirementDocVersions(projectId: string, iterationId: string) {
  const arr = sortedCopy(projectId, iterationId)
  const latest = latestRow(projectId, iterationId)
  return {
    items: arr.map((v) => ({
      id: v.id,
      version_no: v.version_no,
      created_at: v.created_at,
      preview: previewOf(v.markdown),
    })),
    latest_version_id: latest?.id ?? null,
  }
}

export function getIterationRequirementDocVersion(
  projectId: string,
  iterationId: string,
  versionId: string,
): (IterationReqDocVersionRow & { is_latest: boolean }) | null {
  const latest = latestRow(projectId, iterationId)
  const r = rows(projectId, iterationId).find((x) => x.id === versionId)
  if (!r) return null
  return { ...r, is_latest: latest?.id === r.id }
}

export function createIterationRequirementDocVersion(
  projectId: string,
  iterationId: string,
  mode: 'empty' | 'from_latest',
): IterationReqDocVersionRow & { is_latest: true } {
  const list = rows(projectId, iterationId)
  const latest = latestRow(projectId, iterationId)
  let markdown = EMPTY_ITERATION_REQ_DOC_TEMPLATE
  if (mode === 'from_latest' && latest) {
    markdown = latest.markdown
  }
  const nextNo = list.length ? Math.max(...list.map((x) => x.version_no)) + 1 : 1
  const row: IterationReqDocVersionRow = {
    id: nextId(),
    version_no: nextNo,
    markdown,
    created_at: new Date().toISOString(),
  }
  list.push(row)
  return { ...row, is_latest: true }
}

export function appendIterationRequirementDocVersion(
  projectId: string,
  iterationId: string,
  markdown: string,
  basedOnVersionId: string,
): { ok: true; row: IterationReqDocVersionRow & { is_latest: true } } | { ok: false; message: string } {
  const latest = latestRow(projectId, iterationId)
  if (!latest) {
    return { ok: false, message: '尚无版本，请先在列表创建' }
  }
  if (latest.id !== basedOnVersionId) {
    return { ok: false, message: '仅能从当前最新版本保存出新版本；请刷新后重试' }
  }
  const list = rows(projectId, iterationId)
  const nextNo = Math.max(...list.map((x) => x.version_no)) + 1
  const row: IterationReqDocVersionRow = {
    id: nextId(),
    version_no: nextNo,
    markdown,
    created_at: new Date().toISOString(),
  }
  list.push(row)
  return { ok: true, row: { ...row, is_latest: true } }
}

export function patchIterationRequirementDocVersion(
  projectId: string,
  iterationId: string,
  versionId: string,
  markdown: string,
): { ok: true; row: IterationReqDocVersionRow & { is_latest: boolean } } | { ok: false; message: string } {
  const latest = latestRow(projectId, iterationId)
  if (!latest || latest.id !== versionId) {
    return { ok: false, message: '仅允许覆盖当前最新版本' }
  }
  latest.markdown = markdown
  latest.created_at = new Date().toISOString()
  return { ok: true, row: { ...latest, is_latest: true } }
}

export function deleteIterationRequirementDocVersion(
  projectId: string,
  iterationId: string,
  versionId: string,
): { ok: true } | { ok: false; message: string } {
  const list = rows(projectId, iterationId)
  const idx = list.findIndex((x) => x.id === versionId)
  if (idx < 0) return { ok: false, message: '版本不存在' }
  list.splice(idx, 1)
  return { ok: true }
}

export function deleteAllIterationRequirementDocVersions(projectId: string, iterationId: string) {
  byKey.delete(key(projectId, iterationId))
}
