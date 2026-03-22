# PMP_AI_Agent 目录与约定

> **完整树状权威版本**见仓库：`PMP_Req_V2/00-技术规划/TECH-003_三项目目录与模块化约定_v0.3.md` §4。本文只强调 **本包职责与扩展方式**。

## 职责边界（冻结）

- ✅ prompt、模型调用、将输出解析为 **dict**（结构化建议）
- ❌ 业务表读写、JWT、文件 `STORAGE_ROOT` 落盘（均在 **PMP_Service**）

## 入口

| 文件 | 作用 |
|------|------|
| `facade.py` | `invoke(capability, payload)` — Service **只应调此入口** |
| `registry.py` | `capability` → 可调用对象；**`echo`** 为脚手架示例 |

## 目录摘要

```
src/pmp_ai_agent/
├── facade.py / registry.py
├── common/           # llm、context、preferences、prompts（横切）
└── features/       # 按能力垂直切片，与 REQ 大致对应
    ├── requirement_doc/   # M02
    ├── tech_doc/          # M02B
    ├── iteration_plan/    # M03
    ├── task_prompt/       # M04
    ├── cr_assist/         # M06 可选
    └── retrospective/     # M10 可选
```

## 新增能力 Checklist

1. 在 `features/<capability>/` 实现处理函数（输入 `dict`，输出 `dict`）。
2. 在 `registry.py` 中 `HANDLERS["<capability>"] = ...` 或 `register("<capability>", fn)`。
3. 在 **PMP_Service** 的 `features/ai_gateway/capabilities.py`（如有）中保持 **字符串常量一致**。
4. **禁止** 在 Agent 内 `import` Service 或访问 ORM。
