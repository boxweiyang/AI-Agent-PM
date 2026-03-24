# PmpBrandMark

侧栏品牌区 **SVG 标记**（叠层条 + 圆点），使用 `currentColor`，随主题与父级文字色变化。

## 使用

```vue
<script setup lang="ts">
import PmpBrandMark from '@/components/PmpBrandMark'
</script>

<template>
  <PmpBrandMark />
</template>
```

## Props / Emits

无。尺寸与对齐由父级 CSS 控制（如 `ProjectLayout` 品牌行 48px）。

## 修订记录

| 日期 | 摘要 |
|------|------|
| 2026-03-24 | 迁入 `PmpBrandMark/` 文件夹。 |
