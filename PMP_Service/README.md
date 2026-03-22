# PMP_Service

**FastAPI** 业务 API：`/api/v1`，响应形态 `{ "code", "message", "data" }`（**TECH-004**）。

## 依赖顺序

本服务 **`import pmp_ai_agent`** 仅允许出现在 **`features/ai_gateway/`**（**TECH-003 §3.5**）。请先安装 Agent 包：

```bash
cd ../PMP_AI_Agent
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

cd ../PMP_Service
pip install -e ".[dev]"
```

（也可在同一 venv 中先后 `pip install -e`。）

## 运行

```bash
# 在 PMP_Service 目录，已激活 venv
cp .env.example .env
uvicorn pmp_service.main:app --reload --host 0.0.0.0 --port 8000
```

- 健康检查：<http://127.0.0.1:8000/api/v1/health>
- OpenAPI：<http://127.0.0.1:8000/docs>
- AI 脚手架：`POST /api/v1/ai/invoke`，body `{"capability":"echo","payload":{"message":"hi"}}`

## OpenAPI 导出（给前端 codegen）

```bash
python scripts/export_openapi.py
# 生成 PMP_Service/openapi.json
```

## 测试

```bash
pytest -q
```

## 文档

- 本目录结构与扩展方式：**[docs/STRUCTURE.md](./docs/STRUCTURE.md)**
- 总规范：`../PMP_Req_V2/00-技术规划/TECH-003_三项目目录与模块化约定_v0.3.md`、`TECH-004_PMP_Service技术约定_v0.3.md`
