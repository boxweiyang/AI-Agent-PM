/**
 * REQ-M08 Dashboard 的 MSW 聚合数据；与 `contracts/openapi/openapi.yaml` 中 `ProjectDashboardData` 对齐。
 */
import {
  buildForecastCard,
  buildMilestoneCard,
  enrichDashboardCards,
  type ChartStats,
} from '@/features/workspace/dashboardChartOptions'
import type {
  DashboardCard,
  DashboardRiskItem,
  ProjectDashboardData,
} from '@/types/api-contract'

/** handlers 传入的项目行子集，避免与 MockProjectRow 循环依赖 */
export type DashboardProjectRow = {
  id: string
  name: string
  iteration_number?: number
  story_count?: number
  task_open_count?: number
  task_total_count?: number
  bug_open_count?: number
  progress_percent?: number
  artifacts?: Record<string, boolean>
}

type ScopeStats = ChartStats

const ALPHA_SCOPES: Record<string, ScopeStats> = {
  all: {
    storiesTotal: 14,
    storiesDone: 9,
    taskTodo: 9,
    taskDoing: 5,
    taskReview: 3,
    taskDone: 28,
    taskUnassigned: 2,
    blocked: 3,
    poolSize: 12,
    booked: 6,
    assignedFromBooked: 5,
    crOpen: 5,
    crPendingReview: 2,
    bugsOpen: 3,
    bugsCritHigh: 1,
    testsInProgress: 2,
    apiConfirmed: 24,
    apiTotal: 30,
  },
  'iter-a1-s3': {
    storiesTotal: 8,
    storiesDone: 5,
    taskTodo: 4,
    taskDoing: 6,
    taskReview: 2,
    taskDone: 14,
    taskUnassigned: 1,
    blocked: 2,
    poolSize: 12,
    booked: 5,
    assignedFromBooked: 4,
    crOpen: 3,
    crPendingReview: 1,
    bugsOpen: 3,
    bugsCritHigh: 1,
    testsInProgress: 2,
    apiConfirmed: 24,
    apiTotal: 30,
  },
  'iter-a1-s2': {
    storiesTotal: 5,
    storiesDone: 4,
    taskTodo: 1,
    taskDoing: 2,
    taskReview: 1,
    taskDone: 11,
    taskUnassigned: 0,
    blocked: 1,
    poolSize: 12,
    booked: 4,
    assignedFromBooked: 3,
    crOpen: 2,
    crPendingReview: 0,
    bugsOpen: 0,
    bugsCritHigh: 0,
    testsInProgress: 0,
    apiConfirmed: 18,
    apiTotal: 22,
  },
  'iter-a1-s1': {
    storiesTotal: 4,
    storiesDone: 4,
    taskTodo: 0,
    taskDoing: 0,
    taskReview: 0,
    taskDone: 9,
    taskUnassigned: 0,
    blocked: 0,
    poolSize: 8,
    booked: 3,
    assignedFromBooked: 3,
    crOpen: 0,
    crPendingReview: 0,
    bugsOpen: 0,
    bugsCritHigh: 0,
    testsInProgress: 0,
    apiConfirmed: 10,
    apiTotal: 12,
  },
}

const ALPHA_ITERATIONS = [
  { id: 'iter-a1-s1', name: 'Sprint 1', is_current: false },
  { id: 'iter-a1-s2', name: 'Sprint 2', is_current: false },
  { id: 'iter-a1-s3', name: 'Sprint 3（进行中）', is_current: true },
]

function scopeLabel(effectiveKey: string, iterationKey: string): string {
  if (effectiveKey === 'all') return '全部迭代 · 项目维度'
  const it = ALPHA_ITERATIONS.find((i) => i.id === effectiveKey)
  if (it) return `当前统计范围：${it.name}`
  return iterationKey === 'current' ? '当前迭代' : `迭代 ${effectiveKey}`
}

function cardsFromStats(
  s: ScopeStats,
  hasApiModule: boolean,
): DashboardCard[] {
  const cards: DashboardCard[] = [
    {
      kind: 'iteration_progress',
      title: '迭代进度',
      metrics: [
        { label: 'Story 总数', value: String(s.storiesTotal) },
        { label: '已完成 Story', value: String(s.storiesDone) },
      ],
      drill: { route_name: 'project-m03-iterations', query: { view: 'stories' } },
    },
    {
      kind: 'task_execution',
      title: 'Task 执行',
      metrics: [
        { label: '待办', value: String(s.taskTodo) },
        { label: '进行中', value: String(s.taskDoing) },
        { label: '待测试', value: String(s.taskReview) },
        { label: '已完成', value: String(s.taskDone) },
        { label: '未分配负责人', value: String(s.taskUnassigned) },
      ],
      drill: { route_name: 'project-m04-tasks', query: { tab: 'board' } },
    },
    {
      kind: 'blocked',
      title: '阻塞',
      metrics: [{ label: '阻塞 Task', value: String(s.blocked) }],
      drill: { route_name: 'project-m04-tasks', query: { filter: 'blocked' } },
    },
    {
      kind: 'manpower',
      title: '人力负荷',
      metrics: [
        { label: '人力池人数', value: String(s.poolSize) },
        { label: '本迭代已领 Task / 有预订成员', value: `${s.assignedFromBooked} / ${s.booked}` },
      ],
      drill: { route_name: 'project-m05-resources', query: {} },
    },
    {
      kind: 'change_request',
      title: '变更 CR',
      metrics: [
        { label: '未关闭 CR', value: String(s.crOpen) },
        { label: '待评审', value: String(s.crPendingReview) },
      ],
      drill: { route_name: 'project-m06-changes', query: { status: 'open' } },
    },
    {
      kind: 'quality',
      title: '质量',
      metrics: [
        { label: '打开缺陷', value: String(s.bugsOpen) },
        { label: '致命+高', value: String(s.bugsCritHigh) },
        { label: '进行中提测', value: String(s.testsInProgress) },
      ],
      drill: { route_name: 'project-m07-quality', query: { tab: 'bugs' } },
    },
  ]

  if (hasApiModule) {
    cards.push({
      kind: 'api_catalog',
      title: '接口（M02C）',
      metrics: [
        { label: '已确认 / 总数', value: `${s.apiConfirmed} / ${s.apiTotal}` },
      ],
      drill: { route_name: 'project-m02c-apis', query: {} },
    })
  }

  return cards
}

function alphaRisks(effectiveKey: string): DashboardRiskItem[] {
  if (effectiveKey === 'iter-a1-s1') return []
  const base: DashboardRiskItem[] = [
    {
      id: 'risk-bug-1',
      kind: 'bug_high',
      title: '缺陷 #128 · 登录偶发 500',
      subtitle: '致命 · 未关闭 · 关联 Sprint 3',
      severity_rank: 100,
    },
    {
      id: 'risk-task-1',
      kind: 'task_blocked',
      title: 'Task 「对账文件导入」阻塞',
      subtitle: '依赖第三方接口未就绪',
      severity_rank: 80,
    },
    {
      id: 'risk-cr-1',
      kind: 'cr_pending',
      title: 'CR-2026-009 待评审',
      subtitle: '已排队 16 天',
      severity_rank: 55,
    },
    {
      id: 'risk-test-1',
      kind: 'test_rejected',
      title: '提测 #44 已驳回',
      subtitle: '关联 Task 仍开放',
      severity_rank: 40,
    },
  ]
  if (effectiveKey === 'all') {
    base.push({
      id: 'risk-cr-2',
      kind: 'cr_pending',
      title: 'CR-2026-002 已采纳未关闭',
      subtitle: '超过 14 天',
      severity_rank: 50,
    })
  }
  return base.sort((a, b) => (b.severity_rank ?? 0) - (a.severity_rank ?? 0))
}

function fallbackStats(row: DashboardProjectRow): ScopeStats {
  const stories = row.story_count ?? 0
  const done = Math.min(stories, Math.floor(stories * 0.6))
  const open = row.task_open_count ?? 0
  const total = row.task_total_count ?? open
  const bugs = row.bug_open_count ?? 0
  return {
    storiesTotal: stories,
    storiesDone: done,
    taskTodo: Math.max(0, Math.floor(open * 0.45)),
    taskDoing: Math.max(0, Math.floor(open * 0.35)),
    taskReview: Math.max(0, Math.floor(open * 0.15)),
    taskDone: Math.max(0, total - open),
    taskUnassigned: open > 0 ? 1 : 0,
    blocked: open > 3 ? 1 : 0,
    poolSize: 6,
    booked: 3,
    assignedFromBooked: 2,
    crOpen: 1,
    crPendingReview: 0,
    bugsOpen: bugs,
    bugsCritHigh: bugs > 0 ? 1 : 0,
    testsInProgress: 0,
    apiConfirmed: 0,
    apiTotal: 0,
  }
}

function syntheticIterations(row: DashboardProjectRow) {
  const n = row.iteration_number ?? 1
  const id = `iter-${row.id}-current`
  return [{ id, name: `第 ${n} 次迭代`, is_current: true }]
}

function hashSeed(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function assembleCards(
  stats: ScopeStats,
  hasApiModule: boolean,
  seedStr: string,
  row?: DashboardProjectRow,
): DashboardCard[] {
  let base = cardsFromStats(stats, hasApiModule)
  base = enrichDashboardCards(base, stats, seedStr)
  const progressPct =
    row?.progress_percent ??
    Math.min(100, Math.round((stats.storiesDone / Math.max(stats.storiesTotal, 1)) * 100))
  const h = hashSeed(seedStr)
  return [...base, buildForecastCard(stats, h, progressPct), buildMilestoneCard(stats, h)]
}

export function buildProjectDashboard(
  iterationKey: string,
  row: DashboardProjectRow | undefined,
): ProjectDashboardData {
  const keyRaw = iterationKey.trim() || 'current'
  const hasApiModule = row?.artifacts?.api_catalog === true

  if (row?.id === 'proj-demo-1') {
    const currentId = ALPHA_ITERATIONS.find((i) => i.is_current)?.id ?? 'iter-a1-s3'
    let effective = keyRaw
    if (keyRaw === 'current') effective = currentId
    const stats =
      effective === 'all' ? ALPHA_SCOPES.all : ALPHA_SCOPES[effective] ?? ALPHA_SCOPES[currentId]
    const seedStr = `${row.id}-${keyRaw}-${effective}`
    return {
      scope_label: scopeLabel(effective, keyRaw),
      iteration_key: keyRaw,
      iteration_options: ALPHA_ITERATIONS,
      cards: assembleCards(stats, hasApiModule, seedStr, row),
      risk_items: alphaRisks(effective),
    }
  }

  const iterations = row ? syntheticIterations(row) : []
  const currentId = iterations[0]?.id ?? 'iter-unknown'
  let effective = keyRaw
  if (keyRaw === 'current') effective = currentId
  const stats =
    effective === 'all' || !row
      ? fallbackStats(row ?? { id: '', name: '' })
      : fallbackStats(row)

  const seedStr = `${row?.id ?? 'na'}-${keyRaw}-${effective}`
  return {
    scope_label:
      effective === 'all'
        ? '全部迭代 · 项目维度'
        : `当前统计范围：${iterations.find((i) => i.id === effective)?.name ?? '当前迭代'}`,
    iteration_key: keyRaw,
    iteration_options: iterations,
    cards: assembleCards(stats, hasApiModule, seedStr, row),
    risk_items: row && effective !== 'all' && stats.blocked > 0
      ? [
          {
            id: `risk-${row.id}-b`,
            kind: 'task_blocked',
            title: '存在阻塞 Task（演示）',
            subtitle: '请在 Task 看板查看详情',
            severity_rank: 70,
          },
        ]
      : [],
  }
}
