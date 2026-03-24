/**
 * 模块细化需求文档：MSW 内存（按 projectId → 模块 → 版本链）。
 * 契约见 `contracts/openapi/openapi.yaml`（requirement-doc modules）。
 */

import { EMPTY_REQUIREMENT_DOC_TEMPLATE } from '@/mocks/requirementDocStore'
import { getRequirementDocVersion, listRequirementDocVersions } from '@/mocks/requirementDocStore'

type VersionRow = {
  id: string
  version_no: number
  markdown: string
  created_at: string
}

type ModRow = {
  id: string
  title: string
  summary: string
  sort_order: number
  created_at: string
  updated_at: string
  versions: VersionRow[]
}

const byProject = new Map<string, ModRow[]>()

export type AiSplitModuleDraft = {
  title: string
  summary: string
  markdown: string
}

function projectRows(projectId: string): ModRow[] {
  if (!byProject.has(projectId)) byProject.set(projectId, [])
  return byProject.get(projectId)!
}

function nextModId(): string {
  return `rdm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function nextVerId(): string {
  return `rdmv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function sortedModules(mods: ModRow[]): ModRow[] {
  return [...mods].sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at))
}

function normalizeModuleTitle(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLowerCase()
}

function previewOf(md: string): string {
  const line = md.split('\n').find((l) => l.trim())?.trim() ?? ''
  return line.length > 120 ? `${line.slice(0, 120)}…` : line
}

function toSummary(m: ModRow) {
  const vers = [...m.versions].sort((a, b) => a.version_no - b.version_no)
  const latest = vers.length ? vers[vers.length - 1]! : null
  return {
    id: m.id,
    title: m.title,
    summary: m.summary,
    sort_order: m.sort_order,
    version_count: vers.length,
    latest_version_id: latest?.id ?? null,
    created_at: m.created_at,
    updated_at: m.updated_at,
  }
}

function buildDraftsFromMainMarkdown(md: string): AiSplitModuleDraft[] {
  const head =
    md
      .split('\n')
      .find((l) => l.trim().startsWith('#'))
      ?.replace(/^#+\s*/, '')
      .trim() || '需求文档'
  const excerpt = md.trim().slice(0, Math.min(800, md.trim().length))
  const tail = md.length > 800 ? '\n\n…（正文较长，以上为节选）' : ''
  return [
    {
      title: '核心范围与目标',
      summary: '从总文档抽取的业务目标、范围边界与非目标',
      markdown: `# 核心范围与目标\n\n## 概述\n对应总需求：**${head}**\n\n## 细化说明（AI 初稿）\n\n${excerpt}${tail}\n\n## 待确认\n- 与业务方对齐成功度量指标\n`,
    },
    {
      title: '功能与流程',
      summary: '功能点、用户流程与状态',
      markdown: `# 功能与流程\n\n## 功能清单（初稿）\n- 基于总文档拆解为可交付条目（待补充）\n\n## 主流程\n- （待与业务确认）\n\n## 异常流程\n- （待与业务确认）\n`,
    },
    {
      title: '非功能与验收',
      summary: '性能、安全、可用性与验收标准',
      markdown: `# 非功能与验收\n\n## 非功能需求\n- 与总文档对齐性能、可用性、安全要求\n\n## 验收标准\n- 可观察、可验证的条目（待补充）\n`,
    },
  ]
}

function pushModule(projectId: string, draft: AiSplitModuleDraft, sort_order: number) {
  const now = new Date().toISOString()
  const ver: VersionRow = {
    id: nextVerId(),
    version_no: 1,
    markdown: draft.markdown,
    created_at: now,
  }
  projectRows(projectId).push({
    id: nextModId(),
    title: draft.title,
    summary: draft.summary,
    sort_order,
    created_at: now,
    updated_at: now,
    versions: [ver],
  })
}

export function listRequirementDocModules(projectId: string) {
  return { items: sortedModules(projectRows(projectId)).map(toSummary) }
}

export function aiSplitRequirementDocModules(projectId: string, mode: 'full_replace' | 'incremental') {
  const list = listRequirementDocVersions(projectId)
  const lid = list.latest_version_id
  if (!lid) {
    return {
      ok: false as const,
      message: '总需求文档尚无版本，无法拆分。请先在「需求文档」页创建并保存至少一版。',
    }
  }
  const main = getRequirementDocVersion(projectId, lid)
  const md = main?.markdown ?? ''
  if (!md.trim()) {
    return {
      ok: false as const,
      message: '当前最新总需求正文为空，请先编写内容后再拆分。',
    }
  }

  const drafts = buildDraftsFromMainMarkdown(md)
  const added_titles: string[] = []
  const skipped_titles: string[] = []

  if (mode === 'full_replace') {
    const arr = projectRows(projectId)
    arr.splice(0, arr.length)
    drafts.forEach((d, i) => {
      pushModule(projectId, d, i)
      added_titles.push(d.title)
    })
  } else {
    const mods = projectRows(projectId)
    const existingTitles = new Set(mods.map((m) => normalizeModuleTitle(m.title)))
    let nextOrder = mods.length ? Math.max(...mods.map((m) => m.sort_order), -1) + 1 : 0
    for (const d of drafts) {
      const nt = normalizeModuleTitle(d.title)
      if (!nt || existingTitles.has(nt)) {
        if (nt) skipped_titles.push(d.title)
        continue
      }
      pushModule(projectId, d, nextOrder++)
      existingTitles.add(nt)
      added_titles.push(d.title)
    }
  }

  return {
    ok: true as const,
    data: {
      items: listRequirementDocModules(projectId).items,
      mode,
      added_titles,
      skipped_titles,
    },
  }
}

export function createRequirementDocModule(projectId: string, title: string, summary: string) {
  const t = title.trim() || '未命名模块'
  const nt = normalizeModuleTitle(t)
  const mods = projectRows(projectId)
  if (mods.some((m) => normalizeModuleTitle(m.title) === nt)) {
    return { ok: false as const, message: '已存在同名模块（名称忽略大小写与多空格）' }
  }
  const now = new Date().toISOString()
  const sort_order = mods.length ? Math.max(...mods.map((m) => m.sort_order), -1) + 1 : 0
  const ver: VersionRow = {
    id: nextVerId(),
    version_no: 1,
    markdown: EMPTY_REQUIREMENT_DOC_TEMPLATE,
    created_at: now,
  }
  const row: ModRow = {
    id: nextModId(),
    title: t,
    summary: summary.trim(),
    sort_order,
    created_at: now,
    updated_at: now,
    versions: [ver],
  }
  mods.push(row)
  return { ok: true as const, summary: toSummary(row) }
}

export function patchRequirementDocModule(
  projectId: string,
  moduleId: string,
  patch: { title?: string; summary?: string },
) {
  const mods = projectRows(projectId)
  const m = mods.find((x) => x.id === moduleId)
  if (!m) return { ok: false as const, message: '模块不存在' }
  if (typeof patch.title === 'string') {
    const newT = patch.title.trim() || m.title
    const nt = normalizeModuleTitle(newT)
    if (mods.some((x) => x.id !== moduleId && normalizeModuleTitle(x.title) === nt)) {
      return { ok: false as const, message: '已存在同名模块（名称忽略大小写与多空格）' }
    }
    m.title = newT
  }
  if (typeof patch.summary === 'string') m.summary = patch.summary.trim()
  m.updated_at = new Date().toISOString()
  return { ok: true as const, summary: toSummary(m) }
}

export function deleteRequirementDocModule(projectId: string, moduleId: string) {
  const mods = projectRows(projectId)
  const idx = mods.findIndex((x) => x.id === moduleId)
  if (idx < 0) return { ok: false as const, message: '模块不存在' }
  mods.splice(idx, 1)
  return { ok: true as const }
}

export function reorderRequirementDocModules(projectId: string, ordered_module_ids: string[]) {
  const mods = sortedModules(projectRows(projectId))
  const ids = new Set(mods.map((m) => m.id))
  if (ordered_module_ids.length !== ids.size || ordered_module_ids.some((id) => !ids.has(id))) {
    return { ok: false as const, message: 'ordered_module_ids 须包含且仅包含当前全部模块 id' }
  }
  const map = new Map(mods.map((m) => [m.id, m] as const))
  ordered_module_ids.forEach((id, i) => {
    const row = map.get(id)
    if (row) {
      row.sort_order = i
      row.updated_at = new Date().toISOString()
    }
  })
  return { ok: true as const, list: listRequirementDocModules(projectId) }
}

function findModule(projectId: string, moduleId: string): ModRow | null {
  return projectRows(projectId).find((m) => m.id === moduleId) ?? null
}

function latestVersion(m: ModRow): VersionRow | null {
  const vers = [...m.versions].sort((a, b) => a.version_no - b.version_no)
  return vers.length ? vers[vers.length - 1]! : null
}

export function listRequirementDocModuleVersions(projectId: string, moduleId: string) {
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

export function getRequirementDocModuleVersion(projectId: string, moduleId: string, versionId: string) {
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

export function createRequirementDocModuleVersion(
  projectId: string,
  moduleId: string,
  mode: 'empty' | 'from_latest',
) {
  const m = findModule(projectId, moduleId)
  if (!m) return { ok: false as const, message: '模块不存在' }
  const latest = latestVersion(m)
  let markdown = EMPTY_REQUIREMENT_DOC_TEMPLATE
  if (mode === 'from_latest' && latest) {
    markdown = latest.markdown
  }
  const nextNo = m.versions.length ? Math.max(...m.versions.map((x) => x.version_no)) + 1 : 1
  const now = new Date().toISOString()
  const row: VersionRow = {
    id: nextVerId(),
    version_no: nextNo,
    markdown,
    created_at: now,
  }
  m.versions.push(row)
  m.updated_at = now
  return {
    ok: true as const,
    data: {
      id: row.id,
      version_no: row.version_no,
      markdown: row.markdown,
      is_latest: true,
      created_at: row.created_at,
    },
  }
}

export function appendRequirementDocModuleVersion(
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
  const row: VersionRow = {
    id: nextVerId(),
    version_no: nextNo,
    markdown,
    created_at: now,
  }
  m.versions.push(row)
  m.updated_at = now
  return {
    ok: true as const,
    data: {
      id: row.id,
      version_no: row.version_no,
      markdown: row.markdown,
      is_latest: true,
      created_at: row.created_at,
    },
  }
}

export function patchRequirementDocModuleVersion(
  projectId: string,
  moduleId: string,
  versionId: string,
  markdown: string,
) {
  const m = findModule(projectId, moduleId)
  if (!m) return { ok: false as const, message: '模块不存在' }
  const latest = latestVersion(m)
  if (!latest || latest.id !== versionId) {
    return { ok: false as const, message: '仅允许覆盖当前最新版本' }
  }
  latest.markdown = markdown
  latest.created_at = new Date().toISOString()
  m.updated_at = latest.created_at
  return {
    ok: true as const,
    data: {
      id: latest.id,
      version_no: latest.version_no,
      markdown: latest.markdown,
      is_latest: true,
      created_at: latest.created_at,
    },
  }
}

export function deleteRequirementDocModuleVersion(projectId: string, moduleId: string, versionId: string) {
  const m = findModule(projectId, moduleId)
  if (!m) return { ok: false as const, message: '模块不存在' }
  const idx = m.versions.findIndex((x) => x.id === versionId)
  if (idx < 0) return { ok: false as const, message: '版本不存在' }
  m.versions.splice(idx, 1)
  m.updated_at = new Date().toISOString()
  const r = listRequirementDocModuleVersions(projectId, moduleId)
  if (!r.ok) return r
  return { ok: true as const, data: r.data }
}
