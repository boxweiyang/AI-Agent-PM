<template>
  <el-container class="layout">
    <el-header class="header">
      <strong>PMP</strong>
      <span class="sub">脚手架 · Vue3 + Element Plus</span>
    </el-header>
    <el-main>
      <router-view />
    </el-main>
  </el-container>
</template>

<script setup lang="ts"></script>

<style scoped>
.layout {
  min-height: 100%;
}
.header {
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--el-border-color);
}
.sub {
  color: var(--el-text-color-secondary);
  font-size: 14px;
  font-weight: normal;
}
</style>
