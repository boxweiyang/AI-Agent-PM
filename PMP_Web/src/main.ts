import { createPinia } from 'pinia'
import { createApp } from 'vue'

import ElementPlus from 'element-plus'

/** TECH-002：默认暗色 token（与 element-plus dark/css-vars 一致） */
document.documentElement.classList.add('dark')
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'

import App from './App.vue'
import router from './router'
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
  app.use(createPinia())
  app.use(router)
  app.use(ElementPlus)
  app.mount('#app')
}

void bootstrap()
