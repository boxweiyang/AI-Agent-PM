import type { RouteRecordRaw } from 'vue-router'

/**
 * 认证域路由
 *
 * 说明：登录页为 **顶级路由** `/login`（不嵌套工作台壳），由 `src/router/index.ts` 直接注册。
 * 本文件保留空数组，便于日后若有「忘记密码子页」等 **需挂到公共布局下** 的子路由时统一 export。
 */
export const authFeatureChildRoutes: RouteRecordRaw[] = []
