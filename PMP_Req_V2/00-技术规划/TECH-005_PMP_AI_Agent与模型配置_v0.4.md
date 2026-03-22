# TECH-005 PMP_AI_Agent 与 AI 配置/记忆（v0.4）

> 依赖：**TECH-001**（包结构）、**TECH-003**（`ai_gateway`）、**TECH-004**（Service）、**REQ-M11**（撤回与上下文）。

---

## 1. 技术栈

- **Python 3.11+**，**LangChain**（版本脚手架锁定），目录：**`registry` + `facade` + `common/` + `features/*`**（见 TECH-001）。  
- **开发默认**：**DashScope / 通义千问 API**（与「通义灵码」IDE 插件区分）。

---

## 2. 模型与 Key

- 用户在 **Web** 配 **provider / model / API Key**；**只存在 Service（加密）**；**Agent 只收网关传入**，自己不连配置表。  
- **V1**：每人一套连接配置即可。

---

## 3. 上下文记忆（多轮对话）

- **存 Service**（会话表：用户、锚点、消息列表、更新时间）；**网关**读写成 **`history_messages` → `facade`**；Agent 内用 **`common/context`** 转 LangChain 消息。  
- **锚点**：如某文档 ID；无锚点可临时 session。  
- **M11**：一键撤回且要清上下文时，**删掉对应会话**，避免模型还记着已撤回内容。

---

## 4. 用户偏好（简单规则）

- **只按用户**，不按项目。  
- **`category`**：一类 AI 功能一条线（如 `requirement_doc`、`tech_doc`），**各 category 互不混用**；同一 key 可在不同 category 各存一份。  
- **`global`**：**公共偏好**，对所有功能生效；和某功能合并时：**先 global，再该功能 category，同 key 以功能为准**。  
- **网关**合并成 **`preference_bundle`** 传给 `facade`；Agent 用 **`common/preferences`** 拼进 prompt，**不读库**。

---

## 5. Web「AI 设置」

- 路径：**`features/ai_settings/`**（见 TECH-003）：**连模型 + 管偏好**（按 category 分一下就行）。  
- **会话列表/清理**：V1 可不做，靠 **M11 撤回** 即可；要做再放后期。  
- **CRUD 接口**在 Service **`ai_settings`**，**不进 Agent**。

---

## 6. `facade.invoke`（网关传入摘要）

除 LLM 参数外：**`user_id`、`capability`、锚点、`session_id`、历史消息、preference_bundle、业务 payload**；返回可带 **`session_update`** 给网关写库。

---

## 7. M11「外置 AI 回填」（模式③）与 Agent 的关系

- **REQ-M11 §2.5 模式③**：用户在外部模型生成后 **粘贴结构化结果** → **Service 校验 schema → 预览 → 应用落库**；**不调用** `PMP_AI_Agent`。  
- **提示词模板**可与 M04「一键提示词」等 **同源维护**（Web 展示「复制」即可）。  
- **价值**：Agent/模型供应商 **故障或限流** 时，产品能力仍可通过 **外置工具 + 导入** 闭环。

---

## 8. 修订

| 版本 | 说明 |
|------|------|
| v0.1～v0.3 | 逐条细化 |
| v0.4 | **正文压缩**，规则不变 |
| v0.4+ | 增补 §7，对齐 M11 v1.1 §2.5 |

---

**文档状态：草案 v0.4（§7 增补）**
