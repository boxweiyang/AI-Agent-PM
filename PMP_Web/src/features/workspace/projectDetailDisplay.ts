/**
 * 项目详情页：REQ-M01 字段展示文案与空态（与契约 `ProjectSummary` 扩展字段对齐）。
 */
import type { ProjectSummary } from '@/types/api-contract'

export const DETAIL_EMPTY = '未填写'

export function detailText(v: string | null | undefined): string {
  const t = v?.trim()
  return t ? t : DETAIL_EMPTY
}

export function detailIsoDate(v: string | null | undefined): string {
  if (!v?.trim()) return DETAIL_EMPTY
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v.trim()
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

/** 简介：优先 `introduction`，否则回退列表用 `description` */
export function detailIntroduction(p: ProjectSummary): string {
  const i = p.introduction?.trim()
  if (i) return i
  const d = p.description?.trim()
  return d || DETAIL_EMPTY
}

export function detailYesNo(v: boolean | null | undefined): string {
  if (v === true) return '是'
  if (v === false) return '否'
  return DETAIL_EMPTY
}

export function detailIterationLine(p: ProjectSummary): string {
  const n = p.iteration_number
  if (n == null || n < 1) return DETAIL_EMPTY
  return `第 ${n} 次迭代`
}

export function detailNum(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return DETAIL_EMPTY
  return String(v)
}
