# contracts（前后端共用 API 契约）

本目录放在 **仓库根**，供 **PMP_Web** 与 **PMP_Service** 共同引用，避免契约只躺在某一子项目里导致「各写各的」。

## 原则

| 项 | 说明 |
|----|------|
| **当前真相** | 以本目录下的 **OpenAPI 文件**为讨论与 Mock 的基准；**可随时改**，改完在 PR 里说明影响面。 |
| **与实现对齐** | **PMP_Service** 实现稳定后，应用 `PMP_Service/scripts/export_openapi.py` 导出 JSON，与 `openapi/openapi.yaml` **diff**，择一合并或标注差异（以团队约定为准）。 |
| **前端** | Mock（**MSW**，见 `PMP_Web/src/mocks/`）、**openapi-typescript** 等，路径指向 **`contracts/openapi/`**（见 `PMP_Web/docs/STRUCTURE.md`）。 |
| **响应包络** | 与 **TECH-004** 一致：`{ "code", "message", "data" }`；业务成功 **`code === 0`**。 |

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
