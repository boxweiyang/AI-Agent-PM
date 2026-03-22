import { createRouter, createWebHistory } from 'vue-router'

import { useAuthStore } from '@/stores/auth'
import { workspaceChildRoutes } from '@/features/workspace/routes'

/**
 * 路由表
 * - `/login`：公开；已登录访问时重定向首页。
 * - `/`：MainLayout + 子路由（含 `/projects`、`/projects/last`、`/projects/:id`）；未登录重定向登录并携带 `redirect`。
 *
 * 维护：新增/变更路由时，请同步更新 `docs/FEATURES.md`（页面一览与各页说明）。
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
      component: () => import('@/layouts/MainLayout.vue'),
      children: workspaceChildRoutes,
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

  return true
})

export default router
