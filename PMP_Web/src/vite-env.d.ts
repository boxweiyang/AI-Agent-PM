/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string
  /** 开发环境 Mock：与 .env.development 中 VITE_USE_MSW 一致 */
  readonly VITE_USE_MSW?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
