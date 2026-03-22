# PMP_Web 目录与约定

> **完整目录树**：`PMP_Req_V2/00-技术规划/TECH-003_三项目目录与模块化约定_v0.3.md` §2。  
> **UI/暗色/axios 与 `code===0`**：`TECH-002_前端技术约定_v0.1.md`。

## 文档索引（迭代时请同步更新）

| 文档 | 用途 |
|------|------|
| **[FEATURES.md](./FEATURES.md)** | **按页面** 说明用户可见功能、Mock 行为；**每完成一步前端开发** 应增量更新。 |
| **STRUCTURE.md**（本文） | 目录、工程约定、路径与契约引用。 |
| **[README.md](../README.md)** | 安装、运行、Node 版本、MSW 与开发习惯。 |

## Node 版本

- 仓库根 **`.nvmrc`** / **`.node-version`**：`22`（**Node 22 LTS**）。
- `package.json` 中 **`engines.node`**：`>=22 <23`（建议与上保持一致）。
- 安装与 PATH 配置步骤见 **[README.md](../README.md)** 的「Node 版本」一节。

**热更新**：在 `PMP_Web` 保持 **`npm run dev:mock`**（或 `dev`）进程不退出，保存源码即 **Vite HMR**；说明见 README「日常协作开发」。仓库根 **`.vscode/tasks.json`** 提供同名后台任务（命令面板 **Run Task**）。

## 脚手架说明

| 路径 | 作用 |
|------|------|
| `src/api/auth-storage.ts` | 登录令牌在 **sessionStorage / localStorage** 的读写与清理（与「7 天保持登录」、axios 取 token 一致） |
| `src/api/client.ts` | Axios 单例；**请求**注入 `Authorization: Bearer`（经 `getStoredAccessToken()`）；**响应**若 `code!==0` 则 reject |
| `src/types/api-contract.ts` | 与 `contracts/openapi/openapi.yaml` 对齐的 **手写 TS 类型**（可后续改为 openapi-typescript 生成） |
| `src/stores/auth.ts` | 登录态、用户摘要、`sessionStorage` 持久化（Mock 用；接真实后端时收敛 Refresh 存储方式） |
| `src/stores/theme.ts` | **深色 / 浅色**：`localStorage` 键 `pmp_theme`；`html.dark` 与 Element Plus 暗色变量联动（TECH-002） |
| `src/components/ThemeSegmented.vue` | 顶栏与登录页共用的「深色 / 浅色」切换（`el-radio-group`） |
| `src/router/index.ts` | 路由表；`/login` 公开；`/` 套 `WorkbenchLayout`；`/projects/:id` 套 `ProjectLayout`；**导航守卫**校验登录与 `requiresSystemAdmin` |
| `src/layouts/WorkbenchLayout.vue` | **工作台壳（无侧栏）**：顶栏 + `router-view`；未进入项目时使用 |
| `src/config/productBranding.ts` | 产品展示名 **`PRODUCT_DISPLAY_NAME`**（智能项目管理系统） |
| `src/layouts/ProjectLayout.vue` | **项目壳**：侧栏 **三态**（全宽 / 仅图标 / 全收起 + 跨边「腰钮」）+ 顶栏 + `router-view`；品牌行 **48px** |
| `src/components/PmpBrandMark.vue` | 侧栏 **品牌 SVG**（叠层条 + 圆点，`currentColor`） |
| `src/config/projectModuleMenuIcons.ts` | 项目侧栏 **各模块菜单图标**（按路由名语义映射） |
| `src/components/AppHeaderBar.vue` | 顶栏：工作台为 **标题**；项目内为 **项目名 + 切换图标 + `-` + 页标题**；另 **`功能`** 下拉、主题、用户、退出 |
| `src/components/TechStackMultiSelect.vue` | 项目详情：技术栈 **多选下拉**（`el-select` multiple + allow-create） |
| `src/config/techStackOptions.ts` | 四类技术栈 **预设选项** + 字符串与数组互转（`parseStackItems` / `joinStackItems`） |
| `src/config/projectSidebarNav.ts` | **项目内**侧栏分组（概览 + 各 REQ 模块；路由名与 `projectLayoutRoutes` 一致） |
| `src/config/projectRelatedModules.ts` | **项目内**模块路由清单（与 `artifacts` 键对齐；由 `projectLayoutRoutes.ts` 注册） |
| `src/features/auth/pages/Login.vue` | 登录页（Mock：`admin` / 任意密码） |
| `src/features/workspace/routes.ts` | **工作台子路由**：`/`、`/projects`、`/enter-last-project`、`/settings/*`（挂到 `/` 下） |
| `src/features/workspace/projectLayoutRoutes.ts` | **`/projects/:projectId` 子路由**：默认 Dashboard、`detail`、各 `m0x/...` 占位 |
| `src/features/workspace/` | `pages/Home.vue`、`ProjectDashboard.vue`、`ProjectDetail.vue`、`ProjectModulePlaceholder.vue`、`components/ProjectCreateDialog.vue` |
| `src/features/workspace/pages/ProjectDetail.vue` | 项目详情（`.../detail`；GET/PATCH 单项目） |
| `src/features/workspace/pages/ProjectLastHub.vue` | **`/enter-last-project`**：有最近 id 则进 Dashboard，否则空态 |
| `src/features/settings/pages/` | **设置占位页**：`AiSettingsPage`（REQ-M11 说明）、`Profile`、`System` |
| `src/api/last-project.ts` | `sessionStorage` 记录最近访问项目 id（顶栏「进入最近项目」、创建/打开项目时写入） |
| `src/features/workspace/projectPresentation.ts` | 状态分组顺序、Tag 颜色映射、预计完成日与剩余天数文案、Task 待办摘要 |
| `src/features/workspace/projectDetailDisplay.ts` | 项目详情页：M01 字段空态与日期/简介等展示辅助 |
| `src/features/*/routes.ts` | 其它域已建 **空路由数组** 占位，开发时在此 export 并在 `router/index.ts` 合并 |
| `src/core/permissions.ts` | 权限编码常量与 **后续** 细粒度过滤说明（与顶栏/路由 meta 配合） |
| `src/mocks/handlers.ts` | MSW：与 **contracts** 同步的 mock 实现（health、auth、projects、ai echo） |
| `src/App.vue` | `el-config-provider` + **中文 locale** |
| `src/styles/global.css` | 全局字体与底色；**浅色**下柔化 EP 背景变量与菜单底；登录页浅色背景渐变 |
| `docs/FEATURES.md` | **按页面功能说明**（与路由/交互同步维护，见上文「文档索引」） |

## Feature 标准（冻结）

每个 `features/<name>/` 建议包含：

- `routes.ts` — export `*ChildRoutes: RouteRecordRaw[]`（或本域顶级路由说明，如 **auth** 登录页在根路由注册）
- `pages/` — 页面
- `components/` — 仅本域组件

**不要**同时使用全局大 `views/` 与 `features/*/pages/` 两套风格；本仓库选 **`features/*/pages/`**。

## 环境变量

- `.env.example`：默认走 **同源 `/api`** + Vite **proxy**。
- 直连后端时设置 `VITE_API_BASE`（见 `src/api/client.ts`）。

## npm 安装卡住？

若 `npm install` **只有转圈、长时间无输出**：多半是连不上默认的 `registry.npmjs.org`（网络/地区/公司代理）。

- 本目录已提供 **`.npmrc`**，将 registry 指向 **`https://registry.npmmirror.com`** 并放宽重试；请在 **`PMP_Web` 目录下**再执行 `npm install`。
- 仍卡住时加日志定位：`npm install --loglevel verbose`（看停在哪一步）。
- 若必须用公司代理：`npm config set proxy` / `https-proxy`（值由 IT 提供）。

### `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`

表示 Node 在校验 `https://registry.npmmirror.com`（或其它 registry）的证书时，**拼不出完整信任链**。与「镜像慢」不同，属于 **TLS 校验** 问题：常见是 **公司代理**，但 **家庭网络** 下也可能是 **Node 版本/安装损坏** 或 **本机时间不准**。

**家庭网络（无代理、无杀毒）建议顺序**：

1. **核对系统日期时间**（时间漂移会导致证书「未生效/已过期」类校验失败）。
2. **若浏览器能打开 [npmmirror](https://registry.npmmirror.com/)，但 npm 仍报 issuer 错误**：优先让 Node 使用 **与浏览器相同的系统信任库**（不改 `strict-ssl`）：
   ```bash
   node --help | grep use-system-ca   # 有输出再往下
   export NODE_OPTIONS=--use-system-ca
   cd PMP_Web && npm install
   ```
   可把 `export NODE_OPTIONS=--use-system-ca` 写进 `~/.zshrc`（仅本机）。当前 **Node v23.x** 常见于此场景。
3. **换 Node 22 LTS**：用 [fnm](https://github.com/Schniz/fnm) / [nvm](https://github.com/nvm-sh/nvm) 安装 `22` 后重装依赖（生态默认验证更充分）。
4. **重装 Node**（官网 pkg 或 nvm 重装），排除安装损坏。
5. 仍不行：再考虑下面 **strict-ssl**（家庭环境下风险相对可控，但仍不建议提交到仓库）。

**公司网络优先（安全）**：向 IT 要 **企业根证书**（`.pem` / `.crt`），在装依赖前执行（路径改成你的文件）：

```bash
export NODE_EXTRA_CA_CERTS=/绝对路径/公司根证书.pem
cd PMP_Web && npm install
```

可把 `export NODE_EXTRA_CA_CERTS=...` 写进 `~/.zshrc`，只影响你本机。

**临时（不推荐作团队默认）**：关闭 npm 的 SSL 校验，仅用于本地 unblock：

```bash
npm config set strict-ssl false
```

或在 `PMP_Web/.npmrc` 里取消注释 `strict-ssl=false`（**不要提交到 Git**，或仅限个人分支）。

## API 契约（与后端共用）

- **权威草案路径**（相对仓库根）：**`contracts/openapi/openapi.yaml`**
- 从 Web 目录引用：`../../contracts/openapi/openapi.yaml`
- **Mock / openapi-typescript**：建议以上述 YAML（或 Service 导出的 `openapi-from-service.json`）为输入；详见 **`contracts/README.md`**。
- **近期契约增量**：`auth`（login / refresh / me）、`project`（列表）— 与 `src/mocks/handlers.ts` 一致。

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

## 本地演示路径（Mock + 管理员）

1. `npm run dev:mock`（或 `.env.development` 中 `VITE_USE_MSW=true`）
2. 浏览器打开应用 → 跳转 `/login`
3. 用户名 **`admin`**，密码任意非空 → 进入工作台 `/`
4. 顶栏 **功能 → 进入最近项目** 或从工作台打开某一项目 → 进入 **`/projects/:id/dashboard`**（此时出现 **项目左侧菜单**）
