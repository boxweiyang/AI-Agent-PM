<!--
  应用根：包裹 ElConfigProvider（中文文案）。
  深浅色由 theme store + main.ts 首屏同步，写入 <html class="dark">，与 EP dark/css-vars 一致（TECH-002）。
-->
<template>
  <el-config-provider :locale="zhCn">
    <div class="app-viewport">
      <router-view />
    </div>
  </el-config-provider>
</template>

<script setup lang="ts">
import zhCn from 'element-plus/es/locale/lang/zh-cn'
</script>
