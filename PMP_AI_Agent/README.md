# PMP_AI_Agent

纯 Python **AI 能力包**：按 **capability** 调用 LangChain / 模型 API；**不**连接业务数据库、**不**对浏览器暴露。

## 与仓库其它部分的关系

| 调用方 | 方式 |
|--------|------|
| **PMP_Service** | 仅通过 `features/ai_gateway`（或 `core/ai_client`）`import pmp_ai_agent` 并调 `facade.invoke` |
| **PMP_Web** | 不直连本包 |

权威约定见：`../PMP_Req_V2/00-技术规划/TECH-001_多子项目与AI服务拆分_v0.3.md`、`TECH-003_三项目目录与模块化约定_v0.3.md`、`TECH-005_PMP_AI_Agent与模型配置_v0.4.md`。

## 本地开发

```bash
cd PMP_AI_Agent
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
pytest -q
```

## 脚手架说明

- 当前注册 **`echo`** 能力，用于验证 **Service → Agent** 链路。
- 新能力：在 `src/pmp_ai_agent/features/<name>/` 实现 handler，并在 `registry.py` 注册（或模块 import 时 `register()`）。

更多目录说明见 **[docs/STRUCTURE.md](./docs/STRUCTURE.md)**。
