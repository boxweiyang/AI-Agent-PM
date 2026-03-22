import type { RouteRecordRaw } from 'vue-router'

import { PROJECT_RELATED_MODULES } from '@/config/projectRelatedModules'

const projectModuleChildren: RouteRecordRaw[] = PROJECT_RELATED_MODULES.map((m) => ({
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
  ...projectModuleChildren,
]
