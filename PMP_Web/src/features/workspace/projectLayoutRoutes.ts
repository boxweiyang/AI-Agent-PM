import type { RouteRecordRaw } from 'vue-router'

import { PROJECT_RELATED_MODULES } from '@/config/projectRelatedModules'

/** REQ-M02：需求与文档已接真实工作台，其余模块仍为占位 */
const PLACEHOLDER_MODULES = PROJECT_RELATED_MODULES.filter((m) => m.name !== 'project-m02-requirements')

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
  ...projectModuleChildren,
]
