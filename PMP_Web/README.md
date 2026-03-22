# PMP_Web

**Vue 3 + Vite + TypeScript + Element Plus + Pinia + Vue Router**（**TECH-002**）。  
仅请求 **PMP_Service**，不持有模型 Key。

## 运行

```bash
cd PMP_Web
npm install
npm run dev
```

浏览器默认 <http://localhost:5173>。请先启动 **PMP_Service**（`uvicorn`，见上级 `PMP_Service/README.md`），首页会请求 `/api/v1/health` 与 `POST /api/v1/ai/invoke`（经 **Vite proxy** 转发到 `http://127.0.0.1:8000`）。

## 构建

```bash
npm run build
```

## 目录说明

见 **[docs/STRUCTURE.md](./docs/STRUCTURE.md)**。完整树见：`../PMP_Req_V2/00-技术规划/TECH-003_三项目目录与模块化约定_v0.3.md` §2。

## OpenAPI 类型生成（后续）

1. 在 `PMP_Service` 运行 `python scripts/export_openapi.py` 得到 `openapi.json`。
2. 将文件拷到本目录或使用 URL，配置 `openapi-typescript` 生成到 `src/api/generated/`（**勿手改生成文件**）。
