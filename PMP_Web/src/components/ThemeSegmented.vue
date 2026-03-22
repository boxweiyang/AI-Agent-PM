<!--
  深色 / 浅色切换（TECH-002）
  - 与 Element Plus 的 html.dark 方案配合；任意页面可嵌入。
  - 用户可见行为说明见 docs/FEATURES.md「跨页面 → 深浅色主题」。
-->
<template>
  <el-radio-group v-model="modeProxy" class="theme-segmented" size="small">
    <el-radio-button label="dark">深色</el-radio-button>
    <el-radio-button label="light">浅色</el-radio-button>
  </el-radio-group>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { useThemeStore, type ThemeMode } from '@/stores/theme'

const themeStore = useThemeStore()
const { mode } = storeToRefs(themeStore)

const modeProxy = computed({
  get: () => mode.value,
  set: (v: ThemeMode) => themeStore.setMode(v),
})
</script>

<style scoped>
.theme-segmented {
  flex-shrink: 0;
}
</style>
