<!--
  项目内模块占位：已生成 → 引导后续接真实页面；未生成 → PATCH artifacts 模拟「一键生成」后返回详情。
-->
<template>
  <div class="mod-placeholder">
    <el-card class="mod-card" shadow="never">
      <template #header>
        <div class="mod-card-head">
          <span class="mod-card-title">{{ title }}</span>
          <el-tag v-if="reqRef" size="small" type="info">{{ reqRef }}</el-tag>
        </div>
      </template>
      <template v-if="loading">
        <el-skeleton :rows="4" animated />
      </template>
      <template v-else-if="!artifactKey">
        <el-empty description="路由配置缺少 artifactKey" />
      </template>
      <template v-else-if="ready">
        <el-result icon="success" title="该模块资产已就绪（演示）" :sub-title="subTitleReady">
          <template #extra>
            <el-button type="primary" @click="goDetail">返回项目详情</el-button>
          </template>
        </el-result>
      </template>
      <template v-else>
        <el-result icon="folder-opened" title="尚未生成该模块内容" :sub-title="subTitlePending">
          <template #extra>
            <el-button type="primary" :loading="generating" @click="onGenerate">一键生成（演示）</el-button>
            <el-button @click="goDetail">返回项目详情</el-button>
          </template>
        </el-result>
      </template>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

import { apiClient } from '@/api/client'
import type { ApiEnvelope, ProjectOneData, ProjectPatchRequestBody } from '@/types/api-contract'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const generating = ref(false)
const project = ref<ProjectOneData | null>(null)

const title = computed(() => (route.meta.title as string) ?? '模块')
const reqRef = computed(() => (route.meta.reqRef as string) ?? '')
const artifactKey = computed(() => (route.meta.artifactKey as string) ?? '')

const ready = computed(() => {
  const k = artifactKey.value
  if (!k) return false
  return project.value?.artifacts?.[k] === true
})

const subTitleReady = computed(
  () => `后续将在此接入 ${reqRef.value} 真实工作台；当前为前端脚手架占位。`,
)
const subTitlePending = computed(
  () => `按 ${reqRef.value} 落地后，可在此编辑文档与协作数据。演示环境可先「生成」解锁入口。`,
)

function goDetail() {
  const id = route.params.projectId
  if (typeof id === 'string') void router.push({ name: 'project-detail', params: { projectId: id } })
}

async function fetchProject() {
  const id = route.params.projectId
  if (typeof id !== 'string') return
  loading.value = true
  try {
    const { data } = await apiClient.get<ApiEnvelope<ProjectOneData>>(`/api/v1/projects/${id}`)
    project.value = data.data ?? null
  } catch {
    project.value = null
    ElMessage.error('加载项目失败')
  } finally {
    loading.value = false
  }
}

async function onGenerate() {
  const id = route.params.projectId
  const k = artifactKey.value
  if (typeof id !== 'string' || !k) return
  generating.value = true
  try {
    const body: ProjectPatchRequestBody = { artifacts: { [k]: true } }
    const { data } = await apiClient.patch<ApiEnvelope<ProjectOneData>>(`/api/v1/projects/${id}`, body)
    project.value = data.data ?? null
    ElMessage.success('已标记为已生成（演示）')
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    ElMessage.error(msg)
  } finally {
    generating.value = false
  }
}

watch(
  () => route.params.projectId,
  () => {
    void fetchProject()
  },
)

onMounted(() => {
  void fetchProject()
})
</script>

<style scoped>
.mod-placeholder {
  max-width: 720px;
  margin: 0 auto;
  padding: 0 8px 32px;
}

.mod-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.mod-card-title {
  font-weight: 600;
  font-size: 15px;
}

.mod-card {
  border-radius: 10px;
}
</style>
