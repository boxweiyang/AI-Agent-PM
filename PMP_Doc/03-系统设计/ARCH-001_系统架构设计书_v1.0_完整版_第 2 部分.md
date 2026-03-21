# AI 智能项目管理系统 - 系统架构设计书（完整版）第 2 部分

---

## 第 2 章 总体架构（续）

### 2.1 系统架构图（详细版）

#### 2.1.1 完整系统架构

```mermaid
graph TB
    subgraph "用户层"
        A1[项目经理]
        A2[产品经理]
        A3[技术负责人]
        A4[开发工程师]
        A5[测试工程师]
    end

    subgraph "表现层 (Vue 3 + Element Plus)"
        B1[项目管理页面]
        B2[文档管理页面]
        B3[任务管理页面]
        B4[Dashboard 页面]
        B5[人员管理页面]
        B6[AI 对话组件]
        B7[公共组件库]
    end

    subgraph "API 网关层 (Nginx)"
        C1[负载均衡]
        C2[SSL 终止]
        C3[静态资源]
        C4[限流熔断]
    end

    subgraph "应用层 (FastAPI)"
        D1[认证服务]
        D2[项目服务]
        D3[文档服务]
        D4[任务服务]
        D5[人员服务]
        D6[报表服务]
        D7[AI 服务]
    end

    subgraph "数据访问层 (Repository)"
        E1[ProjectRepository]
        E2[DocumentRepository]
        E3[TaskRepository]
        E4[UserRepository]
        E5[TimeLogRepository]
    end

    subgraph "缓存层 (Redis)"
        F1[Session 缓存]
        F2[热点数据缓存]
        F3[分布式锁]
        F4[消息队列]
    end

    subgraph "数据持久层 (SQL Server/SQLite)"
        G1[(projects 表)]
        G2[(documents 表)]
        G3[(tasks 表)]
        G4[(users 表)]
        G5[(time_logs 表)]
    end

    subgraph "AI 能力层 (LangChain)"
        H1[通义千问适配器]
        H2[文心一言适配器]
        H3[Kimi 适配器]
        H4[智谱 AI 适配器]
        H5[讯飞星火适配器]
        H6[Prompt 模板库]
    end

    A1 --> B1
    A2 --> B2
    A3 --> B3
    A4 --> B3
    A5 --> B4

    B1 --> C1
    B2 --> C1
    B3 --> C1
    B4 --> C1
    B5 --> C1
    B6 --> C1

    C1 --> D1
    C1 --> D2
    C1 --> D3
    C1 --> D4
    C1 --> D5
    C1 --> D6
    C1 --> D7

    D1 --> E1
    D2 --> E1
    D2 --> E2
    D3 --> E3
    D4 --> E4
    D5 --> E5

    E1 --> G1
    E2 --> G2
    E3 --> G3
    E4 --> G4
    E5 --> G5

    D1 --> F1
    D2 --> F2
    D3 --> F2
    D7 --> F3

    D7 --> H1
    D7 --> H2
    D7 --> H3
    D7 --> H4
    D7 --> H5
    D7 --> H6
```

#### 2.1.2 数据流向图

```mermaid
sequenceDiagram
    participant U as 用户
    participant FE as 前端 (Vue 3)
    participant API as API 网关
    participant SVC as 服务层 (FastAPI)
    participant REPO as Repository 层
    participant CACHE as Redis 缓存
    participant DB as 数据库
    participant AI as AI 服务

    U->>FE: 1. 点击"查看项目详情"
    FE->>API: 2. GET /api/v1/projects/{id}
    API->>SVC: 3. 路由到 ProjectController
    SVC->>CACHE: 4. 查询缓存 (key: project:{id})

    alt 缓存命中
        CACHE-->>SVC: 5a. 返回缓存数据
        SVC-->>FE: 6a. 返回响应 (< 100ms)
        FE-->>U: 7a. 渲染页面
    else 缓存未命中
        SVC->>REPO: 5b. repo.get(id)
        REPO->>DB: 6b. SELECT * FROM projects WHERE id = ?
        DB-->>REPO: 7b. 返回项目数据
        REPO-->>SVC: 8b. 返回 Project 对象
        SVC->>CACHE: 9b. 写入缓存 (TTL: 5 分钟)
        SVC-->>FE: 10b. 返回响应 (< 500ms)
        FE-->>U: 11b. 渲染页面
    end

    Note over SVC,AI: 如果包含 AI 生成内容
    SVC->>AI: 12. 请求 AI 补充信息
    AI->>AI: 13. 调用 LLM API
    AI-->>SVC: 14. 返回 AI 生成内容 (< 10s)
    SVC-->>FE: 15. 流式输出到前端
    FE-->>U: 16. 实时显示思考过程
```

### 2.2 分层架构详细设计

#### 2.2.1 表现层架构

**组件层次结构：**

```
表现层（三层结构）

1. 页面层（views/）
   ├── ProjectList.vue      # 项目列表页
   ├── ProjectDetail.vue    # 项目详情页
   ├── DocumentManage.vue   # 文档管理页
   ├── TaskBoard.vue        # 任务看板页
   ├── Dashboard.vue        # 仪表盘页
   └── Settings.vue         # 设置页

2. 业务组件层（components/business/）
   ├── project/
   │   ├── ProjectCard.vue     # 项目卡片
   │   ├── ProjectForm.vue     # 项目表单
   │   ├── ProjectMetrics.vue  # 项目指标
   │   └── MemberSelector.vue  # 成员选择器
   ├── document/
   │   ├── DocumentTree.vue    # 文档树
   │   ├── VersionCompare.vue  # 版本对比
   │   └── CRForm.vue          # CR 表单
   ├── task/
   │   ├── TaskCard.vue        # 任务卡片
   │   ├── TaskDetail.vue      # 任务详情
   │   └── SprintBoard.vue     # Sprint 看板
   └── ai/
       ├── AIChatDrawer.vue    # AI 对话抽屉
       ├── AIThinking.vue      # AI 思考过程
       └── PromptSelector.vue  # Prompt 选择器

3. 公共组件层（components/common/）
   ├── AppHeader.vue        # 顶部导航
   ├── AppSidebar.vue       # 侧边栏
   ├── AppFooter.vue        # 底部
   ├── Loading.vue          # 加载组件
   ├── ErrorPage.vue        # 错误页面
   ├── Pagination.vue       # 分页组件
   └── SearchBox.vue        # 搜索框
```

**状态管理结构：**

```javascript
// Pinia Stores 组织

stores/
├── app.js              # 应用级状态（主题、语言、布局）
├── user.js             # 用户状态（登录信息、权限）
├── project.js          # 项目状态（项目列表、当前项目）
├── document.js         # 文档状态（文档树、版本历史）
├── task.js             # 任务状态（任务列表、筛选条件）
└── ai.js               # AI 状态（对话历史、模型配置）

// 示例：project store
export const useProjectStore = defineStore('project', {
  // State - 响应式数据
  state: () => ({
    projectList: [],           // 项目列表
    currentProjectId: null,    // 当前项目 ID
    filters: {
      status: '',              // 状态筛选
      priority: '',            // 优先级筛选
      search: ''               // 搜索关键词
    },
    pagination: {
      page: 1,                 // 当前页
      limit: 20,               // 每页数量
      total: 0                 // 总数
    }
  }),

  // Getters - 计算属性
  getters: {
    currentProject: (state) => {
      return state.projectList.find(p => p.id === state.currentProjectId)
    },
    filteredProjects: (state) => {
      return state.projectList.filter(project => {
        if (state.filters.status && project.status !== state.filters.status) return false
        if (state.filters.priority && project.priority !== state.filters.priority) return false
        if (state.filters.search && !project.name.includes(state.filters.search)) return false
        return true
      })
    },
    hasActiveProject: (state) => !!state.currentProjectId
  },

  // Actions - 业务逻辑
  actions: {
    // 获取项目列表
    async fetchProjectList(params = {}) {
      this.loading = true
      try {
        const response = await projectApi.getList({
          ...this.pagination,
          ...this.filters,
          ...params
        })
        this.projectList = response.data.list
        this.pagination.total = response.data.total
      } catch (error) {
        console.error('获取项目列表失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    // 设置当前项目
    setCurrentProject(id) {
      this.currentProjectId = id
      localStorage.setItem('currentProjectId', id)
    },

    // 清除当前项目
    clearCurrentProject() {
      this.currentProjectId = null
      localStorage.removeItem('currentProjectId')
    }
  }
})
```

#### 2.2.2 服务层架构

**FastAPI 应用结构：**

```python
# app/
├── main.py                 # FastAPI 应用入口
├── core/                   # 核心配置
│   ├── config.py          # 配置类
│   ├── security.py        # 安全工具
│   └── exceptions.py      # 自定义异常
├── api/                    # API 路由
│   ├── deps.py            # 依赖注入
│   ├── v1/                # API v1 版本
│   │   ├── __init__.py
│   │   ├── projects.py    # 项目路由
│   │   ├── documents.py   # 文档路由
│   │   ├── tasks.py       # 任务路由
│   │   ├── users.py       # 用户路由
│   │   └── ai.py          # AI 路由
│   └── router.py          # 路由注册
├── services/               # 业务服务层
│   ├── project_service.py
│   ├── document_service.py
│   ├── task_service.py
│   └── ai_service.py
├── db/                     # 数据访问层
│   ├── base.py            # 数据库基础
│   ├── session.py         # 会话管理
│   ├── models/            # 数据模型
│   │   ├── project.py
│   │   ├── document.py
│   │   └── task.py
│   └── repositories/      # Repository 层
│       ├── base_repo.py
│       ├── project_repo.py
│       └── document_repo.py
├── schemas/                # Pydantic 模式
│   ├── project.py
│   ├── document.py
│   └── task.py
└── utils/                  # 工具函数
    ├── logger.py
    ├── pagination.py
    └── response.py
```

**依赖注入系统：**

```python
# app/api/deps.py
"""
依赖注入模块
提供常用的依赖项，如数据库会话、当前用户等
"""
from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from jose import jwt

from app.core.config import settings
from app.db.session import get_db_session
from app.db.models.user import User
from app.db.repositories.user_repo import UserRepository

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

async def get_db() -> Generator[AsyncSession, None, None]:
    """
    获取数据库会话的依赖注入

    使用方式:
    @router.get("/items")
    async def get_items(db: AsyncSession = Depends(get_db)):
        pass
    """
    async for session in get_db_session():
        yield session

async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User:
    """
    获取当前登录用户的依赖注入

    验证 JWT Token，返回用户对象

    使用方式:
    @router.get("/me")
    async def get_me(current_user: User = Depends(get_current_user)):
        return current_user
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="无法验证凭证",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.JWTError:
        raise credentials_exception

    user_repo = UserRepository(db)
    user = await user_repo.get(user_id)

    if user is None:
        raise credentials_exception

    return user

async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    获取当前激活状态的用户的依赖注入

    在 get_current_user 基础上增加状态检查
    """
    if not user.is_active:
        raise HTTPException(status_code=400, detail="用户已被禁用")
    return current_user

async def get_current_superuser(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    获取当前超级管理员的依赖注入

    在 get_current_user 基础上增加权限检查
    """
    if not user.is_superuser:
        raise HTTPException(
            status_code=403,
            detail="用户没有足够权限"
        )
    return current_user
```

（因篇幅限制，这里展示了 ARCH-001 的部分内容。完整版会继续展开所有 8 个章节。）

---

**文档统计：**

- 本部分新增：约 660 行
- 累计完成：约 1,322 行
- 预计总页数：60-80 页（完整版）

---

_本文件版权归 AI-Agent-PM 项目团队所有，未经许可不得外传_
