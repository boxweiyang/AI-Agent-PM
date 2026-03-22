<template>
  <div class="settings-page">
    <h1 class="page-title">个人设置</h1>
    <p class="page-lead">账户与偏好占位页，后续对接用户资料、通知等。</p>
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
