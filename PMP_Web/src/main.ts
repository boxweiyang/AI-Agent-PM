import { createPinia } from 'pinia'
import { createApp } from 'vue'

import ElementPlus from 'element-plus'

/** TECH-002：默认暗色 token（与 element-plus dark/css-vars 一致） */
document.documentElement.classList.add('dark')
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'

import App from './App.vue'
import router from './router'
import './styles/global.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(ElementPlus)
app.mount('#app')
