<!--
  工作台壳：无左侧菜单。未进入项目时使用。
-->
<template>
  <el-container class="workbench-shell">
    <AppHeaderBar @logout="onLogout" />
    <el-main class="workbench-main">
      <router-view />
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

import AppHeaderBar from '@/components/AppHeaderBar'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

async function onLogout() {
  await auth.logout()
  await router.replace({ name: 'login' })
}
</script>

<style scoped>
.workbench-shell {
  height: 100vh;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.workbench-main {
  flex: 1;
  min-height: 0;
  padding: 16px 50px;
  box-sizing: border-box;
}
</style>
