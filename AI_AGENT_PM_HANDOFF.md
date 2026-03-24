# AI Agent / 继续开发 — 完整交接提示词

> **用途**：新会话先读本文，可快速对齐「已做什么 / 未做什么 / 建议下一步」。  
> **维护**：每完成一块可交付功能，请同步改 **`PMP_Web/docs/FEATURES.md`**（§7 修订记录）与本文对应小节；契约变更改 **`contracts/openapi/openapi.yaml`**。

---

## 1. 复制到新对话（可选）

```
我是 AI-Agent-PM 仓库维护者。请先阅读仓库根目录 **AI_AGENT_PM_HANDOFF.md**，再按其中「建议下一步」协助我。

策略：**先用 MSW（npm run dev:mock）把前端全流程做完**，再接 PMP_Service；契约与 handlers 同步演进。

约束：回答与说明用 **简体中文**；改需求以 **PMP_Req_V2/** Markdown 为准；改前端实现以 **PMP_Web/docs/FEATURES.md** + 代码为准。
```

---

## 2. 仓库与三子项目

| 目录 | 角色 | 状态（粗粒度） |
|------|------|----------------|
| **`PMP_Web/`** | Vue 3 + Vite + Element Plus SPA | **主战场**：登录、双布局、工作台、项目壳、详情与模块占位、MSW Mock |
| **`PMP_Service/`** | FastAPI 后端 | **脚手架级**：健康检查等；项目域是否与契约完全对齐需按实际代码核对 |
| **`PMP_AI_Agent/`** | Python Agent | **脚手架级**：`facade` / 占位 feature |
| **`contracts/openapi/openapi.yaml`** | 前后端共用契约 | 含 auth、projects、PATCH、`artifacts` 等 |
| **`PMP_Req_V2/`** | 产品需求 V2（M01～M12） | **已定稿**；入口 **`REQ-MASTER_完整需求总文档.md`** |
| **`CONTINUE_PROMPT.md`** | 新会话 **浓缩复制区** | 与本文策略一致；**待办与细节以本文 §6 为准** |

**运行前端**：`cd PMP_Web && npm run dev:mock`（MSW）或 `npm run dev:api`（真实 Service，需先起后端）。Node **22**（见 `.nvmrc`）。

### 2.1 开发策略（已定）

- **当前阶段**：**MSW Mock 优先** — 在 **`npm run dev:mock`** 下把各 REQ 模块的 **页面、交互、假数据流** 做完整；需要新接口时 **先扩 `contracts/openapi/openapi.yaml`，再补 `PMP_Web/src/mocks/handlers.ts`**，保持单一真相与可演示闭环。
- **后置阶段**：Mock 验收通过后，再 **接 PMP_Service**（`dev:api`）与 Agent，把同一契约落到真存储与权限。

---

## 3. 产品原则（冻结，勿偏离）

- **管理系统为主**，AI **按需抽屉**；写入业务数据需用户 **显式应用/保存**（**REQ-M11**）。
- **AI 配置**走顶栏 **功能 → AI 设置**；各业务页内再按 M11 做抽屉/建议区。
- 技术规划：**TECH-001～005**（多子项目、前端约定、目录、Service、Agent）。

---

## 4. 前端（PMP_Web）— 已实现清单

### 4.1 路由与布局

- **`/login`**：独立页；Mock `admin` + 任意非空密码；`remember_7d` 与存储位置（TECH-004 语义）。
- **`/`（WorkbenchLayout）**：**无左侧站级菜单**。子路由：`/`、`/projects`、`/enter-last-project`、`/settings/ai|profile|system`。
- **`/projects/:projectId`（ProjectLayout）**：**仅进入项目后出现侧栏**。子路由默认重定向 **`…/dashboard`**；项目详情路径 **`…/detail`**（勿与根路径混淆）。
- **勿使用** `/projects/last`：与 `:projectId` 冲突；改用 **`/enter-last-project`**。
- **导航守卫**：未登录 → `/login`；`meta.requiresSystemAdmin` → 非管理员打回首页。
- **删除**：`MainLayout.vue`、`ProjectShell.vue`、`siteNavMenu.ts`（旧站级侧栏）。

### 4.2 顶栏 `AppHeaderBar.vue`

- **左侧**：**返回箭头**（面包屑上一级逻辑，否则 `history.back` / 工作台）+ **`/` 分隔面包屑**（`src/utils/headerBreadcrumbs.ts`：工作台 / 项目管理 / …；项目内含项目名与当前 `meta.title`），**任意一级可点**。
- **`/settings/*` 三页**：面包屑旁 **「回到项目列表」** → `/projects`。
- **项目内**：**切换项目**（图标 + 文案）→ `/projects`；项目名片段文案来自 `GET /projects/:id`（与详情改名后仍可能短暂不同步）。
- **右侧**：**功能** 下拉（AI / 个人 / 系统 / 进入最近项目）；主题；用户；退出。

### 4.3 项目侧栏 `ProjectLayout.vue`

- 品牌：**`PmpBrandMark` + `PRODUCT_DISPLAY_NAME`（智能项目管理系统）**（`src/config/productBranding.ts`）；品牌行高 **48px** 对齐顶栏。
- **三态**（`localStorage` **`pmp_project_sidebar_mode`**）：全宽 ~220px → 仅图标 ~52px → 全收起 0；**腰钮**在侧栏右缘外，`border-left: none`，**不压菜单**；主题色外发光；全收起悬停 **向右弹性位移**（`prefers-reduced-motion` 已处理）。
- 菜单：`projectSidebarNav.ts` + `projectLayoutRoutes.ts` + `projectRelatedModules.ts`；**模块图标** `projectModuleMenuIcons.ts`。
- 折叠仅图标：隐藏 `el-menu-item-group` 标题；菜单项文案 `v-if` 全宽；CSS 居中图标。

### 4.4 页面与数据（Mock）

- **工作台 / 项目列表**：`Home.vue`；卡片进项目 → **`project-dashboard`**；新建同理。
- **项目详情**：`ProjectDetail.vue`；PATCH；**技术栈** 四类 **`TechStackMultiSelect`** + `techStackOptions.ts`（存库仍为字符串、`、` 拼接）。
- **Dashboard（REQ-M08）**：`GET …/dashboard` + `ProjectDashboard.vue`（**一行两列**卡片、每卡 **双 ECharts**、**点击图弹窗放大**、「查看」下钻）；**完成预测** + **计划与里程碑**（散点+柱线）；MSW `buildProjectDashboard.ts` + `dashboardChartOptions.ts`；依赖 **`echarts`**。
- **模块占位**：`artifacts` + `ProjectModulePlaceholder` 演示 PATCH。
- **REQ-M02 需求与文档**：版本列表/详情（单版本 Markdown 编辑/预览）、导出（MD/HTML/PDF）+ AI 辅助（diff MVP、对话长期记忆与接受/回退后上下文截断）。
- **设置页**：占位 + REQ-M11 说明（AI 页）。
- **MSW**：`PMP_Web/src/mocks/handlers.ts` 与 OpenAPI 对齐。

### 4.5 契约与类型

- **`contracts/openapi/openapi.yaml`**：`stack_*` 多选说明等。
- **`PMP_Web/src/types/api-contract.ts`**、`vite-env.d.ts` 中 `RouteMeta` 扩展。

---

## 5. 未实现 / 占位（明确缺口）

| 项 | 说明 |
|----|------|
| **M02～M11 真实工作台** | `REQ-M02` 已实现需求文档列表/详情/版本机制与 AI 辅助（含 diff MVP + 对话长期记忆/上下文截断）；**M03～M11 仍为占位**（无真实看板/文档业务） |
| **REQ-M08 项目内 Dashboard** | **Mock 页已落地**（卡片/风险/筛选/下钻）；与 M03～M07 **真实同源数据**仍待后端；AI 摘要为 invoke Mock |
| **设置页** | 个人/系统/AI 配置 **尚无真库持久化**；Mock 阶段可用 **MSW + 内存/或 localStorage** 模拟保存 |
| **PMP_Service 项目 API** | **本阶段不阻塞前端**；真后端对齐契约为 Mock 闭环之后的工作 |
| **PMP_AI_Agent** | 未接入 Web 业务流 |
| **顶栏项目名** | 与详情内改名后 **可能需刷新或二次请求** 才一致 |
| **进入最近项目** | 设置页 **无**「回到项目列表」式额外入口（若产品要可加） |
| **`features/*/routes.ts` 空壳** | 若存在未使用的域路由样板文件，与当前 **`projectLayoutRoutes` + `projectRelatedModules`** 并行；合并或删除以 **STRUCTURE** 约定为准 |

---

## 6. 建议下一步（Mock 优先 — 把前端做满）

> **原则**：不接真后端也能在浏览器里 **完整点通产品路径**；缺接口就 **YAML + MSW** 先定形状。

1. **TECH-001～005：开始完成技术设计页面**：把 `PMP_Req_V2/00-技术规划` 里各 TECH 文档的结构/目录做成页面（先实现导航、展示与导出壳，再补交互）。  
2. **按 REQ 铺开 M03～M11**：对照 **`PMP_Req_V2`** 各分册，将侧栏各入口从占位升级为 **有结构的页面**（可先简后繁）；每模块需要的数据在 **handlers** 里用内存 store 或 **fixture** 模拟。  
3. ~~**`ProjectDashboard`（M08）**~~：**已完成（Mock）** — `GET …/dashboard` + 页面；后续与真服务对齐即可。  
4. **设置三页**：AI / 个人 / 系统在 Mock 下 **可保存、可刷新仍生效**（推荐 **localStorage** 或 MSW **sessionStorage 式**内存，与后续真 API 字段对齐时再切换数据源）。  
5. **契约同步**：每增加 Mock 行为，更新 **`openapi.yaml`**（含 request/response schema），避免与真后端对接时再大改。  
6. **体验与工程（穿插）**：项目改名后 **顶栏项目名同步**；可选 **`openapi-typescript`** 生成类型，减轻 `api-contract.ts` 手写负担。  
7. **Mock 验收通过后**：再执行 **`dev:api` 联调 PMP_Service**、Agent 接入（与旧版「先接后端」顺序对调）。  

---

## 7. 关键文件索引（改壳体/路由必看）

| 路径 | 内容 |
|------|------|
| `PMP_Web/src/router/index.ts` | 总路由、守卫 |
| `PMP_Web/src/features/workspace/routes.ts` | 工作台子路由 |
| `PMP_Web/src/features/workspace/projectLayoutRoutes.ts` | 项目子路由 |
| `PMP_Web/src/layouts/WorkbenchLayout.vue` | 无侧栏壳 |
| `PMP_Web/src/layouts/ProjectLayout.vue` | 三态侧栏 + 腰钮 |
| `PMP_Web/src/components/AppHeaderBar/` | 顶栏（见目录内 README；组件均为 **`组件名/` + index.ts**） |
| `PMP_Web/docs/FEATURES.md` | **用户可见功能真相来源** |
| `PMP_Web/docs/STRUCTURE.md` | 目录与约定 |

---

## 8. 协作约定

- **需求争议**：以 **`PMP_Req_V2`** 分册与 **REQ-MASTER** 为准。  
- **前端行为争议**：以 **`FEATURES.md` + 当前代码** 为准；改行为务必更新 FEATURES §7。  
- **接口争议**：以 **`contracts/openapi/openapi.yaml`** 为准，并同步 MSW。  
- **用户规则**：回复 **简体中文**；非用户要求的 Markdown 不要乱建（本文与 FEATURES/STRUCTURE 属交接需要）。

---

## 9. 修订记录（本文档）

| 日期 | 摘要 |
|------|------|
| 2026-03-22 | 首版：汇总双布局、侧栏三态、顶栏行为、已实现/未实现/下一步与关键路径。 |
| 2026-03-22 | 策略修订：**MSW Mock 优先、前端先行闭环**；§6 建议下一步与 §5 设置/Service 表述对齐该策略。 |
| 2026-03-22 | **CONTINUE_PROMPT.md** 与本文对齐：复制区含 Mock 优先与 HANDOFF 引用；§2 表格更新对该文件描述。 |
| 2026-03-22 | **REQ-M08 Dashboard**：OpenAPI + MSW + `ProjectDashboard.vue`；§4.4/§5/§6 同步。 |
| 2026-03-22 | **顶栏**：`AppHeaderBar` 面包屑全路径 + 返回箭头；`headerBreadcrumbs.ts`；§4.2 更新。 |
| 2026-03-22 | **REQ-M02**：需求文档 AI 辅助 diff MVP + 对话长期记忆（project+version）与接受/回退后上下文截断。 |

---

**文档结束**
