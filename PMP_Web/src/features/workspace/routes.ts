import type { RouteRecordRaw } from 'vue-router'

/**
 * 站级工作台子路由（REQ-M09 / M01）
 * - `projects/last` 须在 `projects/:projectId` 之前注册，避免 `last` 被当成 id。
 *
 * 维护：增删改子路由时，同步更新 `docs/FEATURES.md` 中「页面一览」与「工作台」小节。
 */
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
    name: 'project-detail',
    component: () => import('./pages/ProjectDetail.vue'),
    meta: { title: '项目详情' },
  },
  {
    path: 'projects',
    name: 'workspace-projects',
    component: () => import('./pages/Home.vue'),
    meta: { title: '项目管理' },
  },
]
