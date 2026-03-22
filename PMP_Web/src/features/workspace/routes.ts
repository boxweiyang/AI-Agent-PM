import type { RouteRecordRaw } from 'vue-router'

import { PROJECT_RELATED_MODULES } from '@/config/projectRelatedModules'

/**
 * 站级工作台子路由（REQ-M09 / M01）
 * - `projects/last` 须在 `projects/:projectId` 之前注册，避免 `last` 被当成 id。
 * - `projects/:projectId` 下挂详情 + 各模块占位（`projectRelatedModules.ts`）。
 *
 * 维护：增删改子路由时，同步更新 `docs/FEATURES.md` 中「页面一览」与「工作台」小节。
 */
const projectModuleChildren: RouteRecordRaw[] = PROJECT_RELATED_MODULES.map((m) => ({
  path: m.path,
  name: m.name,
  component: () => import('./pages/ProjectModulePlaceholder.vue'),
  meta: { title: m.label, artifactKey: m.artifactKey, reqRef: m.reqRef },
}))

export const workspaceChildRoutes: RouteRecordRaw[] = [
  {
    path: '',
    name: 'workspace-home',
    component: () => import('./pages/Home.vue'),
    meta: { title: '工作台' },
  },
  {
    path: 'projects/last',
    name: 'project-last-hub',
    component: () => import('./pages/ProjectLastHub.vue'),
    meta: { title: '项目详情' },
  },
  {
    path: 'projects/:projectId',
    component: () => import('./pages/ProjectShell.vue'),
    meta: { title: '项目详情' },
    children: [
      {
        path: '',
        name: 'project-detail',
        component: () => import('./pages/ProjectDetail.vue'),
        meta: { title: '项目详情' },
      },
      ...projectModuleChildren,
    ],
  },
  {
    path: 'projects',
    name: 'workspace-projects',
    component: () => import('./pages/Home.vue'),
    meta: { title: '项目管理' },
  },
]
