import type { RouteRecordRaw } from 'vue-router'

/** M09 工作台：脚手架首页 */
export const workspaceChildRoutes: RouteRecordRaw[] = [
  {
    path: '',
    name: 'workspace-home',
    component: () => import('./pages/Home.vue'),
    meta: { title: '工作台' },
  },
]
