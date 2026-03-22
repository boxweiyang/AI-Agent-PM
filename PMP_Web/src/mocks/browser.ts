import { setupWorker } from 'msw/browser'

import { handlers } from './handlers'

/** 浏览器端 Mock Worker；仅应在开发环境、且 VITE_USE_MSW=true 时启动 */
export const worker = setupWorker(...handlers)
