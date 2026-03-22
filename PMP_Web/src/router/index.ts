import { createRouter, createWebHistory } from 'vue-router'

import { useAuthStore } from '@/stores/auth'
import { projectLayoutChildren } from '@/features/workspace/projectLayoutRoutes'
import { workbenchRoutes } from '@/features/workspace/routes'

/**
 * 路由表
 * - `/login`：公开；已登录访问时重定向首页。
 * - `/`：`WorkbenchLayout`（无侧栏）+ 工作台与设置子路由。
 * - `/projects/:projectId`：`ProjectLayout`（项目侧栏）+ Dashboard / 详情 / 各模块占位。
 * - 未登录访问受保护路由：重定向登录并携带 `redirect`。
 *
 * 维护：新增/变更路由时，请同步更新 `docs/FEATURES.md`。
 */
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/features/auth/pages/Login.vue'),
      meta: { public: true, title: '登录' },
    },
    {
      path: '/',
      component: () => import('@/layouts/WorkbenchLayout.vue'),
      children: workbenchRoutes,
    },
    {
      path: '/projects/:projectId',
      component: () => import('@/layouts/ProjectLayout.vue'),
      children: projectLayoutChildren,
    },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  const isPublic = Boolean(to.meta.public)

  if (isPublic) {
    if (to.name === 'login' && auth.isAuthenticated) {
      return { path: '/' }
    }
    return true
  }

  if (!auth.isAuthenticated) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  if (to.meta.requiresSystemAdmin === true && !auth.isSystemAdmin) {
    return { name: 'workspace-home' }
  }

  return true
})

export default router
