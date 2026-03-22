# TECH-002 前端技术约定（v0.1）

> 与 **REQ-M09**（壳与首页）、**REQ-M11**（AI 交互）对齐；**后端契约对齐时可修订本文**。

---

## 1. 定位与仓库位置

- **子项目路径**：**`PMP_Web/`**（见 **TECH-001**、**TECH-003**）。  
- **职责**：Vue3 SPA，**仅调用核心业务 API**；不直连大模型、不持有模型 API Key。

---

## 2. 技术栈（冻结）

| 项 | 选型 |
|----|------|
| 框架 | **Vue 3**（Composition API） |
| UI | **Element Plus** |
| 路由 | **Vue Router** |
| 全局状态 | **Pinia** |
| HTTP | **Axios**（单例 + 拦截器） |
| 构建 | **Vite**（推荐，实现阶段初始化时确认） |

---

## 3. UI / 主题 / 动效

### 3.1 视觉目标

- **简洁、层级清晰**；动效为 **点缀**，避免干扰阅读与操作。  
- **暗色模式**：**默认支持并优先按暗色设计 token**（与 Element Plus 暗色变量方案结合）；亮色可作为后续扩展。  
- 使用 **CSS 变量 / SCSS 变量** 统一：**主色、圆角、间距、阴影、背景层级**，避免页面硬编码散乱。

### 3.2 Element Plus 暗色

- 根布局使用 **`el-config-provider`**，按需开启 **dark**（与官方暗色 CSS 变量方案一致）。  
- **对比度**：主色、成功/警告/错误在暗色下需 **可读**；关键文本与边框与背景 **区分明显**。  
- **用户偏好**：可存 **localStorage + Pinia**（如 `theme: 'dark' | 'light'`）；若仅暗色 MVP，可暂固定暗色，预留切换入口。

### 3.3 动效策略（已共识）

| 场景 | 建议 |
|------|------|
| 登录、工作台首页、Dashboard、空状态 | 可适当使用 **进入过渡、轻微位移/透明度** |
| 列表、表格、高频表单页 | **克制**；优先保证性能与可扫读 |
| 抽屉 / 对话框 | 使用组件 **自带动画**，不重复堆叠 |
| 无障碍 | 尊重 **`prefers-reduced-motion: reduce`**，此时 **关闭或减少** 非必要动画 |

可选：**@vueuse/motion** 或纯 **CSS transition**；**慎用**大体积通用动画库。

---

## 4. 状态管理（Pinia）

- **放入 Pinia**：当前用户与 token、全局权限摘要、**当前项目上下文**、主题、侧边栏折叠等 **跨多路由** 状态。  
- **不放或慎放**：单页列表筛选、单次表单草稿（可用 **ref + composable**）。  
- **避免**：单巨型 store；按 **领域** 拆 store（如 `useUserStore`、`useProjectStore`）。

---

## 5. HTTP：Axios 与统一响应 `{ code, message, data }`

### 5.1 约定（与后端对齐时可改数值，但结构不变）

- 响应体：**`{ code: number, message: string, data: T }`**。  
- **业务成功码**：默认约定 **`code === 0`**（若后端采用 `200` 等，在拦截器常量中 **一处配置** 即可）。  
- **HTTP 层**：`2xx` 且 body 可解析后，再解析 **业务 `code`**；**勿**把业务失败当成 resolve。

### 5.2 拦截器职责

**请求拦截**

- 注入 **Authorization**（Bearer Token，格式与后端一致）。  
- 可选：请求 ID / Trace 头，便于联调。  
- **禁止**：在拦截器写具体业务分支；只放 **全局通用** 逻辑。

**响应拦截**

- **HTTP 非 2xx**：统一映射（**401**：优先 **调 Refresh 换 Access**（见 **TECH-004**），**仅当 Refresh 失败** 再清登录态并跳转登录；**403** → 无权限提示；**5xx** → 通用错误 + 可重试提示）。  
- **HTTP 2xx 但 `code !== 成功码`**：`Promise.reject` 为标准 **`ApiBusinessError`**（含 `code`、`message`、`data?`），由页面决定 **ElMessage** 或表单项下展示。  
- **成功**：返回 **`data`**（泛型 `T`），调用方类型清晰。

### 5.3 封装

- 导出 **`request.get/post/put/delete<T>()`**，内部使用同一实例。  
- **与 Pinia**：避免循环依赖；token 可通过 **getter 函数注入** 或请求前 **动态读取**。

### 5.4 错误展示策略（建议）

| 类型 | 建议 |
|------|------|
| 401 / 登录失效 | 全局处理 + 跳转 |
| 通用网络/5xx | 全局 Toast |
| 业务 `code` 与表单字段相关 | 页面内联，不全局刷屏 |
| 列表加载失败 | 表格/卡片 **空状态 + 重试** |

---

## 6. 目录与组件分层（建议）

> **与 Service、Agent 同思路**：`features` 垂直切片 + `core`/`components/base` 横切 + **薄路由入口**。完整示例树见 **TECH-003 §2**。

```
PMP_Web/src/
├── api/
├── components/base、components/business
├── composables/
├── core/
├── features/            # 按 REQ 域划分，与 TECH-003 对齐
├── layouts/
├── router/              # 聚合各 feature 导出的 routes
├── stores/
├── styles/
└── main.ts
```

- **抽象原则**：**第二次真实重复**再抽到 `base`/`business`，避免过早「万能组件」。

---

## 7. 与需求文档的对应

- **REQ-M09**：布局、路由、权限菜单 → `layouts`、`router`、导航守卫。  
- **REQ-M11**：AI 抽屉、应用/撤回 → 页面级 UI；**不写死**直连模型，一律走 **业务 API**（由 api 再调 ai-service）。

---

## 8. 修订记录

| 版本 | 说明 |
|------|------|
| v0.1 | 初稿：Vue3 + Element Plus + Pinia + Axios；`{ code, message, data }`；暗色优先；动效策略；目录建议 |

---

**文档状态：草案 v0.1（后端成功码等细节对齐时可小改）**
