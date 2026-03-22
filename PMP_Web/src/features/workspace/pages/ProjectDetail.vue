<!--
  项目详情（V1 骨架）：GET /api/v1/projects/:id；后续可换壳为 M08 Dashboard。
-->
<template>
  <div class="project-detail">
    <el-skeleton v-if="loading" :rows="8" animated />
    <el-empty v-else-if="notFound" description="项目不存在或无权访问">
      <el-button type="primary" @click="goList">返回项目列表</el-button>
    </el-empty>
    <template v-else-if="project">
      <div class="detail-head">
        <div class="detail-titles">
          <h1 class="detail-name">{{ project.name }}</h1>
          <el-tag :type="statusTagType(project.status)">{{ project.status }}</el-tag>
        </div>
        <el-button text type="primary" @click="goList">返回列表</el-button>
      </div>
      <p class="detail-desc">{{ project.description?.trim() || '暂无描述' }}</p>
      <el-descriptions :column="1" border class="detail-meta" size="small">
        <el-descriptions-item label="项目 ID">{{ project.id }}</el-descriptions-item>
        <el-descriptions-item v-if="project.updated_at" label="最近更新">
          {{ formatUpdated(project.updated_at) }}
        </el-descriptions-item>
      </el-descriptions>
      <p class="detail-footnote">更多度量与迭代视图将在 M08 Dashboard 接入。</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

import { apiClient } from '@/api/client'
import { setLastProjectId } from '@/api/last-project'
import { statusTagType } from '@/features/workspace/projectPresentation'
import type { ApiEnvelope, ProjectOneData } from '@/types/api-contract'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const notFound = ref(false)
const project = ref<ProjectOneData | null>(null)

function formatUpdated(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('zh-CN', { hour12: false })
}

function goList() {
  void router.push({ path: '/projects' })
}

async function load(id: string) {
  loading.value = true
  notFound.value = false
  project.value = null
  try {
    const { data } = await apiClient.get<ApiEnvelope<ProjectOneData>>(`/api/v1/projects/${id}`)
    const p = data.data
    if (!p?.id) {
      notFound.value = true
      return
    }
    project.value = p
    setLastProjectId(p.id)
  } catch {
    notFound.value = true
    ElMessage.error('加载项目失败')
  } finally {
    loading.value = false
  }
}

watch(
  () => route.params.projectId,
  (id) => {
    if (typeof id === 'string' && id) void load(id)
  },
  { immediate: true },
)
</script>

<style scoped>
.project-detail {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 8px;
}

.detail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.detail-titles {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.detail-name {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  line-height: 1.3;
}

.detail-desc {
  margin: 0 0 20px;
  font-size: 14px;
  color: var(--el-text-color-regular);
  line-height: 1.55;
}

.detail-meta {
  margin-bottom: 16px;
}

.detail-footnote {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
</style>
