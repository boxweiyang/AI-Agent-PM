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

- **入口**：任意页面右上角 **「深色 | 浅色」** 单选（登录页在卡片外右上角；登录后 **WorkbenchLayout / ProjectLayout** 顶栏右侧）。
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
| `/login` | 登录 | `Login.vue`（无工作台壳） | TECH-004、REQ-M09 |
| `/` | 工作台 | `WorkbenchLayout` + `workspace/pages/Home.vue` | REQ-M09 §4 |
| `/projects` | 项目管理 | 同上（`route.name === workspace-projects`） | REQ-M09 §3～§4 |
| `/enter-last-project` | 进入最近项目 | `WorkbenchLayout` + `ProjectLastHub.vue` | REQ-M09、M01 |
| `/settings/ai` | AI 设置 | `WorkbenchLayout` + `settings/pages/AiSettingsPage.vue` | REQ-M11（配置与说明；业务页抽屉使用） |
| `/settings/profile` | 个人设置 | `WorkbenchLayout` + `settings/pages/ProfileSettingsPage.vue` | REQ-M09（占位） |
| `/settings/system` | 系统设置 | 同上（`requiresSystemAdmin`） | REQ-M09（占位） |
| `/projects/:projectId` | （重定向） | `ProjectLayout` → 默认 **`/dashboard`** | — |
| `/projects/:projectId/dashboard` | 项目 Dashboard | `ProjectLayout` + `ProjectDashboard.vue` | REQ-M08：`GET …/dashboard` + MSW；迭代筛选、指标卡片、风险列表、下钻、AI 摘要抽屉（Mock） |
| `/projects/:projectId/detail` | 项目详情 | `ProjectLayout` + `ProjectDetail.vue` | M01、可编辑、模块入口 |
| `/projects/:projectId/m02/requirements` 等 | 各模块占位 | `ProjectLayout` + `ProjectModulePlaceholder.vue` | REQ-M02～M11；`artifacts` 驱动已生成/去生成 |

---

## 4. `/login` 登录页

- **功能**：用户名 + 密码登录；**7 天内保持登录** 勾选（默认勾选；上次选择会记住）；校验失败时字段提示 + `ElMessage`。
- **Mock 约定**：用户名为 **`admin`** 时登录成功（密码需非空，具体规则见 MSW）；其它用户名返回业务错误（`code !== 0`）。请求体含 **`remember_7d`**（契约 `LoginRequest`），后端/Mock 可据此做会话策略。
- **成功后**：进入 **`/`** 工作台；令牌写入 **`sessionStorage`**（未勾选保持登录）或 **`localStorage`**（勾选），与 TECH-004 的 **Refresh 7 天** 产品语义对齐（Mock 仅模拟存储位置）。
- **界面**：卡片内展示 **智能项目管理系统**（`productBranding.ts`）；右上角可切换 **深/浅色**。

---

## 5. 登录后布局（`WorkbenchLayout` 与 `ProjectLayout`）

### 5.1 `WorkbenchLayout`（无左侧菜单）

- **用途**：**未进入具体项目** 时的壳——工作台、项目列表、设置页、`/enter-last-project` 等。
- **布局**：**顶栏** + **主内容区**（`router-view`），**无站级侧栏**。
- **顶栏**（`AppHeaderBar`）：左侧 **返回箭头**（回到面包屑上一级，逻辑见 `goBreadcrumbBack`）+ **`/` 分隔的完整路径**（`el-breadcrumb`，任意一级可点跳转）；**设置页** 旁仍保留 **「回到项目列表」**；**项目内** 面包屑后为 **切换项目** 链接（图标 + 文案）。右侧 **功能** 下拉（**AI 设置**、**个人设置**、**系统设置**〔非管理员项禁用；直链 `/settings/system` 会被守卫打回首页〕、**进入最近项目**）、**深/浅色**、登录名与标签、**退出**。路径生成见 `src/utils/headerBreadcrumbs.ts`。

### 5.2 `ProjectLayout`（项目内左侧菜单）

- **用途**：进入 **`/projects/:projectId/...`** 后出现；菜单仅服务 **当前项目**（分组见 `projectSidebarNav.ts`：概览含 **Dashboard**、**项目详情**，其余为 REQ-M02～M11 模块入口；**各模块图标**按语义见 `projectModuleMenuIcons.ts`）。
- **布局**：左侧 **可三态收缩的侧栏**（见下）+ 右侧 **顶栏**（`AppHeaderBar`）+ **`el-main`**。
- **侧栏**：**品牌行高度 48px**，与顶栏一致；**`PmpBrandMark` + 产品名**（全宽时）+ 当前项目名摘要 + **`el-menu`**。**三态循环**（`localStorage` 键 `pmp_project_sidebar_mode`）：① **全宽**（约 220px，文案+图标）；② **仅图标**（约 **52px**）；③ **全收起**（宽度 0，仅保留「腰钮」）。**腰钮**左缘与菜单 **右边界对齐**（不压住菜单栏）、**无左边框**；有侧栏时约 **16×48px**，全收起 **26×54px**；**主题色外发光**；箭头字号独立控制。
- **顶栏左侧（项目内）**：与 **工作台** 相同为 **返回 + 面包屑**（`工作台 / 项目管理 / 项目名 / 当前页`）；**切换项目**（图标 + 文案）仍跳转 **`/projects`**（项目列表）。
- **项目内页面**：**不在 `el-main` 顶行**再放大标题/返回条（详情仅保留 **编辑/保存** 工具条；Dashboard、模块占位把说明收进 **卡片头**）。
- **默认路由**：访问 **`/projects/:id`** 重定向到 **`/projects/:id/dashboard`**（独立 Dashboard 优先）。
- **需求对照**：REQ-M09（壳体）、REQ-M11（AI **使用**在各业务页抽屉；**配置**走顶栏 AI 设置页）。

---

## 6. `/` 与 `/projects` 工作台（同一页面组件）

- **功能**：`GET /api/v1/projects` 拉取列表后，按 **`status`** **分组**，**`el-collapse`** 可展开/收起；组内 **一行两列** 大卡片（中屏 `md` 起两列，小屏单列）。
- **卡片信息**：名称、**彩色状态标签**（进行中/立项流程中/暂停/已结项等映射）、描述（两行截断）、**细条形完成度**（`progress_percent` + `el-progress`）、**Story 数**、**Task 待办（open/total）**、**Bug 打开数**、**预计完成日**（`planned_end_at`）+ **剩余天数/今日截止/已逾期**（逾期为红色文案）、最近更新时间。
- **管理员**：**新建项目** 打开 **`ProjectCreateDialog`**（项目名称必填，描述与初始状态可选），提交 **`POST /api/v1/projects`**（契约 `ProjectCreateRequest`）；成功后 **写入 `sessionStorage` 最近项目 id**、刷新列表并跳转 **`/projects/:projectId/dashboard`**。**刷新** 仍拉取列表。
- **卡片点击**：进入 **`/projects/:projectId/dashboard`**，并记录最近项目 id（与顶栏「进入最近项目」一致）。
- **分组顺序**：`进行中` → `立项流程中` → `暂停` → `已结项` → 其余状态字典序（见 `projectPresentation.ts`）。
- **区别**：`/` 与 `/projects` 共用 `Home.vue`（`route.name` 区分），仅标题与说明文案不同。

## 6.1 `/projects/:projectId/detail` 项目详情

- **数据**：`GET /api/v1/projects/{projectId}`，展示契约 **`ProjectSummary` 全量字段**（含 **`artifacts`** 模块资产标记），分区对齐 **REQ-M01 §3.1（立项必填）**、**§3.2（可选）**，并含 **执行与度量**（只读汇总）。未填写项统一显示「未填写」。
- **编辑**：**编辑 / 保存 / 取消**；保存走 **`PATCH /api/v1/projects/{projectId}`**（`ProjectPatchRequest`）；度量字段不在此表单修改。
- **技术栈（前端 / 后端 / 数据库 / 中间件）**：编辑态为 **下拉多选**（可筛选、可输入新项），提交时仍按契约以 **字符串** 存储（`、` 拼接；兼容历史数据中的逗号/换行分隔）；只读态以 **标签** 展示。
- **项目空间与文档**：卡片网格列出 **REQ-M02～M11** 等入口（配置见 `projectRelatedModules.ts`），**路由名为子路径**；**已生成** / **未生成** 由 `artifacts` 决定；按钮进入子页。
- **技术负责人**：未填时顶部 **非阻塞** `el-alert`（与 M01 §3.3 一致）。
- **失败**：业务错误或不存在时展示空态；提示使用顶栏 **切换图标** 回列表。

## 6.1.1 `/projects/:projectId/dashboard` 项目 Dashboard（首屏）

- **数据**：**`GET /api/v1/projects/{projectId}/dashboard?iteration_key=`**（`current` | `all` | 具体迭代 id），契约与 **`contracts/openapi/openapi.yaml` v0.2.8** 中 `ProjectDashboardData` 对齐；卡片可含 **`charts[]`**（`DashboardChartSpec.option` 为 ECharts JSON）。开发环境由 **MSW**（`handlers.ts` + `buildProjectDashboard.ts` + `dashboardChartOptions.ts`）返回演示数据。
- **迭代筛选**：顶栏下第一行 **迭代范围** 下拉——**全部迭代**、**当前迭代**、以及接口返回的迭代列表；切换后 **重新请求** Dashboard，**范围说明**（`scope_label`）随响应更新。
- **布局**：指标区 **`grid` 一行两列**、**宽度随 `el-main` 撑满**（窄屏单列）；`ProjectLayout` 主区 **`min-width:0` + `width:100%`** 避免右侧空白。
- **图表**：**`el-carousel`** 轮播（**左右箭头 + 下方指示点**），单页大图高约 **208px**；**点击当前图** → **`el-dialog` 放大**。**「查看」** 在指标卡 **`header` 标题栏最右侧**（`router.push` 下钻），无底部 footer 条。
- **扩展卡片**：**完成时间预测**（`completion_forecast`：累计完成度 + 预测折线、周吞吐柱+线）；**计划与里程碑**（`milestones_plan_actual`：**散点** 计划日 vs 实际日 + **参考对角线**；**柱+线** 计划工期 vs 实际工期及偏差线）。另含 REQ-M08 原有：迭代进度、Task、阻塞、人力、CR、质量、可选接口卡。
- **风险与关注（§5）**：表格展示 `risk_items`（Mock 已按优先级排序）；**示例项目 Alpha**（`proj-demo-1`）数据较完整，其它项目为 **推导演示**。
- **AI（§7）**：**AI：本周摘要** 打开抽屉，调用 **`POST /api/v1/ai/invoke`**，`capability: dashboard_weekly_summary`（MSW 返回固定短文）；**不写入业务数据**，用户可复制。
- **其它**：**项目详情** 按钮跳转 `project-detail`；回项目列表用顶栏 **切换图标**。

## 6.1.2 项目内模块占位页

- **路径**：`/projects/:projectId/<模块路径>`（如 `m02/requirements`）。
- **已生成**（`artifacts[键]===true`）：成功态说明，后续可替换为真实工作台。
- **未生成**：**一键生成（演示）** 调用 **PATCH** 合并 `artifacts`，再可进入已生成态；**返回项目详情** 回到概览。

## 6.3 `/enter-last-project` 进入最近项目

- 有 **`sessionStorage` `pmp_last_project_id`** 时 **replace** 到对应 **`/projects/:id/dashboard`**；否则空态引导去 **`/projects`**。
- **说明**：不使用 `/projects/last` 路径，避免与动态段 `:projectId` 将 `last` 误认为 id。

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
| 2026-03-22 | 项目详情：契约 **v0.2.5** 扩展 M01 字段；详情页分区展示 + 技术负责人提示；`projectDetailDisplay.ts`；Mock 种子数据补全示例。 |
| 2026-03-22 | 项目详情 **可编辑**（PATCH）；**artifacts** + 模块子路由占位；`ProjectShell` / `projectRelatedModules.ts` / `ProjectModulePlaceholder`；OpenAPI **v0.2.6**。 |
| 2026-03-22 | **双布局**：工作台无侧栏（`WorkbenchLayout`）；进项目后 `ProjectLayout` + 侧栏；默认 **Dashboard**；详情为 `detail`；顶栏 **功能** 含 AI/个人/系统设置与 **进入最近项目**（`/enter-last-project`）；移除站级 `siteNavMenu` / `MainLayout`。 |
| 2026-03-22 | 项目详情：技术栈四类改为 **下拉多选**（可自定义项），契约仍为 `stack_*` 字符串（顿号拼接）；OpenAPI 补充字段说明。 |
| 2026-03-22 | `ProjectLayout`：顶栏 **项目名 + 切换 + 页标题**（原独立状态栏并入 `AppHeaderBar`）；侧栏品牌与模块分图标等。 |
| 2026-03-22 | 产品展示名统一为 **智能项目管理系统**（`productBranding.ts`、侧栏、登录、`<title>`）。 |
| 2026-03-22 | 项目侧栏：**三态收缩** + 跨边框腰钮；品牌行 **48px**；详情/Dashboard/模块占位去掉主区顶行大标题与 `page-header` 返回条。 |
| 2026-03-22 | **REQ-M08 Dashboard**：OpenAPI **`GET /projects/{id}/dashboard`** + `ProjectDashboardData`；`ProjectDashboard.vue` 迭代筛选、卡片网格、风险表、模块下钻与 AI 摘要抽屉；MSW `buildProjectDashboard`（`proj-demo-1` 多迭代演示）。 |
| 2026-03-22 | **顶栏**：`AppHeaderBar` 改为 **返回箭头 + 全路径面包屑**（可点任意一级）；`headerBreadcrumbs.ts`；项目内保留 **切换项目**。 |
| 2026-03-22 | 项目内 **切换项目**：由仅图标改为 **图标 +「切换项目」** 文案（`AppHeaderBar`）。 |
| 2026-03-23 | **Dashboard**：一行两列卡片；各卡 **双 ECharts**；点击 **弹窗放大**；新增 **完成预测**、**计划与里程碑**（散点+柱线）；契约 **v0.2.8** `DashboardChartSpec`；`echarts` + `dashboardChartOptions.ts`。 |
| 2026-03-23 | Dashboard：**主区撑满**；图表改 **轮播+指示点**；**查看** 在 **卡片标题栏右侧**（无底部栏）。 |
| 2026-03-23 | **`el-main` 左右留白**：`ProjectLayout` / `WorkbenchLayout` 主区 **`padding: 16px 50px`**（上下 16、左右 50）。 |
| 2026-03-23 | Dashboard：轮播区 **318px**；图 **`fill` + ResizeObserver** 撑满标题与「点击放大」之间高度（卡片主区两列满宽）。 |

---

**维护提示**：新增路由时，务必同时更新 **§3 页面一览**、增加新章节描述，并改 **§7 修订记录**。
