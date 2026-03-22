/**
 * 工作台项目卡片：状态分组顺序、标签颜色、日期与剩余天数文案。
 * 与 REQ-M01 状态枚举对齐时可只改映射表与 STATUS_ORDER。
 */
import type { ProjectSummary } from '@/types/api-contract'

/** 折叠分组标题顺序；不在表内的状态排在后面按字典序 */
export const PROJECT_STATUS_ORDER = ['进行中', '立项流程中', '暂停', '已结项'] as const

/** 新建项目可选初始状态（与分组顺序一致，默认「立项流程中」） */
export const CREATE_PROJECT_STATUS_OPTIONS = [...PROJECT_STATUS_ORDER] as string[]

/** M01 主状态流（§6）与站级列表状态合并，供详情编辑下拉 */
const M01_LIFECYCLE_STATUSES = [
  '立项中',
  '需求完善中',
  '迭代规划中',
  '执行中',
  '测试验收中',
  '收尾复盘中',
  '已归档',
] as const

export const PROJECT_EDIT_STATUS_OPTIONS = [
  ...new Set<string>([...PROJECT_STATUS_ORDER, ...M01_LIFECYCLE_STATUSES]),
]

export type ElTagType = 'success' | 'warning' | 'info' | 'danger' | 'primary'

/** 状态 → Element Plus Tag 类型（浅色/深色主题下均由 EP 变量控制对比度） */
export function statusTagType(status: string): ElTagType {
  const map: Record<string, ElTagType> = {
    进行中: 'success',
    立项流程中: 'primary',
    暂停: 'warning',
    已结项: 'info',
  }
  return map[status] ?? 'info'
}

export type StatusGroup = {
  status: string
  items: ProjectSummary[]
}

/** 按状态聚合后按 PRODUCT 顺序排序分组 */
export function groupProjectsByStatus(items: ProjectSummary[]): StatusGroup[] {
  const map = new Map<string, ProjectSummary[]>()
  for (const p of items) {
    const s = (p.status ?? '').trim() || '未分类'
    if (!map.has(s)) map.set(s, [])
    map.get(s)!.push(p)
  }
  const keys = [...map.keys()]
  const order = PROJECT_STATUS_ORDER as readonly string[]
  keys.sort((a, b) => {
    const ia = order.indexOf(a)
    const ib = order.indexOf(b)
    if (ia === -1 && ib === -1) return a.localeCompare(b, 'zh-CN')
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })
  return keys.map((status) => ({ status, items: map.get(status)! }))
}

/** 预计完成：展示用日期 + 剩余/逾期文案 */
export function plannedEndParts(iso?: string): { dateLabel: string; daysLine: string; overdue: boolean } | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const dateLabel = `${y}-${m}-${day}`

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffMs = end.getTime() - today.getTime()
  const diffDays = Math.round(diffMs / 86_400_000)

  if (diffDays < 0) {
    return { dateLabel, daysLine: `已逾期 ${Math.abs(diffDays)} 天`, overdue: true }
  }
  if (diffDays === 0) {
    return { dateLabel, daysLine: '今日截止', overdue: false }
  }
  return { dateLabel, daysLine: `剩余 ${diffDays} 天`, overdue: false }
}

export function clampProgress(p: ProjectSummary): number {
  const n = p.progress_percent
  if (n == null || Number.isNaN(n)) return 0
  return Math.min(100, Math.max(0, Math.round(n)))
}

/** Task 待办展示：open/total 或单 open */
export function taskOpenTotalSummary(p: ProjectSummary): string {
  if (p.task_total_count != null) {
    return `${p.task_open_count ?? 0}/${p.task_total_count}`
  }
  if (p.task_open_count != null) return String(p.task_open_count)
  return '—'
}
