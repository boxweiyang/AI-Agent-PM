/**
 * 浅色 / 深色外观（TECH-002 §3）
 * - Element Plus：根节点 `html.dark` + 已引入的 `dark/css-vars.css`。
 * - 默认深色；用户选择写入 localStorage，刷新后保持。
 * - 产品向说明：`docs/FEATURES.md`「跨页面 → 深浅色主题」。
 */
import { ref } from 'vue'

import { defineStore } from 'pinia'

export type ThemeMode = 'dark' | 'light'

export const THEME_STORAGE_KEY = 'pmp_theme'

/** 供 main.ts 在 Pinia 之前调用，减少首屏闪色 */
export function readStoredTheme(): ThemeMode {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY)
    if (v === 'light' || v === 'dark') return v
  } catch {
    /* 隐私模式等可能导致 localStorage 不可用 */
  }
  return 'dark'
}

/** 将主题同步到 DOM（与 Element Plus 官方约定一致） */
export function applyThemeDom(mode: ThemeMode): void {
  document.documentElement.classList.toggle('dark', mode === 'dark')
}

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>(readStoredTheme())

  /**
   * 切换并持久化；登录前后共用同一 store，故登录页与 MainLayout 切换效果一致。
   */
  function setMode(next: ThemeMode): void {
    if (mode.value === next) return
    mode.value = next
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
    applyThemeDom(next)
  }

  return { mode, setMode }
})
