# TECH-001 多子项目划分与 AI 协作方式（v0.3）

> v0.3：在 v0.2 基础上 **封板原 §9 待定项**（库表/鉴权/流式/编排），摘要指向 **TECH-002～005**；实现细节以各分册为准。  
> v0.2：**顶层目录**定为 `PMP_Web` / `PMP_Service` / `PMP_AI_Agent`；**PMP_Service → PMP_AI_Agent** 采用 **Python `import`（包依赖）**，非 HTTP。统一模块化思路见 **TECH-003**。

---

## 1. 目标

单仓库内 **三个可并行开发的子项目**（根目录各为独立文件夹）：

| 目录 | 职责 |
|------|------|
| **PMP_Web** | Vue3 + Element Plus SPA；**仅** 调用 **PMP_Service** 的 HTTP API。细则见 **TECH-002**。 |
| **PMP_Service** | 业务 API（FastAPI 等）、鉴权、数据库与文件 IO；需要 AI 时 **仅** 经 **`features/ai_gateway`（或 `core/ai_client`）** **import** **PMP_AI_Agent** 并调 **`facade`**；**业务 feature 禁止** 直接引用 Agent 包（见 **TECH-003 §3.1**）。 |
| **PMP_AI_Agent** | 纯 Python 包：按 **能力** 分子目录实现；**不** 持有业务库连接；**不** 对浏览器暴露。 |

> **原则**：浏览器 **不直连** 大模型；**模型 API Key 仅配置在运行 PMP_Service 的环境**（或由 Agent 包读同一环境变量，但 **绝不进前端**）。  
> **方案 C（V1）**：部署上常为 **同一 Python 进程** 内 **Service 进程加载 Agent 包**；若未来要拆进程，Agent 侧加 HTTP 外壳即可，**能力目录结构可保留**。

---

## 2. 调用关系（冻结）

```
┌──────────────┐   HTTPS/JSON    ┌─────────────────────────────────────────┐
│  PMP_Web     │ ──────────────► │  PMP_Service（FastAPI，对外 API）        │
│              │   JWT 等       │  · 路由 / 鉴权 / ORM / 业务规则          │
└──────────────┘                 │  · AI：仅 ai_gateway → import Agent ───┐ │
                                 └────────────────────────────────────│─┘
                                                                        │
                                   Python import（同进程，V1）            │
                                                                        ▼
                                 ┌─────────────────────────────────────────┐
                                 │  PMP_AI_Agent（包：registry + features/*） │
                                 │  · 各能力模块 · 调 OpenAI 等 outbound HTTP   │
                                 └─────────────────────────────────────────┘
```

- **PMP_Service** 通过 **包依赖** 使用 Agent，例如本地开发：`pip install -e ../PMP_AI_Agent`（路径以实际 monorepo 为准）。  
- **不在 V1** 要求 Agent 单独监听端口；**不** 强制 HTTP 服务间调用。

---

## 3. 推荐仓库根目录（`AI-Agent-PM/`）

```
AI-Agent-PM/
├── PMP_Web/                 # 前端（Vue3 + Element Plus，见 TECH-002、TECH-003）
├── PMP_Service/             # 后端 API（Python）
├── PMP_AI_Agent/            # AI 能力包（Python，被 Service import）
├── PMP_Req_V2/              # 需求与技术规划文档
├── PMP_Doc/                 # 历史文档（可选）
└── （可选）pyproject.toml / 根 README 说明三项目如何本地安装与启动
```

### 3.1 可选共享内容

- **OpenAPI / 类型**：可由 **PMP_Service** 导出 OpenAPI，`PMP_Web` 用工具生成 `api` 类型（与 **TECH-002** 的 axios 泛型配合）。  
- **若未来** 出现跨三端的常量，再考虑 `packages/shared` 或小型 `PMP_Contracts`；**V1 不强制**。

---

## 4. PMP_AI_Agent 内部分层（Python）

**统一入口**：**注册表（registry）+ 薄门面（facade）**——按 **capability 键** 分发给各能力模块，**禁止** 在门面中堆叠所有业务 `if/else`。

**按能力分目录**（示例，与 REQ M02～M10 对齐，可增删）：

```
PMP_AI_Agent/
├── pyproject.toml           # 包名如 pmp_ai_agent
├── README.md
└── src/
    └── pmp_ai_agent/        # 包根
        ├── __init__.py
        ├── registry.py      # capability → 可调用对象 注册
        ├── facade.py        # 对外统一 invoke(capability, payload)（薄）
        ├── common/          # LLM 客户端、重试、日志、共享 prompt 片段
        └── features/
            ├── requirement_doc/   # M02
            ├── tech_doc/          # M02B
            ├── iteration_plan/    # M03
            ├── task_prompt/       # M04
            ├── cr_assist/         # M06 可选
            └── retrospective/     # M10 可选
```

- 每个 **`features/*`**：实现约定接口（如 `run(ctx) -> result`），在 **registry** 登记。  
- **新增能力**：新目录 + **注册一行**；**PMP_Service** 侧 **不** 在各业务域散落 `import Agent`，**只** 通过 **`ai_gateway` / `ai_client`** 调 `facade.invoke`（**TECH-003 §3.1 冻结**）。

---

## 5. PMP_Service 与 PMP_AI_Agent 的边界

| 归属 PMP_Service | 归属 PMP_AI_Agent |
|------------------|-------------------|
| 用户、项目、角色、权限（M09/M01） | prompt 拼装、模型调用、原始文本/结构化建议解析 |
| 文档与版本落库、Diff 元数据（M02/M02B） | **不** 访问业务数据库 |
| CR / Task / 缺陷等业务表 | 接收 Service **传入的上下文 JSON**（摘要），不反向查库（除非日后显式扩展） |
| 组装 HTTP 响应 `{ code, message, data }` | 返回 **纯数据**（dict/Pydantic），由 Service 决定是否落库 |

---

## 6. 与需求分册（M01～M12）

- **M11**：Web 抽屉与「应用」在 **PMP_Web**；落库在 **PMP_Service**；推理在 **PMP_AI_Agent**。  
- **M11 §2.5 三种协作模式**：**模式①②** 仍以 Web + Service 为主；**模式③（外置 AI 结构化回填）** 的 **校验与落库在 PMP_Service**，**不经过** `PMP_AI_Agent`（与 **TECH-005 §7** 一致）。  
- 凡 REQ 中「AI 辅助」：**Agent `features/*`** 须有对应规划位（见 §4）。

---

## 7. 迭代 0 建议顺序

1. 初始化 **PMP_AI_Agent** 为可安装包 + **registry + 一个 echo 能力**。  
2. **PMP_Service**：FastAPI 健康检查 + `pip install -e ../PMP_AI_Agent` + 路由内 **import 调 facade** 验证。  
3. **PMP_Web**：登录占位 + axios 调 Service。  
4. 垂直切片：M01/M02 第一条业务 + 第一个真实 Agent 能力。

---

## 8. 演进说明（方案 C → 未来可选拆分）

- **当前**：`import` 同进程，运维简单；**Agent 包 import 仅限 `ai_gateway` / `ai_client`**。  
- **未来**：若需独立扩缩 Agent，可将 **同一 `features/` + registry** 外挂 **FastAPI 子应用** 或独立服务；**优先只改 `core/ai_client.py`**（内部由 `import` 改为 **`httpx` 调远程**），**业务 feature 仍只调 `ai_gateway`**，改动面最小。

---

## 9. 已定案摘要（原「待定」项，V1 冻结）

以下结论 **已讨论收敛**；字段级与表结构以 **TECH-004** 及后续 OpenAPI/迁移为准。

### 9.1 三端技术栈与职责

| 子项目 | 栈（冻结） | 权威文档 |
|--------|------------|----------|
| **PMP_Web** | **Vue 3** + **Element Plus** + **Pinia** + **Vue Router** + **Axios** + **Vite** | **TECH-002** |
| **PMP_Service** | **Python 3.11+**、**FastAPI** + **Uvicorn**、**SQLAlchemy 2.x 异步**、**Alembic**、**pydantic-settings** | **TECH-004** |
| **PMP_AI_Agent** | **Python 3.11+**、**LangChain**（版本脚手架阶段锁定）、**registry + facade + features/** | **TECH-005**、本文 §4 |

- **浏览器只调 Service**：不直连大模型；模型 **API Key** 仅存 **Service（加密）**，经 **ai_gateway** 按需解密传入 Agent（**TECH-004 §7**、**TECH-005 §2**）。

### 9.2 数据库与 ORM

- **开发**：**SQLite** + **`aiosqlite`**（异步 URL，本地文件路径可配置）。  
- **生产/后期**：通过更换 **`DATABASE_URL`** 与驱动切换 **SQL Server**；业务以 **ORM + Alembic 迁移** 为主，方言差异在迁移层评审。  
- **时间**：库内 **UTC**，接口 **ISO8601**（**TECH-004 §2**）。

### 9.3 鉴权与安全（V1）

- **登录**：**账号 + 密码**（**无 SSO**，后期可扩展）。  
- **Access**：**JWT**，短效（如 15～60 分钟，实现可调）。  
- **Refresh**：**做**；**7 天滑动续期**；**每用户仅一条有效 Refresh**（新登录或轮换成功则作废旧端）；**Refresh 只存哈希**；传输优先 **HttpOnly Cookie** 等（**TECH-004 §3**）。  
- **权限**：**Permission + PermissionGroup**；用户多组并集；**项目维度** 用成员表/组绑定；**`is_system_admin` 全权限短路**（**TECH-004 §4**）。  
- **前端**：Access 过期 **静默 Refresh**，失败再登（**TECH-002** 拦截器）。

### 9.4 HTTP 契约与文档

- **前缀**：`/api/v1`。  
- **响应体**：`{ "code", "message", "data" }`，成功 **`code === 0`**（与 **TECH-002** 一致）。  
- **OpenAPI**：Service 默认暴露；可脚本导出 **`openapi.json`** 供 Web 生成类型（本文 §3.1）。  
- **CORS**：开发放行本地前端源；生产白名单（**TECH-004 §5**）。

### 9.5 AI 调用与流式（V1）

- **V1 冻结**：AI 对话接口以 **同步「完整 JSON 响应」** 为主（一次请求返回完整建议文本/结构化片段，由前端写入「建议区」再 **应用**）。**降低** 前后端与网关复杂度，与 **M11**「先建议、后应用」一致。  
- **SSE / Token 流式**：**不作为 V1 必做**；若迭代中需优化体验，在 **PMP_Service `ai_gateway`** 与 **PMP_Web 抽屉** 增量引入 **SSE** 或 **chunk 响应**，**不改变**「应用前不落库」的产品规则。  
- **外置回填（M11 模式③）**：纯 Service 校验解析，**与流式无关**（**TECH-005 §7**）。

### 9.6 本地开发与部署（V1）

- **Python 侧**：`PMP_AI_Agent` 以 **`pip install -e`**（或 **`uv` 等价可编辑安装**）装入 **PMP_Service** 虚拟环境；**单进程** 跑 Uvicorn 即可（方案 C）。  
- **前端**：在 **`PMP_Web/`** 内 **`pnpm`/`npm`** 独立安装与 dev server（与 Python **无强制** 单一 workspace 绑定）。  
- **根目录**：建议 **`README.md`** 说明「先起 Service、再起 Web」；**Docker Compose** **可选**（V1 不阻塞无 Compose 的纯本地起服务）。  
- **文件存储**：文档正文走 **文件系统**，路径由 **`STORAGE_ROOT`** 配置（**TECH-004 §6**）。

### 9.7 与 TECH-002～005 索引

| 主题 | 文档 |
|------|------|
| 前端壳、暗色、axios、`code===0` | **TECH-002** |
| 三项目目录、`features`、`ai_gateway` 唯一 import Agent | **TECH-003** |
| JWT/Refresh、权限、存储、日志 | **TECH-004** |
| LangChain、DashScope、会话记忆、偏好、ai_settings | **TECH-005** |

---

## 10. 修订记录

| 版本 | 说明 |
|------|------|
| v0.1 | 初稿 |
| v0.2 | 目录名 `PMP_*`；Service↔Agent **import**；对齐 **TECH-003** |
| v0.3 | **§9 待定 → 已定案**：栈、DB、JWT、API、**V1 非流式优先**、本地/部署；**§6** 补充 M11 模式③；**§10** 修订记录 |

---

**文档状态：草案 v0.3（V1 技术边界已封板，随脚手架可微调实现参数）**
