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
