# AI 辅助抽屉（AiAssistDrawer）

本文说明 **`AiAssistDrawer`** 的挂载方式、**Props / Emits**、与后端 **`/api/v1/ai/invoke`** 的约定。

**文本差异弹窗**已抽为公用组件 **`DiffDialog`**（`@/components/DiffDialog`），抽屉在「已有正文 → 生成建议稿」时引用它；若你**只要 diff、不要抽屉**，请直接看 [**`../DiffDialog/README.md`**](../DiffDialog/README.md)。

## 本目录结构

| 文件 | 说明 |
|------|------|
| `index.ts` | `export default` → `AiAssistDrawer.vue` |
| `AiAssistDrawer.vue` | 抽屉本体（站内/外置 AI、生成文档、内嵌 **`DiffDialog`**） |
| `README.md` | 本文 |

相关工具：

| 文件 | 说明 |
|------|------|
| `components/DiffDialog/` | 公用差异弹窗 UI |
| `utils/aiAssistDiffGrid.ts` | 行级 diff 数据 |
| `utils/inlineTextDiff.ts` | 行内字词/字符级片段 |

---

## 1. 组合关系

```
业务页面
    ├── v-model 抽屉
    ├── document-text / anchor-assistant-id / allow-apply
    └── @apply → 写入编辑器

AiAssistDrawer
    ├── el-drawer（聊天 + 生成）
    └── DiffDialog（已有正文时，生成后弹出；表头为「原版 / 新版 AI 建议」）
```

---

## 2. Props / Emits / Expose / invoke

（与上一版一致，下表为摘要。）

### Props

| Prop | 说明 |
|------|------|
| `modelValue` | 抽屉 `v-model` |
| `capability` | 必填，invoke 能力标识 |
| `defaultPrompt` / `externalPrompt` / `payloadBase` / `memoryKey` | 见源码 |
| `documentText` | 建议与编辑区同步，供 diff 左侧 |
| `anchorAssistantId` | diff 回退时对话截断锚点 |
| `allowApply` / `allowApplyMessage` | 传给 **`DiffDialog`**，控制是否允许点「接受」 |

### Emits

| 事件 | 说明 |
|------|------|
| `update:modelValue` | 抽屉显隐 |
| `apply` | `{ assistantId, text }`，用户确认写入的全文 |
| `generated` | chat 返回文本（可选） |

### `defineExpose`

- `truncateHistoryToAssistantId(id)` — 一般无需业务调用。

### `/api/v1/ai/invoke`

请求 `payload` 含 `payloadBase` 展开、`provider`、`action`（`chat` | `generate_doc`）、`message`、`default_prompt`、`history`。响应 `data` 经 `pickText` 解析（`markdown` → `document` → …）。

---

## 3. 最小示例

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import AiAssistDrawer from '@/components/AiAssistDrawer'

const aiOpen = ref(false)
const doc = ref('')
const lastAcceptedAssistantId = ref<string | null>(null)
const canApply = computed(() => true)

function onApply(payload: { assistantId: string; text: string }) {
  doc.value = payload.text
  lastAcceptedAssistantId.value = payload.assistantId
}
</script>

<template>
  <AiAssistDrawer
    v-model="aiOpen"
    capability="your_capability_key"
    :payload-base="{ markdown: doc }"
    memory-key="unique-scope-key"
    :document-text="doc"
    :anchor-assistant-id="lastAcceptedAssistantId"
    :allow-apply="canApply"
    @apply="onApply"
  />
</template>
```

---

## 4. 需求文档页对照

见 **`RequirementDocVersionDetailPage.vue`**：`document-text` ← `markdown`，`anchor-assistant-id` ← `lastAppliedAssistantId`，`allow-apply` ← `is_latest`。

---

## 5. 维护约定

变更时同步 **`docs/STRUCTURE.md`**、**`docs/FEATURES.md`**（AI 辅助相关）；**DiffDialog** 的 API 以 **`DiffDialog/README.md`** 为准。

## 修订记录

| 日期 | 摘要 |
|------|------|
| 2026-03-24 | 初版含 AiAssistDiffDialog；后迁入文件夹。 |
| 2026-03-24 | 差异 UI 拆为公用 **`DiffDialog`**，本文仅描述抽屉。 |
