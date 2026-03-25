# AiCompletionSummaryDialog

**AI 操作完成后的结果摘要弹窗**（`el-dialog` + `el-descriptions` 单列带边框），与 **接口管理 · AI 生成接口清单** 的「生成结果」弹窗视觉与信息结构一致。

## 约定（产品 / 前端）

凡 **AI 批量写库或批量变更** 且需要向用户交代「模式、数量、明细、时间」等，**优先使用本组件** 展示完成详情，而不是仅用 `ElMessage` 长文案。

适用示例：

- 接口清单 AI 生成（已实现接入）
- 迭代规划 AI 应用落库（已实现接入）
- 后续：约束 AI 生成、模块拆分结果回显等（按需接入）

## Props

| Prop | 类型 | 默认 | 说明 |
|------|------|------|------|
| `modelValue` | `boolean` | — | 显隐（`v-model`） |
| `title` | `string` | `'操作结果'` | 弹窗标题 |
| `rows` | `AiCompletionSummaryRow[]` | — | 描述行 |
| `width` | `string` | `'520px'` | 弹窗宽度 |
| `column` | `number` | `1` | `el-descriptions` 列数 |
| `confirmText` | `string` | `'知道了'` | 底部主按钮文案 |

## `AiCompletionSummaryRow`

- `label`：左侧标签（与 `el-descriptions-item` 一致）
- `value`：主文案（可选）
- `lines`：明细列表（可选）；可与 `value` 同时存在（先展示 value，再展示列表）

## 示例

```vue
<AiCompletionSummaryDialog
  v-model="summaryOpen"
  title="迭代规划应用结果"
  :rows="summaryRows"
/>
```

```ts
import type { AiCompletionSummaryRow } from '@/components/AiCompletionSummaryDialog'

const summaryRows: AiCompletionSummaryRow[] = [
  { label: '落库模式', value: '仅增量新增' },
  { label: '新建迭代', value: '2 个', lines: ['迭代 A', '迭代 B'] },
]
```
