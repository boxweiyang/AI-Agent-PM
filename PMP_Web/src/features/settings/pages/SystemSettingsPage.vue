<template>
  <div class="settings-page">
    <h1 class="page-title">系统设置</h1>
    <p class="page-lead">仅系统管理员可见入口；全局策略与运维占位。</p>
    <el-card shadow="never">
      <el-empty description="待实现" />
    </el-card>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.settings-page {
  max-width: 720px;
}

.page-title {
  margin: 0 0 8px;
  font-size: 22px;
}

.page-lead {
  margin: 0 0 16px;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}
</style>
