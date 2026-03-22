# PMP_Web

**Vue 3 + Vite + TypeScript + Element Plus + Pinia + Vue Router**（**TECH-002**）。  
仅请求 **PMP_Service**，不持有模型 Key。

## 运行

```bash
cd PMP_Web
npm install
npm run dev:mock    # MSW Mock，无需后端（推荐纯前端）
# 或
npm run dev:api     # 走真实 PMP_Service（需先 uvicorn，Vite proxy → :8000）
# 或
npm run dev         # 与 .env.development 中 VITE_USE_MSW 一致
```

浏览器默认 <http://localhost:5173>。

### MSW Mock（开发默认开启）

- **`npm run dev:mock`**：通过 **cross-env** 固定 **`VITE_USE_MSW=true`**，**无需改 `.env`**；由 **MSW** 拦截 **`/api/v1/*`** 已声明接口，**可不启动 PMP_Service**。
- **`npm run dev:api`**：固定 **`VITE_USE_MSW=false`**，请求经 **Vite proxy** 到 `http://127.0.0.1:8000`（需先起 **`uvicorn`**）。
- Handler 与契约对齐：**`src/mocks/handlers.ts`** ↔ 仓库根 **`contracts/openapi/openapi.yaml`**。
- 也可只改 **`.env.development`** 里的 **`VITE_USE_MSW`** 后使用 **`npm run dev`**。
- Service Worker 文件：**`public/mockServiceWorker.js`**（MSW 2.7.0）；升级 `msw` 大版本后请执行 `npx msw init public/` 覆盖。

## 构建

```bash
npm run build
```

## 目录说明

见 **[docs/STRUCTURE.md](./docs/STRUCTURE.md)**。完整树见：`../PMP_Req_V2/00-技术规划/TECH-003_三项目目录与模块化约定_v0.3.md` §2。

## OpenAPI 类型生成（后续）

**契约默认放在仓库根** **`../contracts/openapi/openapi.yaml`**（前后端共用）。

1. 开发中以该 YAML 为 Mock/codegen 输入；或运行 `PMP_Service` 的 `python scripts/export_openapi.py --copy-contracts` 得到 `contracts/openapi/openapi-from-service.json` 与 YAML 做 diff。
2. 配置 `openapi-typescript` 等生成到 `src/api/generated/`（**勿手改生成文件**）。
