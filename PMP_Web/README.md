# PMP_Web

**Vue 3 + Vite + TypeScript + Element Plus + Pinia + Vue Router**（**TECH-002**）。  
仅请求 **PMP_Service**，不持有模型 Key。

## Node 版本（请用 22 LTS）

仓库根已有 **`.nvmrc`** / **`.node-version`**（内容为 `22`），与 `package.json` 的 **`engines.node`** 一致。  
你当前若是 **Node 23**，建议降到 **22**，可减少 TLS/npm 与工具链的边角问题。

**方式 A：Homebrew（你本机已有 `/usr/local/bin/brew` 时）**

```bash
brew install node@22
```

安装完成后让 **22 优先于** 旧 Node（Intel 常见 `/usr/local`，Apple Silicon 常见 `/opt/homebrew`）：

```bash
# Intel Mac（路径以 brew 提示为准）
echo 'export PATH="/usr/local/opt/node@22/bin:$PATH"' >> ~/.zshrc

# Apple Silicon
# echo 'export PATH="/opt/homebrew/opt/node@22/bin:$PATH"' >> ~/.zshrc

source ~/.zshrc
node -v   # 应显示 v22.x.x
```

**方式 B：fnm（多版本切换方便）**

```bash
curl -fsSL https://fnm.vercel.app/install | bash
# 按安装脚本提示重启 shell 后：
cd /path/to/AI-Agent-PM
fnm install
fnm use
node -v
```

**方式 C：nvm**

```bash
nvm install 22
nvm use 22
```

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

### 日常协作开发（建议一直开着）

- **Vite 默认热更新（HMR）**：在 `PMP_Web` 里执行 **`npm run dev:mock`** 后**不要关这个终端**；保存 `.vue` / `.ts` / `.css` 等源码，浏览器会**自动刷新或热替换**，无需手工重启。
- 改 **`vite.config.ts`**、**`.env.*`** 或依赖版本时，一般需在终端里 **Ctrl+C 停掉再重新 `npm run dev:mock`**。
- 在 Cursor / VS Code：**终端 → 新建终端 → `cd PMP_Web && npm run dev:mock`**，或用命令面板 **「Tasks: Run Task」**（若仓库配置了 task）跑同一命令；保持该面板常驻即可。

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

## 目录与功能说明

- **工程结构、约定**：[**docs/STRUCTURE.md**](./docs/STRUCTURE.md)（目录树以 REQ **TECH-003** 为准）。
- **按页面介绍功能**（随开发更新）：[**docs/FEATURES.md**](./docs/FEATURES.md)。
- **差异弹窗**（公用 **`DiffDialog`**）：[**src/components/DiffDialog/README.md**](./src/components/DiffDialog/README.md)（任意双稿对比场景可复用）。
- **AI 辅助抽屉**（**`AiAssistDrawer`**，内嵌 **`DiffDialog`**）：[**src/components/AiAssistDrawer/README.md**](./src/components/AiAssistDrawer/README.md)（传参、事件、接入示例）。
- **组件目录约定**：[**src/components/README.md**](./src/components/README.md)（一组件一文件夹、`index.ts` 导出）。

## OpenAPI 类型生成（后续）

**契约默认放在仓库根** **`../contracts/openapi/openapi.yaml`**（前后端共用）。

1. 开发中以该 YAML 为 Mock/codegen 输入；或运行 `PMP_Service` 的 `python scripts/export_openapi.py --copy-contracts` 得到 `contracts/openapi/openapi-from-service.json` 与 YAML 做 diff。
2. 配置 `openapi-typescript` 等生成到 `src/api/generated/`（**勿手改生成文件**）。
