# DiffDialog

**公用**双栏文本差异弹窗：Git 风格行号、`−` / `+`、行底色与「修改」行**字词/字符级**高亮。  
适用于任意需要「旧稿 vs 新稿」确认的场景（**AI 辅助**、配置草稿、版本对比等）。

数据层：`@/utils/aiAssistDiffGrid`、`@/utils/inlineTextDiff`（一般无需业务直接调用）。

## 使用

```vue
<script setup lang="ts">
import { ref } from 'vue'
import DiffDialog from '@/components/DiffDialog'

const visible = ref(false)
const left = ref('…')
const right = ref('…')
</script>

<template>
  <DiffDialog
    v-model="visible"
    :old-text="left"
    :new-text="right"
    left-header="当前环境"
    right-header="导入结果"
    @accept="onAccept"
    @rollback="onRollback"
  />
</template>
```

## Props

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `modelValue` | `boolean` | — | `v-model` |
| `oldText` | `string` | — | 左侧全文 |
| `newText` | `string` | — | 右侧全文 |
| `title` | `string` | `'差异对比'` | `el-dialog` 标题 |
| `leftHeader` | `string` | `'左侧'` | 左列表头 |
| `rightHeader` | `string` | `'右侧'` | 右列表头 |
| `readOnly` | `boolean` | `false` | `true` 时仅查看：底部只显示「关闭」，关窗**不**触发 `rollback` |
| `allowAccept` | `boolean` | `true` | `false` 时「接受」仅提示、不关窗 |
| `denyAcceptMessage` | `string` | `''` | 拦截「接受」时的提示文案 |

## Emits

| 事件 | 说明 |
|------|------|
| `update:modelValue` | 弹窗显隐 |
| `accept` | 用户确认接受（且 `allowAccept` 为真）后触发，随后关闭 |
| `rollback` | 用户点「回退」，或未点按钮直接关窗（含右上角 X）时触发；**`readOnly` 为真时不触发** |

**接受/回退后的业务写入**由父组件在事件回调中完成。

## 与 AiAssistDrawer

`AiAssistDrawer` 在「已有正文生成建议稿」流程中**引用本组件**，并传入更具体的 `left-header` / `right-header`（如原版 / 新版建议稿）。

## 修订记录

| 日期 | 摘要 |
|------|------|
| 2026-03-24 | 从 `AiAssistDrawer` 拆出并更名为 **`DiffDialog`**，作为公用组件。 |
| 2026-03-24 | 新增 **`title`**、**`readOnly`**（只读：底部仅「关闭」，不触发 `rollback`）。 |
