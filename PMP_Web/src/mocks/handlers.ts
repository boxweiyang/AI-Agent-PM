/**
 * MSW 请求处理器：与仓库根 `contracts/openapi/openapi.yaml` 对齐。
 * 新增/变更接口时：**先改契约 → 再改此处 → 再改页面**，避免 Mock 与后端分叉。
 * @see https://mswjs.io/docs/
 */
import { http, HttpResponse } from 'msw'

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
  updated_at?: string
  progress_percent?: number
  iteration_number?: number
  story_count?: number
  task_open_count?: number
  task_total_count?: number
  bug_open_count?: number
  planned_end_at?: string
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
    updated_at: '2026-03-20T08:00:00Z',
    progress_percent: 62,
    iteration_number: 3,
    story_count: 14,
    task_open_count: 7,
    task_total_count: 22,
    bug_open_count: 3,
    planned_end_at: '2026-04-15T23:59:59+08:00',
  },
  {
    id: 'proj-demo-2',
    name: '示例项目 Beta',
    status: '进行中',
    description: '同状态下第二张卡片，观察一行两列布局与进度条。',
    updated_at: '2026-03-19T16:20:00Z',
    progress_percent: 28,
    iteration_number: 5,
    story_count: 8,
    task_open_count: 12,
    task_total_count: 18,
    bug_open_count: 1,
    planned_end_at: '2026-03-25T00:00:00Z',
  },
  {
    id: 'proj-demo-3',
    name: '立项演示 Gamma',
    status: '立项流程中',
    description: '立项与范围确认阶段，进度与任务数偏低属正常。',
    updated_at: '2026-03-18T10:30:00Z',
    progress_percent: 12,
    iteration_number: 1,
    story_count: 3,
    task_open_count: 4,
    task_total_count: 5,
    bug_open_count: 0,
    planned_end_at: '2026-05-01T00:00:00+08:00',
  },
  {
    id: 'proj-demo-4',
    name: '资源冻结 Delta',
    status: '暂停',
    description: '业务暂停示例：逾期计划用于验证红色剩余天数提示。',
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
    updated_at: '2025-12-01T18:00:00Z',
    progress_percent: 100,
    iteration_number: 8,
    story_count: 20,
    task_open_count: 0,
    task_total_count: 40,
    bug_open_count: 0,
    planned_end_at: '2025-11-30T00:00:00Z',
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
    let body: { name?: string; description?: string; status?: string } = {}
    try {
      body = (await request.json()) as typeof body
    } catch {
      /* ignore */
    }
    const name = (body.name ?? '').trim()
    if (!name) {
      return HttpResponse.json({ code: 40001, message: '项目名称为必填', data: null })
    }
    const item: MockProjectRow = {
      id: `proj-${Date.now()}`,
      name,
      description: (body.description ?? '').trim() || undefined,
      status: (body.status ?? '立项流程中').trim() || '立项流程中',
      updated_at: new Date().toISOString(),
      progress_percent: 0,
      iteration_number: 1,
      story_count: 0,
      task_open_count: 0,
      task_total_count: 0,
      bug_open_count: 0,
    }
    mockProjects = [item, ...mockProjects]
    return HttpResponse.json({
      code: 0,
      message: 'ok',
      data: item,
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

  http.post('/api/v1/ai/invoke', async ({ request }) => {
    let body: AiInvokeBody = {}
    try {
      body = (await request.json()) as AiInvokeBody
    } catch {
      /* empty body */
    }
    const capability = body.capability ?? 'echo'
    const message = (body.payload?.message as string | undefined) ?? ''
    return HttpResponse.json({
      code: 0,
      message: 'ok',
      data: { echo: message, capability },
    })
  }),
]
