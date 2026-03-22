# PMP_Web 目录与约定

> **完整目录树**：`PMP_Req_V2/00-技术规划/TECH-003_三项目目录与模块化约定_v0.3.md` §2。  
> **UI/暗色/axios 与 `code===0`**：`TECH-002_前端技术约定_v0.1.md`。

## 脚手架说明

| 路径 | 作用 |
|------|------|
| `src/api/client.ts` | Axios 实例；响应体含 `code` 且非 0 时 reject |
| `src/router/index.ts` | 薄聚合；目前只挂载 `workspace` 子路由 |
| `src/layouts/MainLayout.vue` | M09 主壳占位 |
| `src/features/workspace/` | 首页 + 联调 Service / AI echo |
| `src/features/*/routes.ts` | 其它域已建 **空路由数组** 占位，开发时在此 export 并在 `router/index.ts` 合并 |

## Feature 标准（冻结）

每个 `features/<name>/` 建议包含：

- `routes.ts` — export `*ChildRoutes: RouteRecordRaw[]`
- `pages/` — 页面
- `components/` — 仅本域组件

**不要**同时使用全局大 `views/` 与 `features/*/pages/` 两套风格；本仓库选 **`features/*/pages/`**。

## 环境变量

- `.env.example`：默认走 **同源 `/api`** + Vite **proxy**。
- 直连后端时设置 `VITE_API_BASE`（见 `src/api/client.ts`）。

## API 契约（与后端共用）

- **权威草案路径**（相对仓库根）：**`contracts/openapi/openapi.yaml`**
- 从 Web 目录引用：`../../contracts/openapi/openapi.yaml`
- **Mock / openapi-typescript**：建议以上述 YAML（或 Service 导出的 `openapi-from-service.json`）为输入；详见 **`contracts/README.md`**。

## MSW（浏览器 Mock）

| 路径 | 作用 |
|------|------|
| `src/mocks/handlers.ts` | 与 OpenAPI 对齐的 `http.get/post/...` |
| `src/mocks/browser.ts` | `setupWorker` |
| `src/mocks/enableMsw.ts` | `VITE_USE_MSW` 判断 |
| `public/mockServiceWorker.js` | MSW 运行时（勿提交到 CDN 生产域名根路径以外误用） |
| `.env.development` | `VITE_USE_MSW=true/false`（`npm run dev` 时读取） |

**npm**：`dev:mock` / `dev:api` 用 **cross-env** 覆盖 `VITE_USE_MSW`，**无需改 .env**。

**`main.ts`** 在挂载 Vue 前 `await worker.start({ onUnhandledRequest: 'bypass' })`，未匹配的请求仍走真实网络。
