/**
 * 应用入口
 * - 主题：`readStoredTheme` + `applyThemeDom` 在 Pinia 之前执行，减少首屏闪色（详见 `stores/theme.ts`、TECH-002）。
 * - MSW：见 `mocks/enableMsw.ts`；契约与 handler 对齐说明见 `docs/STRUCTURE.md`、`docs/FEATURES.md`。
 */
import { createPinia } from 'pinia'
import { createApp } from 'vue'

import ElementPlus from 'element-plus'

import { applyThemeDom, readStoredTheme } from './stores/theme'

/** 按 localStorage 应用深/浅色（默认深色） */
applyThemeDom(readStoredTheme())
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'

import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import { shouldUseMsw } from './mocks/enableMsw'
import './styles/global.css'

async function bootstrap() {
  if (shouldUseMsw()) {
    const { worker } = await import('./mocks/browser')
    await worker.start({
      onUnhandledRequest: 'bypass',
      quiet: true,
    })
    console.info('[MSW] Mock 已启用；联调真实后端请将 .env.development 中 VITE_USE_MSW 设为 false')
  }

  const app = createApp(App)
  const pinia = createPinia()
  app.use(pinia)
  /** 在挂载路由前恢复会话，避免首屏进入 `/` 时被误判未登录 */
  useAuthStore().hydrateFromStorage()
  app.use(router)
  app.use(ElementPlus)
  app.mount('#app')
}

void bootstrap()
