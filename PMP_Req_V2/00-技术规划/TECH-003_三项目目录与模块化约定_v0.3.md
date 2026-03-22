# TECH-003 三项目目录与模块化约定（v0.3）

> 与 **TECH-001 v0.3**（三子项目、Agent `import`）、**TECH-002**（前端细节）、**TECH-004**（Service 栈）配合使用。  
> **v0.3**：在 v0.2 基础上 **展开三端完整目录树**、**feature 标准子结构**、**M01～M12 对照表**、**M11 模式③（结构化粘贴）在 Service 的落点**。

**统一思路**：按 **业务/能力垂直切片** 建 **`features`**；**横切能力** 进 **`core` / `common` / `components/base`**；**对外入口** 保持 **薄**（路由聚合、注册表、门面）。

---

## 1. 三条共同原则（冻结）

| 原则 | 说明 |
|------|------|
| **垂直切片** | 每个业务域或 AI 能力一个文件夹，**内部**自包含该域主要代码（减少跨域互相 include 混乱）。 |
| **横切下沉** | 日志、HTTP 客户端封装、通用 UI、DB 连接、鉴权中间件等 → **`core` / `common` / `components/base`**，**不**复制进每个 feature。 |
| **薄入口** | **路由层**（Web / Service）只做：鉴权、参数校验、**调用本域 service 或 Agent facade**、返回 DTO；**不写**大段领域逻辑。 |
| **注册扩展** | 新增能力时：**加 feature 目录 + 注册一行**（Vue 路由、FastAPI `include_router`、Agent `registry`），避免中央文件无限膨胀。 |

---

## 2. PMP_Web（Vue 3 + Vite）— 完整目录规划

### 2.1 仓库根（`PMP_Web/`）

```
PMP_Web/
├── index.html
├── package.json
├── pnpm-lock.yaml              # 或 package-lock.json / yarn.lock，团队统一一种
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── .env.development            # 不提交密钥；示例见 .env.example
├── .env.example
├── public/                     # 静态资源（favicon 等）
├── README.md
└── src/
    ├── main.ts
    ├── App.vue
    ├── api/                    # Axios 实例 + 按域拆分 *.ts（与后端路由域一致）
    │   ├── client.ts           # 实例、拦截器（Access 静默 Refresh，见 TECH-002）
    │   ├── auth.ts
    │   ├── projects.ts
    │   ├── documents.ts
    │   └── ...                 # 与 features 一一对应或按聚合拆分
    ├── assets/
    ├── components/
    │   ├── base/               # 二次封装 Element Plus（ElTable 封装等）
    │   └── business/           # 跨 feature 复用的业务块（如项目选择器）
    ├── composables/            # 全局或跨域 composable（特化仍放 feature 内）
    ├── core/                   # 横切：常量、工具、权限指令、全局类型、路由守卫辅助
    │   ├── constants/
    │   ├── utils/
    │   ├── types/
    │   └── permissions.ts
    ├── features/               # 垂直切片（与 REQ 模块对应，见 §7）
    │   ├── auth/
    │   ├── workspace/          # M09 工作台、项目列表入口
    │   ├── project/            # 项目内壳、子路由出口（M01/M09）
    │   ├── requirement/      # M02
    │   ├── design/             # M02B；其下可再分子目录 interface / db_catalog 对应 M02C/M02D
    │   ├── iteration/          # M03
    │   ├── taskboard/          # M04
    │   ├── workforce/          # M05（可与 taskboard 邻近；人力池独立 feature）
    │   ├── cr/                 # M06
    │   ├── qa/                 # M07
    │   ├── dashboard/          # M08
    │   ├── retrospective/      # M10
    │   └── ai_settings/        # TECH-005：模型连接、偏好；AI 抽屉壳层可放此处或 core
    ├── layouts/                # M09：主壳、侧栏、顶栏布局
    ├── router/
    │   └── index.ts            # 薄聚合：import 各 feature 的 routes 片段后 merge
    ├── stores/                 # Pinia，建议按域拆文件，与 features 对齐
    ├── styles/                 # 全局样式、暗色 token（TECH-002）
    └── plugins/                # 可选：i18n、全局组件注册
```

### 2.2 可选：OpenAPI 生成类型

- 由 **PMP_Service** 导出 `openapi.json` 后，在 `PMP_Web` 用 **openapi-typescript** 等生成：  
  **`src/api/generated/`**（或 `src/types/api.d.ts`），**勿手改**；脚本可挂在 `package.json` `scripts.codegen-api`。

### 2.3 Feature 内标准子结构（推荐冻结）

**约定**：每个 `features/<name>/` **至少**包含 **`routes.ts`**（export 路由数组）；页面与私有组件 **默认放在本目录下**，避免与全局 `views/` 混用两套风格。

```
features/<name>/
├── routes.ts                   # export const xxxRoutes: RouteRecordRaw[]
├── pages/                      # 或 views/，全仓库统一一种命名
├── components/                 # 仅本域可见的组件
├── composables/                # 可选
└── stores/                     # 可选：特大域再拆；小域可用顶层 stores/<name>.ts
```

- **AI 抽屉**：可按域放在 **`features/<域>/components/AiDrawer*.vue`**，或抽 **`components/business/AiDrawerShell.vue`** + 各域传 `capability`（与 M11 一致）。

---

## 3. PMP_Service（FastAPI）— 完整目录规划

### 3.1 仓库根（`PMP_Service/`）

```
PMP_Service/
├── pyproject.toml              # 依赖含：fastapi、uvicorn、sqlalchemy[async]、alembic、pydantic-settings 等
├── README.md
├── .env.example
├── alembic.ini
├── alembic/
│   ├── env.py
│   ├── script.py.mako
│   └── versions/               # 迁移脚本
├── tests/                      # pytest，目录镜像 features 或按 test_*.py
│   ├── conftest.py
│   └── ...
├── scripts/                    # 可选：导出 openapi、初始化数据
│   └── export_openapi.py
└── src/
    └── pmp_service/            # 包根（包名实现阶段可微调，与 import 路径一致即可）
        ├── __init__.py
        ├── main.py             # FastAPI app、lifespan、CORS、全局异常、挂载 v1 路由
        ├── core/               # 横切（冻结：与业务 feature 解耦）
        │   ├── config.py       # pydantic-settings
        │   ├── security.py     # JWT、密码哈希、依赖项 get_current_user
        │   ├── db.py           # async engine、session factory
        │   ├── logging.py
        │   ├── exceptions.py   # 业务异常 → HTTP / code 映射（可选）
        │   └── ai_client.py    # 可选：封装调用 ai_gateway / 超时重试；未来可改为 httpx 远程 Agent
        ├── schemas/            # 仅跨多域复用的 Pydantic；域内优先放各 feature/schemas.py
        ├── features/
        │   ├── auth/           # 登录、refresh、登出
        │   ├── projects/       # M01：项目 CRUD、归档；项目成员与权限组绑定（与 M09 一致）
        │   ├── documents/      # M02/M02B：文档元数据、版本、文件路径 STORAGE_ROOT、Diff 元数据
        │   ├── interfaces/     # M02C：接口库
        │   ├── db_catalog/     # M02D：库表/DDL 目录（原草案名 `schema_db`，避免与 SQLAlchemy MetaData 混淆）
        │   ├── iterations/     # M03：迭代、Story
        │   ├── tasks/          # M04：Task、看板相关 API
        │   ├── workforce/      # M05：人力池、预订
        │   ├── changes/        # M06：CR
        │   ├── qa/             # M07：提测、缺陷、联调
        │   ├── reports/        # M08：Dashboard 数据源
        │   ├── closure/        # M10：结项、复盘
        │   ├── ai_settings/    # TECH-005：用户 LLM 配置、偏好、会话表 CRUD；**禁止** import Agent
        │   └── ai_gateway/     # **唯一** import pmp_ai_agent：转调 facade；聚合各域所需的 invoke
        └── ...
```

### 3.2 单个业务 feature 内标准文件（推荐）

```
features/<name>/
├── __init__.py
├── router.py                   # APIRouter，prefix 与 tags 清晰
├── service.py                  # 用例与编排
├── schemas.py                  # 请求/响应 Pydantic
├── models.py                   # SQLAlchemy models（或拆 repository.py）
└── repository.py               # 可选：复杂查询单独层
```

### 3.3 `ai_gateway/` 内建议

```
features/ai_gateway/
├── __init__.py
├── router.py                   # 可选：统一 POST /ai/invoke 或按 capability 分子路径
├── service.py                  # 组装 history、preference_bundle、调用 facade
└── capabilities.py             # 可选：capability 字符串常量，与 Agent registry 键对齐
```

### 3.4 M11「外置 AI 回填」（模式③）落点

- **校验 / 解析 / 预览数据组装**：在 **各业务域** `service.py`（如 `documents`、`iterations`）实现，或抽 **`core/structured_import/`** 放 **共用 JSON Schema / Pydantic 校验器**，由多域 `router` 引用。  
- **原则**：**不** import `pmp_ai_agent`；与 **TECH-005 §7** 一致。

### 3.5 调用 Agent 的唯一入口（冻结，同 v0.2）

| 规则 | 说明 |
|------|------|
| **禁止** | 在 **`features/*` 任意业务域**（`documents`、`tasks` 等）内 **`import pmp_ai_agent`**。 |
| **允许** | 仅在 **`features/ai_gateway`**（及可选 **`core/ai_client.py`**）中 import 并调 **`facade`**。 |
| **业务域** | 需要模型推理时：调 **`ai_gateway` 暴露的函数** 或注入的 **`AiClient`**。 |

**自检**：`grep -r "pmp_ai_agent" src` 命中应 **仅限于** `features/ai_gateway/` 与（若存在）`core/ai_client.py`。

---

## 4. PMP_AI_Agent（Python 包）— 完整目录规划

### 4.1 仓库根（`PMP_AI_Agent/`）

```
PMP_AI_Agent/
├── pyproject.toml              # 包名如 pmp_ai_agent
├── README.md
├── tests/
│   ├── conftest.py
│   └── features/               # 与各能力目录对应
└── src/
    └── pmp_ai_agent/
        ├── __init__.py
        ├── registry.py         # capability → 可调用对象
        ├── facade.py           # invoke(capability, payload) 薄分发
        ├── common/
        │   ├── llm/            # 模型客户端封装、重试
        │   ├── context/        # history_messages → LangChain 消息
        │   ├── preferences/    # preference_bundle 合并进 prompt
        │   └── prompts/        # 共享片段、模板
        └── features/
            ├── requirement_doc/    # M02
            ├── tech_doc/           # M02B
            ├── iteration_plan/     # M03
            ├── task_prompt/        # M04（与「一键提示词」拼装同源思路，见 REQ-M04 §6.4）
            ├── cr_assist/          # M06 可选
            ├── retrospective/      # M10 可选
            └── ...                 # 新增能力：目录 + registry 一行
```

### 4.2 单个能力目录内标准文件（推荐）

```
features/<capability_name>/
├── __init__.py
├── handler.py                  # 或 run.py：实现约定接口 run(ctx) -> result
├── prompts/                    # 可选：该能力专用模板
└── parsers.py                  # 可选：模型输出 → 结构化 dict（**不**落库）
```

---

## 5. 三端 feature 命名对照（M01～M12）

> 下列 **Web / Service** 为 **文件夹名建议**；若团队更喜单数 `task` 可统一重命名，**三端同步** 即可。

| REQ | 说明 | PMP_Web `features/` | PMP_Service `features/` | PMP_AI_Agent `features/` |
|-----|------|---------------------|-------------------------|----------------------------|
| M01 | 项目与立项 | `project`（壳内）+ `workspace`（列表入口） | `projects` | — |
| M02 | 需求与文档 | `requirement` | `documents`（需求侧） | `requirement_doc` |
| M02B | 架构与技术设计 | `design`（技术文档子区） | `documents`（设计侧）或并列 `design` | `tech_doc` |
| M02C | 接口管理 | `design/interface` 或 `design` 子路由 | `interfaces` | 可选：提示词上下文由 Service 摘要传入 |
| M02D | 库表/DDL | `design/db_catalog` | `db_catalog` | 同上 |
| M03 | 迭代·Story·Task 规划 | `iteration` | `iterations`（Story 可同包或子模块） | `iteration_plan` |
| M04 | Task 与执行 | `taskboard` | `tasks` | `task_prompt` |
| M05 | 人力池与预订 | `workforce` | `workforce` | — |
| M06 | 变更与 CR | `cr` | `changes` | `cr_assist`（可选） |
| M07 | 开发与测试协同 | `qa` | `qa` | 可选后续 |
| M08 | Dashboard | `dashboard` | `reports` | — |
| M09 | 应用壳与首页 | `layouts` + `workspace` + `auth` | `auth` + `projects`（成员） | — |
| M10 | 收尾与复盘 | `retrospective` | `closure` | `retrospective` |
| M11 | 全站 AI 交互 | 各域抽屉 + `ai_settings` | `ai_gateway` + `ai_settings` | 全部 `features/*` |
| M12 | 通用规范与验收 | —（横切质量门禁） | — | — |

**横切**：**TECH-005** 的会话与偏好属 **`ai_settings`** + **`ai_gateway`**；**M11 模式③** 属 **业务 feature + `core/structured_import`**（见 §3.4）。

---

## 6. 仓库根 `AI-Agent-PM/`（单仓三项目）总览

```
AI-Agent-PM/
├── PMP_Web/
├── PMP_Service/
├── PMP_AI_Agent/
├── PMP_Req_V2/
├── PMP_Doc/                    # 可选：历史文档
├── README.md                   # 建议：说明先起 Service、再起 Web、Agent 随 Service 进程加载
└── docker-compose.yml          # 可选（TECH-001）
```

---

## 7. 验收（结构级）

- [ ] 三项目根目录分别为 **PMP_Web**、**PMP_Service**、**PMP_AI_Agent**。  
- [ ] **PMP_Service** 中 **`pmp_ai_agent` 的 import 仅出现在 `features/ai_gateway/` 与（可选）`core/ai_client.py`**。  
- [ ] 三端均有 **`features` + `core`/`common`/`base`** 分层；**新增域优先新建 feature 目录**。  
- [ ] **M02D** Service 目录使用 **`db_catalog`**（或团队统一另一名），**避免** 与 SQLAlchemy `schema` 术语混读。  
- [ ] **Web** 路由仅 **`router/index.ts` 聚合**，各域 **`features/*/routes.ts` export**。  

---

## 8. 修订记录

| 版本 | 说明 |
|------|------|
| v0.2 | §3.1 冻结唯一 import Agent；验收 grep |
| v0.3 | **完整三端目录树**；**feature 标准子结构**；**M01～M12 对照表**；**M11 模式③ Service 落点**；**workforce**；**db_catalog** 命名说明；OpenAPI 生成路径 |

---

**文档状态：草案 v0.3（脚手架初始化时允许微调文件名，对照表需同步）**
