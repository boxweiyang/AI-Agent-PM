import type {
  ApiCatalogAiGenerateMode,
  ApiCatalogConstraint,
  ApiCatalogEndpoint,
  ApiCatalogParam,
  ApiCatalogResponseField,
  ApiHttpMethod,
  ApiCatalogTaskSummary,
} from '@/types/api-contract'

type ApiCatalogProjectState = {
  constraint: ApiCatalogConstraint
  endpoints: ApiCatalogEndpoint[]
  tasks: ApiCatalogTaskSummary[]
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

function state(projectId: string): ApiCatalogProjectState {
  if (!byProject.has(projectId)) {
    byProject.set(projectId, {
      constraint: initialConstraint(),
      endpoints: [],
      tasks: [
        { id: 'task-mock-1', title: '实现项目接口列表查询' },
        { id: 'task-mock-2', title: '完成新增接口定义后端接口' },
        { id: 'task-mock-3', title: '补齐接口管理联调测试用例' },
      ],
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
  return state(projectId).constraint
}

export function patchApiCatalogConstraint(projectId: string, patch: Partial<ApiCatalogConstraint>) {
  const s = state(projectId)
  s.constraint = {
    ...s.constraint,
    ...patch,
    id: s.constraint.id,
    updated_at: nowIso(),
  }
  return s.constraint
}

export function aiGenerateApiCatalogConstraint(projectId: string) {
  const s = state(projectId)
  s.constraint = {
    ...s.constraint,
    version: `v${Math.max(1, Number(s.constraint.version.replace(/\D/g, '') || 1))}`,
    content_markdown:
      '## AI 生成通用接口约束（Mock）\n- 统一包络 `{ code, message, data }`\n- `code=0` 成功，其他为失败\n- 错误码定义统一由平台维护\n- 前后端返回结构必须严格遵循约束\n',
    updated_at: nowIso(),
  }
  return s.constraint
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
  const generated: ApiCatalogEndpoint[] = [
    {
      id: nextId('api'),
      name: '获取项目接口列表',
      method: 'GET',
      path: '/api/v1/projects/{projectId}/api-catalog/endpoints',
      summary: '分页获取接口清单',
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
  ]

  if (mode === 'full_replace') {
    s.endpoints = generated
    return { items: [...s.endpoints], mode, added: generated.length, skipped: 0 }
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
  return { items: [...s.endpoints], mode, added: generated.length - skipped, skipped }
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
