/**
 * 是否启用 MSW：仅 DEV + VITE_USE_MSW 为真（见 .env.development）
 */
export function shouldUseMsw(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_USE_MSW === 'true'
}
