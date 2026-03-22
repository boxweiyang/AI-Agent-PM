/// <reference types="vite/client" />

export {}

declare module 'vue-router' {
  interface RouteMeta {
    /** 登录页等无需鉴权 */
    public?: boolean
    /** 顶栏标题等 */
    title?: string
    /** 仅系统管理员可访问（路由守卫） */
    requiresSystemAdmin?: boolean
    /** 项目模块占位：契约 `artifacts` 键 */
    artifactKey?: string
    reqRef?: string
  }
}

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string
  /** 开发环境 Mock：与 .env.development 中 VITE_USE_MSW 一致 */
  readonly VITE_USE_MSW?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
