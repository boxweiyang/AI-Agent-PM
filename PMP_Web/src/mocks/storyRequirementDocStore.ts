/**
 * Story 需求文档版本链（按 projectId + storyId），规则与 requirementDocStore 一致：
 * - 仅 latest 可 PATCH / 覆盖；
 * - 保存新版本仅允许从 latest 追加（based_on_version_id 必须等于 latest.id）；
 * - 删除最新后，上一版将成为 latest（通过删除操作自然实现）。
 */
export type StoryReqDocVersionRow = {
  id: string
  version_no: number
  markdown: string
  created_at: string
}

function key(projectId: string, storyId: string) {
  return `${projectId}\t${storyId}`
}

const byKey = new Map<string, StoryReqDocVersionRow[]>()

const EMPTY_STORY_REQ_DOC_TEMPLATE = `# 本 Story 需求说明

## 目标

（本 Story 要达成的可验收目标）

## 范围

（包含 / 不包含的边界）

## 验收标准

- 
`

function rows(projectId: string, storyId: string): StoryReqDocVersionRow[] {
  const k = key(projectId, storyId)
  if (!byKey.has(k)) byKey.set(k, [])
  return byKey.get(k)!
}

function sortedCopy(projectId: string, storyId: string): StoryReqDocVersionRow[] {
  return [...rows(projectId, storyId)].sort((a, b) => a.version_no - b.version_no)
}

function latestRow(projectId: string, storyId: string): StoryReqDocVersionRow | null {
  const arr = sortedCopy(projectId, storyId)
  return arr.length ? arr[arr.length - 1]! : null
}

function previewOf(md: string): string {
  const line = md.split('\n').find((l) => l.trim())?.trim() ?? ''
  return line.length > 120 ? `${line.slice(0, 120)}…` : line
}

function nextId() {
  return `srdv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function listStoryRequirementDocVersions(projectId: string, storyId: string) {
  const arr = sortedCopy(projectId, storyId)
  const latest = latestRow(projectId, storyId)
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

export function getStoryRequirementDocVersion(
  projectId: string,
  storyId: string,
  versionId: string,
): (StoryReqDocVersionRow & { is_latest: boolean }) | null {
  const latest = latestRow(projectId, storyId)
  const r = rows(projectId, storyId).find((x) => x.id === versionId)
  if (!r) return null
  return { ...r, is_latest: latest?.id === r.id }
}

export function createStoryRequirementDocVersion(
  projectId: string,
  storyId: string,
  mode: 'empty' | 'from_latest',
): StoryReqDocVersionRow & { is_latest: true } {
  const list = rows(projectId, storyId)
  const latest = latestRow(projectId, storyId)
  let markdown = EMPTY_STORY_REQ_DOC_TEMPLATE
  if (mode === 'from_latest' && latest) {
    markdown = latest.markdown
  }
  const nextNo = list.length ? Math.max(...list.map((x) => x.version_no)) + 1 : 1
  const row: StoryReqDocVersionRow = {
    id: nextId(),
    version_no: nextNo,
    markdown,
    created_at: new Date().toISOString(),
  }
  list.push(row)
  return { ...row, is_latest: true }
}

export function appendStoryRequirementDocVersion(
  projectId: string,
  storyId: string,
  markdown: string,
  basedOnVersionId: string,
): { ok: true; row: StoryReqDocVersionRow & { is_latest: true } } | { ok: false; message: string } {
  const latest = latestRow(projectId, storyId)
  if (!latest) return { ok: false, message: '尚无版本，请先在列表创建' }
  if (latest.id !== basedOnVersionId) {
    return { ok: false, message: '仅能从当前最新版本保存出新版本；请刷新后重试' }
  }
  const list = rows(projectId, storyId)
  const nextNo = Math.max(...list.map((x) => x.version_no)) + 1
  const row: StoryReqDocVersionRow = {
    id: nextId(),
    version_no: nextNo,
    markdown,
    created_at: new Date().toISOString(),
  }
  list.push(row)
  return { ok: true, row: { ...row, is_latest: true } }
}

export function patchStoryRequirementDocVersion(
  projectId: string,
  storyId: string,
  versionId: string,
  markdown: string,
): { ok: true; row: StoryReqDocVersionRow & { is_latest: boolean } } | { ok: false; message: string } {
  const latest = latestRow(projectId, storyId)
  if (!latest || latest.id !== versionId) {
    return { ok: false, message: '仅允许覆盖当前最新版本' }
  }
  latest.markdown = markdown
  latest.created_at = new Date().toISOString()
  return { ok: true, row: { ...latest, is_latest: true } }
}

export function deleteStoryRequirementDocVersion(
  projectId: string,
  storyId: string,
  versionId: string,
): { ok: true } | { ok: false; message: string } {
  const list = rows(projectId, storyId)
  const idx = list.findIndex((x) => x.id === versionId)
  if (idx < 0) return { ok: false, message: '版本不存在' }
  list.splice(idx, 1)
  return { ok: true }
}

export function deleteAllStoryRequirementDocVersions(projectId: string, storyId: string) {
  byKey.delete(key(projectId, storyId))
}

