/**
 * 项目内关联模块入口（与 REQ-MASTER M02～M11 对齐）。
 * - `artifactKey` 对应契约 `ProjectSummary.artifacts` 布尔键；Mock 可 PATCH 合并。
 * - 路由挂在 `/projects/:projectId/` 下，由 `projectLayoutRoutes.ts` 展开注册。
 */
export type ProjectRelatedModuleDef = {
  path: string
  name: string
  artifactKey: string
  label: string
  reqRef: string
}

export const PROJECT_RELATED_MODULES: ProjectRelatedModuleDef[] = [
  { path: 'm02/requirements', name: 'project-m02-requirements', artifactKey: 'req_doc', label: '需求与文档', reqRef: 'REQ-M02' },
  { path: 'm02b/design', name: 'project-m02b-design', artifactKey: 'tech_design', label: '技术设计', reqRef: 'REQ-M02B' },
  { path: 'm02c/apis', name: 'project-m02c-apis', artifactKey: 'api_catalog', label: '接口管理', reqRef: 'REQ-M02C' },
  { path: 'm02d/schema', name: 'project-m02d-schema', artifactKey: 'db_schema', label: '数据库结构', reqRef: 'REQ-M02D' },
  { path: 'm03/iterations', name: 'project-m03-iterations', artifactKey: 'iteration_board', label: '迭代与 Story', reqRef: 'REQ-M03' },
  { path: 'm04/tasks', name: 'project-m04-tasks', artifactKey: 'task_board', label: 'Task 与执行', reqRef: 'REQ-M04' },
  { path: 'm05/resources', name: 'project-m05-resources', artifactKey: 'resource_plan', label: '人力池与预订', reqRef: 'REQ-M05' },
  { path: 'm06/changes', name: 'project-m06-changes', artifactKey: 'change_requests', label: '变更请求 CR', reqRef: 'REQ-M06' },
  { path: 'm07/quality', name: 'project-m07-quality', artifactKey: 'test_harness', label: '测试与协同', reqRef: 'REQ-M07' },
  { path: 'm08/dashboard', name: 'project-m08-dashboard', artifactKey: 'dashboard_board', label: '项目 Dashboard', reqRef: 'REQ-M08' },
  { path: 'm10/closure', name: 'project-m10-closure', artifactKey: 'closure_pack', label: '收尾与知识', reqRef: 'REQ-M10' },
  { path: 'm11/ai', name: 'project-m11-ai', artifactKey: 'ai_workspace', label: 'AI 中心', reqRef: 'REQ-M11' },
]
