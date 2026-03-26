# OpenAPI 文件约定

| 文件 | 说明 |
|------|------|
| **`openapi.yaml`** | **当前默认草案**：Mock / 前端 codegen / 评审以此为起点；**不视为冻结**。 |
| **`openapi-from-service.json`** | （可选）由 `PMP_Service/scripts/export_openapi.py --copy-contracts` 生成，与 YAML **diff** 后合并。 |

## Mock 与契约同步（团队强制约定）

在 **`PMP_Web/src/mocks/handlers.ts`**（或其它 Mock 注册处）**新增或变更**接口时，**须在同一变更中**更新本目录下的 **`openapi.yaml`**，使后端可直接按文档开发，减少前后端口头对齐。

每条路径在 YAML 中至少应包含：

| 项 | 说明 |
|----|------|
| **调用路径** | HTTP 方法 + URL（含路径参数名） |
| **接口功能** | `summary`，必要时用 `description` 写清业务语义、鉴权、幂等等 |
| **入参** | path / query / header / requestBody 的 schema 与必填项 |
| **返回** | 成功响应体（通常经包络 `Envelope*`）；错误响应与 **TECH-004** 一致 |

若仅更新 Mock 而未更新 OpenAPI，视为契约不完整，评审时应要求补全。

## 与 FastAPI 同步（建议节奏）

1. 本地运行 Service，导出：`cd PMP_Service && python scripts/export_openapi.py` → 生成 `PMP_Service/openapi.json`。  
2. 用编辑器或 `npx @redocly/cli` 等将 JSON 与 `openapi.yaml` 对比，把 **有意的设计** 合回 YAML（FastAPI 导出常为 JSON，团队可选 **只提交 YAML** 或 **YAML + 自动导出 JSON** 二选一）。  
3. 更新 Web 侧生成类型与 MSW（若有）。

## 版本化（可选）

迭代跨度大时，可复制为 `openapi-2025-03-iter1.yaml` 并在本文件注明 **default** 指向谁。
