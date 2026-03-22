/**
 * 认证与会话（Pinia）
 *
 * **产品**：对齐 REQ-M09（登录后工作台、管理员全站可见）与 TECH-004（JWT + Refresh、7 天滑动窗口）。
 *
 * **存储**：
 * - Access / Refresh / user 写入 **sessionStorage** 或 **localStorage**（由登录页「7 天保持登录」决定，见 `api/auth-storage.ts`）。
 * - 正式实现后 Refresh 宜 **HttpOnly Cookie**；本方式在接入真实后端时需收敛。
 */
import { computed, ref } from 'vue'

import { defineStore } from 'pinia'

import {
  clearAllAuthStorage,
  loadAuthFromBrowser,
  LOGIN_REMEMBER_7D_KEY,
  saveAuthToBrowser,
} from '@/api/auth-storage'
import { apiClient } from '@/api/client'
import type { ApiEnvelope, AuthLoginData, UserMe } from '@/types/api-contract'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string>('')
  const refreshToken = ref<string>('')
  const user = ref<UserMe | null>(null)

  const isAuthenticated = computed(() => Boolean(accessToken.value))

  const isSystemAdmin = computed(() => Boolean(user.value?.is_system_admin))

  function hydrateFromStorage(): void {
    const loaded = loadAuthFromBrowser()
    if (!loaded) {
      accessToken.value = ''
      refreshToken.value = ''
      user.value = null
      return
    }
    accessToken.value = loaded.access
    refreshToken.value = loaded.refresh
    if (loaded.userJson) {
      try {
        user.value = JSON.parse(loaded.userJson) as UserMe
      } catch {
        user.value = null
      }
    } else {
      user.value = null
    }
  }

  /**
   * @param remember7d 与登录请求 `remember_7d` 一致；决定令牌写入 session 还是 local。
   */
  function applyAuthPayload(data: AuthLoginData, remember7d: boolean): void {
    accessToken.value = data.access_token
    refreshToken.value = data.refresh_token
    user.value = data.user
    const userJson = JSON.stringify(data.user)
    saveAuthToBrowser(remember7d, data.access_token, data.refresh_token, userJson)
  }

  /**
   * @param remember7d 勾选「7 天内保持登录」时传 true（TECH-004 产品语义）
   */
  async function login(username: string, password: string, remember7d: boolean): Promise<void> {
    const { data: envelope } = await apiClient.post<ApiEnvelope<AuthLoginData>>('/api/v1/auth/login', {
      username,
      password,
      remember_7d: remember7d,
    })
    if (!envelope.data) {
      throw new Error(envelope.message || '登录失败')
    }
    try {
      localStorage.setItem(LOGIN_REMEMBER_7D_KEY, remember7d ? 'true' : 'false')
    } catch {
      /* ignore */
    }
    applyAuthPayload(envelope.data, remember7d)
  }

  function logout(): void {
    accessToken.value = ''
    refreshToken.value = ''
    user.value = null
    clearAllAuthStorage()
  }

  return {
    accessToken,
    refreshToken,
    user,
    isAuthenticated,
    isSystemAdmin,
    hydrateFromStorage,
    login,
    logout,
  }
})
