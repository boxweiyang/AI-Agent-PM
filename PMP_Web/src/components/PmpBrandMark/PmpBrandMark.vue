<!--
  「智能项目管理系统」侧栏品牌图标：叠层条形象征「多项目 / 进度分层」，随 `currentColor` 适配深浅色。
-->
<template>
  <svg
    class="pmp-brand-mark"
    viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect x="3" y="5" width="26" height="6" rx="2" fill="currentColor" opacity="0.22" />
    <rect x="3" y="13" width="20" height="6" rx="2" fill="currentColor" opacity="0.45" />
    <rect x="3" y="21" width="14" height="6" rx="2" fill="currentColor" opacity="0.88" />
    <circle cx="25" cy="11" r="4" fill="currentColor" opacity="0.95" />
  </svg>
</template>

<script setup lang="ts"></script>

<style scoped>
.pmp-brand-mark {
  width: 1.35rem;
  height: 1.35rem;
  flex-shrink: 0;
  color: var(--el-color-primary);
}
</style>
