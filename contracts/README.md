# contracts（前后端共用 API 契约）

本目录放在 **仓库根**，供 **PMP_Web** 与 **PMP_Service** 共同引用，避免契约只躺在某一子项目里导致「各写各的」。

## 原则

| 项 | 说明 |
|----|------|
| **当前真相** | 以本目录下的 **OpenAPI 文件**为讨论与 Mock 的基准；**可随时改**，改完在 PR 里说明影响面。 |
| **与实现对齐** | **PMP_Service** 实现稳定后，应用 `PMP_Service/scripts/export_openapi.py` 导出 JSON，与 `openapi/openapi.yaml` **diff**，择一合并或标注差异（以团队约定为准）。 |
| **前端** | Mock（**MSW**，见 `PMP_Web/src/mocks/`）、**openapi-typescript** 等，路径指向 **`contracts/openapi/`**（见 `PMP_Web/docs/STRUCTURE.md`）。 |
| **响应包络** | 与 **TECH-004** 一致：`{ "code", "message", "data" }`；业务成功 **`code === 0`**。 |

**最近更新（草案 v0.2+）**：已补充 **`/api/v1/auth/*`**（login / refresh / me）与 **`GET /api/v1/projects`**；**v0.2.1**：`LoginRequest.remember_7d`、`UserMe.is_mock_profile`；**v0.2.2**：`ProjectSummary` 增加进度、Story/Task、Bug、预计完成日等工作台卡片字段；**v0.2.3**：`ProjectSummary.iteration_number`（第几次迭代，Story 前展示）；**v0.2.4**：`POST /api/v1/projects`、`GET /api/v1/projects/{projectId}`、`ProjectCreateRequest`（M01 新建与详情）；**v0.2.5**：`ProjectSummary` / `ProjectCreateRequest` 扩展 **REQ-M01** 立项字段（背景、简介、计划起止、负责人、人力、技术栈、目标、范围、风险、后续补全标记等）；**v0.2.6**：`ProjectSummary.artifacts`、`PATCH /api/v1/projects/{projectId}`、`ProjectPatchRequest`（详情编辑与模块资产标记）。**v0.2.9**：**REQ-M02** `GET/POST/PATCH/DELETE …/projects/{projectId}/requirement-doc/versions`（Markdown 版本列表、新建/覆盖语义见路径说明）。

## 目录

```
contracts/
├── README.md                 # 本说明
└── openapi/
    ├── README.md             # 文件命名约定
    └── openapi.yaml          # 当前草案（与脚手架已实现的接口对齐起步）
```

后续可按迭代增加 `openapi/iteration-1.yaml` 或 `archive/v0.1.yaml`，在 `openapi/README.md` 里写清 **哪一份是「当前默认」**。

## 相对路径速查

- 从 **`PMP_Web/`** 指向契约：`../contracts/openapi/openapi.yaml`
- 从 **`PMP_Service/`** 指向契约：`../contracts/openapi/openapi.yaml`
