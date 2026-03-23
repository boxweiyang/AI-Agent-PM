/**
 * 需求文档版本：MSW 内存存储（按 projectId）。
 * 规则：仅 **当前 latest** 可 PATCH 覆盖或作为 based_on 追加新版本；删除最新后上一版成为 latest。
 */

export type ReqDocVersionRow = {
  id: string
  version_no: number
  markdown: string
  created_at: string
}

const byProject = new Map<string, ReqDocVersionRow[]>()

const seeded = new Set<string>()

export const EMPTY_REQUIREMENT_DOC_TEMPLATE = `# 需求文档

## 目标

（简述业务目标）

## 功能清单

- 

## 交互流程

## 业务规则

## 异常处理

## 验收标准

`

function rows(projectId: string): ReqDocVersionRow[] {
  if (!byProject.has(projectId)) byProject.set(projectId, [])
  return byProject.get(projectId)!
}

function sortedCopy(projectId: string): ReqDocVersionRow[] {
  return [...rows(projectId)].sort((a, b) => a.version_no - b.version_no)
}

function latestRow(projectId: string): ReqDocVersionRow | null {
  const arr = sortedCopy(projectId)
  return arr.length ? arr[arr.length - 1] : null
}

function previewOf(md: string): string {
  const line = md.split('\n').find((l) => l.trim())?.trim() ?? ''
  return line.length > 120 ? `${line.slice(0, 120)}…` : line
}

function nextId(): string {
  return `rdv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/** 演示：示例项目 Alpha 预置两版，便于联调 */
export function seedRequirementDocDemo(projectId: string) {
  if (seeded.has(projectId)) return
  seeded.add(projectId)
  if (projectId !== 'proj-demo-1') return
  const list = rows(projectId)
  list.push(
    {
      id: 'rdv-demo-1',
      version_no: 1,
      markdown: '# 需求文档 v1\n\n初稿：账号统一认证范围与里程碑。',
      created_at: '2026-03-20T10:00:00.000Z',
    },
    {
      id: 'rdv-demo-2',
      version_no: 2,
      markdown: '# 需求文档 v2\n\n修订：补充 SSO 对接与审计字段说明。',
      created_at: '2026-03-21T14:30:00.000Z',
    },
  )
}

export function listRequirementDocVersions(projectId: string) {
  seedRequirementDocDemo(projectId)
  const arr = sortedCopy(projectId)
  const latest = latestRow(projectId)
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

export function getRequirementDocVersion(
  projectId: string,
  versionId: string,
): ReqDocVersionRow & { is_latest: boolean } | null {
  seedRequirementDocDemo(projectId)
  const latest = latestRow(projectId)
  const r = rows(projectId).find((x) => x.id === versionId)
  if (!r) return null
  return { ...r, is_latest: latest?.id === r.id }
}

export function createRequirementDocVersion(
  projectId: string,
  mode: 'empty' | 'from_latest',
): ReqDocVersionRow & { is_latest: true } {
  seedRequirementDocDemo(projectId)
  const list = rows(projectId)
  const latest = latestRow(projectId)
  let markdown = EMPTY_REQUIREMENT_DOC_TEMPLATE
  if (mode === 'from_latest' && latest) {
    markdown = latest.markdown
  }
  const nextNo = list.length ? Math.max(...list.map((x) => x.version_no)) + 1 : 1
  const row: ReqDocVersionRow = {
    id: nextId(),
    version_no: nextNo,
    markdown,
    created_at: new Date().toISOString(),
  }
  list.push(row)
  return { ...row, is_latest: true }
}

export function appendRequirementDocVersion(
  projectId: string,
  markdown: string,
  basedOnVersionId: string,
): { ok: true; row: ReqDocVersionRow & { is_latest: true } } | { ok: false; message: string } {
  seedRequirementDocDemo(projectId)
  const latest = latestRow(projectId)
  if (!latest) {
    return { ok: false, message: '尚无版本，请先在列表创建' }
  }
  if (latest.id !== basedOnVersionId) {
    return { ok: false, message: '仅能从当前最新版本保存出新版本；请刷新后重试' }
  }
  const list = rows(projectId)
  const nextNo = Math.max(...list.map((x) => x.version_no)) + 1
  const row: ReqDocVersionRow = {
    id: nextId(),
    version_no: nextNo,
    markdown,
    created_at: new Date().toISOString(),
  }
  list.push(row)
  return { ok: true, row: { ...row, is_latest: true } }
}

export function patchRequirementDocVersion(
  projectId: string,
  versionId: string,
  markdown: string,
): { ok: true; row: ReqDocVersionRow & { is_latest: boolean } } | { ok: false; message: string } {
  seedRequirementDocDemo(projectId)
  const latest = latestRow(projectId)
  if (!latest || latest.id !== versionId) {
    return { ok: false, message: '仅允许覆盖当前最新版本' }
  }
  latest.markdown = markdown
  latest.created_at = new Date().toISOString()
  return { ok: true, row: { ...latest, is_latest: true } }
}

export function deleteRequirementDocVersion(
  projectId: string,
  versionId: string,
): { ok: true } | { ok: false; message: string } {
  seedRequirementDocDemo(projectId)
  const list = rows(projectId)
  const idx = list.findIndex((x) => x.id === versionId)
  if (idx < 0) return { ok: false, message: '版本不存在' }
  list.splice(idx, 1)
  return { ok: true }
}
