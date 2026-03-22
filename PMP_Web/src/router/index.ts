import { createRouter, createWebHistory } from 'vue-router'

import { workspaceChildRoutes } from '@/features/workspace/routes'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('@/layouts/MainLayout.vue'),
      children: workspaceChildRoutes,
    },
  ],
})

export default router
