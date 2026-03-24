/**
 * REQ-M02B：技术设计总文档 Markdown 版本链（MSW 内存，按 projectId）。
 * 规则与 `requirementDocStore` 一致：仅当前 latest 可 PATCH 或作为 based_on 追加新版本。
 */

export type TechDesignDocVersionRow = {
  id: string
  version_no: number
  markdown: string
  created_at: string
}

const byProject = new Map<string, TechDesignDocVersionRow[]>()

const seeded = new Set<string>()

export const EMPTY_TECH_DESIGN_DOC_TEMPLATE = `# 技术设计文档

## 技术栈与运行环境

（前端 / 后端 / 数据库 / 中间件 / 部署）

## 系统上下文与架构

（上下文图、分层、关键边界）

## 模块与职责

（与需求模块对齐的边界说明）

## 数据与接口边界

（概要；详细接口见接口管理模块）

## 非功能需求

（性能、安全、可用性、可观测性）

## 风险与待定项

`

function rows(projectId: string): TechDesignDocVersionRow[] {
  if (!byProject.has(projectId)) byProject.set(projectId, [])
  return byProject.get(projectId)!
}

function sortedCopy(projectId: string): TechDesignDocVersionRow[] {
  return [...rows(projectId)].sort((a, b) => a.version_no - b.version_no)
}

function latestRow(projectId: string): TechDesignDocVersionRow | null {
  const arr = sortedCopy(projectId)
  return arr.length ? arr[arr.length - 1] : null
}

function previewOf(md: string): string {
  const line = md.split('\n').find((l) => l.trim())?.trim() ?? ''
  return line.length > 120 ? `${line.slice(0, 120)}…` : line
}

function nextId(): string {
  return `tdv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/** 与需求演示项目对齐：预置两版技术设计，便于联调 */
export function seedTechDesignDocDemo(projectId: string) {
  if (seeded.has(projectId)) return
  seeded.add(projectId)
  if (projectId !== 'proj-demo-1') return
  const list = rows(projectId)
  list.push(
    {
      id: 'tdv-demo-1',
      version_no: 1,
      markdown:
        '# 技术设计 v1\n\n初稿：Vue3 SPA + FastAPI 分层；JWT 鉴权；PostgreSQL 主库。',
      created_at: '2026-03-20T11:00:00.000Z',
    },
    {
      id: 'tdv-demo-2',
      version_no: 2,
      markdown:
        '# 技术设计 v2\n\n修订：补充 Redis 缓存边界、审计日志异步落库与 MSW/真后端切换约定。',
      created_at: '2026-03-22T09:15:00.000Z',
    },
  )
}

export function listTechDesignDocVersions(projectId: string) {
  seedTechDesignDocDemo(projectId)
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

export function getTechDesignDocVersion(
  projectId: string,
  versionId: string,
): (TechDesignDocVersionRow & { is_latest: boolean }) | null {
  seedTechDesignDocDemo(projectId)
  const latest = latestRow(projectId)
  const r = rows(projectId).find((x) => x.id === versionId)
  if (!r) return null
  return { ...r, is_latest: latest?.id === r.id }
}

export function createTechDesignDocVersion(
  projectId: string,
  mode: 'empty' | 'from_latest',
): TechDesignDocVersionRow & { is_latest: true } {
  seedTechDesignDocDemo(projectId)
  const list = rows(projectId)
  const latest = latestRow(projectId)
  let markdown = EMPTY_TECH_DESIGN_DOC_TEMPLATE
  if (mode === 'from_latest' && latest) {
    markdown = latest.markdown
  }
  const nextNo = list.length ? Math.max(...list.map((x) => x.version_no)) + 1 : 1
  const row: TechDesignDocVersionRow = {
    id: nextId(),
    version_no: nextNo,
    markdown,
    created_at: new Date().toISOString(),
  }
  list.push(row)
  return { ...row, is_latest: true }
}

export function appendTechDesignDocVersion(
  projectId: string,
  markdown: string,
  basedOnVersionId: string,
): { ok: true; row: TechDesignDocVersionRow & { is_latest: true } } | { ok: false; message: string } {
  seedTechDesignDocDemo(projectId)
  const latest = latestRow(projectId)
  if (!latest) {
    return { ok: false, message: '尚无版本，请先在列表创建' }
  }
  if (latest.id !== basedOnVersionId) {
    return { ok: false, message: '仅能从当前最新版本保存出新版本；请刷新后重试' }
  }
  const list = rows(projectId)
  const nextNo = Math.max(...list.map((x) => x.version_no)) + 1
  const row: TechDesignDocVersionRow = {
    id: nextId(),
    version_no: nextNo,
    markdown,
    created_at: new Date().toISOString(),
  }
  list.push(row)
  return { ok: true, row: { ...row, is_latest: true } }
}

export function patchTechDesignDocVersion(
  projectId: string,
  versionId: string,
  markdown: string,
):
  | { ok: true; row: TechDesignDocVersionRow & { is_latest: boolean } }
  | { ok: false; message: string } {
  seedTechDesignDocDemo(projectId)
  const latest = latestRow(projectId)
  if (!latest || latest.id !== versionId) {
    return { ok: false, message: '仅允许覆盖当前最新版本' }
  }
  latest.markdown = markdown
  latest.created_at = new Date().toISOString()
  return { ok: true, row: { ...latest, is_latest: true } }
}

export function deleteTechDesignDocVersion(
  projectId: string,
  versionId: string,
): { ok: true } | { ok: false; message: string } {
  seedTechDesignDocDemo(projectId)
  const list = rows(projectId)
  const idx = list.findIndex((x) => x.id === versionId)
  if (idx < 0) return { ok: false, message: '版本不存在' }
  list.splice(idx, 1)
  return { ok: true }
}
