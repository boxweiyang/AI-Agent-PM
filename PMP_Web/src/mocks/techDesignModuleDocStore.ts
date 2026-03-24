/**
 * REQ-M02B：技术设计文档（按交付部分）模块化版本链（MSW 内存）。
 * - 首次创建：按技术选型交付部分批量创建，每个模块自动生成 v1。
 * - 事务规则：任一模块生成失败则整体回滚（all-or-nothing）。
 * - 命名规则固定：ARCH-MOD-{序号}_{交付名}_v{major}.{minor}
 */

import type { TechDeliveryPart } from '@/types/api-contract'
import { getRequirementDocVersion, listRequirementDocVersions } from '@/mocks/requirementDocStore'

type VersionRow = {
  id: string
  version_no: number
  markdown: string
  created_at: string
}

type DesignModuleRow = {
  id: string
  delivery_part_id: string
  fixed_doc_name: string
  title: string
  summary: string
  sort_order: number
  created_at: string
  updated_at: string
  versions: VersionRow[]
}

const byProject = new Map<string, DesignModuleRow[]>()

function projectRows(projectId: string): DesignModuleRow[] {
  if (!byProject.has(projectId)) byProject.set(projectId, [])
  return byProject.get(projectId)!
}

function nextModId(): string {
  return `tdm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function nextVerId(): string {
  return `tdmv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function normalizeLabel(s: string): string {
  return s.trim().replace(/\s+/g, ' ')
}

function previewOf(md: string): string {
  const line = md.split('\n').find((l) => l.trim())?.trim() ?? ''
  return line.length > 120 ? `${line.slice(0, 120)}…` : line
}

function partDisplayName(part: TechDeliveryPart): string {
  if (part.delivery_kind === 'other') return normalizeLabel(part.custom_label || '') || '其它'
  const dict: Record<string, string> = {
    website: '网站',
    mobile_app: 'App',
    desktop_exe: '桌面端',
    mini_program: '小程序',
    api_service: '后端服务',
    ops_tool: '运维工具',
  }
  return dict[part.delivery_kind] || part.delivery_kind || '未命名交付部分'
}

function fixedDocName(index1: number, displayName: string): string {
  const safe = displayName.replace(/[/\\?%*:|"<>]/g, '_').replace(/\s+/g, '')
  return `ARCH-MOD-${String(index1).padStart(2, '0')}_${safe}_v1.0`
}

function buildV1Markdown(part: TechDeliveryPart, reqMd: string, displayName: string, fixedName: string): string {
  const reqExcerpt = reqMd.trim().slice(0, Math.min(1200, reqMd.trim().length))
  const reqTail = reqMd.length > 1200 ? '\n\n…（需求正文较长，以上为节选）' : ''
  const tech = normalizeLabel(part.technologies || '')
  const db = normalizeLabel(part.database || '')
  const arch = normalizeLabel(part.architecture || '')
  const notes = normalizeLabel(part.notes || '')
  return `# ${displayName} 技术设计（v1）

> 文档编号：${fixedName}
> 生成方式：首版自动生成（Mock）

## 交付范围
- 交付部分：${displayName}
- 形态编码：${part.delivery_kind}

## 技术选型摘要
- 技术栈：${tech}
- 数据库：${db}
- 架构要点：${arch}
${notes ? `- 备注：${notes}` : ''}

## 对齐需求摘要
${reqExcerpt}${reqTail}

## 技术方案（初稿）
- 基于以上技术选型，确定该交付部分的分层、边界、部署与依赖。
- 与其它交付部分通过契约接口协作，保持命名一致与调用边界清晰。

## 风险与待确认
- 需求中未量化指标需补齐（性能、安全、可用性）。
- 与上下游交互协议需在接口管理中进一步落地。
`
}

function toSummary(m: DesignModuleRow) {
  const vers = [...m.versions].sort((a, b) => a.version_no - b.version_no)
  const latest = vers.length ? vers[vers.length - 1]! : null
  return {
    id: m.id,
    delivery_part_id: m.delivery_part_id,
    fixed_doc_name: m.fixed_doc_name,
    title: m.title,
    summary: m.summary,
    sort_order: m.sort_order,
    version_count: vers.length,
    latest_version_id: latest?.id ?? null,
    created_at: m.created_at,
    updated_at: m.updated_at,
  }
}

function latestVersion(m: DesignModuleRow): VersionRow | null {
  const vers = [...m.versions].sort((a, b) => a.version_no - b.version_no)
  return vers.length ? vers[vers.length - 1]! : null
}

function findModule(projectId: string, moduleId: string): DesignModuleRow | null {
  return projectRows(projectId).find((m) => m.id === moduleId) ?? null
}

export function listTechDesignModules(projectId: string) {
  const items = [...projectRows(projectId)]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((m) => toSummary(m))
  return { items }
}

export function createTechDesignModulesFirstAuto(
  projectId: string,
  selectionParts: TechDeliveryPart[],
): { ok: true; data: { items: ReturnType<typeof listTechDesignModules>['items']; created_count: number } } | { ok: false; message: string } {
  if (projectRows(projectId).length > 0) {
    return { ok: false, message: '已存在交付部分技术文档，请勿重复执行首次创建' }
  }
  const reqList = listRequirementDocVersions(projectId)
  if (!reqList.latest_version_id) {
    return { ok: false, message: '缺少需求文档最新版本，无法自动生成技术设计首版' }
  }
  const reqDetail = getRequirementDocVersion(projectId, reqList.latest_version_id)
  const reqMd = reqDetail?.markdown?.trim() ?? ''
  if (!reqMd) return { ok: false, message: '需求文档正文为空，无法自动生成技术设计首版' }

  const staged: DesignModuleRow[] = []
  const now = new Date().toISOString()
  for (let i = 0; i < selectionParts.length; i++) {
    const p = selectionParts[i]!
    const name = partDisplayName(p)
    if (!p.id || !p.delivery_kind || !normalizeLabel(p.technologies || '') || !normalizeLabel(p.database || '') || !normalizeLabel(p.architecture || '')) {
      return { ok: false, message: `技术选型未完成：交付部分 ${i + 1} 缺少必填字段` }
    }
    const fixedName = fixedDocName(i + 1, name)
    const md = buildV1Markdown(p, reqMd, name, fixedName)
    if (!md.trim()) {
      return { ok: false, message: `交付部分 ${i + 1} 首版生成失败，已整体回滚` }
    }
    staged.push({
      id: nextModId(),
      delivery_part_id: p.id,
      fixed_doc_name: fixedName,
      title: name,
      summary: `${name} 技术设计初稿（自动生成）`,
      sort_order: i,
      created_at: now,
      updated_at: now,
      versions: [{ id: nextVerId(), version_no: 1, markdown: md, created_at: now }],
    })
  }
  const rows = projectRows(projectId)
  rows.push(...staged)
  return { ok: true, data: { items: listTechDesignModules(projectId).items, created_count: staged.length } }
}

export function listTechDesignModuleVersions(projectId: string, moduleId: string) {
  const m = findModule(projectId, moduleId)
  if (!m) return { ok: false as const, message: '模块不存在' }
  const arr = [...m.versions].sort((a, b) => a.version_no - b.version_no)
  const latest = latestVersion(m)
  return {
    ok: true as const,
    data: {
      items: arr.map((v) => ({
        id: v.id,
        version_no: v.version_no,
        created_at: v.created_at,
        preview: previewOf(v.markdown),
      })),
      latest_version_id: latest?.id ?? null,
    },
  }
}

export function getTechDesignModuleVersion(projectId: string, moduleId: string, versionId: string) {
  const m = findModule(projectId, moduleId)
  if (!m) return { ok: false as const, message: '模块不存在' }
  const latest = latestVersion(m)
  const v = m.versions.find((x) => x.id === versionId)
  if (!v) return { ok: false as const, message: '版本不存在' }
  return {
    ok: true as const,
    data: {
      id: v.id,
      version_no: v.version_no,
      markdown: v.markdown,
      is_latest: latest?.id === v.id,
      created_at: v.created_at,
    },
  }
}

export function createTechDesignModuleVersion(projectId: string, moduleId: string, mode: 'empty' | 'from_latest') {
  const m = findModule(projectId, moduleId)
  if (!m) return { ok: false as const, message: '模块不存在' }
  const latest = latestVersion(m)
  const baseMd =
    mode === 'from_latest' && latest
      ? latest.markdown
      : `# ${m.title} 技术设计\n\n> 文档编号：${m.fixed_doc_name}\n\n## 技术方案\n\n（待补充）\n`
  const nextNo = m.versions.length ? Math.max(...m.versions.map((x) => x.version_no)) + 1 : 1
  const now = new Date().toISOString()
  const row: VersionRow = { id: nextVerId(), version_no: nextNo, markdown: baseMd, created_at: now }
  m.versions.push(row)
  m.updated_at = now
  return { ok: true as const, data: { id: row.id, version_no: row.version_no, markdown: row.markdown, is_latest: true, created_at: row.created_at } }
}

export function appendTechDesignModuleVersion(
  projectId: string,
  moduleId: string,
  markdown: string,
  basedOnVersionId: string,
) {
  const m = findModule(projectId, moduleId)
  if (!m) return { ok: false as const, message: '模块不存在' }
  const latest = latestVersion(m)
  if (!latest) return { ok: false as const, message: '尚无版本' }
  if (latest.id !== basedOnVersionId) {
    return { ok: false as const, message: '仅能从当前最新版本保存出新版本；请刷新后重试' }
  }
  const nextNo = Math.max(...m.versions.map((x) => x.version_no)) + 1
  const now = new Date().toISOString()
  const row: VersionRow = { id: nextVerId(), version_no: nextNo, markdown, created_at: now }
  m.versions.push(row)
  m.updated_at = now
  return { ok: true as const, data: { id: row.id, version_no: row.version_no, markdown: row.markdown, is_latest: true, created_at: row.created_at } }
}

export function patchTechDesignModuleVersion(projectId: string, moduleId: string, versionId: string, markdown: string) {
  const m = findModule(projectId, moduleId)
  if (!m) return { ok: false as const, message: '模块不存在' }
  const latest = latestVersion(m)
  if (!latest || latest.id !== versionId) {
    return { ok: false as const, message: '仅允许覆盖当前最新版本' }
  }
  latest.markdown = markdown
  latest.created_at = new Date().toISOString()
  m.updated_at = latest.created_at
  return { ok: true as const, data: { id: latest.id, version_no: latest.version_no, markdown: latest.markdown, is_latest: true, created_at: latest.created_at } }
}

export function deleteTechDesignModuleVersion(projectId: string, moduleId: string, versionId: string) {
  const m = findModule(projectId, moduleId)
  if (!m) return { ok: false as const, message: '模块不存在' }
  const idx = m.versions.findIndex((x) => x.id === versionId)
  if (idx < 0) return { ok: false as const, message: '版本不存在' }
  m.versions.splice(idx, 1)
  m.updated_at = new Date().toISOString()
  const r = listTechDesignModuleVersions(projectId, moduleId)
  if (!r.ok) return r
  return { ok: true as const, data: r.data }
}
