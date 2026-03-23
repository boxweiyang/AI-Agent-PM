/**
 * Dashboard 卡片内 ECharts option 生成（Mock）；与 MSW `buildProjectDashboard` 传入的 stats 对齐。
 */
import type { DashboardCard, DashboardChartSpec } from '@/types/api-contract'

/** 与 `buildProjectDashboard.ts` 中 ScopeStats 字段一致 */
export type ChartStats = {
  storiesTotal: number
  storiesDone: number
  taskTodo: number
  taskDoing: number
  taskReview: number
  taskDone: number
  taskUnassigned: number
  blocked: number
  poolSize: number
  booked: number
  assignedFromBooked: number
  crOpen: number
  crPendingReview: number
  bugsOpen: number
  bugsCritHigh: number
  testsInProgress: number
  apiConfirmed: number
  apiTotal: number
}

function dateLabels(days: number): string[] {
  const out: string[] = []
  const d = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const x = new Date(d)
    x.setDate(x.getDate() - i)
    out.push(
      `${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`,
    )
  }
  return out
}

function jitter(seed: number, i: number, max: number): number {
  const v = Math.sin(seed * 0.01 + i * 1.7) * 0.5 + 0.5
  return Math.max(0, Math.min(max, Math.round(v * max)))
}

export function buildChartsForCardKind(kind: string, s: ChartStats, seed: number): DashboardChartSpec[] {
  const labels = dateLabels(14)
  const n = labels.length

  switch (kind) {
    case 'iteration_progress': {
      const target = Math.max(s.storiesDone, 1)
      const cum: number[] = []
      let acc = 0
      for (let i = 0; i < n; i++) {
        acc += jitter(seed, i, Math.ceil(target / n) + 1)
        cum.push(Math.min(s.storiesTotal, acc))
      }
      cum[n - 1] = s.storiesDone
      for (let i = 1; i < n; i++) {
        if (cum[i] < cum[i - 1]) cum[i] = cum[i - 1]
      }
      const daily = cum.map((v, i) => (i === 0 ? v : Math.max(0, v - cum[i - 1])))
      return [
        {
          id: 'story-cum',
          title: 'Story 累计完成（按天）',
          option: {
            tooltip: { trigger: 'axis' },
            legend: { data: ['累计完成', '当日完成'], bottom: 0, textStyle: { fontSize: 10 } },
            grid: { left: 36, right: 12, top: 28, bottom: 52 },
            xAxis: { type: 'category', data: labels, axisLabel: { fontSize: 9 } },
            yAxis: { type: 'value', minInterval: 1 },
            series: [
              { name: '累计完成', type: 'line', smooth: true, data: cum, showSymbol: false },
              { name: '当日完成', type: 'bar', data: daily, itemStyle: { opacity: 0.55 } },
            ],
          },
        },
        {
          id: 'story-velocity',
          title: 'Story 完成节奏（效率）',
          option: {
            tooltip: { trigger: 'axis' },
            grid: { left: 36, right: 12, top: 24, bottom: 28 },
            xAxis: { type: 'category', data: labels, axisLabel: { fontSize: 9 } },
            yAxis: { type: 'value', name: '件/天', nameTextStyle: { fontSize: 10 } },
            series: [
              {
                name: '完成',
                type: 'line',
                smooth: true,
                areaStyle: { opacity: 0.12 },
                data: daily,
              },
            ],
          },
        },
      ]
    }
    case 'task_execution': {
      const doneDaily = labels.map((_, i) => jitter(seed + 3, i, 4) + 1)
      const wip = labels.map((_, i) =>
        Math.max(2, s.taskTodo + s.taskDoing + s.taskReview + jitter(seed + 1, i, 4) - Math.floor(i / 3)),
      )
      return [
        {
          id: 'task-done',
          title: 'Task 每日完成',
          option: {
            tooltip: { trigger: 'axis' },
            grid: { left: 36, right: 12, top: 24, bottom: 28 },
            xAxis: { type: 'category', data: labels, axisLabel: { fontSize: 9 } },
            yAxis: { type: 'value', minInterval: 1 },
            series: [{ type: 'bar', data: doneDaily, itemStyle: { color: '#5470c6' } }],
          },
        },
        {
          id: 'task-wip',
          title: '在制存量（待办+进行中+待测）',
          option: {
            tooltip: { trigger: 'axis' },
            grid: { left: 36, right: 12, top: 24, bottom: 28 },
            xAxis: { type: 'category', data: labels, axisLabel: { fontSize: 9 } },
            yAxis: { type: 'value', minInterval: 1 },
            series: [{ type: 'line', smooth: true, data: wip, showSymbol: false }],
          },
        },
      ]
    }
    case 'blocked': {
      const blockedDaily = labels.map((_, i) =>
        i > n - 5 ? Math.max(0, s.blocked - 1 + jitter(seed, i, 2)) : jitter(seed + 9, i, Math.max(1, s.blocked)),
      )
      return [
        {
          id: 'blocked-bar',
          title: '阻塞 Task 按天',
          option: {
            tooltip: { trigger: 'axis' },
            grid: { left: 36, right: 12, top: 24, bottom: 28 },
            xAxis: { type: 'category', data: labels, axisLabel: { fontSize: 9 } },
            yAxis: { type: 'value', minInterval: 1 },
            series: [{ type: 'bar', data: blockedDaily, itemStyle: { color: '#ee6666' } }],
          },
        },
        {
          id: 'blocked-line',
          title: '阻塞趋势',
          option: {
            tooltip: { trigger: 'axis' },
            grid: { left: 36, right: 12, top: 24, bottom: 28 },
            xAxis: { type: 'category', data: labels, axisLabel: { fontSize: 9 } },
            yAxis: { type: 'value' },
            series: [{ type: 'line', smooth: true, data: blockedDaily, showSymbol: false }],
          },
        },
      ]
    }
    case 'manpower': {
      return [
        {
          id: 'manpower-bar',
          title: '人力与认领对比',
          option: {
            tooltip: { trigger: 'axis' },
            grid: { left: 80, right: 12, top: 24, bottom: 28 },
            xAxis: { type: 'value' },
            yAxis: {
              type: 'category',
              data: ['已领任务', '有预订', '池内人数'],
              axisLabel: { fontSize: 11 },
            },
            series: [
              {
                type: 'bar',
                data: [s.assignedFromBooked, s.booked, s.poolSize],
                itemStyle: { color: '#91cc75' },
              },
            ],
          },
        },
        {
          id: 'manpower-load',
          title: '负荷结构（示意）',
          option: {
            tooltip: { trigger: 'item' },
            series: [
              {
                type: 'pie',
                radius: ['42%', '68%'],
                label: { fontSize: 10 },
                data: [
                  { name: '已认领', value: Math.max(1, s.assignedFromBooked) },
                  { name: '预订未领', value: Math.max(1, s.booked - s.assignedFromBooked) },
                  { name: '池内余量', value: Math.max(1, s.poolSize - s.booked) },
                ],
              },
            ],
          },
        },
      ]
    }
    case 'change_request': {
      const w = labels.slice(-7)
      const openSer = w.map((_, i) => Math.max(0, s.crOpen - 1 + jitter(seed + 11, i, 2)))
      const revSer = w.map((_, i) => jitter(seed + 12, i, s.crPendingReview + 1))
      return [
        {
          id: 'cr-group',
          title: 'CR 未关闭 vs 待评审（近7日）',
          option: {
            tooltip: { trigger: 'axis' },
            legend: { bottom: 0, textStyle: { fontSize: 10 } },
            grid: { left: 36, right: 12, top: 24, bottom: 48 },
            xAxis: { type: 'category', data: w, axisLabel: { fontSize: 9 } },
            yAxis: { type: 'value', minInterval: 1 },
            series: [
              { name: '未关闭', type: 'bar', data: openSer },
              { name: '待评审', type: 'bar', data: revSer },
            ],
          },
        },
        {
          id: 'cr-line',
          title: '未关闭 CR 走势',
          option: {
            tooltip: { trigger: 'axis' },
            grid: { left: 36, right: 12, top: 24, bottom: 28 },
            xAxis: { type: 'category', data: labels, axisLabel: { fontSize: 9 } },
            yAxis: { type: 'value' },
            series: [
              {
                type: 'line',
                data: labels.map((_, i) => s.crOpen + jitter(seed, i, 2) - 1),
                smooth: true,
                showSymbol: false,
              },
            ],
          },
        },
      ]
    }
    case 'quality': {
      const bugs = labels.map((_, i) => Math.max(0, s.bugsOpen + jitter(seed + 4, i, 2) - 1))
      return [
        {
          id: 'bugs-line',
          title: '打开缺陷（按天）',
          option: {
            tooltip: { trigger: 'axis' },
            grid: { left: 36, right: 12, top: 24, bottom: 28 },
            xAxis: { type: 'category', data: labels, axisLabel: { fontSize: 9 } },
            yAxis: { type: 'value', minInterval: 1 },
            series: [{ type: 'line', smooth: true, areaStyle: { opacity: 0.08 }, data: bugs }],
          },
        },
        {
          id: 'test-bar',
          title: '提测活动（示意）',
          option: {
            tooltip: { trigger: 'axis' },
            grid: { left: 36, right: 12, top: 24, bottom: 28 },
            xAxis: { type: 'category', data: labels.slice(-7), axisLabel: { fontSize: 9 } },
            yAxis: { type: 'value', minInterval: 1 },
            series: [
              {
                type: 'bar',
                data: labels.slice(-7).map((_, i) => (i % 3 === 0 ? s.testsInProgress : jitter(seed + 5, i, 2))),
              },
            ],
          },
        },
      ]
    }
    case 'api_catalog': {
      const total = Math.max(s.apiTotal, 1)
      const rate = labels.map((_, i) => {
        const base = (s.apiConfirmed / total) * 100
        return Math.min(100, Math.max(0, base - 15 + (i / n) * 20 + jitter(seed + 7, i, 5)))
      })
      const rest = Math.max(0, s.apiTotal - s.apiConfirmed)
      return [
        {
          id: 'api-rate',
          title: '接口确认率趋势 %',
          option: {
            tooltip: { trigger: 'axis', valueFormatter: (v: number) => `${Number(v).toFixed(0)}%` },
            grid: { left: 40, right: 12, top: 24, bottom: 28 },
            xAxis: { type: 'category', data: labels, axisLabel: { fontSize: 9 } },
            yAxis: { type: 'value', max: 100 },
            series: [{ type: 'line', smooth: true, data: rate, showSymbol: false }],
          },
        },
        {
          id: 'api-count',
          title: '已确认 vs 未确认',
          option: {
            tooltip: { trigger: 'axis' },
            legend: { bottom: 0, textStyle: { fontSize: 10 } },
            grid: { left: 36, right: 12, top: 24, bottom: 44 },
            xAxis: { type: 'category', data: ['接口'] },
            yAxis: { type: 'value' },
            series: [
              { name: '已确认', type: 'bar', stack: 'x', data: [s.apiConfirmed] },
              { name: '未确认', type: 'bar', stack: 'x', data: [rest] },
            ],
          },
        },
      ]
    }
    default:
      return []
  }
}

function addDaysISO(base: Date, days: number): string {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export function buildForecastCharts(s: ChartStats, progressPercent: number, seed: number): DashboardChartSpec[] {
  const labels = dateLabels(14)
  const n = labels.length
  const pct = Math.min(100, Math.max(0, progressPercent))
  const hist: number[] = []
  let p = Math.max(5, pct - 10)
  for (let i = 0; i < n; i++) {
    p = Math.min(pct + 2, p + jitter(seed + 20, i, 4))
    hist.push(Math.min(100, p))
  }
  hist[n - 1] = pct
  const extLabels = [...labels, '预测+7', '预测+14', '预测+21']
  const slope = (hist[n - 1] - hist[Math.max(0, n - 5)]) / 5 || 1.2
  const f1 = Math.min(100, hist[n - 1] + slope * 2)
  const f2 = Math.min(100, hist[n - 1] + slope * 4 + jitter(seed, 3, 3))
  const f3 = Math.min(100, hist[n - 1] + slope * 6)
  const histFull: (number | null)[] = [...hist, null, null, null]
  const fore: (number | null)[] = extLabels.map(() => null)
  fore[n - 1] = hist[n - 1]
  fore[n] = f1
  fore[n + 1] = f2
  fore[n + 2] = f3
  return [
    {
      id: 'forecast-progress',
      title: '综合完成度 & 预测延伸（Mock）',
      option: {
        tooltip: {
          trigger: 'axis',
          valueFormatter: (v: unknown) => (v == null ? '' : `${Number(v).toFixed(0)}%`),
        },
        legend: { data: ['实际累计', '预测'], bottom: 0, textStyle: { fontSize: 10 } },
        grid: { left: 42, right: 12, top: 28, bottom: 48 },
        xAxis: { type: 'category', data: extLabels, axisLabel: { fontSize: 9, rotate: 28 } },
        yAxis: { type: 'value', max: 100 },
        series: [
          {
            name: '实际累计',
            type: 'line',
            data: histFull,
            smooth: true,
            showSymbol: false,
          },
          {
            name: '预测',
            type: 'line',
            lineStyle: { type: 'dashed' },
            data: fore,
            smooth: true,
            connectNulls: true,
          },
        ],
      },
    },
    {
      id: 'forecast-velocity',
      title: '周吞吐（Story 完成，示意）',
      option: {
        tooltip: { trigger: 'axis' },
        grid: { left: 36, right: 12, top: 24, bottom: 28 },
        xAxis: { type: 'category', data: ['W-3', 'W-2', 'W-1', '本周'] },
        yAxis: { type: 'value', minInterval: 1 },
        series: [
          {
            type: 'bar',
            data: [
              jitter(seed, 1, 3) + 1,
              jitter(seed, 2, 4) + 1,
              jitter(seed, 3, 3) + 2,
              Math.max(1, Math.round(s.storiesDone / 3)),
            ],
          },
          {
            type: 'line',
            smooth: true,
            data: [2, 3, 2.5, Math.max(1, s.storiesDone / 4)],
          },
        ],
      },
    },
  ]
}

export function buildMilestoneCharts(seed: number): DashboardChartSpec[] {
  const ms = ['MS1', 'MS2', 'MS3', 'MS4', 'MS5']
  const planDays = [3, 7, 10, 14, 18]
  const actualDays = planDays.map((p, i) => p + jitter(seed + 30, i, 4) - 2)
  const scatter = planDays.map((p, i) => [p, actualDays[i]])
  const planDur = [3, 4, 3, 4, 4]
  const actDur = planDur.map((d, i) => d + jitter(seed + 40, i, 3) - 1)
  return [
    {
      id: 'ms-scatter',
      title: '计划完成日 vs 实际完成日（序日）',
      option: {
        tooltip: { trigger: 'item' },
        grid: { left: 44, right: 12, top: 24, bottom: 36 },
        xAxis: { type: 'value', name: '计划', nameTextStyle: { fontSize: 10 }, min: 0 },
        yAxis: { type: 'value', name: '实际', nameTextStyle: { fontSize: 10 }, min: 0 },
        series: [
          {
            type: 'scatter',
            symbolSize: 14,
            data: scatter,
            itemStyle: { color: '#5470c6' },
          },
          {
            name: 'y=x 参考',
            type: 'line',
            data: [
              [0, 0],
              [22, 22],
            ],
            lineStyle: { type: 'dashed', width: 1, color: '#999' },
            showSymbol: false,
            tooltip: { show: false },
          },
        ],
      },
    },
    {
      id: 'ms-bar-line',
      title: '计划工期 vs 实际工期',
      option: {
        tooltip: { trigger: 'axis' },
        legend: { bottom: 0, textStyle: { fontSize: 10 } },
        grid: { left: 36, right: 12, top: 24, bottom: 48 },
        xAxis: { type: 'category', data: ms, axisLabel: { fontSize: 10 } },
        yAxis: { type: 'value', name: '天', nameTextStyle: { fontSize: 10 } },
        series: [
          { name: '计划', type: 'bar', data: planDur },
          { name: '实际', type: 'bar', data: actDur },
          {
            name: '偏差',
            type: 'line',
            yAxisIndex: 0,
            smooth: true,
            data: actDur.map((a, i) => a - planDur[i]),
          },
        ],
      },
    },
  ]
}

export function buildForecastCard(
  s: ChartStats,
  seed: number,
  progressPercent: number,
): DashboardCard {
  const optimistic = addDaysISO(new Date(), 14 + jitter(seed, 0, 5))
  const median = addDaysISO(new Date(), 21 + jitter(seed, 1, 4))
  const pessimistic = addDaysISO(new Date(), 32 + jitter(seed, 2, 6))
  return {
    kind: 'completion_forecast',
    title: '完成时间预测',
    metrics: [
      { label: '中位预测完成', value: median },
      { label: '乐观 / 悲观', value: `${optimistic} / ${pessimistic}` },
      { label: '口径', value: '近14日速率外推（Mock，非生产）' },
    ],
    drill: { route_name: 'project-detail', query: {} },
    charts: buildForecastCharts(s, progressPercent, seed),
  }
}

export function buildMilestoneCard(_stats: ChartStats, seed: number): DashboardCard {
  const late = actDurCount(seed)
  return {
    kind: 'milestones_plan_actual',
    title: '计划与里程碑',
    metrics: [
      { label: '里程碑数', value: '5' },
      { label: '延期（示意）', value: String(late) },
      { label: '按期（示意）', value: String(5 - late) },
    ],
    drill: { route_name: 'project-m03-iterations', query: {} },
    charts: buildMilestoneCharts(seed),
  }
}

function actDurCount(seed: number): number {
  const planDur = [3, 4, 3, 4, 4]
  const actDur = planDur.map((d, i) => d + jitter(seed + 40, i, 3) - 1)
  return actDur.filter((a, i) => a > planDur[i]).length
}

export function enrichDashboardCards(
  cards: DashboardCard[],
  stats: ChartStats,
  seedStr: string,
): DashboardCard[] {
  let seed = 0
  for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) | 0
  seed = Math.abs(seed)

  return cards.map((c) => ({
    ...c,
    charts: c.charts?.length ? c.charts : buildChartsForCardKind(c.kind, stats, seed),
  }))
}
