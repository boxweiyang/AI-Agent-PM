# 下一会话接续提示词（复制到新对话）

> **完整交接**（已实现 / 缺口 / 建议下一步 / 关键路径 / 修订记录）：仓库根目录 **`AI_AGENT_PM_HANDOFF.md`**。**新会话优先读该文件**，本文仅提供「一键复制」的浓缩版。

将下面 **「【复制区】」** 内的全部内容复制到 Cursor 新对话中发送即可。

---

## 【复制区】

我是 **AI-Agent-PM** 仓库维护者。工作区：**AI-Agent-PM**。

**请先阅读** 仓库根目录 **`AI_AGENT_PM_HANDOFF.md`**（§2.1 策略、§4～§6），再协助我。

**已定策略**

- **MSW Mock 优先**：日常用 **`cd PMP_Web && npm run dev:mock`**；在 **不接 PMP_Service** 的前提下把前端路径做完整。
- 新能力：**先扩 `contracts/openapi/openapi.yaml`，再补 `PMP_Web/src/mocks/handlers.ts`**；改界面同步 **`PMP_Web/docs/FEATURES.md`** §7。
- Mock 验收通过后，再 **`dev:api` 联调** 与 Agent。

**需求与实现依据**

- 产品需求：**`PMP_Req_V2/`**，入口 **`REQ-MASTER_完整需求总文档.md`**。
- 前端行为：**`PMP_Web/docs/FEATURES.md`** + 当前代码。
- 接口形状：**`contracts/openapi/openapi.yaml`**。

**约束**：回答与说明用 **简体中文**。

---

## 【复制区结束】

### 与旧版清单的关系

- 需求定稿（M01～M12）、三子项目脚手架、TECH-001～005 等 **已在前期完成**；细节见 **REQ-MASTER**、**PMP_Req_V2/README.md**、各 **TECH-*** 文档。
- **当前阶段工作项** 以 **`AI_AGENT_PM_HANDOFF.md` §6** 为准（M02 竖切 → M03～M11 铺开 → Dashboard Mock → 设置页 Mock 持久等），勿再以本文下方历史条目为「待办」。

---

## 修订记录（本文档）

| 日期 | 摘要 |
|------|------|
| （首版） | 短接续词 + 需求/脚手架已完成清单。 |
| 2026-03-22 | 与 **HANDOFF** 对齐：**Mock 优先**、复制区浓缩、明确 §6 为当前待办来源。 |
