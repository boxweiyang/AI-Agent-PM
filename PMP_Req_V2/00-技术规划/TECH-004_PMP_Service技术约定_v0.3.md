# TECH-004 PMP_Service（FastAPI）技术约定（v0.3）

> 与 **TECH-001**（三项目、Agent `import`）、**TECH-002**（前端 `{ code, message, data }`）、**TECH-003**（目录与 **ai_gateway**）一致。

---

## 1. 技术栈（冻结）

| 项 | 选型 |
|----|------|
| 语言 | **Python 3.11+**（团队另有约束可降为 3.10） |
| Web | **FastAPI** + **Uvicorn** |
| 并发模型 | **异步优先**：**SQLAlchemy 2.x Async** + **`aiosqlite`**（开发） |
| 迁移 | **Alembic**（自项目启动即使用，避免长期依赖仅 `create_all`） |
| 配置 | **`pydantic-settings`** + `.env`，密钥不入库不入 Git |
| 包布局 | 见 **TECH-003**（`features/*`、`core/`、**`features/ai_gateway`**） |

---

## 2. 数据库（开发 SQLite → 后期 SQL Server）

- **开发**：`sqlite+aiosqlite:///./相对路径.db`（路径由配置指定）。  
- **后期**：通过 **更换 `DATABASE_URL`**（及驱动，如 `mssql+aioodbc` 等）切换 **SQL Server**；业务代码以 **ORM + 可移植迁移** 为主（方言差异见 TECH 讨论结论：迁移需评审）。  
- **时间**：存储 **UTC**；接口层可按约定返回 ISO8601。

---

## 3. 鉴权（V1 冻结）

| 项 | 约定 |
|----|------|
| V1 方式 | **账号 + 密码** 登录，**不发 SSO/OAuth**；**后期再扩展**。 |
| 访问令牌 | **Access Token**（**JWT**，短有效期，如 **15～60 分钟**，实现阶段可调）。 |
| 刷新令牌 | **Refresh Token**（**做**）：实现 **7 天内免重复登录**；**滑动续期**——在 **7 天窗口内** 每次 **成功使用 Refresh 换发新对（Access + Refresh）** 时，以 **本次使用时间** 为基准 **重新计算** 后续 7 天有效期（即「一直在用就一直不登出」，超过 **连续 7 天未使用 Refresh** 则需重新登录）。 |
| **一人一 Refresh（冻结）** | **同一用户同时仅一条有效 Refresh**。**新登录**或 **成功 Refresh 轮换** 时，**使该用户此前 Refresh 全部作废**（新会话覆盖旧会话：**后登录端踢掉先登录端**）。库表层可对 `user_id` **唯一约束**（一条活跃行）或等价逻辑。 |
| Refresh 存库 | **Refresh 串只存哈希**；字段建议：`user_id`（唯一）、`token_hash`、`expires_at`、`revoked_at`；可选 `device`/`user_agent` **仅审计**。**登出 / 改密** 吊销当前行即可。 |
| 传输 | Access：**Bearer** `Authorization: Bearer <access>`；Refresh：**仅** 走 **专用接口**（如 `POST /api/v1/auth/refresh`），建议 **HttpOnly + Secure + SameSite** 的 **Cookie** 承载 Refresh（降低 XSS 窃取风险），或 **Body 单次传输**（次选）；**禁止** 把 Refresh 长期放 `localStorage`（若用 Cookie，Access 仍可内存或短存）。 |
| 密码 | 使用 **标准慢哈希**（如 **argon2** 或 **bcrypt**），具体库实现阶段定。 |

**前端配合**：Access 过期时 **静默 Refresh**；Refresh 失败再跳转登录（与 **TECH-002** 拦截器协同）。

---

## 4. 权限模型（V1 冻结）

- **权限（Permission）**：原子能力，使用 **稳定字符串编码**（如 `document.read`、`document.write`、`project.archive`），便于前后端与审计日志统一。  
- **权限组（PermissionGroup）**：一组权限的集合；**可配置**「本组包含哪些权限」（多对多：组 ↔ 权限）。  
- **账号与权限组**：账号可归属 **一个或多个权限组**（多对多：用户 ↔ 权限组）；**有效权限** = 所归属各组权限的 **并集**（去重）。  
- **项目维度（REQ 多项目）**：业务数据均带 **`project_id`**；需约定 **「用户在项目内的权限组」** 或 **「全局组 + 项目成员关系」** 之一（实现阶段建表）：  
  - **推荐**：`ProjectMembership(user_id, project_id, permission_group_id)` 或等价的 **成员表 + 组**，保证 **同一用户在不同项目可有不同组**。  
- **系统管理员（冻结）**：用户表 **`is_system_admin == true`** 时，**视为拥有全部权限**，**不参与**权限组配置、**不**必维护「管理员权限组」；鉴权逻辑 **优先** 判断该标志并 **短路通过**（与 **REQ-M09** 站级管理员一致）。

**校验**：在 **Service 层**（或依赖注入的权限依赖）校验，**与路由** 声明的 required permissions 对齐；**禁止**仅前端隐藏。**系统管理员** 同样走统一依赖，在依赖内 **最先** 判断 `is_system_admin`。

---

## 5. HTTP API 形态

- **前缀**：建议 **`/api/v1`**。  
- **响应体**：与前端统一 **`{ "code": number, "message": string, "data": T }`**；**业务成功码** 与 **TECH-002** 一致（默认 **`code === 0`**）。  
- **实现**：**全局异常处理器** + **成功响应包装**（或等价中间层），减少重复代码。  
- **CORS**：开发环境放行前端 dev 源（如 `http://localhost:5173`）；生产 **白名单域名**，由配置注入。  
- **OpenAPI**：默认开启；可选 CI/脚本 **导出 `openapi.json`** 供 **PMP_Web** 生成类型。

---

## 6. 文档与文件存储（V1 冻结）

- **原则**：**数据库不存大段正文**；库中存 **文件路径（及版本、元数据）**，正文在 **文件系统**。  
- **V1 落盘位置**：项目相关文件放在 **「项目发布/存储根目录」** 下，由配置项指定（如 `STORAGE_ROOT=./data` 或 `./storage`），**禁止写死绝对路径入仓库**。  
  - 建议结构示例：`{STORAGE_ROOT}/projects/{project_id}/documents/...`（实现阶段细化，含版本号/文件名规则）。  
- **后期**：对象存储（S3/MinIO 等）或统一 NAS **仅换存储适配层**，**DB 仍存逻辑路径或 key**；本阶段不实现。

---

## 7. 与 PMP_AI_Agent

- **仅** **`features/ai_gateway`**（及可选 **`core/ai_client.py`**）**import** Agent；规则见 **TECH-003 §3.1**。  
- **调用大模型超时**、异常映射：建议在 **`ai_client`** 统一配置（如 60～120s，实现阶段可调）。  
- **用户自选模型与自有 Token**：**配置与密文落库在 PMP_Service**（见 **TECH-005**）；**ai_gateway** 在每次调用 Agent 前 **解密并组装** `provider / model / api_key`，**仅内存**传入 Agent；**Agent 不落库密钥**。

---

## 8. 日志与可观测（建议）

- **Request ID**：从请求头继承或生成，写入日志上下文。  
- **关键操作**（登录失败、删文档、结项等）：满足 **REQ-M12** 审计底线。

---

## 9. 测试（建议）

- **pytest** + **异步测试**支持；核心路径：**鉴权、权限、一两条业务 API**。  
- **迁移**：测试库可 **SQLite 内存** 或临时文件，**跑 Alembic upgrade** 验证。

---

## 10. 修订记录

| 版本 | 说明 |
|------|------|
| v0.1 | JWT、账号密码 V1；**权限组 + 权限**；异步 ORM；**文档走文件路径 + 可配置 STORAGE_ROOT**；SSO 后期 |
| v0.2 | **Refresh Token** + **7 天滑动续期**；**系统管理员 `is_system_admin` 全权限、不配组** |
| v0.3 | **每用户仅一条有效 Refresh**（新登录/轮换踢旧端） |

---

**文档状态：草案 v0.3（实现细节随脚手架补充）**
