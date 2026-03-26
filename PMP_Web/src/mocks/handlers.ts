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
import {
  appendTechDesignDocVersion,
  createTechDesignDocVersion,
  deleteTechDesignDocVersion,
  getTechDesignDocVersion,
  listTechDesignDocVersions,
  patchTechDesignDocVersion,
} from '@/mocks/techDesignDocStore'
import {
  appendTechDesignModuleVersion,
  createTechDesignModuleVersion,
  createTechDesignModulesFirstAuto,
  deleteTechDesignModuleVersion,
  getTechDesignModuleVersion,
  listTechDesignModuleVersions,
  listTechDesignModules,
  patchTechDesignModuleVersion,
} from '@/mocks/techDesignModuleDocStore'
import {
  aiSplitRequirementDocModules,
  appendRequirementDocModuleVersion,
  createRequirementDocModule,
  createRequirementDocModuleVersion,
  deleteRequirementDocModule,
  deleteRequirementDocModuleVersion,
  getRequirementDocModuleVersion,
  listRequirementDocModuleVersions,
  listRequirementDocModules,
  patchRequirementDocModule,
  patchRequirementDocModuleVersion,
  reorderRequirementDocModules,
} from '@/mocks/requirementModuleDocStore'
import {
  aiGenerateApiCatalogConstraint,
  aiGenerateApiCatalogEndpoints,
  appendApiCatalogConstraintVersion,
  createApiCatalogEndpoint,
  createApiCatalogConstraintVersion,
  deleteApiCatalogEndpoint,
  deleteApiCatalogConstraintVersion,
  getApiCatalogConstraint,
  getApiCatalogConstraintVersion,
  listApiCatalogConstraintVersions,
  listApiCatalogEndpoints,
  patchApiCatalogConstraint,
  patchApiCatalogEndpoint,
  listApiCatalogTasks,
  bindApiCatalogEndpointTasks,
  listApiCatalogEndpointsByTask,
  getApiCatalogLatestGenerateResult,
  applyPlanningTaskProgressToLinkedEndpoints,
} from '@/mocks/apiCatalogStore'
import {
  appendIterationRequirementDocVersion,
  createIterationRequirementDocVersion,
  deleteIterationRequirementDocVersion,
  getIterationRequirementDocVersion,
  listIterationRequirementDocVersions,
  patchIterationRequirementDocVersion,
} from '@/mocks/iterationRequirementDocStore'
import {
  appendStoryRequirementDocVersion,
  createStoryRequirementDocVersion,
  deleteStoryRequirementDocVersion,
  getStoryRequirementDocVersion,
  listStoryRequirementDocVersions,
  patchStoryRequirementDocVersion,
} from '@/mocks/storyRequirementDocStore'
import {
  applyIterationPlanningAi,
  createPlanningIteration,
  createPlanningStory,
  createPlanningTask,
  deletePlanningIteration,
  deletePlanningStory,
  deletePlanningTask,
  getPlanningIteration,
  getPlanningStory,
  getPlanningTask,
  listPlanningIterations,
  listPlanningStories,
  listPlanningTasks,
  listPlanningTasksByStory,
  patchPlanningIteration,
  patchPlanningStory,
  patchPlanningTask,
  reorderPlanningIterations,
  reorderPlanningStories,
  reorderPlanningTasks,
} from '@/mocks/planningStore'
import {
  createTaskAttachment,
  createTaskComment,
  createTaskTestSubmission,
  listTaskAttachments,
  listTaskComments,
  listTaskTestSubmissions,
} from '@/mocks/taskCollabStore'
import {
  aiGenerateDbCatalogSchemaDraft,
  createDbCatalogTable,
  deleteDbCatalogTable,
  generateDbCatalogDdl,
  generateDbCatalogDesignDoc,
  getDbCatalogConfig,
  getDbCatalogTable,
  getDbCatalogTableLatestAlter,
  listDbCatalogTables,
  patchDbCatalogConfig,
  patchDbCatalogTable,
} from '@/mocks/dbCatalogStore'
import type {
  ApiCatalogAiGenerateMode,
  ApiCatalogConstraint,
  ApiCatalogEndpoint,
  RequirementDocModuleAiSplitRequest,
  RequirementDocModuleCreateBody,
  RequirementDocModulePatchBody,
  RequirementDocModuleReorderBody,
  RequirementDocVersionCreateOrAppendBody,
  TechDeliveryPart,
} from '@/types/api-contract'
import { normalizeTechDeliveryPartsFromUnknown } from '@/utils/techDeliveryPartsNormalize'

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
  tech_delivery_parts?: TechDeliveryPart[]
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
    tech_delivery_parts: [
      {
        id: 'tdp-seed-a',
        delivery_kind: 'website',
        technologies: 'Vue 3、TypeScript、Element Plus',
        database: '—（浏览器侧）',
        architecture: 'SPA；经 PMP_Service HTTP API；静态资源走 CDN（示意）',
      },
      {
        id: 'tdp-seed-b',
        delivery_kind: 'api_service',
        technologies: 'Python、FastAPI',
        database: 'PostgreSQL、Redis',
        architecture: '分层 router → service → ORM；AI 经 ai_gateway import Agent（TECH-001）',
      },
    ],
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

function isTechSelectionCompleted(parts: TechDeliveryPart[] | undefined): boolean {
  if (!parts || parts.length === 0) return false
  return parts.every((p) => {
    if (!p.delivery_kind?.trim()) return false
    if (p.delivery_kind === 'other' && !p.custom_label?.trim()) return false
    return Boolean(p.technologies?.trim() && p.database?.trim() && p.architecture?.trim())
  })
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
    if (Array.isArray(raw.tech_delivery_parts)) {
      item.tech_delivery_parts = normalizeTechDeliveryPartsFromUnknown(raw.tech_delivery_parts)
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

  /** REQ-M02B：技术设计总文档版本列表 */
  http.get('/api/v1/projects/:projectId/tech-design-doc/versions', ({ request, params }) => {
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
      data: listTechDesignDocVersions(id),
    })
  }),

  http.post('/api/v1/projects/:projectId/tech-design-doc/versions', async ({ request, params }) => {
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
      const r = appendTechDesignDocVersion(projectId, body.markdown, body.based_on_version_id)
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
      const row = createTechDesignDocVersion(projectId, body.mode)
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

  http.get('/api/v1/projects/:projectId/tech-design-doc/versions/:versionId', ({ request, params }) => {
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
    const row = getTechDesignDocVersion(projectId, versionId)
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

  http.patch('/api/v1/projects/:projectId/tech-design-doc/versions/:versionId', async ({ request, params }) => {
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
    const r = patchTechDesignDocVersion(projectId, versionId, markdown)
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

  http.delete('/api/v1/projects/:projectId/tech-design-doc/versions/:versionId', ({ request, params }) => {
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
    const r = deleteTechDesignDocVersion(projectId, versionId)
    if (!r.ok) {
      return HttpResponse.json({ code: 40402, message: r.message, data: null })
    }
    return HttpResponse.json({
      code: 0,
      message: 'ok',
      data: listTechDesignDocVersions(projectId),
    })
  }),

  /** REQ-M02B：技术设计（按交付部分）模块列表 */
  http.get('/api/v1/projects/:projectId/tech-design-doc/modules', ({ request, params }) => {
    if (!bearerOk(request)) {
      return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    }
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) {
      return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    }
    return HttpResponse.json({ code: 0, message: 'ok', data: listTechDesignModules(projectId) })
  }),

  /** REQ-M02B：首次按技术选型自动创建（事务，失败回滚） */
  http.post('/api/v1/projects/:projectId/tech-design-doc/modules/auto-create-first', ({ request, params }) => {
    if (!bearerOk(request)) {
      return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    }
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    const project = mockProjects.find((r) => r.id === projectId)
    if (!project) {
      return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    }
    if (!isTechSelectionCompleted(project.tech_delivery_parts)) {
      return HttpResponse.json({ code: 40031, message: '必须先完成技术选型（形态/技术栈/数据库/架构要点）', data: null })
    }
    const r = createTechDesignModulesFirstAuto(projectId, project.tech_delivery_parts ?? [])
    if (!r.ok) return HttpResponse.json({ code: 40032, message: r.message, data: null })
    return HttpResponse.json({ code: 0, message: 'ok', data: r.data })
  }),

  http.get('/api/v1/projects/:projectId/tech-design-doc/modules/:moduleId/versions', ({ request, params }) => {
    if (!bearerOk(request)) {
      return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    }
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    const moduleId = typeof params.moduleId === 'string' ? params.moduleId : params.moduleId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) {
      return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    }
    const r = listTechDesignModuleVersions(projectId, moduleId)
    if (!r.ok) return HttpResponse.json({ code: 40411, message: r.message, data: null })
    return HttpResponse.json({ code: 0, message: 'ok', data: r.data })
  }),

  http.post('/api/v1/projects/:projectId/tech-design-doc/modules/:moduleId/versions', async ({ request, params }) => {
    if (!bearerOk(request)) {
      return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    }
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    const moduleId = typeof params.moduleId === 'string' ? params.moduleId : params.moduleId?.[0] ?? ''
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
      const r = appendTechDesignModuleVersion(projectId, moduleId, body.markdown, body.based_on_version_id)
      if (!r.ok) return HttpResponse.json({ code: 40012, message: r.message, data: null })
      return HttpResponse.json({ code: 0, message: 'ok', data: r.data })
    }
    if (body.mode === 'empty' || body.mode === 'from_latest') {
      const r = createTechDesignModuleVersion(projectId, moduleId, body.mode)
      if (!r.ok) return HttpResponse.json({ code: 40411, message: r.message, data: null })
      return HttpResponse.json({ code: 0, message: 'ok', data: r.data })
    }
    return HttpResponse.json({ code: 40001, message: '请求体需包含 mode（empty|from_latest）或 markdown + based_on_version_id', data: null })
  }),

  http.get(
    '/api/v1/projects/:projectId/tech-design-doc/modules/:moduleId/versions/:versionId',
    ({ request, params }) => {
      if (!bearerOk(request)) {
        return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
      }
      const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
      const moduleId = typeof params.moduleId === 'string' ? params.moduleId : params.moduleId?.[0] ?? ''
      const versionId = typeof params.versionId === 'string' ? params.versionId : params.versionId?.[0] ?? ''
      if (!mockProjects.find((r) => r.id === projectId)) {
        return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
      }
      const r = getTechDesignModuleVersion(projectId, moduleId, versionId)
      if (!r.ok) return HttpResponse.json({ code: 40412, message: r.message, data: null })
      return HttpResponse.json({ code: 0, message: 'ok', data: r.data })
    },
  ),

  http.patch(
    '/api/v1/projects/:projectId/tech-design-doc/modules/:moduleId/versions/:versionId',
    async ({ request, params }) => {
      if (!bearerOk(request)) {
        return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
      }
      const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
      const moduleId = typeof params.moduleId === 'string' ? params.moduleId : params.moduleId?.[0] ?? ''
      const versionId = typeof params.versionId === 'string' ? params.versionId : params.versionId?.[0] ?? ''
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
      const r = patchTechDesignModuleVersion(projectId, moduleId, versionId, markdown)
      if (!r.ok) return HttpResponse.json({ code: 40013, message: r.message, data: null })
      return HttpResponse.json({ code: 0, message: 'ok', data: r.data })
    },
  ),

  http.delete(
    '/api/v1/projects/:projectId/tech-design-doc/modules/:moduleId/versions/:versionId',
    ({ request, params }) => {
      if (!bearerOk(request)) {
        return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
      }
      const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
      const moduleId = typeof params.moduleId === 'string' ? params.moduleId : params.moduleId?.[0] ?? ''
      const versionId = typeof params.versionId === 'string' ? params.versionId : params.versionId?.[0] ?? ''
      if (!mockProjects.find((r) => r.id === projectId)) {
        return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
      }
      const r = deleteTechDesignModuleVersion(projectId, moduleId, versionId)
      if (!r.ok) return HttpResponse.json({ code: 40412, message: r.message, data: null })
      return HttpResponse.json({ code: 0, message: 'ok', data: r.data })
    },
  ),

  /** 模块细化：列表 */
  http.get('/api/v1/projects/:projectId/requirement-doc/modules', ({ request, params }) => {
    if (!bearerOk(request)) {
      return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    }
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) {
      return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    }
    return HttpResponse.json({ code: 0, message: 'ok', data: listRequirementDocModules(projectId) })
  }),

  /** 模块细化：手动新建 */
  http.post('/api/v1/projects/:projectId/requirement-doc/modules', async ({ request, params }) => {
    if (!bearerOk(request)) {
      return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    }
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) {
      return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    }
    let body: RequirementDocModuleCreateBody = { title: '' }
    try {
      body = (await request.json()) as RequirementDocModuleCreateBody
    } catch {
      /* ignore */
    }
    const title = typeof body.title === 'string' ? body.title : ''
    if (!title.trim()) {
      return HttpResponse.json({ code: 40001, message: 'title 必填', data: null })
    }
    const r = createRequirementDocModule(
      projectId,
      title,
      typeof body.summary === 'string' ? body.summary : '',
    )
    if (!r.ok) {
      return HttpResponse.json({ code: 40002, message: r.message, data: null })
    }
    return HttpResponse.json({ code: 0, message: 'ok', data: r.summary })
  }),

  /** 模块细化：AI 拆分 */
  http.post('/api/v1/projects/:projectId/requirement-doc/modules/ai-split', async ({ request, params }) => {
    if (!bearerOk(request)) {
      return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    }
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) {
      return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    }
    let body: RequirementDocModuleAiSplitRequest = { mode: 'full_replace' }
    try {
      body = (await request.json()) as RequirementDocModuleAiSplitRequest
    } catch {
      /* ignore */
    }
    const mode = body.mode === 'incremental' ? 'incremental' : 'full_replace'
    const r = aiSplitRequirementDocModules(projectId, mode)
    if (!r.ok) {
      return HttpResponse.json({ code: 40003, message: r.message, data: null })
    }
    return HttpResponse.json({ code: 0, message: 'ok', data: r.data })
  }),

  /** 模块细化：排序 */
  http.put('/api/v1/projects/:projectId/requirement-doc/modules/reorder', async ({ request, params }) => {
    if (!bearerOk(request)) {
      return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    }
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) {
      return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    }
    let body: RequirementDocModuleReorderBody = { ordered_module_ids: [] }
    try {
      body = (await request.json()) as RequirementDocModuleReorderBody
    } catch {
      /* ignore */
    }
    const ids = Array.isArray(body.ordered_module_ids) ? body.ordered_module_ids : []
    const r = reorderRequirementDocModules(projectId, ids)
    if (!r.ok) {
      return HttpResponse.json({ code: 40004, message: r.message, data: null })
    }
    return HttpResponse.json({ code: 0, message: 'ok', data: r.list })
  }),

  http.get(
    '/api/v1/projects/:projectId/requirement-doc/modules/:moduleId/versions/:versionId',
    ({ request, params }) => {
      if (!bearerOk(request)) {
        return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
      }
      const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
      const moduleId = typeof params.moduleId === 'string' ? params.moduleId : params.moduleId?.[0] ?? ''
      const versionId = typeof params.versionId === 'string' ? params.versionId : params.versionId?.[0] ?? ''
      if (!mockProjects.find((r) => r.id === projectId)) {
        return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
      }
      const r = getRequirementDocModuleVersion(projectId, moduleId, versionId)
      if (!r.ok) {
        const code = r.message === '模块不存在' ? 40402 : 40403
        return HttpResponse.json({ code, message: r.message, data: null })
      }
      return HttpResponse.json({ code: 0, message: 'ok', data: r.data })
    },
  ),

  http.patch(
    '/api/v1/projects/:projectId/requirement-doc/modules/:moduleId/versions/:versionId',
    async ({ request, params }) => {
      if (!bearerOk(request)) {
        return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
      }
      const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
      const moduleId = typeof params.moduleId === 'string' ? params.moduleId : params.moduleId?.[0] ?? ''
      const versionId = typeof params.versionId === 'string' ? params.versionId : params.versionId?.[0] ?? ''
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
      const r = patchRequirementDocModuleVersion(projectId, moduleId, versionId, markdown)
      if (!r.ok) {
        return HttpResponse.json({ code: 40003, message: r.message, data: null })
      }
      return HttpResponse.json({ code: 0, message: 'ok', data: r.data })
    },
  ),

  http.delete(
    '/api/v1/projects/:projectId/requirement-doc/modules/:moduleId/versions/:versionId',
    ({ request, params }) => {
      if (!bearerOk(request)) {
        return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
      }
      const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
      const moduleId = typeof params.moduleId === 'string' ? params.moduleId : params.moduleId?.[0] ?? ''
      const versionId = typeof params.versionId === 'string' ? params.versionId : params.versionId?.[0] ?? ''
      if (!mockProjects.find((r) => r.id === projectId)) {
        return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
      }
      const r = deleteRequirementDocModuleVersion(projectId, moduleId, versionId)
      if (!r.ok) {
        return HttpResponse.json({ code: 40402, message: r.message, data: null })
      }
      return HttpResponse.json({ code: 0, message: 'ok', data: r.data })
    },
  ),

  http.post(
    '/api/v1/projects/:projectId/requirement-doc/modules/:moduleId/versions',
    async ({ request, params }) => {
      if (!bearerOk(request)) {
        return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
      }
      const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
      const moduleId = typeof params.moduleId === 'string' ? params.moduleId : params.moduleId?.[0] ?? ''
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
        const r = appendRequirementDocModuleVersion(
          projectId,
          moduleId,
          body.markdown,
          body.based_on_version_id,
        )
        if (!r.ok) {
          return HttpResponse.json({ code: 40002, message: r.message, data: null })
        }
        return HttpResponse.json({ code: 0, message: 'ok', data: r.data })
      }
      if (body.mode === 'empty' || body.mode === 'from_latest') {
        const r = createRequirementDocModuleVersion(projectId, moduleId, body.mode)
        if (!r.ok) {
          return HttpResponse.json({ code: 40402, message: r.message, data: null })
        }
        return HttpResponse.json({ code: 0, message: 'ok', data: r.data })
      }
      return HttpResponse.json({
        code: 40001,
        message: '请求体需包含 mode（empty|from_latest）或 markdown + based_on_version_id',
        data: null,
      })
    },
  ),

  http.get('/api/v1/projects/:projectId/requirement-doc/modules/:moduleId/versions', ({ request, params }) => {
    if (!bearerOk(request)) {
      return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    }
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    const moduleId = typeof params.moduleId === 'string' ? params.moduleId : params.moduleId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) {
      return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    }
    const r = listRequirementDocModuleVersions(projectId, moduleId)
    if (!r.ok) {
      return HttpResponse.json({ code: 40402, message: r.message, data: null })
    }
    return HttpResponse.json({ code: 0, message: 'ok', data: r.data })
  }),

  http.patch('/api/v1/projects/:projectId/requirement-doc/modules/:moduleId', async ({ request, params }) => {
    if (!bearerOk(request)) {
      return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    }
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    const moduleId = typeof params.moduleId === 'string' ? params.moduleId : params.moduleId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) {
      return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    }
    let body: RequirementDocModulePatchBody = {}
    try {
      body = (await request.json()) as RequirementDocModulePatchBody
    } catch {
      /* ignore */
    }
    const r = patchRequirementDocModule(projectId, moduleId, body)
    if (!r.ok) {
      return HttpResponse.json({ code: 40402, message: r.message, data: null })
    }
    return HttpResponse.json({ code: 0, message: 'ok', data: r.summary })
  }),

  http.delete('/api/v1/projects/:projectId/requirement-doc/modules/:moduleId', ({ request, params }) => {
    if (!bearerOk(request)) {
      return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    }
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    const moduleId = typeof params.moduleId === 'string' ? params.moduleId : params.moduleId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) {
      return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    }
    const r = deleteRequirementDocModule(projectId, moduleId)
    if (!r.ok) {
      return HttpResponse.json({ code: 40402, message: r.message, data: null })
    }
    return HttpResponse.json({ code: 0, message: 'ok', data: null })
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
    if (Array.isArray(patch.tech_delivery_parts)) {
      row.tech_delivery_parts = normalizeTechDeliveryPartsFromUnknown(patch.tech_delivery_parts)
    }
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
    if (
      capability === 'requirement_doc_assist' ||
      capability === 'requirement_module_doc_assist' ||
      capability === 'tech_design_doc_assist' ||
      capability === 'db_catalog_design_doc_assist' ||
      capability === 'api_catalog_constraint_assist' ||
      capability === 'iteration_requirement_doc_assist' ||
      capability === 'story_requirement_doc_assist'
    ) {
      const payload = body.payload ?? {}
      const action = String(payload?.action ?? 'chat')
      const message = String(payload?.message ?? '').trim()
      const markdown = String(payload?.markdown ?? '').trim()
      const lineCount = markdown ? markdown.split('\n').length : 0
      const dialect = String(payload?.dialect ?? '')
      const modHint =
        capability === 'requirement_module_doc_assist'
          ? `\n\n【模块上下文】module_id=${String(payload?.module_id ?? '')} title=${String(payload?.module_title ?? '')}`
          : capability === 'iteration_requirement_doc_assist'
          ? `\n\n【迭代上下文】iteration_id=${String(payload?.iteration_id ?? '')} iteration_name=${String(payload?.iteration_name ?? '')}`
          : capability === 'story_requirement_doc_assist'
          ? `\n\n【Story 上下文】story_id=${String(payload?.story_id ?? '')} story_name=${String(payload?.story_name ?? '')}`
          : ''

      if (action === 'generate_doc') {
        const excerpt = message ? message.slice(0, 120) : '（未提供具体诉求）'
        const doc =
          capability === 'api_catalog_constraint_assist'
            ? `# 通用接口约束

## 统一响应包络
- 所有接口统一返回：\`{ code, message, data }\`
- 成功：\`code = 0\`
- 失败：\`code != 0\`，\`message\` 必填

## 字段规范
- 时间字段统一 ISO8601（UTC）
- 分页参数统一：\`page\`、\`page_size\`
- 列表响应建议：\`{ list, total }\`

## 错误码规范
- 400xx：参数错误
- 401xx：认证失败
- 403xx：权限不足
- 404xx：资源不存在
- 500xx：服务端异常

## 约束说明
- 诉求摘要：${excerpt}
- 待确认项：幂等键、重试策略、链路追踪字段
`
            : capability === 'tech_design_doc_assist'
            ? `# 技术设计文档

## 技术栈与运行环境
- 诉求摘要：${excerpt}
- 前端 / 后端 / 数据库 / 中间件 / 部署方式：（待你在对话中确认）

## 系统上下文与架构
- 系统边界与外部依赖：（待确认）
- 分层与模块调用关系：（待确认）

## 模块与职责
- （与需求模块对齐的边界说明 1）
- （与需求模块对齐的边界说明 2）

## 数据与接口边界
- 核心实体与归属：（待确认）
- 对外 API 概要：详见接口管理模块落地后同步

## 非功能需求
- 性能 / 安全 / 可用性 / 可观测性：（待量化或标注待确认）

## 风险与待定项
- 依赖与排期风险：（待确认）
- 与需求未对齐处：标注「待确认」并列跟进人
`
            : capability === 'db_catalog_design_doc_assist'
              ? `# 数据库设计文档

## 方言与生成配置
- 方言：${dialect || '（未指定）'}
- 诉求摘要：${excerpt}

## 表与字段总览
- 目标：把业务实体/接口需求映射为可落库的表与字段
- 说明：字段类型需与本方言映射表一致；无法确定处标注「待确认」

## 关键约束建议
- 主键：确保每表有明确主键与自增策略（如适用）
- 唯一约束：用于去重/业务幂等关键字段
- 外键：如存在引用关系，补充引用表/列与级联策略（可选）

## DDL / 迁移策略建议
- 生成：优先导出 CREATE TABLE 脚本
- 修改：后续保存表结构时生成「每表仅保留最新一条」的变更脚本（ALTER/重建策略取决于方言实现）

## 风险与待定项
- 类型映射是否已在方言层对齐
- 业务幂等/历史数据回填方案
`
            : capability === 'iteration_requirement_doc_assist'
            ? `# 迭代需求说明

## 本迭代目标
- 诉求摘要：${excerpt}
- 与项目总需求的对齐关系：（待你在对话中标注章节/模块锚点）

## 范围
- 包含：（待确认）
- 不包含：（待确认）

## 里程碑与时间
- 计划起止与关键节点：（可与迭代表单中的计划日期对齐）

## 验收标准
- （可观察、可测试的条目）

## 依赖与风险
- 跨迭代/跨团队依赖：（待确认）
`
            : capability === 'story_requirement_doc_assist'
            ? `# Story 需求说明

## 本 Story 目标
- 诉求摘要：${excerpt}
- 与该迭代目标的对齐关系：（待你在对话中标注关联迭代/Story 锚点）

## 范围
- 包含：（待确认）
- 不包含：（待确认）

## 验收标准
- （可观察、可测试的条目）

## 依赖与风险
- 与其他 Story 的衔接关系：（待确认）
`
            : `# 需求文档

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

      const suggestLead =
        capability === 'api_catalog_constraint_assist'
          ? `### 下一步我需要你确认/补充的点
- 响应包络是否固定 \`{ code, message, data }\`？
- 错误码是否要区分平台码与业务码？
- 是否需要强制分页/排序/时间格式字段规范？`
          : capability === 'tech_design_doc_assist'
          ? `### 下一步我需要你确认/补充的点
- 技术栈是否已冻结？与项目详情中的填写是否一致？
- 架构上最关键的边界是什么（鉴权、多租户、数据一致性）？
- 非功能指标里哪一条是硬约束（延迟、吞吐、RPO/RTO）？`
          : capability === 'db_catalog_design_doc_assist'
            ? `### 下一步我需要你确认/补充的点
- 方言/类型映射是否已确认（尤其是 int/string/datetime 等）
- 每张表的主键策略与自增/非自增规则
- 外键与唯一约束需要覆盖哪些业务边界
- 保存后迁移脚本的生成策略：ALTER 还是重建表（按你实现阶段取舍）`
          : capability === 'iteration_requirement_doc_assist'
          ? `### 下一步我需要你确认/补充的点
- 本迭代相对总需求文档，**独有**的交付边界是什么？
- 验收标准希望细化到「可测试步骤」还是「业务结果描述」？
- 与上一迭代或未关闭项的衔接关系？`
          : capability === 'story_requirement_doc_assist'
          ? `### 下一步我需要你确认/补充的点
- 本 Story 相对该迭代的**独有交付点**是什么？
- 验收标准希望细化到「可测试步骤」还是「业务结果描述」？
- 与其他 Story 的依赖/约束关系？`
          : `### 下一步我需要你确认/补充的点
- 你的「目标」具体是什么？可否用一句话 + 一个可衡量指标描述？
- 「功能清单」你希望粒度到什么层级？（页面级 / 模块级 / 条目级）
- 交互流程里，你最关心哪一个异常场景？（版本冲突 / 输入缺失 / 解析失败）`

      return HttpResponse.json({
        code: 0,
        message: 'ok',
        data: {
          capability,
          suggestion: `## AI 建议（Mock）

### 你提出的诉求
${message || '（未提供）'}

${suggestLead}

### 当前文档状态
- 已有行数：${lineCount}
${modHint}
`,
        },
      })
    }
    if (capability === 'tech_selection_assist') {
      const payload = body.payload ?? {}
      const action = String(payload?.action ?? 'chat')
      const message = String(payload?.message ?? '').trim()
      const existing = normalizeTechDeliveryPartsFromUnknown(payload.tech_delivery_parts)

      if (action === 'generate_tech_selection') {
        const hist = Array.isArray(payload.history) ? payload.history : []
        const lastUser = [...hist].reverse().find((m) => {
          if (!m || typeof m !== 'object') return false
          return (m as { role?: string }).role === 'user'
        }) as { content?: string } | undefined
        const hint = (lastUser?.content ?? message).trim().slice(0, 80) || '未命名场景'

        const parts: TechDeliveryPart[] = [
          {
            id: `tdp-ai-${Date.now()}-a`,
            delivery_kind: 'website',
            technologies: 'Vue 3、TypeScript、Element Plus',
            database: '—（浏览器侧）',
            architecture: `对标「${hint}」的 SPA；鉴权 Bearer；与 OpenAPI 契约对齐（Mock）`,
          },
          {
            id: `tdp-ai-${Date.now()}-b`,
            delivery_kind: 'api_service',
            technologies: 'Python、FastAPI',
            database: 'PostgreSQL、Redis',
            architecture: '分层 + JWT；AI 经 ai_gateway（Mock）',
          },
        ]

        return HttpResponse.json({
          code: 0,
          message: 'ok',
          data: {
            capability,
            summary_markdown: `已根据对话生成 **${parts.length}** 条交付部分草案。请在对比弹窗中核对后点 **接受** 填入表单；再点 **确定保存** 写入项目。`,
            tech_delivery_parts: parts,
          },
        })
      }

      return HttpResponse.json({
        code: 0,
        message: 'ok',
        data: {
          capability,
          suggestion: `## 技术选型讨论（Mock）

### 本轮输入
${message || '（无）'}

### 当前表单
已有 **${existing.length}** 条交付部分。

### 建议继续说明
- 是否要 **多端统一账号**（SSO / OAuth2）
- **数据**：主从、缓存、消息队列是否需要
- **部署**：内网 / 公有云 / 混合

讨论完成后点击 **「根据对话生成技术选型并预览」**。
`,
        },
      })
    }
    if (capability === 'iteration_planning_assist') {
      const payload = body.payload ?? {}
      const action = String(payload?.action ?? 'chat')
      const umsg = String(payload?.message ?? '').trim()

      if (action === 'generate_iteration_planning') {
        const iterations = [
          {
            name: '迭代1（AI Mock）',
            goal_summary: '完成核心闭环与基础治理，可演示联调。',
            scope_notes: '与需求文档对齐；Task 在「Task 与执行」中维护',
            priority: 0,
            sort_order: 0,
          },
          {
            name: '迭代2（AI Mock）',
            goal_summary: '增强协同、可观测与运营侧能力。',
            scope_notes: 'REQ-M04/M08',
            priority: 1,
            sort_order: 1,
          },
        ]
        const stories = [
          {
            iteration_index: 0,
            title: '认证与项目壳',
            acceptance_criteria: ['未登录访问受保护路由跳转登录', '项目列表可进入工作区'],
            requirement_ref: 'REQ-M02',
            priority: 0,
            notes: '',
          },
          {
            iteration_index: 0,
            title: '迭代与 Story 规划入口',
            acceptance_criteria: ['可按迭代维护 Story', '可从 Story 跳转 Task 执行页'],
            requirement_ref: 'REQ-M03',
            priority: 1,
            notes: '',
          },
          {
            iteration_index: 1,
            title: 'Task 执行与接口绑定',
            acceptance_criteria: ['Task 状态可回写接口完成态（Mock）', '支持按 Story/迭代筛选'],
            requirement_ref: 'REQ-M04 + M02C',
            priority: 0,
            notes: '',
          },
        ]
        return HttpResponse.json({
          code: 0,
          message: 'ok',
          data: {
            capability,
            summary_markdown: `已生成 **${iterations.length}** 个迭代与 **${stories.length}** 条 Story 草案。请在对比弹窗核对后点 **接受**。**覆盖**将清空后重建；**增量**将按规范化名称匹配，**已有迭代与 Story 会用草案整字段覆盖**。`,
            iterations,
            stories,
          },
        })
      }

      return HttpResponse.json({
        code: 0,
        message: 'ok',
        data: {
          capability,
          suggestion: `## 迭代规划讨论（Mock）

### 本轮输入
${umsg || '（无）'}

### 建议继续说明
- 希望几个迭代、每个迭代的大目标与边界
- 每个迭代下优先 Story 与验收标准（AC）
- 与需求模块（REQ-M02/M02C）的对应关系

讨论完成后点击 **「根据对话生成迭代与 Story 并预览」**。
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

  http.get('/api/v1/projects/:projectId/api-catalog/constraints', ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    const row = getApiCatalogConstraint(projectId)
    if (!row) return HttpResponse.json({ code: 40423, message: '暂无约束版本', data: null })
    return HttpResponse.json({ code: 0, message: 'ok', data: row })
  }),

  http.get('/api/v1/projects/:projectId/api-catalog/constraints/versions', ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    return HttpResponse.json({ code: 0, message: 'ok', data: listApiCatalogConstraintVersions(projectId) })
  }),

  http.post('/api/v1/projects/:projectId/api-catalog/constraints/versions', async ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    let body: { mode?: 'empty' | 'from_latest'; markdown?: string; based_on_version_id?: string } = {}
    try { body = (await request.json()) as { mode?: 'empty' | 'from_latest'; markdown?: string; based_on_version_id?: string } } catch { /* ignore */ }
    if (typeof body.markdown === 'string' && typeof body.based_on_version_id === 'string') {
      const r = appendApiCatalogConstraintVersion(projectId, body.markdown, body.based_on_version_id)
      if (!r.ok) return HttpResponse.json({ code: 40023, message: r.message, data: null })
      return HttpResponse.json({ code: 0, message: 'ok', data: r.data })
    }
    const mode = body.mode === 'from_latest' ? 'from_latest' : 'empty'
    return HttpResponse.json({ code: 0, message: 'ok', data: createApiCatalogConstraintVersion(projectId, mode) })
  }),

  http.get('/api/v1/projects/:projectId/api-catalog/constraints/versions/:versionId', ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    const versionId = typeof params.versionId === 'string' ? params.versionId : params.versionId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    const row = getApiCatalogConstraintVersion(projectId, versionId)
    if (!row) return HttpResponse.json({ code: 40423, message: '约束版本不存在', data: null })
    return HttpResponse.json({ code: 0, message: 'ok', data: row })
  }),

  http.delete('/api/v1/projects/:projectId/api-catalog/constraints/versions/:versionId', ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    const versionId = typeof params.versionId === 'string' ? params.versionId : params.versionId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    const r = deleteApiCatalogConstraintVersion(projectId, versionId)
    if (!r.ok) return HttpResponse.json({ code: 40023, message: r.message, data: null })
    return HttpResponse.json({ code: 0, message: 'ok', data: r.data })
  }),

  http.patch('/api/v1/projects/:projectId/api-catalog/constraints', async ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    let body: Partial<ApiCatalogConstraint> = {}
    try { body = (await request.json()) as Partial<ApiCatalogConstraint> } catch { /* ignore */ }
    const row = patchApiCatalogConstraint(projectId, body)
    if (!row) return HttpResponse.json({ code: 40423, message: '暂无约束版本', data: null })
    return HttpResponse.json({ code: 0, message: 'ok', data: row })
  }),

  http.post('/api/v1/projects/:projectId/api-catalog/constraints/ai-generate', ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    return HttpResponse.json({ code: 0, message: 'ok', data: aiGenerateApiCatalogConstraint(projectId) })
  }),

  http.get('/api/v1/projects/:projectId/api-catalog/endpoints', ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    return HttpResponse.json({ code: 0, message: 'ok', data: listApiCatalogEndpoints(projectId) })
  }),

  http.post('/api/v1/projects/:projectId/api-catalog/endpoints', async ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    let body: Partial<ApiCatalogEndpoint> = {}
    try { body = (await request.json()) as Partial<ApiCatalogEndpoint> } catch { /* ignore */ }
    return HttpResponse.json({ code: 0, message: 'ok', data: createApiCatalogEndpoint(projectId, body) })
  }),

  http.patch('/api/v1/projects/:projectId/api-catalog/endpoints/:endpointId', async ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    const endpointId = typeof params.endpointId === 'string' ? params.endpointId : params.endpointId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    let body: Partial<ApiCatalogEndpoint> = {}
    try { body = (await request.json()) as Partial<ApiCatalogEndpoint> } catch { /* ignore */ }
    const r = patchApiCatalogEndpoint(projectId, endpointId, body)
    if (!r.ok) return HttpResponse.json({ code: 40421, message: r.message, data: null })
    return HttpResponse.json({ code: 0, message: 'ok', data: r.data })
  }),

  http.delete('/api/v1/projects/:projectId/api-catalog/endpoints/:endpointId', ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    const endpointId = typeof params.endpointId === 'string' ? params.endpointId : params.endpointId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    const r = deleteApiCatalogEndpoint(projectId, endpointId)
    if (!r.ok) return HttpResponse.json({ code: 40421, message: r.message, data: null })
    return HttpResponse.json({ code: 0, message: 'ok', data: null })
  }),

  http.get('/api/v1/projects/:projectId/db-catalog/config', ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    return HttpResponse.json({ code: 0, message: 'ok', data: getDbCatalogConfig(projectId) })
  }),

  http.patch('/api/v1/projects/:projectId/db-catalog/config', async ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    const body = (await request.json().catch(() => ({}))) as { dialect?: 'sqlite' | 'sqlserver' | 'mysql' | null }
    return HttpResponse.json({ code: 0, message: 'ok', data: patchDbCatalogConfig(projectId, body) })
  }),

  http.get('/api/v1/projects/:projectId/db-catalog/tables', ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    return HttpResponse.json({ code: 0, message: 'ok', data: listDbCatalogTables(projectId) })
  }),

  http.post('/api/v1/projects/:projectId/db-catalog/tables', async ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    return HttpResponse.json({ code: 0, message: 'ok', data: createDbCatalogTable(projectId, body as never) })
  }),

  http.get('/api/v1/projects/:projectId/db-catalog/tables/:tableId', ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    const tableId = typeof params.tableId === 'string' ? params.tableId : params.tableId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    const row = getDbCatalogTable(projectId, tableId)
    if (!row) return HttpResponse.json({ code: 40401, message: '表不存在', data: null })
    return HttpResponse.json({ code: 0, message: 'ok', data: row })
  }),

  http.patch('/api/v1/projects/:projectId/db-catalog/tables/:tableId', async ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    const tableId = typeof params.tableId === 'string' ? params.tableId : params.tableId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const r = patchDbCatalogTable(projectId, tableId, body as never)
    if (!r.ok) return HttpResponse.json({ code: 40401, message: r.message, data: null })
    return HttpResponse.json({ code: 0, message: 'ok', data: r.data })
  }),

  http.delete('/api/v1/projects/:projectId/db-catalog/tables/:tableId', ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    const tableId = typeof params.tableId === 'string' ? params.tableId : params.tableId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    const ok = deleteDbCatalogTable(projectId, tableId)
    if (!ok) return HttpResponse.json({ code: 40401, message: '表不存在', data: null })
    return HttpResponse.json({ code: 0, message: 'ok', data: null })
  }),

  http.get('/api/v1/projects/:projectId/db-catalog/tables/:tableId/latest-alter', ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    const tableId = typeof params.tableId === 'string' ? params.tableId : params.tableId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    return HttpResponse.json({ code: 0, message: 'ok', data: getDbCatalogTableLatestAlter(projectId, tableId) })
  }),

  http.post('/api/v1/projects/:projectId/db-catalog/ddl', async ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    const body = (await request.json().catch(() => ({}))) as {
      dialect?: 'sqlite' | 'sqlserver' | 'mysql'
      scope?: 'all' | 'table'
      table_id?: string | null
      include_database?: boolean
      include_mock_data?: boolean
    }
    if (body.dialect !== 'sqlite' && body.dialect !== 'sqlserver' && body.dialect !== 'mysql') {
      return HttpResponse.json({ code: 40001, message: 'dialect 必填', data: null })
    }
    const scope = body.scope === 'table' ? 'table' : 'all'
    return HttpResponse.json({ code: 0, message: 'ok', data: generateDbCatalogDdl(projectId, { ...body, dialect: body.dialect, scope }) })
  }),

  http.post('/api/v1/projects/:projectId/db-catalog/ai-generate', async ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    const body = (await request.json().catch(() => ({}))) as { dialect?: 'sqlite' | 'sqlserver' | 'mysql' }
    if (body.dialect !== 'sqlite' && body.dialect !== 'sqlserver' && body.dialect !== 'mysql') {
      return HttpResponse.json({ code: 40001, message: 'dialect 必填', data: null })
    }
    return HttpResponse.json({ code: 0, message: 'ok', data: aiGenerateDbCatalogSchemaDraft(projectId, body.dialect) })
  }),

  http.post('/api/v1/projects/:projectId/db-catalog/design-doc/generate', async ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    const body = (await request.json().catch(() => ({}))) as { dialect?: 'sqlite' | 'sqlserver' | 'mysql'; include_ddl_snippets?: boolean }
    if (body.dialect !== 'sqlite' && body.dialect !== 'sqlserver' && body.dialect !== 'mysql') {
      return HttpResponse.json({ code: 40001, message: 'dialect 必填', data: null })
    }
    const include = body.include_ddl_snippets !== false
    return HttpResponse.json({ code: 0, message: 'ok', data: generateDbCatalogDesignDoc(projectId, body.dialect, include) })
  }),

  http.post('/api/v1/projects/:projectId/api-catalog/endpoints/ai-generate', async ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    let body: { mode?: ApiCatalogAiGenerateMode } = {}
    try { body = (await request.json()) as { mode?: ApiCatalogAiGenerateMode } } catch { /* ignore */ }
    const mode = body.mode === 'full_replace' ? 'full_replace' : 'incremental'
    return HttpResponse.json({ code: 0, message: 'ok', data: aiGenerateApiCatalogEndpoints(projectId, mode) })
  }),

  http.get('/api/v1/projects/:projectId/api-catalog/endpoints/ai-generate/latest', ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    const data = getApiCatalogLatestGenerateResult(projectId)
    if (!data) return HttpResponse.json({ code: 40422, message: '暂无生成记录', data: null })
    return HttpResponse.json({ code: 0, message: 'ok', data })
  }),

  http.get('/api/v1/projects/:projectId/api-catalog/tasks', ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    return HttpResponse.json({ code: 0, message: 'ok', data: listApiCatalogTasks(projectId) })
  }),

  http.put('/api/v1/projects/:projectId/api-catalog/endpoints/:endpointId/task-bindings', async ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    const endpointId = typeof params.endpointId === 'string' ? params.endpointId : params.endpointId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    let body: { task_ids?: string[] } = {}
    try { body = (await request.json()) as { task_ids?: string[] } } catch { /* ignore */ }
    const r = bindApiCatalogEndpointTasks(projectId, endpointId, Array.isArray(body.task_ids) ? body.task_ids : [])
    if (!r.ok) return HttpResponse.json({ code: 40421, message: r.message, data: null })
    return HttpResponse.json({ code: 0, message: 'ok', data: r.data })
  }),

  http.get('/api/v1/projects/:projectId/api-catalog/tasks/:taskId/endpoints', ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    const taskId = typeof params.taskId === 'string' ? params.taskId : params.taskId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    return HttpResponse.json({ code: 0, message: 'ok', data: listApiCatalogEndpointsByTask(projectId, taskId) })
  }),

  http.get('/api/v1/projects/:projectId/iterations', ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    return HttpResponse.json({ code: 0, message: 'ok', data: listPlanningIterations(projectId) })
  }),

  http.post('/api/v1/projects/:projectId/iterations', async ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    const body = (await request.json().catch(() => ({}))) as { name?: string; goal_summary?: string }
    if (!body.name || !body.goal_summary) {
      return HttpResponse.json({ code: 40001, message: 'name 与 goal_summary 必填', data: null })
    }
    return HttpResponse.json({ code: 0, message: 'ok', data: createPlanningIteration(projectId, body as never) })
  }),

  http.patch('/api/v1/projects/:projectId/iterations/reorder', async ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    const body = (await request.json().catch(() => ({}))) as { ordered_ids?: string[] }
    if (!Array.isArray(body.ordered_ids)) {
      return HttpResponse.json({ code: 40001, message: 'ordered_ids 必填', data: null })
    }
    reorderPlanningIterations(projectId, { ordered_ids: body.ordered_ids })
    return HttpResponse.json({ code: 0, message: 'ok', data: null })
  }),

  http.get('/api/v1/projects/:projectId/iterations/:iterationId', ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    const iterationId = typeof params.iterationId === 'string' ? params.iterationId : params.iterationId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    const row = getPlanningIteration(projectId, iterationId)
    if (!row) return HttpResponse.json({ code: 40423, message: '迭代不存在', data: null })
    return HttpResponse.json({ code: 0, message: 'ok', data: row })
  }),

  http.patch('/api/v1/projects/:projectId/iterations/:iterationId', async ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    const iterationId = typeof params.iterationId === 'string' ? params.iterationId : params.iterationId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const r = patchPlanningIteration(projectId, iterationId, body as never)
    if (!r.ok) return HttpResponse.json({ code: 40423, message: r.message, data: null })
    return HttpResponse.json({ code: 0, message: 'ok', data: r.data })
  }),

  http.delete('/api/v1/projects/:projectId/iterations/:iterationId', ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    const iterationId = typeof params.iterationId === 'string' ? params.iterationId : params.iterationId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    const r = deletePlanningIteration(projectId, iterationId)
    if (!r.ok) return HttpResponse.json({ code: 40423, message: r.message, data: null })
    return HttpResponse.json({ code: 0, message: 'ok', data: null })
  }),

  http.get('/api/v1/projects/:projectId/iterations/:iterationId/requirement-doc/versions', ({
    request,
    params,
  }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    const iterationId = typeof params.iterationId === 'string' ? params.iterationId : params.iterationId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    if (!getPlanningIteration(projectId, iterationId)) {
      return HttpResponse.json({ code: 40423, message: '迭代不存在', data: null })
    }
    return HttpResponse.json({ code: 0, message: 'ok', data: listIterationRequirementDocVersions(projectId, iterationId) })
  }),

  http.post('/api/v1/projects/:projectId/iterations/:iterationId/requirement-doc/versions', async ({
    request,
    params,
  }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    const iterationId = typeof params.iterationId === 'string' ? params.iterationId : params.iterationId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    if (!getPlanningIteration(projectId, iterationId)) {
      return HttpResponse.json({ code: 40423, message: '迭代不存在', data: null })
    }
    let body: RequirementDocVersionCreateOrAppendBody = {}
    try {
      body = (await request.json()) as RequirementDocVersionCreateOrAppendBody
    } catch {
      /* ignore */
    }
    if (typeof body.markdown === 'string' && typeof body.based_on_version_id === 'string') {
      const r = appendIterationRequirementDocVersion(projectId, iterationId, body.markdown, body.based_on_version_id)
      if (!r.ok) return HttpResponse.json({ code: 40002, message: r.message, data: null })
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
      const row = createIterationRequirementDocVersion(projectId, iterationId, body.mode)
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

  http.get('/api/v1/projects/:projectId/iterations/:iterationId/requirement-doc/versions/:versionId', ({
    request,
    params,
  }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    const iterationId = typeof params.iterationId === 'string' ? params.iterationId : params.iterationId?.[0] ?? ''
    const versionId = typeof params.versionId === 'string' ? params.versionId : params.versionId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    const row = getIterationRequirementDocVersion(projectId, iterationId, versionId)
    if (!row) return HttpResponse.json({ code: 40402, message: '版本不存在', data: null })
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

  http.patch('/api/v1/projects/:projectId/iterations/:iterationId/requirement-doc/versions/:versionId', async ({
    request,
    params,
  }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    const iterationId = typeof params.iterationId === 'string' ? params.iterationId : params.iterationId?.[0] ?? ''
    const versionId = typeof params.versionId === 'string' ? params.versionId : params.versionId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    let markdown = ''
    try {
      const b = (await request.json()) as { markdown?: string }
      markdown = typeof b.markdown === 'string' ? b.markdown : ''
    } catch {
      /* ignore */
    }
    const r = patchIterationRequirementDocVersion(projectId, iterationId, versionId, markdown)
    if (!r.ok) return HttpResponse.json({ code: 40003, message: r.message, data: null })
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

  http.delete('/api/v1/projects/:projectId/iterations/:iterationId/requirement-doc/versions/:versionId', ({
    request,
    params,
  }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    const iterationId = typeof params.iterationId === 'string' ? params.iterationId : params.iterationId?.[0] ?? ''
    const versionId = typeof params.versionId === 'string' ? params.versionId : params.versionId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    const r = deleteIterationRequirementDocVersion(projectId, iterationId, versionId)
    if (!r.ok) return HttpResponse.json({ code: 40402, message: r.message, data: null })
    return HttpResponse.json({
      code: 0,
      message: 'ok',
      data: listIterationRequirementDocVersions(projectId, iterationId),
    })
  }),

  http.get('/api/v1/projects/:projectId/stories/:storyId/requirement-doc/versions', ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    const storyId = typeof params.storyId === 'string' ? params.storyId : params.storyId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    if (!getPlanningStory(projectId, storyId)) {
      return HttpResponse.json({ code: 40423, message: 'Story 不存在', data: null })
    }
    return HttpResponse.json({ code: 0, message: 'ok', data: listStoryRequirementDocVersions(projectId, storyId) })
  }),

  http.post('/api/v1/projects/:projectId/stories/:storyId/requirement-doc/versions', async ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    const storyId = typeof params.storyId === 'string' ? params.storyId : params.storyId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    if (!getPlanningStory(projectId, storyId)) {
      return HttpResponse.json({ code: 40423, message: 'Story 不存在', data: null })
    }
    let body: RequirementDocVersionCreateOrAppendBody = {}
    try {
      body = (await request.json()) as RequirementDocVersionCreateOrAppendBody
    } catch {
      /* ignore */
    }
    if (typeof body.markdown === 'string' && typeof body.based_on_version_id === 'string') {
      const r = appendStoryRequirementDocVersion(projectId, storyId, body.markdown, body.based_on_version_id)
      if (!r.ok) return HttpResponse.json({ code: 40002, message: r.message, data: null })
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
      const row = createStoryRequirementDocVersion(projectId, storyId, body.mode)
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

  http.get('/api/v1/projects/:projectId/stories/:storyId/requirement-doc/versions/:versionId', ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    const storyId = typeof params.storyId === 'string' ? params.storyId : params.storyId?.[0] ?? ''
    const versionId = typeof params.versionId === 'string' ? params.versionId : params.versionId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    const row = getStoryRequirementDocVersion(projectId, storyId, versionId)
    if (!row) return HttpResponse.json({ code: 40402, message: '版本不存在', data: null })
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

  http.patch('/api/v1/projects/:projectId/stories/:storyId/requirement-doc/versions/:versionId', async ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    const storyId = typeof params.storyId === 'string' ? params.storyId : params.storyId?.[0] ?? ''
    const versionId = typeof params.versionId === 'string' ? params.versionId : params.versionId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    let markdown = ''
    try {
      const b = (await request.json()) as { markdown?: string }
      markdown = typeof b.markdown === 'string' ? b.markdown : ''
    } catch {
      /* ignore */
    }
    const r = patchStoryRequirementDocVersion(projectId, storyId, versionId, markdown)
    if (!r.ok) return HttpResponse.json({ code: 40003, message: r.message, data: null })
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

  http.delete('/api/v1/projects/:projectId/stories/:storyId/requirement-doc/versions/:versionId', ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    const storyId = typeof params.storyId === 'string' ? params.storyId : params.storyId?.[0] ?? ''
    const versionId = typeof params.versionId === 'string' ? params.versionId : params.versionId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    const r = deleteStoryRequirementDocVersion(projectId, storyId, versionId)
    if (!r.ok) return HttpResponse.json({ code: 40402, message: r.message, data: null })
    return HttpResponse.json({
      code: 0,
      message: 'ok',
      data: listStoryRequirementDocVersions(projectId, storyId),
    })
  }),

  http.post('/api/v1/projects/:projectId/planning/ai-apply', async ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    const body = (await request.json().catch(() => ({}))) as {
      mode?: string
      iterations?: unknown[]
      stories?: unknown[]
    }
    if (body.mode !== 'replace_all' && body.mode !== 'incremental') {
      return HttpResponse.json({ code: 40001, message: 'mode 须为 replace_all 或 incremental', data: null })
    }
    const mode = body.mode
    if (!Array.isArray(body.iterations) || !Array.isArray(body.stories)) {
      return HttpResponse.json({ code: 40001, message: 'iterations、stories 须为数组', data: null })
    }
    const r = applyIterationPlanningAi(projectId, mode, {
      iterations: body.iterations as never,
      stories: body.stories as never,
    })
    if (!r.ok) return HttpResponse.json({ code: 40002, message: r.message, data: null })
    return HttpResponse.json({ code: 0, message: 'ok', data: r.result })
  }),

  http.get('/api/v1/projects/:projectId/iterations/:iterationId/stories', ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    const iterationId = typeof params.iterationId === 'string' ? params.iterationId : params.iterationId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    return HttpResponse.json({ code: 0, message: 'ok', data: listPlanningStories(projectId, iterationId) })
  }),

  http.post('/api/v1/projects/:projectId/iterations/:iterationId/stories', async ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    const iterationId = typeof params.iterationId === 'string' ? params.iterationId : params.iterationId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    const body = (await request.json().catch(() => ({}))) as { title?: string; acceptance_criteria?: string[] }
    if (!body.title) return HttpResponse.json({ code: 40001, message: 'title 必填', data: null })
    const r = createPlanningStory(projectId, iterationId, body as never)
    if (!r.ok) return HttpResponse.json({ code: 40423, message: r.message, data: null })
    return HttpResponse.json({ code: 0, message: 'ok', data: r.data })
  }),

  http.patch('/api/v1/projects/:projectId/iterations/:iterationId/stories/reorder', async ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    const iterationId = typeof params.iterationId === 'string' ? params.iterationId : params.iterationId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    const body = (await request.json().catch(() => ({}))) as { ordered_ids?: string[] }
    if (!Array.isArray(body.ordered_ids)) {
      return HttpResponse.json({ code: 40001, message: 'ordered_ids 必填', data: null })
    }
    reorderPlanningStories(projectId, iterationId, { ordered_ids: body.ordered_ids })
    return HttpResponse.json({ code: 0, message: 'ok', data: null })
  }),

  http.get('/api/v1/projects/:projectId/stories/:storyId', ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    const storyId = typeof params.storyId === 'string' ? params.storyId : params.storyId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    const row = getPlanningStory(projectId, storyId)
    if (!row) return HttpResponse.json({ code: 40424, message: 'Story 不存在', data: null })
    return HttpResponse.json({ code: 0, message: 'ok', data: row })
  }),

  http.patch('/api/v1/projects/:projectId/stories/:storyId', async ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    const storyId = typeof params.storyId === 'string' ? params.storyId : params.storyId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const r = patchPlanningStory(projectId, storyId, body as never)
    if (!r.ok) return HttpResponse.json({ code: 40424, message: r.message, data: null })
    return HttpResponse.json({ code: 0, message: 'ok', data: r.data })
  }),

  http.delete('/api/v1/projects/:projectId/stories/:storyId', ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    const storyId = typeof params.storyId === 'string' ? params.storyId : params.storyId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    const r = deletePlanningStory(projectId, storyId)
    if (!r.ok) return HttpResponse.json({ code: 40424, message: r.message, data: null })
    return HttpResponse.json({ code: 0, message: 'ok', data: null })
  }),

  http.get('/api/v1/projects/:projectId/stories/:storyId/tasks', ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    const storyId = typeof params.storyId === 'string' ? params.storyId : params.storyId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    return HttpResponse.json({ code: 0, message: 'ok', data: listPlanningTasksByStory(projectId, storyId) })
  }),

  http.post('/api/v1/projects/:projectId/stories/:storyId/tasks', async ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    const storyId = typeof params.storyId === 'string' ? params.storyId : params.storyId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    const body = (await request.json().catch(() => ({}))) as { title?: string; type_suggestion?: string }
    if (!body.title || !body.type_suggestion) {
      return HttpResponse.json({ code: 40001, message: 'title 与 type_suggestion 必填', data: null })
    }
    const r = createPlanningTask(projectId, storyId, body as never)
    if (!r.ok) return HttpResponse.json({ code: 40424, message: r.message, data: null })
    return HttpResponse.json({ code: 0, message: 'ok', data: r.data })
  }),

  http.patch('/api/v1/projects/:projectId/stories/:storyId/tasks/reorder', async ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    const storyId = typeof params.storyId === 'string' ? params.storyId : params.storyId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    const body = (await request.json().catch(() => ({}))) as { ordered_ids?: string[] }
    if (!Array.isArray(body.ordered_ids)) {
      return HttpResponse.json({ code: 40001, message: 'ordered_ids 必填', data: null })
    }
    reorderPlanningTasks(projectId, storyId, { ordered_ids: body.ordered_ids })
    return HttpResponse.json({ code: 0, message: 'ok', data: null })
  }),

  http.get('/api/v1/projects/:projectId/tasks', ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    const url = new URL(request.url)
    const iteration_id = url.searchParams.get('iteration_id') || undefined
    const story_id = url.searchParams.get('story_id') || undefined
    const api_endpoint_id = url.searchParams.get('api_endpoint_id') || undefined
    const ts = url.searchParams.get('type_suggestion') || undefined
    const type_suggestion =
      ts === 'frontend' || ts === 'backend' || ts === 'qa' || ts === 'devops' || ts === 'other' ? ts : undefined
    return HttpResponse.json({
      code: 0,
      message: 'ok',
      data: listPlanningTasks(projectId, { iteration_id, story_id, api_endpoint_id, type_suggestion }),
    })
  }),

  http.get('/api/v1/projects/:projectId/tasks/:taskId', ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    const taskId = typeof params.taskId === 'string' ? params.taskId : params.taskId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    const row = getPlanningTask(projectId, taskId)
    if (!row) return HttpResponse.json({ code: 40425, message: 'Task 不存在', data: null })
    return HttpResponse.json({ code: 0, message: 'ok', data: row })
  }),

  http.patch('/api/v1/projects/:projectId/tasks/:taskId', async ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    const taskId = typeof params.taskId === 'string' ? params.taskId : params.taskId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const r = patchPlanningTask(projectId, taskId, body as never)
    if (!r.ok) return HttpResponse.json({ code: 40425, message: r.message, data: null })
    applyPlanningTaskProgressToLinkedEndpoints(projectId, r.data)
    return HttpResponse.json({ code: 0, message: 'ok', data: r.data })
  }),

  http.delete('/api/v1/projects/:projectId/tasks/:taskId', ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    const taskId = typeof params.taskId === 'string' ? params.taskId : params.taskId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    const r = deletePlanningTask(projectId, taskId)
    if (!r.ok) return HttpResponse.json({ code: 40425, message: r.message, data: null })
    return HttpResponse.json({ code: 0, message: 'ok', data: null })
  }),

  http.get('/api/v1/projects/:projectId/tasks/:taskId/comments', ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    const taskId = typeof params.taskId === 'string' ? params.taskId : params.taskId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    if (!getPlanningTask(projectId, taskId)) return HttpResponse.json({ code: 40425, message: 'Task 不存在', data: null })
    return HttpResponse.json({ code: 0, message: 'ok', data: listTaskComments(projectId, taskId) })
  }),

  http.post('/api/v1/projects/:projectId/tasks/:taskId/comments', async ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    const taskId = typeof params.taskId === 'string' ? params.taskId : params.taskId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    if (!getPlanningTask(projectId, taskId)) return HttpResponse.json({ code: 40425, message: 'Task 不存在', data: null })
    const body = (await request.json().catch(() => ({}))) as { content?: string }
    if (!body.content?.trim()) return HttpResponse.json({ code: 40001, message: 'content 必填', data: null })
    return HttpResponse.json({ code: 0, message: 'ok', data: createTaskComment(projectId, taskId, { content: body.content }) })
  }),

  http.get('/api/v1/projects/:projectId/tasks/:taskId/attachments', ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    const taskId = typeof params.taskId === 'string' ? params.taskId : params.taskId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    if (!getPlanningTask(projectId, taskId)) return HttpResponse.json({ code: 40425, message: 'Task 不存在', data: null })
    return HttpResponse.json({ code: 0, message: 'ok', data: listTaskAttachments(projectId, taskId) })
  }),

  http.post('/api/v1/projects/:projectId/tasks/:taskId/attachments', async ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    const taskId = typeof params.taskId === 'string' ? params.taskId : params.taskId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    if (!getPlanningTask(projectId, taskId)) return HttpResponse.json({ code: 40425, message: 'Task 不存在', data: null })
    const body = (await request.json().catch(() => ({}))) as { name?: string; url?: string }
    if (!body.name?.trim() || !body.url?.trim()) return HttpResponse.json({ code: 40001, message: 'name/url 必填', data: null })
    return HttpResponse.json({ code: 0, message: 'ok', data: createTaskAttachment(projectId, taskId, { name: body.name, url: body.url }) })
  }),

  http.get('/api/v1/projects/:projectId/tasks/:taskId/test-submissions', ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    const taskId = typeof params.taskId === 'string' ? params.taskId : params.taskId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    if (!getPlanningTask(projectId, taskId)) return HttpResponse.json({ code: 40425, message: 'Task 不存在', data: null })
    return HttpResponse.json({ code: 0, message: 'ok', data: listTaskTestSubmissions(projectId, taskId) })
  }),

  http.post('/api/v1/projects/:projectId/tasks/:taskId/test-submissions', async ({ request, params }) => {
    if (!bearerOk(request)) return HttpResponse.json({ code: 40100, message: '未登录', data: null }, { status: 401 })
    const projectId = typeof params.projectId === 'string' ? params.projectId : params.projectId?.[0] ?? ''
    const taskId = typeof params.taskId === 'string' ? params.taskId : params.taskId?.[0] ?? ''
    if (!mockProjects.find((r) => r.id === projectId)) return HttpResponse.json({ code: 40401, message: '项目不存在', data: null })
    if (!getPlanningTask(projectId, taskId)) return HttpResponse.json({ code: 40425, message: 'Task 不存在', data: null })
    const body = (await request.json().catch(() => ({}))) as { environment_notes?: string; test_notes?: string }
    if (!body.environment_notes?.trim() || !body.test_notes?.trim()) {
      return HttpResponse.json({ code: 40001, message: 'environment_notes/test_notes 必填', data: null })
    }
    return HttpResponse.json({
      code: 0,
      message: 'ok',
      data: createTaskTestSubmission(projectId, taskId, {
        environment_notes: body.environment_notes,
        test_notes: body.test_notes,
      }),
    })
  }),
]
