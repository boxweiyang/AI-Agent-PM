# AI 智能项目管理系统 - 系统架构设计书

---

## 📋 文档信息

| 项目         | 内容             |
| ------------ | ---------------- |
| **文档编号** | ARCH-001         |
| **文档名称** | 系统架构设计书   |
| **版本号**   | v1.0             |
| **创建日期** | 2024-01-20       |
| **创建人**   | AI-Agent-PM Team |
| **状态**     | 🔄 进行中        |
| **优先级**   | P0               |

---

## 第 1 章 架构概述

### 1.1 架构目标

本系统的架构设计旨在实现以下目标：

**1. 高可用性**

- 系统可用性达到 99.5%+
- 支持故障自动恢复
- 数据备份与容灾

**2. 高性能**

- 页面响应时间 < 2 秒
- API 响应时间 < 500ms
- 支持 100+ 并发用户

**3. 易扩展**

- 模块化设计，易于功能扩展
- 支持水平扩展
- 插件化架构

**4. 易维护**

- 代码结构清晰
- 文档完善
- 自动化运维

**5. 安全性**

- 数据安全
- 认证授权完善
- 符合安全规范

### 1.2 设计原则

**1. 分层架构原则**

- 表现层、服务层、数据访问层、数据持久层清晰分离
- 每层职责明确，不跨层调用

**2. 单一职责原则**

- 每个类只负责一项职责
- 每个模块只做一件事

**3. 依赖倒置原则**

- 依赖于抽象而非具体实现
- 便于替换和测试

**4. 接口隔离原则**

- 使用多个专门的接口优于单个通用接口
- 减少耦合

**5. 开闭原则**

- 对扩展开放，对修改关闭
- 通过扩展实现新功能，而非修改现有代码

### 1.3 技术选型

#### 前端技术栈

| 技术            | 选型              | 理由                 |
| --------------- | ----------------- | -------------------- |
| **框架**        | Vue 3             | 轻量、高性能、易上手 |
| **语言**        | JavaScript (ES6+) | 生态成熟、团队熟悉   |
| **UI 库**       | Element Plus      | 组件丰富、美观       |
| **状态管理**    | Pinia             | Vue 3 官方推荐、简洁 |
| **路由**        | Vue Router 4      | 官方路由、功能完善   |
| **HTTP 客户端** | Axios             | 成熟稳定、拦截器强大 |
| **图表库**      | ECharts           | 功能强大、图表丰富   |
| **构建工具**    | Vite              | 快速启动、热更新     |

#### 后端技术栈

| 技术         | 选型        | 理由                       |
| ------------ | ----------- | -------------------------- |
| **框架**     | FastAPI     | 高性能、异步、自动生成文档 |
| **语言**     | Python 3.9+ | AI 生态好、开发效率高      |
| **ORM**      | SQLAlchemy  | 功能强大、支持多数据库     |
| **认证**     | JWT (PyJWT) | 无状态、安全               |
| **密码加密** | bcrypt      | 安全可靠                   |
| **验证**     | Pydantic    | 类型安全、性能好           |

#### AI 技术栈

| 技术           | 选型         | 理由                    |
| -------------- | ------------ | ----------------------- |
| **框架**       | LangChain    | AI 应用开发标准、生态好 |
| **模型适配**   | 多模型适配器 | 支持国内主流大模型      |
| **提示词管理** | 模板引擎     | 可配置、易维护          |

#### 数据库

| 环境     | 选型                    | 理由                     |
| -------- | ----------------------- | ------------------------ |
| **开发** | SQLite                  | 轻量、无需安装、快速原型 |
| **生产** | SQL Server / PostgreSQL | 企业级、性能强、可扩展   |

---

## 第 2 章 总体架构

### 2.1 系统架构图

```
┌─────────────────────────────────────────────────────────┐
│                     用户层                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ 项目经理  │  │ 产品经理  │  │ 开发人员  │  ...         │
│  └──────────┘  └──────────┘  └──────────┘              │
└─────────────────────────────────────────────────────────┘
                        ↓ HTTPS
┌─────────────────────────────────────────────────────────┐
│                   表现层 (Frontend)                      │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Vue 3 + Element Plus + Pinia                      │ │
│  │  - 项目管理页面                                     │ │
│  │  - 文档管理页面                                     │ │
│  │  - 任务管理页面                                     │ │
│  │  - Dashboard                                        │ │
│  │  - AI 对话组件                                      │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                        ↓ HTTP/REST API
┌─────────────────────────────────────────────────────────┐
│                  服务层 (Backend)                        │
│  ┌────────────────────────────────────────────────────┐ │
│  │  FastAPI Application                               │ │
│  │  ┌──────────────┐  ┌──────────────┐               │ │
│  │  │ API Routes   │  │ Middlewares  │               │ │
│  │  │ - Projects   │  │ - CORS       │               │ │
│  │  │ - Documents  │  │ - Auth       │               │ │
│  │  │ - Tasks      │  │ - Logging    │               │ │
│  │  │ - Members    │  │              │               │ │
│  │  └──────────────┘  └──────────────┘               │ │
│  │                                                    │ │
│  │  ┌──────────────────────────────────────────────┐ │ │
│  │  │           Services (业务逻辑层)                │ │ │
│  │  │  - ProjectService                            │ │ │
│  │  │  - DocumentService                           │ │ │
│  │  │  - TaskService                               │ │ │
│  │  │  - AIService                                 │ │ │
│  │  └──────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                        ↓ Repository Pattern
┌─────────────────────────────────────────────────────────┐
│               数据访问层 (Repository)                    │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Repositories                                      │ │
│  │  - ProjectRepository                               │ │
│  │  - DocumentRepository                              │ │
│  │  - TaskRepository                                  │ │
│  │  - MemberRepository                                │ │
│  └────────────────────────────────────────────────────┘ │
│                        ↓ ORM                             │
│  ┌────────────────────────────────────────────────────┐ │
│  │  SQLAlchemy Models                                 │ │
│  │  - Project Model                                   │ │
│  │  - Document Model                                  │ │
│  │  - Task Model                                      │ │
│  │  - Member Model                                    │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│              数据持久层 (Database)                       │
│  ┌────────────────────────────────────────────────────┐ │
│  │  SQLite (开发) / SQL Server (生产)                  │ │
│  │  - projects 表                                     │ │
│  │  - documents 表                                    │ │
│  │  - tasks 表                                        │ │
│  │  - members 表                                      │ │
│  │  - ...                                             │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                AI 能力层 (AI Core)                       │
│  ┌────────────────────────────────────────────────────┐ │
│  │  PMP_AI_Core (独立 Python 包)                         │ │
│  │  ┌──────────────────────────────────────────────┐ │ │
│  │  │ LLM Adapters                                  │ │ │
│  │  │ - Tongyi Adapter                              │ │ │
│  │  │ - Wenxin Adapter                              │ │ │
│  │  │ - Kimi Adapter                                │ │ │
│  │  │ - Zhipu Adapter                               │ │ │
│  │  │ - Iflytek Adapter                             │ │ │
│  │  └──────────────────────────────────────────────┘ │ │
│  │                                                    │ │
│  │  ┌──────────────────────────────────────────────┐ │ │
│  │  │ Prompt Templates                              │ │ │
│  │  │ - PRD Generation                              │ │ │
│  │  │ - Design Generation                           │ │ │
│  │  │ - Story Generation                            │ │ │
│  │  └──────────────────────────────────────────────┘ │ │
│  │                                                    │ │
│  │  ┌──────────────────────────────────────────────┐ │ │
│  │  │ AI Services                                   │ │ │
│  │  │ - Chat Service                                │ │ │
│  │  │ - Document Service                            │ │ │
│  │  │ - Analysis Service                            │ │ │
│  │  └──────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                        ↓ AI API Calls
┌─────────────────────────────────────────────────────────┐
│                 外部 AI 服务                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ 通义千问  │  │ 文心一言  │  │   Kimi    │  ...         │
│  └──────────┘  └──────────┘  └──────────┘              │
└─────────────────────────────────────────────────────────┘
```

### 2.2 分层架构说明

#### 表现层（Frontend）

**职责：**

- 用户界面展示
- 用户交互处理
- 数据可视化
- 前端路由

**技术实现：**

- Vue 3 Composition API
- Pinia 状态管理
- Element Plus 组件库
- ECharts 图表库

**关键特性：**

- 组件化开发
- 响应式布局
- 流式输出显示
- 动画效果丰富

---

#### 服务层（Backend）

**职责：**

- 业务逻辑处理
- API 接口提供
- 认证授权
- 数据验证

**技术实现：**

- FastAPI 框架
- Pydantic 数据验证
- JWT 认证
- 依赖注入

**关键特性：**

- 异步处理
- 自动生成 API 文档
- 统一错误处理
- 日志记录

---

#### 数据访问层（Repository）

**职责：**

- 数据库操作封装
- CRUD 统一接口
- 查询优化

**技术实现：**

- Repository Pattern
- SQLAlchemy ORM
- 泛型仓库

**关键特性：**

- 数据库无关性
- 易于测试
- 代码复用

---

#### 数据持久层（Database）

**职责：**

- 数据存储
- 数据索引
- 事务管理

**技术实现：**

- SQLite（开发）
- SQL Server（生产）
- SQLAlchemy ORM

**关键特性：**

- 数据一致性
- 高性能查询
- 可扩展

---

#### AI 能力层（AI Core）

**职责：**

- AI 模型适配
- 提示词管理
- 对话服务
- 文档生成

**技术实现：**

- LangChain 框架
- 多模型适配器
- 提示词模板引擎

**关键特性：**

- 多模型支持
- 流式输出
- 上下文管理

---

## 第 3 章 技术架构

### 3.1 前端架构

#### 3.1.1 组件化设计

```
App.vue (根组件)
    ├── RouterView (路由视图)
    │
    ├── Layout (布局组件)
    │   ├── PageHeader (页面头部)
    │   ├── Sidebar (侧边栏)
    │   └── Footer (页脚)
    │
    └── Views (页面组件)
        ├── ProjectList (项目列表)
        ├── ProjectHome (项目首页)
        ├── DocumentList (文档列表)
        ├── TaskBoard (任务看板)
        ├── Dashboard (仪表盘)
        └── ...

公共组件库：
    ├── common/ (通用组件)
    │   ├── PageHeader
    │   ├── DataTable
    │   ├── SearchBar
    │   └── Pagination
    │
    ├── ai/ (AI 组件)
    │   ├── AIChatDrawer ⭐
    │   ├── AIPromptInput
    │   └── StreamingText
    │
    ├── document/ (文档组件)
    │   ├── DocumentViewer
    │   ├── MarkdownRenderer
    │   └── DiffViewer
    │
    └── task/ (任务组件)
        ├── TaskBoard
        ├── TaskCard
        └── TaskDetail
```

#### 3.1.2 状态管理（Pinia）

```javascript
// stores/index.js
stores:
  - user (用户 Store)
    * userInfo, token, permissions
    * login(), logout(), checkPermission()

  - project (项目 Store)
    * projectList, currentProject
    * fetchProjectList(), createProject()

  - document (文档 Store)
    * documentList, currentDocument
    * fetchDocuments(), saveDocument()

  - task (任务 Store)
    * taskList, filters
    * fetchTasks(), updateStatus()

  - member (成员 Store)
    * memberList, recommendations
    * fetchMembers(), recommendMembers()

  - dashboard (仪表盘 Store)
    * overview, charts data
    * fetchDashboardData()

  - aiConfig (AI 配置 Store)
    * currentModel, tokens
    * updateToken(), switchModel()
```

#### 3.1.3 API 层设计

```javascript
// api/index.js (Axios 实例)
const request = axios.create({
  baseURL: 'http://localhost:8000',
  timeout: 30000
})

// 请求拦截器
request.interceptors.request.use(config => {
  // 添加 Token
  // 记录请求日志
  return config
})

// 响应拦截器
request.interceptors.response.use(response => {
  // 返回数据
  // 记录响应日志
  return response.data
}, error => {
  // 统一错误处理
  // 401 跳转登录
  return Promise.reject(error)
})

// API 模块
api/
  ├── project.js
  ├── document.js
  ├── task.js
  ├── member.js
  ├── dashboard.js
  └── auth.js
```

---

### 3.2 后端架构

#### 3.2.1 FastAPI 应用结构

```python
# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="AI Agent PM Platform",
    description="AI 智能项目管理系统",
    version="1.0.0"
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
from .api.v1 import projects, documents, tasks, members, dashboard, auth
app.include_router(auth.router, prefix="/api/v1/auth", tags=["认证"])
app.include_router(projects.router, prefix="/api/v1/projects", tags=["项目"])
app.include_router(documents.router, prefix="/api/v1/documents", tags=["文档"])
app.include_router(tasks.router, prefix="/api/v1/tasks", tags=["任务"])
app.include_router(members.router, prefix="/api/v1/members", tags=["成员"])
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["Dashboard"])

@app.get("/")
async def root():
    return {"message": "Welcome to AI Agent PM Platform"}
```

#### 3.2.2 依赖注入

```python
# app/dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .db.session import get_db
from .core.security import verify_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """获取当前登录用户"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="无法验证凭证",
        headers={"WWW-Authenticate": "Bearer"},
    )

    user = verify_token(token, db)
    if user is None:
        raise credentials_exception
    return user

async def get_project_owner(
    current_user = Depends(get_current_user),
    project_id: int = Path(...)
):
    """检查是否为项目负责人"""
    # 权限检查逻辑
    pass
```

---

### 3.3 AI 架构

#### 3.3.1 LLM 抽象层

```python
# PMP_AI_Core/ai_core/llm/base.py
from abc import ABC, abstractmethod

class BaseLLM(ABC):
    """LLM 基类"""

    @abstractmethod
    async def generate(self, prompt: str, **kwargs) -> str:
        """生成回复"""
        pass

    @abstractmethod
    async def stream_generate(self, prompt: str, **kwargs):
        """流式生成"""
        pass

    @property
    @abstractmethod
    def model_name(self) -> str:
        """模型名称"""
        pass
```

#### 3.3.2 工厂模式

```python
# PMP_AI_Core/ai_core/llm/factory.py
class LLMFactory:
    """LLM 工厂类"""

    _registry = {}

    @classmethod
    def register(cls, name: str):
        """注册模型"""
        def decorator(llm_class):
            cls._registry[name] = llm_class
            return llm_class
        return decorator

    @classmethod
    def create(cls, name: str, **kwargs):
        """创建 LLM 实例"""
        if name not in cls._registry:
            raise ValueError(f"不支持的模型：{name}")
        return cls._registry[name](**kwargs)

    @classmethod
    def list_models(cls):
        """列出所有可用模型"""
        return list(cls._registry.keys())
```

---

## 第 4 章 部署架构

### 4.1 开发环境部署

```
┌─────────────────────────────────────┐
│         开发机器                     │
│                                     │
│  ┌──────────────┐  ┌──────────────┐│
│  │  Frontend    │  │   Backend    ││
│  │  (Vite Dev)  │  │  (Uvicorn)   ││
│  │  :5173       │  │  :8000       ││
│  └──────────────┘  └──────────────┘│
│          ↓                ↓         │
│  ┌──────────────────────────────┐  │
│  │      SQLite Database         │  │
│  │      database.db             │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

### 4.2 生产环境部署

```
┌─────────────────────────────────────────────────┐
│              Nginx (反向代理)                    │
│                   Port 80/443                   │
└─────────────────────────────────────────────────┘
              ↓                    ↓
    ┌──────────────────┐  ┌──────────────────┐
    │   Frontend       │  │    Backend       │
    │   (Static Files) │  │   (Gunicorn)     │
    │   Nginx Location │  │   :8000          │
    └──────────────────┘  └──────────────────┘
                                    ↓
                          ┌──────────────────┐
                          │  SQL Server      │
                          │  Database        │
                          └──────────────────┘
```

---

## 第 5 章 安全设计

### 5.1 认证授权

**JWT Token 流程：**

```
1. 用户登录 → 验证用户名密码
2. 生成 JWT Token → 返回给前端
3. 前端存储 Token → 每次请求携带
4. 后端验证 Token → 解析用户信息
5. Token 过期 → 刷新 Token 或重新登录
```

### 5.2 数据加密

**密码加密：**

```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 加密
hashed = pwd_context.hash(password)

# 验证
verified = pwd_context.verify(password, hashed)
```

### 5.3 CORS 配置

```python
# 仅允许信任的源
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://yourdomain.com",
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
```

---

## 第 6 章 扩展性设计

### 6.1 水平扩展

**方案：**

- 负载均衡（Nginx）
- 多实例部署
- 会话共享（Redis）

### 6.2 插件化设计

**扩展点：**

- AI 模型适配器（可添加新模型）
- 导出格式（可添加新格式）
- 报表模板（可自定义）

---

**文档结束**

---

_本文件版权归 AI-Agent-PM 项目团队所有，未经许可不得外传_
