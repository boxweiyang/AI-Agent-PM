import axios from 'axios'

import type { InternalAxiosRequestConfig } from 'axios'

import { getStoredAccessToken } from '@/api/auth-storage'

/**
 * Axios 单例（TECH-002）
 *
 * **baseURL**：
 * - 默认空字符串：开发环境走 Vite `server.proxy` 将 `/api` 转到 PMP_Service。
 * - 直连后端时设置 `VITE_API_BASE`（如 `http://127.0.0.1:8000`）。
 *
 * **业务包络**：响应体含 `code` 且 `code !== 0` 时，在响应拦截器里 **reject**，
 * 便于页面统一用 `try/catch` 处理业务失败（与 TECH-002 一致）。
 */
const baseURL = import.meta.env.VITE_API_BASE ?? ''

export const apiClient = axios.create({
  baseURL,
  timeout: 60_000,
})

/**
 * 请求拦截：注入 Bearer Access（TECH-004）。
 * 从 session / local 统一读取（见 `auth-storage`），与「7 天保持登录」一致。
 */
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getStoredAccessToken()
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => {
    const data = response.data
    if (data && typeof data === 'object' && 'code' in data && (data as { code: number }).code !== 0) {
      const msg = (data as { message?: string }).message ?? '业务错误'
      return Promise.reject(new Error(msg))
    }
    return response
  },
  (err) => Promise.reject(err),
)
