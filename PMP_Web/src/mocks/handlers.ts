/**
 * MSW 请求处理器：与仓库根 `contracts/openapi/openapi.yaml` 对齐。
 * 新增/变更接口时：**先改契约 → 再改此处 → 再改页面**，避免 Mock 与后端分叉。
 * @see https://mswjs.io/docs/
 */
import { http, HttpResponse } from 'msw'

import { buildProjectDashboard } from '@/mocks/buildProjectDashboard'
import {
  appendRequirementDocVersion,
  createRequirementDocVersion,
  deleteRequirementDocVersion,
  getRequirementDocVersion,
  listRequirementDocVersions,
  patchRequirementDocVersion,
} from '@/mocks/requirementDocStore'
import type { RequirementDocVersionCreateOrAppendBody } from '@/types/api-contract'

type AiInvokeBody = {
  capability?: string
  payload?: Record<string, unknown> & { message?: string }
}

type LoginBody = {
  username?: string
  password?: string
  remember_7d?: boolean
}

/**
 * Mock 管理员（与契约 `UserMe` 一致）
 * - `display_name` 不再夹带「系统管理员」文案，顶栏用标签展示角色 + Mock。
 */
const MOCK_ADMIN = {
  id: 'user-admin-mock',
  username: 'admin',
  display_name: '管理员',
  is_system_admin: true,
  permission_codes: ['*'] as string[],
  is_mock_profile: true,
}

type MockProjectRow = {
  id: string
  name: string
  status: string
  description?: string
  introduction?: string
  background?: string
  planned_start_at?: string
  technical_lead_name?: string
  headcount_frontend?: number
  headcount_backend?: number
  headcount_qa?: number
  stack_frontend?: string
  stack_backend?: string
  stack_database?: string
  stack_middleware?: string
  goals?: string[]
  scope_in?: string
  scope_out?: string
  risk_notes?: string
  manpower_stack_deferred?: boolean
  updated_at?: string
  progress_percent?: number
  iteration_number?: number
  story_count?: number
  task_open_count?: number
  task_total_count?: number
  bug_open_count?: number
  planned_end_at?: string
  artifacts?: Record<string, boolean>
}

/**
 * Mock 项目列表：覆盖多种状态，便于工作台「按状态折叠 + 一行两卡片」联调。
 * 字段与 `ProjectSummary` 契约一致；运行期可被 POST 新建追加。
 */
const PROJECTS_SEED: MockProjectRow[] = [
  {
    id: 'proj-demo-1',
    name: '示例项目 Alpha',
    status: '进行中',
    description: '迭代交付中：Story/Task 与缺陷统计为演示数据。',
    introduction: '统一账号与权限中心改造，支撑多产品线接入。',
    background:
      '历史系统账号分散、审计困难，业务侧要求在一个季度内完成统一认证与细粒度权限模型，并兼容存量接口。',
    planned_start_at: '2026-01-06T00:00:00+08:00',
    planned_end_at: '2026-04-15T23:59:59+08:00',
    technical_lead_name: '张三（Mock）',
    headcount_frontend: 2,
    headcount_backend: 3,
    headcount_qa: 1,
    stack_frontend: 'Vue 3、TypeScript、Element Plus',
    stack_backend: 'Python、FastAPI',
    stack_database: 'PostgreSQL',
    stack_middleware: 'Redis、Kafka',
    goals: ['完成核心认证与租户隔离', '提供可观测的审计日志', '支撑灰度发布'],
    scope_in: '账号、角色、权限模型、审计、与现有业务系统的 SSO 对接。',
    scope_out: '不包含财务结算与客服工单系统改造。',
    risk_notes: '依赖外部 IdP 的 SLA，需预留联调窗口。',
    manpower_stack_deferred: false,
    artifacts: {
      req_doc: true,
      tech_design: true,
      api_catalog: false,
      db_schema: false,
      iteration_board: true,
      task_board: true,
      resource_plan: false,
      change_requests: false,
      test_harness: true,
      dashboard_board: false,
      closure_pack: false,
      ai_workspace: false,
    },
    updated_at: '2026-03-20T08:00:00Z',
    progress_percent: 62,
    iteration_number: 3,
    story_count: 14,
    task_open_count: 7,
    task_total_count: 22,
    bug_open_count: 3,
  },
  {
    id: 'proj-demo-2',
    name: '示例项目 Beta',
    status: '进行中',
    description: '同状态下第二张卡片，观察一行两列布局与进度条。',
    introduction: '运营活动配置平台，支持多活动并行与实时指标。',
    background: '运营团队需要自助配置活动规则，减少研发排期。',
    planned_start_at: '2025-11-01T00:00:00Z',
    planned_end_at: '2026-03-25T00:00:00Z',
    technical_lead_name: '李四（Mock）',
    headcount_frontend: 1,
    headcount_backend: 2,
    headcount_qa: 1,
    stack_frontend: 'Vue 3',
    stack_backend: 'Go',
    stack_database: 'MySQL',
    goals: ['活动模板化配置', '核心指标实时看板'],
    scope_in: '活动创建、投放渠道、指标采集。',
    scope_out: '不含大数据离线数仓建设。',
    artifacts: {
      req_doc: true,
      tech_design: false,
      iteration_board: true,
      task_board: false,
    },
    updated_at: '2026-03-19T16:20:00Z',
    progress_percent: 28,
    iteration_number: 5,
    story_count: 8,
    task_open_count: 12,
    task_total_count: 18,
    bug_open_count: 1,
  },
  {
    id: 'proj-demo-3',
    name: '立项演示 Gamma',
    status: '立项流程中',
    description: '立项与范围确认阶段，进度与任务数偏低属正常。',
    introduction: '供应链可视化试点，先覆盖华东仓配。',
    background: '业务希望先验证可视化价值，再决定是否全量推广。',
    planned_start_at: '2026-03-01T00:00:00+08:00',
    planned_end_at: '2026-05-01T00:00:00+08:00',
    manpower_stack_deferred: true,
    artifacts: {},
    updated_at: '2026-03-18T10:30:00Z',
    progress_percent: 12,
    iteration_number: 1,
    story_count: 3,
    task_open_count: 4,
    task_total_count: 5,
    bug_open_count: 0,
  },
  {
    id: 'proj-demo-4',
    name: '资源冻结 Delta',
    status: '暂停',
    description: '业务暂停示例：逾期计划用于验证红色剩余天数提示。',
    introduction: '历史交付项目，当前业务侧暂停投入。',
    background: '因上游政策调整暂缓，保留代码与文档以便复盘。',
    planned_start_at: '2025-08-01T00:00:00Z',
    technical_lead_name: '王五（Mock）',
    updated_at: '2026-02-10T09:00:00Z',
    progress_percent: 45,
    iteration_number: 2,
    story_count: 10,
    task_open_count: 6,
    task_total_count: 15,
    bug_open_count: 5,
    planned_end_at: '2026-02-28T00:00:00Z',
  },
  {
    id: 'proj-demo-5',
    name: '已结项归档 Epsilon',
    status: '已结项',
    description: '结项后只读场景占位；完成度 100%。',
    introduction: '年度合规自查工具，已归档。',
    background: '监管要求的一次性交付，已结项。',
    planned_start_at: '2025-01-01T00:00:00Z',
    planned_end_at: '2025-11-30T00:00:00Z',
    technical_lead_name: '赵六（Mock）',
    updated_at: '2025-12-01T18:00:00Z',
    progress_percent: 100,
    iteration_number: 8,
    story_count: 20,
    task_open_count: 0,
    task_total_count: 40,
    bug_open_count: 0,
  },
]

let mockProjects: MockProjectRow[] = [...PROJECTS_SEED]

function bearerOk(request: Request): boolean {
  const h = request.headers.get('authorization') ?? ''
  return h.startsWith('Bearer ')
}

export const handlers = [
  http.get('/api/v1/health', () =>
    HttpResponse.json({
      code: 0,
      message: 'ok',
      data: { status: 'up' },
    }),
  ),

  /**
   * 登录：Mock 约定用户名必须为 `admin`（与 Login 页文案一致），密码任意非空由前端校验。
   * 正式后端：校验密码哈希、签发真实 JWT、写入 Refresh 行（TECH-004）。
   */
  http.post('/api/v1/auth/login', async ({ request }) => {
    let body: LoginBody = {}
    try {
      body = (await request.json()) as LoginBody
    } catch {
      /* ignore */
    }
    if (body.username !== 'admin') {
      return HttpResponse.json(
        { code: 40101, message: '用户名或密码错误', data: null },
        { status: 200 },
      )
    }
    return HttpResponse.json({
      code: 0,
      message: 'ok',
      data: {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
        user: MOCK_ADMIN,
      },
    })
  }),

  /** Refresh：占位轮换 token；前端拦截器接入后再打通静默续期 */
  http.post('/api/v1/auth/refresh', () =>
    HttpResponse.json({
      code: 0,
      message: 'ok',
      data: {
        access_token: 'mock-access-token-refreshed',
        refresh_token: 'mock-refresh-token-new',
        expires_in: 3600,
        token_type: 'Bearer',
        user: MOCK_ADMIN,
      },
    }),
  ),

  /** 当前用户：与登录返回一致（真实实现应解析 JWT 再查库） */
  http.get('/api/v1/auth/me', ({ request }) => {
    if (!bearerOk(request)) {
      return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    }
    return HttpResponse.json({
      code: 0,
      message: 'ok',
      data: MOCK_ADMIN,
    })
  }),

  /** 项目列表：需 Bearer；管理员 Mock 返回全量示例 + 本会话内新建项 */
  http.get('/api/v1/projects', ({ request }) => {
    if (!bearerOk(request)) {
      return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    }
    return HttpResponse.json({
      code: 0,
      message: 'ok',
      data: { items: mockProjects },
    })
  }),

  /** 新建项目：追加到内存列表，供列表与详情 GET */
  http.post('/api/v1/projects', async ({ request }) => {
    if (!bearerOk(request)) {
      return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    }
    const raw = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const name = String(raw.name ?? '').trim()
    if (!name) {
      return HttpResponse.json({ code: 40001, message: '项目名称为必填', data: null })
    }
    const desc = String(raw.description ?? '').trim()
    const intro = typeof raw.introduction === 'string' ? raw.introduction.trim() : ''
    const goals =
      Array.isArray(raw.goals) && raw.goals.length
        ? raw.goals
            .filter((g): g is string => typeof g === 'string')
            .map((g) => g.trim())
            .filter(Boolean)
        : undefined
    const n = (k: string) => {
      const v = raw[k]
      if (typeof v !== 'number' || Number.isNaN(v) || v < 0) return undefined
      return Math.floor(v)
    }
    const item: MockProjectRow = {
      id: `proj-${Date.now()}`,
      name,
      description: desc || undefined,
      introduction: intro || desc || undefined,
      background: typeof raw.background === 'string' && raw.background.trim() ? raw.background.trim() : undefined,
      planned_start_at: typeof raw.planned_start_at === 'string' ? raw.planned_start_at : undefined,
      planned_end_at: typeof raw.planned_end_at === 'string' ? raw.planned_end_at : undefined,
      technical_lead_name:
        typeof raw.technical_lead_name === 'string' && raw.technical_lead_name.trim()
          ? raw.technical_lead_name.trim()
          : undefined,
      headcount_frontend: n('headcount_frontend'),
      headcount_backend: n('headcount_backend'),
      headcount_qa: n('headcount_qa'),
      stack_frontend: typeof raw.stack_frontend === 'string' ? raw.stack_frontend.trim() || undefined : undefined,
      stack_backend: typeof raw.stack_backend === 'string' ? raw.stack_backend.trim() || undefined : undefined,
      stack_database: typeof raw.stack_database === 'string' ? raw.stack_database.trim() || undefined : undefined,
      stack_middleware: typeof raw.stack_middleware === 'string' ? raw.stack_middleware.trim() || undefined : undefined,
      goals,
      scope_in: typeof raw.scope_in === 'string' ? raw.scope_in.trim() || undefined : undefined,
      scope_out: typeof raw.scope_out === 'string' ? raw.scope_out.trim() || undefined : undefined,
      risk_notes: typeof raw.risk_notes === 'string' ? raw.risk_notes.trim() || undefined : undefined,
      manpower_stack_deferred:
        typeof raw.manpower_stack_deferred === 'boolean' ? raw.manpower_stack_deferred : undefined,
      status: String(raw.status ?? '立项流程中').trim() || '立项流程中',
      updated_at: new Date().toISOString(),
      progress_percent: 0,
      iteration_number: 1,
      story_count: 0,
      task_open_count: 0,
      task_total_count: 0,
      bug_open_count: 0,
      artifacts: {},
    }
    mockProjects = [item, ...mockProjects]
    return HttpResponse.json({
      code: 0,
      message: 'ok',
      data: item,
    })
  }),

  /** REQ-M08：项目 Dashboard 只读聚合（iteration_key=current|all|迭代 id） */
  http.get('/api/v1/projects/:projectId/dashboard', ({ request, params }) => {
    if (!bearerOk(request)) {
      return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    }
    const raw = params.projectId
    const id = typeof raw === 'string' ? raw : raw?.[0] ?? ''
    const row = mockProjects.find((r) => r.id === id)
    if (!row) {
      return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    }
    const url = new URL(request.url)
    const iterationKey = url.searchParams.get('iteration_key')?.trim() || 'current'
    return HttpResponse.json({
      code: 0,
      message: 'ok',
      data: buildProjectDashboard(iterationKey, row),
    })
  }),

  /** REQ-M02：需求文档 Markdown 版本列表 */
  http.get('/api/v1/projects/:projectId/requirement-doc/versions', ({ request, params }) => {
    if (!bearerOk(request)) {
      return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    }
    const raw = params.projectId
    const id = typeof raw === 'string' ? raw : raw?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === id)) {
      return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    }
    return HttpResponse.json({
      code: 0,
      message: 'ok',
      data: listRequirementDocVersions(id),
    })
  }),

  /** 创建版本（列表：mode）或保存为新版本（详情：markdown + based_on_version_id） */
  http.post('/api/v1/projects/:projectId/requirement-doc/versions', async ({ request, params }) => {
    if (!bearerOk(request)) {
      return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    }
    const raw = params.projectId
    const projectId = typeof raw === 'string' ? raw : raw?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) {
      return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    }
    let body: RequirementDocVersionCreateOrAppendBody = {}
    try {
      body = (await request.json()) as RequirementDocVersionCreateOrAppendBody
    } catch {
      /* ignore */
    }
    if (typeof body.markdown === 'string' && typeof body.based_on_version_id === 'string') {
      const r = appendRequirementDocVersion(projectId, body.markdown, body.based_on_version_id)
      if (!r.ok) {
        return HttpResponse.json({ code: 40002, message: r.message, data: null })
      }
      const row = r.row
      return HttpResponse.json({
        code: 0,
        message: 'ok',
        data: {
          id: row.id,
          version_no: row.version_no,
          markdown: row.markdown,
          is_latest: true,
          created_at: row.created_at,
        },
      })
    }
    if (body.mode === 'empty' || body.mode === 'from_latest') {
      const row = createRequirementDocVersion(projectId, body.mode)
      return HttpResponse.json({
        code: 0,
        message: 'ok',
        data: {
          id: row.id,
          version_no: row.version_no,
          markdown: row.markdown,
          is_latest: true,
          created_at: row.created_at,
        },
      })
    }
    return HttpResponse.json({
      code: 40001,
      message: '请求体需包含 mode（empty|from_latest）或 markdown + based_on_version_id',
      data: null,
    })
  }),

  http.get('/api/v1/projects/:projectId/requirement-doc/versions/:versionId', ({ request, params }) => {
    if (!bearerOk(request)) {
      return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    }
    const rawP = params.projectId
    const projectId = typeof rawP === 'string' ? rawP : rawP?.[0] ?? ''
    const rawV = params.versionId
    const versionId = typeof rawV === 'string' ? rawV : rawV?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) {
      return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    }
    const row = getRequirementDocVersion(projectId, versionId)
    if (!row) {
      return HttpResponse.json({ code: 40402, message: '版本不存在', data: null })
    }
    return HttpResponse.json({
      code: 0,
      message: 'ok',
      data: {
        id: row.id,
        version_no: row.version_no,
        markdown: row.markdown,
        is_latest: row.is_latest,
        created_at: row.created_at,
      },
    })
  }),

  http.patch('/api/v1/projects/:projectId/requirement-doc/versions/:versionId', async ({ request, params }) => {
    if (!bearerOk(request)) {
      return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    }
    const rawP = params.projectId
    const projectId = typeof rawP === 'string' ? rawP : rawP?.[0] ?? ''
    const rawV = params.versionId
    const versionId = typeof rawV === 'string' ? rawV : rawV?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) {
      return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    }
    let markdown = ''
    try {
      const b = (await request.json()) as { markdown?: string }
      markdown = typeof b.markdown === 'string' ? b.markdown : ''
    } catch {
      /* ignore */
    }
    const r = patchRequirementDocVersion(projectId, versionId, markdown)
    if (!r.ok) {
      return HttpResponse.json({ code: 40003, message: r.message, data: null })
    }
    const row = r.row
    return HttpResponse.json({
      code: 0,
      message: 'ok',
      data: {
        id: row.id,
        version_no: row.version_no,
        markdown: row.markdown,
        is_latest: row.is_latest,
        created_at: row.created_at,
      },
    })
  }),

  http.delete('/api/v1/projects/:projectId/requirement-doc/versions/:versionId', ({ request, params }) => {
    if (!bearerOk(request)) {
      return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    }
    const rawP = params.projectId
    const projectId = typeof rawP === 'string' ? rawP : rawP?.[0] ?? ''
    const rawV = params.versionId
    const versionId = typeof rawV === 'string' ? rawV : rawV?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) {
      return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    }
    const r = deleteRequirementDocVersion(projectId, versionId)
    if (!r.ok) {
      return HttpResponse.json({ code: 40402, message: r.message, data: null })
    }
    return HttpResponse.json({
      code: 0,
      message: 'ok',
      data: listRequirementDocVersions(projectId),
    })
  }),

  /** 项目详情：按 id 查找内存列表 */
  http.get('/api/v1/projects/:projectId', ({ request, params }) => {
    if (!bearerOk(request)) {
      return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    }
    const raw = params.projectId
    const id = typeof raw === 'string' ? raw : raw?.[0] ?? ''
    const p = mockProjects.find((row) => row.id === id)
    if (!p) {
      return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    }
    return HttpResponse.json({
      code: 0,
      message: 'ok',
      data: p,
    })
  }),

  /** 部分更新项目（含 artifacts 浅合并） */
  http.patch('/api/v1/projects/:projectId', async ({ request, params }) => {
    if (!bearerOk(request)) {
      return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    }
    const rawId = params.projectId
    const id = typeof rawId === 'string' ? rawId : rawId?.[0] ?? ''
    const row = mockProjects.find((r) => r.id === id)
    if (!row) {
      return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    }
    let patch: Record<string, unknown> = {}
    try {
      patch = (await request.json()) as Record<string, unknown>
    } catch {
      /* ignore */
    }
    if (patch.artifacts && typeof patch.artifacts === 'object' && !Array.isArray(patch.artifacts)) {
      row.artifacts = { ...(row.artifacts ?? {}), ...(patch.artifacts as Record<string, boolean>) }
    }
    if (typeof patch.name === 'string' && patch.name.trim()) row.name = patch.name.trim()
    if (typeof patch.status === 'string' && patch.status.trim()) row.status = patch.status.trim()
    if (typeof patch.description === 'string') row.description = patch.description.trim() || undefined
    if (typeof patch.introduction === 'string') row.introduction = patch.introduction.trim() || undefined
    if (typeof patch.background === 'string') row.background = patch.background.trim() || undefined
    if (typeof patch.planned_start_at === 'string') row.planned_start_at = patch.planned_start_at || undefined
    if (typeof patch.planned_end_at === 'string') row.planned_end_at = patch.planned_end_at || undefined
    if (typeof patch.technical_lead_name === 'string')
      row.technical_lead_name = patch.technical_lead_name.trim() || undefined
    for (const hk of ['headcount_frontend', 'headcount_backend', 'headcount_qa'] as const) {
      const v = patch[hk]
      if (typeof v === 'number' && !Number.isNaN(v) && v >= 0) row[hk] = Math.floor(v)
    }
    for (const sk of [
      'stack_frontend',
      'stack_backend',
      'stack_database',
      'stack_middleware',
    ] as const) {
      const v = patch[sk]
      if (typeof v === 'string') row[sk] = v.trim() || undefined
    }
    if (Array.isArray(patch.goals)) {
      row.goals = patch.goals
        .filter((g): g is string => typeof g === 'string')
        .map((g) => g.trim())
        .filter(Boolean)
    }
    if (typeof patch.scope_in === 'string') row.scope_in = patch.scope_in.trim() || undefined
    if (typeof patch.scope_out === 'string') row.scope_out = patch.scope_out.trim() || undefined
    if (typeof patch.risk_notes === 'string') row.risk_notes = patch.risk_notes.trim() || undefined
    if (typeof patch.manpower_stack_deferred === 'boolean') row.manpower_stack_deferred = patch.manpower_stack_deferred
    row.updated_at = new Date().toISOString()
    return HttpResponse.json({
      code: 0,
      message: 'ok',
      data: row,
    })
  }),

  http.post('/api/v1/ai/invoke', async ({ request }) => {
    let body: AiInvokeBody = {}
    try {
      body = (await request.json()) as AiInvokeBody
    } catch {
      /* empty body */
    }
    const capability = body.capability ?? 'echo'
    const message = (body.payload?.message as string | undefined) ?? ''
    if (capability === 'dashboard_weekly_summary') {
      const scope = (body.payload?.scope_label as string | undefined) ?? '（未指定范围）'
      return HttpResponse.json({
        code: 0,
        message: 'ok',
        data: {
          capability,
          summary: `【Mock 周报摘要】统计范围：${scope}\n\n本周完成 Story 推进与缺陷收敛；仍存在阻塞 Task 与高优缺陷，建议优先排期联调与 CR 评审。（实际内容由 Agent 基于真实数据生成）`,
        },
      })
    }
    if (capability === 'requirement_doc_assist') {
      const payload = body.payload ?? {}
      const action = String(payload?.action ?? 'chat')
      const message = String(payload?.message ?? '').trim()
      const markdown = String(payload?.markdown ?? '').trim()
      const lineCount = markdown ? markdown.split('\n').length : 0

      if (action === 'generate_doc') {
        const excerpt = message ? message.slice(0, 120) : '（未提供具体诉求）'
        const doc = `# 需求文档

## 目标
- 目标概述：${excerpt}
- 成功标准：输出内容应包含可验收的条目与边界说明。

## 功能清单
- （待你在对话里补充/确认的条目1）
- （待你在对话里补充/确认的条目2）
- （待你在对话里补充/确认的条目3）

## 交互流程
- 主流程（简版）：
  - 用户发起需求澄清/补充
  - AI 汇总为建议
  - 用户点击「生成并应用」
- 异常流程（简版）：
  - 输入缺失：提示补充
  - 解析失败：提示错误并要求重新回填/澄清

## 业务规则
- 不编造未提供的信息，无法确定的用「待确认」标记。
- 保存产生新版本；覆盖仅允许在最新版本时进行。

## 异常处理
- 网络/调用失败：返回错误信息，不写脏数据。
- 版本链冲突：提示刷新并说明仅允许从最新分叉。

## 验收标准
- 目标/功能/流程/规则/异常/验收六块齐全
- 每条功能都有可观察的验收条件或验证方式
- 历史版本列表可回到任意版本并可导出
`
        return HttpResponse.json({
          code: 0,
          message: 'ok',
          data: {
            capability,
            markdown: doc,
          },
        })
      }

      return HttpResponse.json({
        code: 0,
        message: 'ok',
        data: {
          capability,
          suggestion: `## AI 建议（Mock）

### 你提出的诉求
${message || '（未提供）'}

### 下一步我需要你确认/补充的点
- 你的「目标」具体是什么？可否用一句话 + 一个可衡量指标描述？
- 「功能清单」你希望粒度到什么层级？（页面级 / 模块级 / 条目级）
- 交互流程里，你最关心哪一个异常场景？（版本冲突 / 输入缺失 / 解析失败）

### 当前文档状态
- 已有行数：${lineCount}
`,
        },
      })
    }
    return HttpResponse.json({
      code: 0,
      message: 'ok',
      data: { echo: message, capability },
    })
  }),
]
