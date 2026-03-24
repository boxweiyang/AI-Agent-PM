# TechStackMultiSelect

项目详情 **技术栈** 编辑：四类栈（前端 / 后端 / 中间件 / 基础设施）的 **`el-select` 多选 + 可创建条目**，与 M01 的 `stack_*` 字符串（顿号拼接）互转见 `techStackOptions.ts`。

## 使用

```vue
<script setup lang="ts">
import TechStackMultiSelect from '@/components/TechStackMultiSelect'
import { TECH_STACK_PRESETS } from '@/config/techStackOptions'
</script>

<template>
  <TechStackMultiSelect v-model="stackFrontendArr" :options="TECH_STACK_PRESETS.frontend" placeholder="选择或输入" />
</template>
```

## Props / Emits

| Prop | 类型 | 说明 |
|------|------|------|
| `modelValue` | `string[]` | `v-model`，多选值 |
| `options` | `readonly string[] \| string[]` | 下拉候选项 |
| `placeholder` | `string` | 可选 |
| `maxCollapseTags` | `number` | 默认 `12`，标签折叠阈值 |

**Emit**：`update:modelValue`

## 修订记录

| 日期 | 摘要 |
|------|------|
| 2026-03-24 | 迁入 `TechStackMultiSelect/` 文件夹。 |
