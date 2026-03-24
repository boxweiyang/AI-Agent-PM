import type {
  ApiCatalogAiGenerateMode,
  ApiCatalogConstraint,
  ApiCatalogConstraintVersionListData,
  ApiCatalogEndpoint,
  ApiCatalogParam,
  ApiCatalogResponseField,
  ApiHttpMethod,
  ApiCatalogTaskSummary,
} from '@/types/api-contract'

type ConstraintVersionRow = ApiCatalogConstraint & {
  version_no: number
  created_at: string
}

type ApiCatalogProjectState = {
  constraint_versions: ConstraintVersionRow[]
  endpoints: ApiCatalogEndpoint[]
  tasks: ApiCatalogTaskSummary[]
  latest_generate_result: {
    mode: ApiCatalogAiGenerateMode
    added: number
    skipped: number
    total_after: number
    constraint_version: string
    generated_at: string
  } | null
}

const byProject = new Map<string, ApiCatalogProjectState>()

function nowIso() {
  return new Date().toISOString()
}

function nextId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function initialConstraint(): ApiCatalogConstraint {
  return {
    id: 'api-constraint-default',
    version: 'v1',
    title: '通用接口约束',
    content_markdown:
      '## 统一约束\n- 所有接口响应使用统一包络：`{ code, message, data }`\n- 成功：`code=0`\n- 失败：`code!=0`，并返回可读 `message`\n',
    response_schema_json:
      '{\n  "code": 0,\n  "message": "ok",\n  "data": {}\n}',
    error_codes: [
      { code: '40001', meaning: '参数错误' },
      { code: '40100', meaning: '未登录或登录失效' },
      { code: '40300', meaning: '无权限' },
      { code: '40401', meaning: '资源不存在' },
      { code: '50000', meaning: '服务内部错误' },
    ],
    updated_at: nowIso(),
  }
}

function previewOfConstraint(c: ApiCatalogConstraint) {
  const t = c.title.trim()
  if (t) return t
  const firstLine = c.content_markdown
    .split('\n')
    .map((x) => x.trim())
    .find(Boolean)
  return firstLine || '接口约束'
}

function state(projectId: string): ApiCatalogProjectState {
  if (!byProject.has(projectId)) {
    byProject.set(projectId, {
      constraint_versions: [],
      endpoints: [],
      tasks: [
        { id: 'task-mock-1', title: '实现项目接口列表查询' },
        { id: 'task-mock-2', title: '完成新增接口定义后端接口' },
        { id: 'task-mock-3', title: '补齐接口管理联调测试用例' },
      ],
      latest_generate_result: null,
    })
  }
  return byProject.get(projectId)!
}

function sampleParams(method: ApiHttpMethod, path: string): ApiCatalogParam[] {
  const out: ApiCatalogParam[] = []
  if (path.includes(':id') || path.includes('{id}')) {
    out.push({ name: 'id', in: 'path', type: 'string', required: true, description: '资源 id' })
  }
  if (method === 'GET') {
    out.push({ name: 'page', in: 'query', type: 'number', required: false, description: '页码' })
  } else {
    out.push({ name: 'body', in: 'body', type: 'object', required: true, description: '请求体' })
  }
  return out
}

function sampleSuccessFields(): ApiCatalogResponseField[] {
  return [
    { name: 'code', type: 'number', description: '业务码，成功为 0' },
    { name: 'message', type: 'string', description: '说明信息' },
    { name: 'data', type: 'object', description: '业务数据' },
  ]
}

function sampleErrorFields(): ApiCatalogResponseField[] {
  return [
    { name: 'code', type: 'number', description: '错误码' },
    { name: 'message', type: 'string', description: '错误说明' },
    { name: 'data', type: 'null', description: '失败时通常为空' },
  ]
}

function keyOf(e: Pick<ApiCatalogEndpoint, 'method' | 'path'>) {
  return `${e.method} ${e.path}`
}

export function getApiCatalogConstraint(projectId: string) {
  const s = state(projectId)
  const latest = s.constraint_versions[s.constraint_versions.length - 1]
  return latest || null
}

export function patchApiCatalogConstraint(projectId: string, patch: Partial<ApiCatalogConstraint>) {
  const s = state(projectId)
  const current = s.constraint_versions[s.constraint_versions.length - 1]
  if (!current) return null
  const next: ConstraintVersionRow = {
    ...current,
    ...patch,
    id: current.id,
    updated_at: nowIso(),
  }
  s.constraint_versions[s.constraint_versions.length - 1] = next
  return next
}

export function aiGenerateApiCatalogConstraint(projectId: string) {
  const s = state(projectId)
  const latest = s.constraint_versions[s.constraint_versions.length - 1]
  if (!latest) {
    const row: ConstraintVersionRow = {
      ...initialConstraint(),
      id: nextId('api-constraint-ver'),
      version_no: 1,
      version: 'v1',
      created_at: nowIso(),
      updated_at: nowIso(),
    }
    s.constraint_versions.push(row)
    return row
  }
  const row: ConstraintVersionRow = {
    ...latest,
    id: nextId('api-constraint-ver'),
    version_no: latest.version_no + 1,
    version: `v${latest.version_no + 1}`,
    content_markdown:
      '## AI 生成通用接口约束（Mock）\n- 统一包络 `{ code, message, data }`\n- `code=0` 成功，其他为失败\n- 错误码定义统一由平台维护\n- 前后端返回结构必须严格遵循约束\n',
    created_at: nowIso(),
    updated_at: nowIso(),
  }
  s.constraint_versions.push(row)
  return row
}

export function listApiCatalogConstraintVersions(projectId: string): ApiCatalogConstraintVersionListData {
  const rows = state(projectId).constraint_versions
  const items = rows.map((r) => ({
    id: r.id,
    version_no: r.version_no,
    created_at: r.created_at,
    preview: previewOfConstraint(r),
  }))
  return {
    items,
    latest_version_id: items.length ? items[items.length - 1]!.id : null,
  }
}

export function getApiCatalogConstraintVersion(projectId: string, versionId: string) {
  const s = state(projectId)
  const row = s.constraint_versions.find((x) => x.id === versionId)
  if (!row) return null
  return { ...row, is_latest: s.constraint_versions[s.constraint_versions.length - 1]?.id === row.id }
}

export function createApiCatalogConstraintVersion(projectId: string, mode: 'empty' | 'from_latest') {
  const s = state(projectId)
  const latest = s.constraint_versions[s.constraint_versions.length - 1] || null
  const nextNo = (latest?.version_no || 0) + 1
  const base = mode === 'from_latest' && latest
    ? latest
    : {
        ...initialConstraint(),
        title: '通用接口约束',
        content_markdown: '## 通用接口约束\n',
        response_schema_json: '{\n  "code": 0,\n  "message": "ok",\n  "data": {}\n}',
        error_codes: [],
      }
  const row: ConstraintVersionRow = {
    ...base,
    id: nextId('api-constraint-ver'),
    version_no: nextNo,
    version: `v${nextNo}`,
    created_at: nowIso(),
    updated_at: nowIso(),
  }
  s.constraint_versions.push(row)
  return row
}

export function appendApiCatalogConstraintVersion(projectId: string, markdown: string, basedOnVersionId: string) {
  const s = state(projectId)
  const latest = s.constraint_versions[s.constraint_versions.length - 1]
  if (!latest) return { ok: false as const, message: '暂无可基于的约束版本' }
  if (latest.id !== basedOnVersionId) return { ok: false as const, message: '仅允许基于最新版本创建新版本' }
  const row: ConstraintVersionRow = {
    ...latest,
    id: nextId('api-constraint-ver'),
    version_no: latest.version_no + 1,
    version: `v${latest.version_no + 1}`,
    content_markdown: markdown,
    created_at: nowIso(),
    updated_at: nowIso(),
  }
  s.constraint_versions.push(row)
  return { ok: true as const, data: { ...row, is_latest: true } }
}

export function deleteApiCatalogConstraintVersion(projectId: string, versionId: string) {
  const s = state(projectId)
  const idx = s.constraint_versions.findIndex((x) => x.id === versionId)
  if (idx < 0) return { ok: false as const, message: '约束版本不存在' }
  s.constraint_versions.splice(idx, 1)
  return { ok: true as const, data: listApiCatalogConstraintVersions(projectId) }
}

export function listApiCatalogEndpoints(projectId: string) {
  return { items: [...state(projectId).endpoints] }
}

export function createApiCatalogEndpoint(projectId: string, body: Partial<ApiCatalogEndpoint>) {
  const s = state(projectId)
  const row: ApiCatalogEndpoint = {
    id: nextId('api'),
    name: String(body.name || '未命名接口'),
    method: (body.method as ApiHttpMethod) || 'GET',
    path: String(body.path || '/api/v1/placeholder'),
    summary: String(body.summary || ''),
    detail_description: String(body.detail_description || ''),
    status: body.status || 'draft',
    group_refs: body.group_refs || {},
    request_params: body.request_params || [],
    response_success_params: body.response_success_params || sampleSuccessFields(),
    response_error_params: body.response_error_params || sampleErrorFields(),
    fe_status: body.fe_status || 'todo',
    be_status: body.be_status || 'todo',
    qa_status: body.qa_status || 'todo',
    updated_at: nowIso(),
  }
  s.endpoints.push(row)
  return row
}

export function patchApiCatalogEndpoint(projectId: string, endpointId: string, patch: Partial<ApiCatalogEndpoint>) {
  const s = state(projectId)
  const row = s.endpoints.find((x) => x.id === endpointId)
  if (!row) return { ok: false as const, message: '接口不存在' }
  Object.assign(row, patch, { id: row.id, updated_at: nowIso() })
  return { ok: true as const, data: row }
}

export function deleteApiCatalogEndpoint(projectId: string, endpointId: string) {
  const s = state(projectId)
  const idx = s.endpoints.findIndex((x) => x.id === endpointId)
  if (idx < 0) return { ok: false as const, message: '接口不存在' }
  s.endpoints.splice(idx, 1)
  return { ok: true as const }
}

export function aiGenerateApiCatalogEndpoints(projectId: string, mode: ApiCatalogAiGenerateMode) {
  const s = state(projectId)
  // 仅在还没有任何约束版本时，自动生成首版约束
  if (s.constraint_versions.length === 0) {
    aiGenerateApiCatalogConstraint(projectId)
  }
  const generated: ApiCatalogEndpoint[] = [
    {
      id: nextId('api'),
      name: '获取接口清单',
      method: 'GET',
      path: '/api/v1/projects/{projectId}/api-catalog/endpoints',
      summary: '分页获取接口定义列表',
      detail_description:
        '用于接口管理页初始加载与刷新。支持按分组、状态、关键字筛选，返回当前项目可见接口定义集合。',
      status: 'draft',
      group_refs: { common_group: '公共功能', requirement_module: '接口管理', delivery_part: '后端服务' },
      request_params: sampleParams('GET', '/api/v1/projects/{projectId}/api-catalog/endpoints'),
      response_success_params: sampleSuccessFields(),
      response_error_params: sampleErrorFields(),
      fe_status: 'todo',
      be_status: 'todo',
      qa_status: 'todo',
      updated_at: nowIso(),
      bound_task_ids: [],
    },
    {
      id: nextId('api'),
      name: '新增接口定义',
      method: 'POST',
      path: '/api/v1/projects/{projectId}/api-catalog/endpoints',
      summary: '创建一条接口定义',
      detail_description:
        '创建新的接口元数据（方法、路径、参数、返回字段、分组信息）。成功后可立即用于前后端协同与 Task 绑定。',
      status: 'draft',
      group_refs: { common_group: '公共功能', requirement_module: '接口管理', delivery_part: '后端服务' },
      request_params: sampleParams('POST', '/api/v1/projects/{projectId}/api-catalog/endpoints'),
      response_success_params: sampleSuccessFields(),
      response_error_params: sampleErrorFields(),
      fe_status: 'todo',
      be_status: 'todo',
      qa_status: 'todo',
      updated_at: nowIso(),
      bound_task_ids: [],
    },
    {
      id: nextId('api'),
      name: '更新接口定义',
      method: 'PATCH',
      path: '/api/v1/projects/{projectId}/api-catalog/endpoints/{endpointId}',
      summary: '修改接口定义内容与分组',
      detail_description:
        '在评审阶段对接口定义进行修订，包括参数字段、错误码描述、分组归属、状态流转等。',
      status: 'draft',
      group_refs: { common_group: '公共功能', requirement_module: '接口管理', delivery_part: '后端服务' },
      request_params: [
        { name: 'projectId', in: 'path', type: 'string', required: true, description: '项目 id' },
        { name: 'endpointId', in: 'path', type: 'string', required: true, description: '接口 id' },
        { name: 'body', in: 'body', type: 'object', required: true, description: '变更内容' },
      ],
      response_success_params: sampleSuccessFields(),
      response_error_params: sampleErrorFields(),
      fe_status: 'todo',
      be_status: 'todo',
      qa_status: 'todo',
      updated_at: nowIso(),
      bound_task_ids: [],
    },
    {
      id: nextId('api'),
      name: '获取当前用户信息',
      method: 'GET',
      path: '/api/v1/auth/me',
      summary: '登录后读取用户摘要与权限',
      detail_description:
        '前端会话恢复时调用，返回当前用户身份、权限编码与管理员标记，用于控制菜单与操作权限。',
      status: 'reviewed',
      group_refs: { common_group: '鉴权', requirement_module: '用户与权限', delivery_part: '后端服务' },
      request_params: [{ name: 'Authorization', in: 'header', type: 'string', required: true, description: 'Bearer token' }],
      response_success_params: sampleSuccessFields(),
      response_error_params: sampleErrorFields(),
      fe_status: 'done',
      be_status: 'done',
      qa_status: 'todo',
      updated_at: nowIso(),
      bound_task_ids: [],
    },
    {
      id: nextId('api'),
      name: '获取项目详情',
      method: 'GET',
      path: '/api/v1/projects/{projectId}',
      summary: '读取项目基础信息与模块开关',
      detail_description:
        '用于项目内页面头部和模块入口判定，包含项目元信息、artifacts 开关及技术选型摘要。',
      status: 'reviewed',
      group_refs: { common_group: '项目管理', requirement_module: '项目管理', delivery_part: '后端服务' },
      request_params: [{ name: 'projectId', in: 'path', type: 'string', required: true, description: '项目 id' }],
      response_success_params: sampleSuccessFields(),
      response_error_params: sampleErrorFields(),
      fe_status: 'done',
      be_status: 'done',
      qa_status: 'done',
      updated_at: nowIso(),
      bound_task_ids: [],
    },
    {
      id: nextId('api'),
      name: '获取技术设计模块列表',
      method: 'GET',
      path: '/api/v1/projects/{projectId}/tech-design-doc/modules',
      summary: '按交付部分返回技术设计模块',
      detail_description:
        '技术设计页按交付部分展示文档树时调用，返回固定命名的模块信息与版本统计。',
      status: 'draft',
      group_refs: { common_group: '技术设计', requirement_module: '技术设计', delivery_part: '后端服务' },
      request_params: [{ name: 'projectId', in: 'path', type: 'string', required: true, description: '项目 id' }],
      response_success_params: sampleSuccessFields(),
      response_error_params: sampleErrorFields(),
      fe_status: 'todo',
      be_status: 'done',
      qa_status: 'todo',
      updated_at: nowIso(),
      bound_task_ids: [],
    },
    {
      id: nextId('api'),
      name: '首次自动创建技术设计文档',
      method: 'POST',
      path: '/api/v1/projects/{projectId}/tech-design-doc/modules/auto-create-first',
      summary: '按技术选型批量生成各交付部分首版',
      detail_description:
        '首次技术设计初始化接口。读取技术选型与需求文档，批量生成每个交付部分的 v1 文档，失败整体回滚。',
      status: 'draft',
      group_refs: { common_group: '技术设计', requirement_module: '技术设计', delivery_part: '后端服务' },
      request_params: [{ name: 'projectId', in: 'path', type: 'string', required: true, description: '项目 id' }],
      response_success_params: sampleSuccessFields(),
      response_error_params: sampleErrorFields(),
      fe_status: 'todo',
      be_status: 'done',
      qa_status: 'todo',
      updated_at: nowIso(),
      bound_task_ids: [],
    },
    {
      id: nextId('api'),
      name: '保存接口约束',
      method: 'PATCH',
      path: '/api/v1/projects/{projectId}/api-catalog/constraints',
      summary: '更新通用接口约束与错误码字典',
      detail_description:
        '维护全局 API 约束，包括统一响应包络、错误码含义、字段命名规则等，供前后端和测试统一参照。',
      status: 'draft',
      group_refs: { common_group: '接口管理', requirement_module: '接口管理', delivery_part: '后端服务' },
      request_params: [
        { name: 'projectId', in: 'path', type: 'string', required: true, description: '项目 id' },
        { name: 'body', in: 'body', type: 'object', required: true, description: '约束内容' },
      ],
      response_success_params: sampleSuccessFields(),
      response_error_params: sampleErrorFields(),
      fe_status: 'done',
      be_status: 'todo',
      qa_status: 'todo',
      updated_at: nowIso(),
      bound_task_ids: [],
    },
    {
      id: nextId('api'),
      name: '绑定接口与Task',
      method: 'PUT',
      path: '/api/v1/projects/{projectId}/api-catalog/endpoints/{endpointId}/task-bindings',
      summary: '维护接口与任务的绑定关系',
      detail_description:
        '将一个接口与多个 Task 建立关联，用于后续通过 Task 进度反推接口实现状态与测试完成状态。',
      status: 'draft',
      group_refs: { common_group: '接口管理', requirement_module: 'Task协同', delivery_part: '后端服务' },
      request_params: [
        { name: 'projectId', in: 'path', type: 'string', required: true, description: '项目 id' },
        { name: 'endpointId', in: 'path', type: 'string', required: true, description: '接口 id' },
        { name: 'body', in: 'body', type: 'object', required: true, description: 'task_ids 列表' },
      ],
      response_success_params: sampleSuccessFields(),
      response_error_params: sampleErrorFields(),
      fe_status: 'todo',
      be_status: 'done',
      qa_status: 'todo',
      updated_at: nowIso(),
      bound_task_ids: [],
    },
  ]

  if (mode === 'full_replace') {
    s.endpoints = generated
    s.latest_generate_result = {
      mode,
      added: generated.length,
      skipped: 0,
      total_after: s.endpoints.length,
      constraint_version: s.constraint_versions[s.constraint_versions.length - 1]?.version || '-',
      generated_at: nowIso(),
    }
    return { items: [...s.endpoints], ...s.latest_generate_result }
  }
  const existing = new Set(s.endpoints.map((x) => keyOf(x)))
  let skipped = 0
  generated.forEach((g) => {
    const k = keyOf(g)
    if (existing.has(k)) {
      skipped += 1
      return
    }
    s.endpoints.push(g)
    existing.add(k)
  })
  s.latest_generate_result = {
    mode,
    added: generated.length - skipped,
    skipped,
    total_after: s.endpoints.length,
    constraint_version: s.constraint_versions[s.constraint_versions.length - 1]?.version || '-',
    generated_at: nowIso(),
  }
  return { items: [...s.endpoints], ...s.latest_generate_result }
}

export function listApiCatalogTasks(projectId: string) {
  return { items: [...state(projectId).tasks] }
}

export function listApiCatalogEndpointsByTask(projectId: string, taskId: string) {
  const s = state(projectId)
  return {
    items: s.endpoints.filter((e) => (e.bound_task_ids || []).includes(taskId)),
  }
}

export function bindApiCatalogEndpointTasks(projectId: string, endpointId: string, taskIds: string[]) {
  const s = state(projectId)
  const row = s.endpoints.find((x) => x.id === endpointId)
  if (!row) return { ok: false as const, message: '接口不存在' }
  const taskSet = new Set(s.tasks.map((t) => t.id))
  row.bound_task_ids = taskIds.filter((id) => taskSet.has(id))
  row.updated_at = nowIso()
  return { ok: true as const, data: row }
}

export function getApiCatalogLatestGenerateResult(projectId: string) {
  return state(projectId).latest_generate_result
}
