# PMP_Web 功能说明（按页面）

---

## 1. 文档定位与维护约定

| 项 | 说明 |
|----|------|
| **目的** | 从 **用户可见页面** 描述当前前端已实现能力，便于产品/联调/交接；**不替代** `PMP_Req_V2` 分册需求正文。 |
| **与 [STRUCTURE.md](./STRUCTURE.md) 分工** | STRUCTURE 侧重 **目录、工程约定、脚本与契约路径**；本文侧重 **路由、交互、数据从哪来（Mock/API）**。 |
| **何时更新** | **每完成一步前端开发**（新页面、改交互、改接口/Mock）：更新本文对应小节，并在 §7 **修订记录** 记一行（日期 + 摘要）。 |
| **需求追溯** | 文中 **REQ** 标注为产品文档模块号，实现细节以代码与 `contracts/openapi/openapi.yaml` 为准。 |

---

## 2. 跨页面（全局）能力

### 2.1 深浅色主题（TECH-002）

- **入口**：任意页面右上角 **「深色 | 浅色」** 单选（登录页在卡片外右上角；登录后主壳顶栏右侧）。
- **行为**：切换后写入浏览器 **`localStorage`**（键 `pmp_theme`），刷新仍生效；根节点 **`html`** 增减 class **`dark`**，与 Element Plus 暗色 CSS 变量配套。
- **默认**：首次访问默认为 **深色**。
- **浅色视觉**：全局背景使用偏灰变量（`global.css` 中 `:root:not(.dark)`），减轻纯白刺眼；登录页浅色下渐变更淡。

### 2.2 鉴权与数据模式

- **导航守卫**：未登录访问需登录页以外的路由 → 跳转 **`/login`**，并附带 `redirect` 查询参数（预留，登录成功后可扩展跳回）。
- **会话**：Access / Refresh / 用户摘要存 **`sessionStorage`** 或 **`localStorage`**（由登录页 **「7 天内保持登录」** 决定，见 `src/api/auth-storage.ts`）；请求头 **`Authorization: Bearer …`** 由 `src/api/client.ts` 从两处统一读取。
- **Mock（推荐日常前端开发）**：`npm run dev:mock`，**MSW** 拦截 `/api/v1/*` 已声明路径，与仓库根 **`contracts/openapi/openapi.yaml`** 及 **`src/mocks/handlers.ts`** 对齐。
- **真实后端**：`npm run dev:api`，关闭 MSW，经 Vite 代理访问 **`PMP_Service`**（需本地已启动服务）。

### 2.3 国际化与组件库

- **UI 文案**：根组件使用 Element Plus **中文 locale**（`App.vue`）。
- **技术栈**：Vue 3、Vue Router、Pinia、Element Plus、Axios、Vite（见 README）。

---

## 3. 页面一览

| 路由 | 名称（路由 meta.title） | 组件 / 布局 | 主要需求参考 |
|------|-------------------------|-------------|--------------|
| `/login` | 登录 | `Login.vue`（无主壳） | TECH-004、REQ-M09 |
| `/` | 工作台 | `MainLayout` + `workspace/pages/Home.vue` | REQ-M09 §4 |
| `/projects` | 项目管理 | 同上（`route.name === workspace-projects`） | REQ-M09 §3～§4 |
| `/projects/last` | 项目详情 | `MainLayout` + `workspace/pages/ProjectLastHub.vue` | REQ-M09、M01 |
| `/projects/:projectId` | 项目详情 | `MainLayout` + `workspace/pages/ProjectDetail.vue` | M01、M08 占位 |

---

## 4. `/login` 登录页

- **功能**：用户名 + 密码登录；**7 天内保持登录** 勾选（默认勾选；上次选择会记住）；校验失败时字段提示 + `ElMessage`。
- **Mock 约定**：用户名为 **`admin`** 时登录成功（密码需非空，具体规则见 MSW）；其它用户名返回业务错误（`code !== 0`）。请求体含 **`remember_7d`**（契约 `LoginRequest`），后端/Mock 可据此做会话策略。
- **成功后**：进入 **`/`** 工作台；令牌写入 **`sessionStorage`**（未勾选保持登录）或 **`localStorage`**（勾选），与 TECH-004 的 **Refresh 7 天** 产品语义对齐（Mock 仅模拟存储位置）。
- **界面**：卡片内 **项目名称** 居中展示；右上角可切换 **深/浅色**。

---

## 5. 主壳 `MainLayout`（登录后除登录页外的根布局）

- **布局**：左侧 **侧栏**（品牌区 + 菜单 + 收起）+ 右侧 **顶栏** + **主内容区**（`router-view`）。
- **侧栏菜单**：按 **REQ-MASTER** 模块拆 **8 个主菜单**（均为 `el-sub-menu`，默认全部展开，可多组同时展开）；主项带 **Element Plus 图标**（语义化）；**已实现**：**首页** `/`、**项目列表** `/projects`、**项目详情** `/projects/last`（无最近访问记录时引导去列表；有则重定向到 `/projects/:id`）；其余子项 **disabled** 灰显并附 **「待开发」** 标签；**系统设置**子项仅 **系统管理员** 可见（个人设置对所有登录用户展示）。菜单数据见 `src/config/siteNavMenu.ts`。
- **顶栏**：高度与侧栏 **品牌条**一致（同一「顶带」）；当前模块标题（来自子路由 `meta.title`）、**深/浅色**切换、**登录名**（`username`）、角色标签 **「系统管理员」**（`is_system_admin`）、演示标签 **「Mock」**（`user.is_mock_profile`，仅 Mock 用户）、**退出**（确认后清空 session/local 中的令牌并回登录页）。侧栏系统名与顶栏标题 **14px / 半粗** 对齐阅读节奏。
- **需求对照**：REQ-M09（站级壳、菜单层级、权限隐藏入口的雏形）。

---

## 6. `/` 与 `/projects` 工作台（同一页面组件）

- **功能**：`GET /api/v1/projects` 拉取列表后，按 **`status`** **分组**，**`el-collapse`** 可展开/收起；组内 **一行两列** 大卡片（中屏 `md` 起两列，小屏单列）。
- **卡片信息**：名称、**彩色状态标签**（进行中/立项流程中/暂停/已结项等映射）、描述（两行截断）、**细条形完成度**（`progress_percent` + `el-progress`）、**Story 数**、**Task 待办（open/total）**、**Bug 打开数**、**预计完成日**（`planned_end_at`）+ **剩余天数/今日截止/已逾期**（逾期为红色文案）、最近更新时间。
- **管理员**：**新建项目** 打开 **`ProjectCreateDialog`**（项目名称必填，描述与初始状态可选），提交 **`POST /api/v1/projects`**（契约 `ProjectCreateRequest`）；成功后 **写入 `sessionStorage` 最近项目 id**、刷新列表并跳转 **`/projects/:projectId`**。**刷新** 仍拉取列表。
- **卡片点击**：进入 **`/projects/:projectId`**，并记录最近项目 id（与侧栏「项目详情」入口一致）。
- **分组顺序**：`进行中` → `立项流程中` → `暂停` → `已结项` → 其余状态字典序（见 `projectPresentation.ts`）。
- **区别**：`/` 与 `/projects` 共用 `Home.vue`（`route.name` 区分），仅标题与说明文案不同。

## 6.1 `/projects/:projectId` 项目详情（V1 骨架）

- **数据**：`GET /api/v1/projects/{projectId}`，展示名称、状态、描述、id、最近更新；后续可替换为 M08 Dashboard 布局。
- **失败**：业务错误或不存在时展示空态并可回列表。

## 6.2 `/projects/last` 项目详情入口

- 有 **`sessionStorage` `pmp_last_project_id`** 时 **replace** 到对应 **`/projects/:id`**；否则空态引导去 **`/projects`**。

---

## 7. 修订记录

| 日期 | 摘要 |
|------|------|
| 2026-03-22 | 初版：登录、主壳、工作台/项目管理、主题切换、Mock/API 说明与维护约定。 |
| 2026-03-22 | 壳体 UI：浅色背景柔化（`global.css`）；顶栏高度 48px 与侧栏品牌条对齐；顶栏标题与侧栏「智能项目管理系统」字号统一为 14px semi。 |
| 2026-03-22 | 登录：「7 天内保持登录」+ `remember_7d` 契约；令牌按选项写入 session/local（`auth-storage`）。顶栏：登录名 +「系统管理员」+「Mock」标签；`UserMe.is_mock_profile` 与 OpenAPI 对齐。 |
| 2026-03-22 | 工作台：移除开发联调区；按状态 `el-collapse`、一行两卡片、细条进度、预计完成日+剩余/逾期；`ProjectSummary` 扩展（OpenAPI v0.2.2）。 |
| 2026-03-22 | 主壳：站级侧栏改为 **模块子菜单** + 图标；未实现页 **待开发** 标签；`@element-plus/icons-vue` 显式依赖；配置 `siteNavMenu.ts`。 |
| 2026-03-22 | M01 雏形：**新建项目** 弹窗 + `POST/GET` 项目契约（OpenAPI v0.2.4）；`ProjectDetail` / `ProjectLastHub`；侧栏 **项目详情**；MSW 内存列表可追加新项目。 |

---

**维护提示**：新增路由时，务必同时更新 **§3 页面一览**、增加新章节描述，并改 **§7 修订记录**。
