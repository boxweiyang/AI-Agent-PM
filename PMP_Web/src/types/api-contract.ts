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

/** GET /api/v1/projects 列表项（工作台卡片；字段均可选扩展，缺省由前端显示「—」） */
export type ProjectSummary = {
  id: string
  name: string
  status: string
  description?: string
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
}

/** POST /api/v1/projects、GET /api/v1/projects/{id} 成功载荷 */
export type ProjectOneData = ProjectSummary
