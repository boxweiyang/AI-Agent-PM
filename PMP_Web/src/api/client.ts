import axios from 'axios'

/**
 * 开发环境：vite proxy 将 /api 转到 PMP_Service（见 vite.config.ts）。
 * 若需直连，可设 VITE_API_BASE=http://127.0.0.1:8000 并改 baseURL。
 */
const baseURL = import.meta.env.VITE_API_BASE ?? ''

export const apiClient = axios.create({
  baseURL,
  timeout: 60_000,
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
