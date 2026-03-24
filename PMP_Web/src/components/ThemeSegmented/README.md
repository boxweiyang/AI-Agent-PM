# ThemeSegmented

**深色 / 浅色**切换（`el-radio-group`），绑定 Pinia **`useThemeStore`**，与 `html.dark` 及 Element Plus 暗色变量一致（TECH-002）。

## 使用

```vue
<script setup lang="ts">
import ThemeSegmented from '@/components/ThemeSegmented'
</script>

<template>
  <ThemeSegmented />
</template>
```

## Props / Emits

无。

## 出现位置

- `AppHeaderBar`（登录后顶栏）
- `Login.vue`（登录页右上角）

## 修订记录

| 日期 | 摘要 |
|------|------|
| 2026-03-24 | 迁入 `ThemeSegmented/` 文件夹。 |
