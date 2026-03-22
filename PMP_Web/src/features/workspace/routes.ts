import type { RouteRecordRaw } from 'vue-router'

/**
 * 工作台壳（无侧栏）子路由：`/` + `WorkbenchLayout`。
 * - 项目内路由见 `projectLayoutRoutes.ts`，挂在 `/projects/:projectId`。
 * - `enter-last-project` 避免与 `/projects/:projectId` 的 `last` 冲突。
 */
export const workbenchRoutes: RouteRecordRaw[] = [
  {
    path: '',
    name: 'workspace-home',
    component: () => import('./pages/Home.vue'),
    meta: { title: '工作台' },
  },
  {
    path: 'projects',
    name: 'workspace-projects',
    component: () => import('./pages/Home.vue'),
    meta: { title: '项目管理' },
  },
  {
    path: 'enter-last-project',
    name: 'enter-last-project',
    component: () => import('./pages/ProjectLastHub.vue'),
    meta: { title: '进入最近项目' },
  },
  {
    path: 'settings/ai',
    name: 'settings-ai',
    component: () => import('@/features/settings/pages/AiSettingsPage.vue'),
    meta: { title: 'AI 设置' },
  },
  {
    path: 'settings/profile',
    name: 'settings-profile',
    component: () => import('@/features/settings/pages/ProfileSettingsPage.vue'),
    meta: { title: '个人设置' },
  },
  {
    path: 'settings/system',
    name: 'settings-system',
    component: () => import('@/features/settings/pages/SystemSettingsPage.vue'),
    meta: { title: '系统设置', requiresSystemAdmin: true },
  },
]
