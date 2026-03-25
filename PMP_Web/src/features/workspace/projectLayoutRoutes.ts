import type { RouteRecordRaw } from 'vue-router'

import { PROJECT_RELATED_MODULES } from '@/config/projectRelatedModules'

/** 已接真实页面的模块路由名（其余走占位页） */
const IMPLEMENTED_PROJECT_MODULE_NAMES = new Set([
  'project-m02-requirements',
  'project-m02b-design',
  'project-m02c-apis',
  'project-m03-iterations',
  'project-m04-tasks',
])

const PLACEHOLDER_MODULES = PROJECT_RELATED_MODULES.filter((m) => !IMPLEMENTED_PROJECT_MODULE_NAMES.has(m.name))

const projectModuleChildren: RouteRecordRaw[] = PLACEHOLDER_MODULES.map((m) => ({
  path: m.path,
  name: m.name,
  component: () => import('./pages/ProjectModulePlaceholder.vue'),
  meta: { title: m.label, artifactKey: m.artifactKey, reqRef: m.reqRef },
}))

/**
 * `/projects/:projectId` 下子路由（由 `ProjectLayout` 渲染）。
 * - 默认进入 **Dashboard**；**项目详情** 为 `detail`。
 */
export const projectLayoutChildren: RouteRecordRaw[] = [
  { path: '', redirect: { name: 'project-dashboard' } },
  {
    path: 'dashboard',
    name: 'project-dashboard',
    component: () => import('./pages/ProjectDashboard.vue'),
    meta: { title: '项目 Dashboard' },
  },
  {
    path: 'detail',
    name: 'project-detail',
    component: () => import('./pages/ProjectDetail.vue'),
    meta: { title: '项目详情' },
  },
  {
    path: 'm02/requirements/modules/:moduleId/versions/:versionId',
    name: 'project-m02-requirements-module-version',
    component: () => import('./pages/requirements/RequirementModuleDocVersionDetailPage.vue'),
    meta: { title: '模块细化文档', artifactKey: 'req_doc', reqRef: 'REQ-M02' },
  },
  {
    path: 'm02/requirements/versions/:versionId',
    name: 'project-m02-requirements-version',
    component: () => import('./pages/requirements/RequirementDocVersionDetailPage.vue'),
    meta: { title: '需求文档', artifactKey: 'req_doc', reqRef: 'REQ-M02' },
  },
  {
    path: 'm02/requirements',
    name: 'project-m02-requirements',
    component: () => import('./pages/requirements/RequirementDocListPage.vue'),
    meta: { title: '需求与文档', artifactKey: 'req_doc', reqRef: 'REQ-M02' },
  },
  {
    path: 'm02b/design/modules/:moduleId/versions/:versionId',
    name: 'project-m02b-design-module-version',
    component: () => import('./pages/design/TechDesignDocVersionDetailPage.vue'),
    meta: { title: '技术设计文档', artifactKey: 'tech_design', reqRef: 'REQ-M02B' },
  },
  {
    path: 'm02b/design/versions/:versionId',
    name: 'project-m02b-design-version',
    component: () => import('./pages/design/TechDesignDocVersionDetailPage.vue'),
    meta: { title: '技术设计文档', artifactKey: 'tech_design', reqRef: 'REQ-M02B' },
  },
  {
    path: 'm02b/design',
    name: 'project-m02b-design',
    component: () => import('./pages/design/TechDesignDocListPage.vue'),
    meta: { title: '技术设计', artifactKey: 'tech_design', reqRef: 'REQ-M02B' },
  },
  {
    path: 'm02c/apis/constraints/versions/:versionId',
    name: 'project-m02c-apis-constraint-version',
    component: () => import('./pages/apis/ApiConstraintVersionDetailPage.vue'),
    meta: { title: '通用接口约束', artifactKey: 'api_catalog', reqRef: 'REQ-M02C' },
  },
  {
    path: 'm02c/apis',
    name: 'project-m02c-apis',
    component: () => import('./pages/apis/ApiCatalogPage.vue'),
    meta: { title: '接口管理', artifactKey: 'api_catalog', reqRef: 'REQ-M02C' },
  },
  {
    path: 'm03/iterations',
    name: 'project-m03-iterations',
    component: () => import('./pages/iterations/IterationPlanningPage.vue'),
    meta: { title: '迭代与 Story', artifactKey: 'iteration_board', reqRef: 'REQ-M03' },
  },
  {
    path: 'm04/tasks',
    name: 'project-m04-tasks',
    component: () => import('./pages/tasks/TasksExecutionPage.vue'),
    meta: { title: 'Task 与执行', artifactKey: 'task_board', reqRef: 'REQ-M04' },
  },
  ...projectModuleChildren,
]
