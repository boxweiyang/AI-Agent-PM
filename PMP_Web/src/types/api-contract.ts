/**
 * 与仓库根 `contracts/openapi/openapi.yaml` 中 schema 对齐的 **前端类型子集**。
 * 后续可用 openapi-typescript 从契约生成并替换本文件，减少手写漂移。
 */

/** 统一响应包络（TECH-002 / TECH-004） */
export type ApiEnvelope<T> = {
  code: number
  message: string
  data: T
}

/** GET /api/v1/auth/me 与登录返回中的 user 摘要 */
export type UserMe = {
  id: string
  username: string
  display_name: string
  is_system_admin: boolean
  /** 有效权限编码并集；系统管理员在业务上可忽略此字段 */
  permission_codes: string[]
  /** 为 true 时顶栏展示「Mock」标签（演示/MSW）；真实后端默认省略或 false */
  is_mock_profile?: boolean
}

/** POST /api/v1/auth/login 请求体（契约 LoginRequest） */
export type LoginRequestBody = {
  username: string
  password: string
  /** 与 TECH-004 的 Refresh 7 天窗口对齐：服务端可据此设置会话/ Cookie 策略 */
  remember_7d?: boolean
}

/** POST /api/v1/auth/login 成功载荷 */
export type AuthLoginData = {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  user: UserMe
}

/** POST /api/v1/auth/refresh 成功载荷（与登录类似，含轮换后的 token 对） */
export type AuthRefreshData = AuthLoginData

/** 项目级技术选型条目（契约 `TechDeliveryPart`） */
export type TechDeliveryPart = {
  id: string
  delivery_kind: string
  custom_label?: string
  technologies?: string
  database?: string
  architecture?: string
  notes?: string
}

/** GET /api/v1/projects 列表项（工作台卡片；字段均可选扩展，缺省由前端显示「—」） */
export type ProjectSummary = {
  id: string
  name: string
  status: string
  description?: string
  /** REQ-M01 项目简介 */
  introduction?: string
  /** REQ-M01 项目背景 */
  background?: string
  /** REQ-M01 计划开始（ISO8601） */
  planned_start_at?: string
  /** REQ-M01 技术负责人 */
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
  /** 人力与技术栈是否标记为后续补全（REQ-M01 §3.3） */
  manpower_stack_deferred?: boolean
  updated_at?: string
  /** 0–100 */
  progress_percent?: number
  /** 当前第几次迭代（从 1 起；可选） */
  iteration_number?: number
  story_count?: number
  task_open_count?: number
  task_total_count?: number
  bug_open_count?: number
  /** 预计完成时间（ISO8601） */
  planned_end_at?: string
  /** 各模块资产是否已生成（键如 req_doc、tech_design，见 OpenAPI 说明） */
  artifacts?: Record<string, boolean>
  /** REQ-M02B 技术选型：按交付形态拆分的技术栈 / 库 / 架构决策 */
  tech_delivery_parts?: TechDeliveryPart[]
}

export type ProjectListData = {
  items: ProjectSummary[]
}

/** POST /api/v1/projects 请求体（契约 ProjectCreateRequest） */
export type ProjectCreateRequestBody = {
  name: string
  description?: string
  /** 缺省由服务端定为「立项流程中」 */
  status?: string
  background?: string
  introduction?: string
  planned_start_at?: string
  planned_end_at?: string
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
  tech_delivery_parts?: TechDeliveryPart[]
}

/** PATCH /api/v1/projects/{projectId}（契约 ProjectPatchRequest） */
export type ProjectPatchRequestBody = {
  name?: string
  status?: string
  description?: string
  introduction?: string
  background?: string
  planned_start_at?: string
  planned_end_at?: string
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
  artifacts?: Record<string, boolean>
  /** 若传入则整表替换 */
  tech_delivery_parts?: TechDeliveryPart[]
}

/** POST /api/v1/projects、GET /api/v1/projects/{id} 成功载荷 */
export type ProjectOneData = ProjectSummary

/** GET /api/v1/projects/{projectId}/dashboard（REQ-M08） */
export type DashboardIterationOption = {
  id: string
  name: string
  is_current: boolean
}

export type DashboardMetricLine = {
  label: string
  value: string
}

export type DashboardCardDrill = {
  route_name: string
  query?: Record<string, string>
}

/** Dashboard 卡片内嵌 ECharts：`option` 与 `echarts.setOption` 一致（Mock 由服务端/Mock 生成） */
export type DashboardChartSpec = {
  id: string
  title: string
  option: Record<string, unknown>
}

export type DashboardCard = {
  kind: string
  title: string
  metrics: DashboardMetricLine[]
  drill?: DashboardCardDrill
  /** 多角度小图；点击后在弹窗中放大 */
  charts?: DashboardChartSpec[]
}

export type DashboardRiskItem = {
  id: string
  kind: string
  title: string
  subtitle: string
  severity_rank?: number
}

export type ProjectDashboardData = {
  scope_label: string
  iteration_key: string
  iteration_options: DashboardIterationOption[]
  cards: DashboardCard[]
  risk_items: DashboardRiskItem[]
}

/** GET …/requirement-doc/versions */
export type RequirementDocVersionListItem = {
  id: string
  version_no: number
  created_at: string
  preview: string
}

export type RequirementDocVersionListData = {
  items: RequirementDocVersionListItem[]
  latest_version_id: string | null
}

/** GET/PATCH/POST 返回的单条详情 */
export type RequirementDocVersionDetail = {
  id: string
  version_no: number
  markdown: string
  is_latest: boolean
  created_at: string
}

/** POST …/versions：列表创建 或 详情保存为新版本 */
export type RequirementDocVersionCreateOrAppendBody = {
  mode?: 'empty' | 'from_latest'
  markdown?: string
  based_on_version_id?: string
}

/** PATCH …/versions/{id} */
export type RequirementDocVersionPatchBody = {
  markdown: string
}

/** REQ-M02B：`…/tech-design-doc/versions` 与需求文档版本链字段一致 */
export type TechDesignDocVersionListItem = RequirementDocVersionListItem
export type TechDesignDocVersionListData = RequirementDocVersionListData
export type TechDesignDocVersionDetail = RequirementDocVersionDetail
export type TechDesignDocVersionCreateOrAppendBody = RequirementDocVersionCreateOrAppendBody
export type TechDesignDocVersionPatchBody = RequirementDocVersionPatchBody

/** REQ-M02B：按交付部分拆分的技术设计文档模块摘要 */
export type TechDesignDocModuleSummary = {
  id: string
  delivery_part_id: string
  fixed_doc_name: string
  title: string
  summary: string
  sort_order: number
  version_count: number
  latest_version_id: string | null
  created_at: string
  updated_at: string
}

export type TechDesignDocModuleListData = {
  items: TechDesignDocModuleSummary[]
}

export type TechDesignDocModuleAutoCreateResultData = {
  items: TechDesignDocModuleSummary[]
  created_count: number
}

/** GET …/requirement-doc/modules */
export type RequirementDocModuleSummary = {
  id: string
  title: string
  summary: string
  sort_order: number
  version_count: number
  latest_version_id: string | null
  created_at: string
  updated_at: string
}

export type RequirementDocModuleListData = {
  items: RequirementDocModuleSummary[]
}

export type RequirementDocModuleCreateBody = {
  title: string
  summary?: string
}

export type RequirementDocModulePatchBody = {
  title?: string
  summary?: string
}

export type RequirementDocModuleReorderBody = {
  ordered_module_ids: string[]
}

export type RequirementDocModuleAiSplitRequest = {
  mode: 'full_replace' | 'incremental'
}

export type RequirementDocModuleAiSplitResultData = RequirementDocModuleListData & {
  mode: 'full_replace' | 'incremental'
  /** 本次新落库的模块标题（全量时为全部新建；增量时为真正新增的） */
  added_titles: string[]
  /** 增量模式下因「同名模块已存在」而跳过的 AI 建议标题 */
  skipped_titles: string[]
}
