/**
 * 登录令牌的浏览器存储（session vs local）
 *
 * - **未勾选「7 天保持登录」**：仅 `sessionStorage`（关标签即失会话，偏安全）。
 * - **勾选**：`localStorage`（刷新/重开浏览器仍可用，对齐 TECH-004 **7 天滑动 Refresh** 的产品语义；Mock 仅模拟落盘位置）。
 *
 * Axios 拦截器通过 `getStoredAccessToken()` 读取，避免只认 session。
 */

export const AUTH_STORAGE_KEYS = {
  access: 'pmp_access_token',
  refresh: 'pmp_refresh_token',
  user: 'pmp_user_json',
} as const

/** 登录页记住「7 天」勾选状态，下次打开登录页恢复默认 */
export const LOGIN_REMEMBER_7D_KEY = 'pmp_login_remember_7d'

export function getStoredAccessToken(): string | null {
  return (
    sessionStorage.getItem(AUTH_STORAGE_KEYS.access) ?? localStorage.getItem(AUTH_STORAGE_KEYS.access) ?? null
  )
}

export function clearAllAuthStorage(): void {
  for (const k of Object.values(AUTH_STORAGE_KEYS)) {
    sessionStorage.removeItem(k)
    localStorage.removeItem(k)
  }
}

type LoadedAuth = {
  access: string
  refresh: string
  userJson: string | null
}

/** 优先 session（同浏览器多标签时，当前会话优先于长期记住的会话） */
export function loadAuthFromBrowser(): LoadedAuth | null {
  const sAccess = sessionStorage.getItem(AUTH_STORAGE_KEYS.access)
  if (sAccess) {
    return {
      access: sAccess,
      refresh: sessionStorage.getItem(AUTH_STORAGE_KEYS.refresh) ?? '',
      userJson: sessionStorage.getItem(AUTH_STORAGE_KEYS.user),
    }
  }
  const lAccess = localStorage.getItem(AUTH_STORAGE_KEYS.access)
  if (lAccess) {
    return {
      access: lAccess,
      refresh: localStorage.getItem(AUTH_STORAGE_KEYS.refresh) ?? '',
      userJson: localStorage.getItem(AUTH_STORAGE_KEYS.user),
    }
  }
  return null
}

export function saveAuthToBrowser(remember7d: boolean, access: string, refresh: string, userJson: string): void {
  clearAllAuthStorage()
  const target = remember7d ? localStorage : sessionStorage
  target.setItem(AUTH_STORAGE_KEYS.access, access)
  target.setItem(AUTH_STORAGE_KEYS.refresh, refresh)
  target.setItem(AUTH_STORAGE_KEYS.user, userJson)
}
