<template>
  <div class="page">
    <h1>工作台（脚手架）</h1>
    <p class="hint">通过 Vite 代理请求 <code>/api/v1/health</code>，请确保 PMP_Service 已启动。</p>
    <el-space direction="vertical" alignment="stretch" :size="16">
      <el-alert :title="healthTitle" :type="healthOk ? 'success' : 'error'" show-icon :closable="false" />
      <el-card shadow="never">
        <template #header>AI 链路（echo）</template>
        <el-space>
          <el-input v-model="echoInput" placeholder="输入传给 Agent 的 message" style="width: 240px" />
          <el-button type="primary" :loading="echoLoading" @click="runEcho">调用 /api/v1/ai/invoke</el-button>
        </el-space>
        <pre v-if="echoResult" class="json">{{ echoResult }}</pre>
      </el-card>
    </el-space>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { apiClient } from '@/api/client'

const healthOk = ref<boolean | null>(null)
const healthDetail = ref<string>('')
const echoInput = ref('hello from PMP_Web')
const echoLoading = ref(false)
const echoResult = ref('')

const healthTitle = computed(() => {
  if (healthOk.value === null) return '正在检查 Service…'
  return healthOk.value ? `Service 正常：${healthDetail.value}` : `Service 不可用：${healthDetail.value}`
})

onMounted(async () => {
  try {
    const { data } = await apiClient.get<{ code: number; data?: { status?: string } }>('/api/v1/health')
    healthOk.value = data.code === 0
    healthDetail.value = data.data?.status ?? JSON.stringify(data)
  } catch (e: unknown) {
    healthOk.value = false
    healthDetail.value = e instanceof Error ? e.message : String(e)
  }
})

async function runEcho() {
  echoLoading.value = true
  echoResult.value = ''
  try {
    const { data } = await apiClient.post('/api/v1/ai/invoke', {
      capability: 'echo',
      payload: { message: echoInput.value },
    })
    echoResult.value = JSON.stringify(data, null, 2)
  } catch (e: unknown) {
    echoResult.value = e instanceof Error ? e.message : String(e)
  } finally {
    echoLoading.value = false
  }
}
</script>

<style scoped>
.page {
  max-width: 720px;
}
.hint {
  color: var(--el-text-color-secondary);
}
.json {
  margin-top: 12px;
  padding: 12px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
  overflow: auto;
}
</style>
