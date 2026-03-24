# AppHeaderBar

全局顶栏：**返回**、**面包屑**（`headerBreadcrumbs.ts`）、项目内 **切换项目**、设置页 **回到项目列表**、**功能** 下拉（AI / 个人 / 系统 / 进入最近项目）、**ThemeSegmented**、用户区、退出。

## 使用

```vue
<script setup lang="ts">
import AppHeaderBar from '@/components/AppHeaderBar'
</script>

<template>
  <AppHeaderBar />
</template>
```

## 依赖

- `@/components/ThemeSegmented`（独立组件，非本目录子文件）
- `@/utils/headerBreadcrumbs.ts`、`@/stores/auth.ts`、Vue Router

## Props / Emits

无（内部根据路由与 meta 自适配）。若后续增加 props，请在此 README 补充表格。

## 修订记录

| 日期 | 摘要 |
|------|------|
| 2026-03-24 | 迁入 `AppHeaderBar/` 文件夹。 |
