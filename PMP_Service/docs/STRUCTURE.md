# PMP_Service 目录与约定

> **完整目录树**见：`PMP_Req_V2/00-技术规划/TECH-003_三项目目录与模块化约定_v0.3.md` §3。  
> **JWT、Refresh、权限、STORAGE_ROOT** 等见：`TECH-004_PMP_Service技术约定_v0.3.md`。

## 脚手架当前状态

| 路径 | 状态 |
|------|------|
| `main.py` | FastAPI 应用、CORS、`/api/v1/health` |
| `features/ai_gateway/` | **唯一** `import pmp_ai_agent`；`POST /api/v1/ai/invoke` |
| `core/config.py` | `pydantic-settings`，`.env` |
| `core/db.py` | 异步引擎占位（尚无 ORM 模型） |
| `core/structured_import/` | M11 模式③ 共用校验占位 |
| `features/*` 其它目录 | 仅 `__init__.py`，待按 REQ 填 `router/service/schemas` |
| `alembic/` | `target_metadata=None`，有模型后改 `env.py` 并 `alembic revision --autogenerate` |

## 新增业务域 Checklist

1. 在 `features/<domain>/` 增加 `router.py`、`service.py`、`schemas.py`（及 `models.py` 等）。
2. 在 `main.py` 的 `api_v1` 上 `include_router`（或使用聚合模块统一注册）。
3. **禁止**在业务域 `import pmp_ai_agent`；需要模型时只调 **`ai_gateway` 暴露的函数**。

## 自检（Code review）

```bash
grep -r "pmp_ai_agent" src
# 应仅命中 features/ai_gateway/（及未来可选的 core/ai_client.py）
```
