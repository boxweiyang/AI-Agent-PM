# AI-Agent-PM

单仓三项目：**PMP_Web**（Vue3 SPA）、**PMP_Service**（FastAPI）、**PMP_AI_Agent**（Python 能力包，被 Service `import`）。  
需求与实现约定见 **`PMP_Req_V2/`**（**REQ-MASTER** + **TECH-001～005** + **TECH-003** 目录结构）。

## 推荐阅读顺序

1. `PMP_Req_V2/REQ-MASTER_完整需求总文档.md`
2. `PMP_Req_V2/00-技术规划/TECH-001_多子项目与AI服务拆分_v0.3.md`
3. `PMP_Req_V2/00-技术规划/TECH-003_三项目目录与模块化约定_v0.3.md`

## 本地联调（脚手架）

### 1. Agent 包 + Service（同一 Python 虚拟环境推荐）

```bash
cd PMP_AI_Agent
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
pytest -q

cd ../PMP_Service
pip install -e ".[dev]"
cp .env.example .env
uvicorn pmp_service.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Web

```bash
cd PMP_Web
npm install
npm run dev
```

打开 <http://localhost:5173>：首页会检查 `/api/v1/health` 并演示 `POST /api/v1/ai/invoke`（**echo** 能力）。

## 子项目文档

| 目录 | README | 结构说明 |
|------|--------|----------|
| `PMP_AI_Agent/` | [README.md](./PMP_AI_Agent/README.md) | [docs/STRUCTURE.md](./PMP_AI_Agent/docs/STRUCTURE.md) |
| `PMP_Service/` | [README.md](./PMP_Service/README.md) | [docs/STRUCTURE.md](./PMP_Service/docs/STRUCTURE.md) |
| `PMP_Web/` | [README.md](./PMP_Web/README.md) | [docs/STRUCTURE.md](./PMP_Web/docs/STRUCTURE.md) |

## 续接提示词

见仓库根目录 **`CONTINUE_PROMPT.md`**。
