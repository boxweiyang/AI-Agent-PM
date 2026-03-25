<template>
  <div class="tasks-exec">
    <el-alert
      v-if="apiEndpointFilter"
      type="info"
      show-icon
      :closable="false"
      class="filter-alert"
      :title="`来自接口管理：筛选关联 api_endpoint_id=${apiEndpointFilter}`"
    >
      <template #default>
        <el-button size="small" @click="clearEndpointFilter">清除筛选</el-button>
        <el-button size="small" type="primary" @click="goApiCatalog">回到接口管理</el-button>
      </template>
    </el-alert>

    <el-card shadow="never" class="block-card">
      <template #header>
        <div class="head-row">
          <span class="title">Task 与执行</span>
          <div class="tools">
            <el-select v-model="statusFilter" clearable placeholder="状态" style="width: 120px">
              <el-option label="待办" value="todo" />
              <el-option label="进行中" value="in_progress" />
              <el-option label="待测试" value="testing" />
              <el-option label="已完成" value="done" />
            </el-select>
            <el-button @click="loadAll">刷新</el-button>
          </div>
        </div>
      </template>

      <el-table v-loading="loading" :data="displayTasks" row-key="id" stripe>
        <el-table-column prop="title" label="Task" min-width="200" />
        <el-table-column label="迭代" width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ storyContext.get(row.story_id)?.iterationName ?? row.iteration_id }}</template>
        </el-table-column>
        <el-table-column label="Story" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ storyContext.get(row.story_id)?.title ?? row.story_id }}</template>
        </el-table-column>
        <el-table-column label="类型" width="88">
          <template #default="{ row }">{{ typeLabel(row.type_suggestion) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-select
              :model-value="row.status"
              size="small"
              style="width: 100%"
              @change="(v) => onStatusChange(row, v)"
            >
              <el-option label="待办" value="todo" />
              <el-option label="进行中" value="in_progress" />
              <el-option label="待测试" value="testing" />
              <el-option label="已完成" value="done" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="关联接口" width="96">
          <template #default="{ row }">{{ (row.linked_endpoint_ids || []).length }}</template>
        </el-table-column>
        <el-table-column label="高亮" width="72">
          <template #default="{ row }">
            <el-tag v-if="highlightTaskId === row.id" size="small" type="warning">定位</el-tag>
          </template>
        </el-table-column>
      </el-table>
      <p class="hint">
        Task 在「迭代与 Story」中拆分；此处调整执行状态。状态为「已完成」且已绑定接口时，将按类型回写接口管理中的前端/后端/测试完成态（Mock）。
      </p>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

import { apiClient } from '@/api/client'
import type {
  ApiEnvelope,
  PlanningIteration,
  PlanningStory,
  PlanningTask,
  PlanningTaskStatus,
  PlanningTaskTypeSuggestion,
} from '@/types/api-contract'

const route = useRoute()
const router = useRouter()

const projectId = computed(() => (typeof route.params.projectId === 'string' ? route.params.projectId : ''))

const loading = ref(false)
const tasks = ref<PlanningTask[]>([])
const storyContext = ref(
  new Map<string, { title: string; iterationName: string }>(),
)
const statusFilter = ref<PlanningTaskStatus | ''>('')

const apiEndpointFilter = computed(() => {
  const raw = route.query.api_endpoint_id
  return typeof raw === 'string' ? raw : ''
})

const highlightTaskId = computed(() => {
  const raw = route.query.highlight_task_id
  return typeof raw === 'string' ? raw : ''
})

const displayTasks = computed(() => {
  let list = tasks.value
  if (statusFilter.value) list = list.filter((t) => t.status === statusFilter.value)
  if (apiEndpointFilter.value) {
    list = list.filter((t) => (t.linked_endpoint_ids || []).includes(apiEndpointFilter.value))
  }
  return list
})

async function buildStoryContext() {
  if (!projectId.value) return
  const ctx = new Map<string, { title: string; iterationName: string }>()
  try {
    const { data } = await apiClient.get<ApiEnvelope<{ items: PlanningIteration[] }>>(
      `/api/v1/projects/${projectId.value}/iterations`,
    )
    const iters = data.data?.items ?? []
    await Promise.all(
      iters.map(async (it) => {
        const { data: sd } = await apiClient.get<ApiEnvelope<{ items: PlanningStory[] }>>(
          `/api/v1/projects/${projectId.value}/iterations/${it.id}/stories`,
        )
        for (const s of sd.data?.items ?? []) {
          ctx.set(s.id, { title: s.title, iterationName: it.name })
        }
      }),
    )
  } catch {
    /* ignore */
  }
  storyContext.value = ctx
}

async function loadAll() {
  if (!projectId.value) return
  loading.value = true
  try {
    const q = new URLSearchParams()
    if (apiEndpointFilter.value) q.set('api_endpoint_id', apiEndpointFilter.value)
    const path =
      `/api/v1/projects/${projectId.value}/tasks` + (q.toString() ? `?${q.toString()}` : '')
    const { data } = await apiClient.get<ApiEnvelope<{ items: PlanningTask[] }>>(path)
    tasks.value = data.data?.items ?? []
    await buildStoryContext()
  } catch {
    tasks.value = []
    ElMessage.error('加载 Task 失败')
  } finally {
    loading.value = false
  }
}

function onStatusChange(row: PlanningTask, v: string) {
  if (v === 'todo' || v === 'in_progress' || v === 'testing' || v === 'done') {
    void patchStatus(row, v)
  }
}

async function patchStatus(row: PlanningTask, status: PlanningTaskStatus) {
  if (!projectId.value) return
  try {
    const { data } = await apiClient.patch<ApiEnvelope<PlanningTask>>(
      `/api/v1/projects/${projectId.value}/tasks/${row.id}`,
      { status },
    )
    if (data.data) {
      const idx = tasks.value.findIndex((x) => x.id === row.id)
      if (idx >= 0) tasks.value[idx] = data.data
    }
    ElMessage.success('状态已更新')
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '更新失败')
    await loadAll()
  }
}

function typeLabel(t: PlanningTaskTypeSuggestion) {
  const m: Record<PlanningTaskTypeSuggestion, string> = {
    frontend: '前端',
    backend: '后端',
    qa: '测试',
    devops: '运维',
    other: '其他',
  }
  return m[t] ?? t
}

function goApiCatalog() {
  const id = projectId.value
  if (id) void router.push({ name: 'project-m02c-apis', params: { projectId: id } })
}

function clearEndpointFilter() {
  void router.replace({
    name: 'project-m04-tasks',
    params: { projectId: projectId.value },
    query: {},
  })
}

watch(
  () => [route.query.api_endpoint_id, projectId.value],
  () => {
    void loadAll()
  },
)

onMounted(() => {
  void loadAll()
})
</script>

<style scoped>
.tasks-exec {
  padding: 0 0 24px;
}
.filter-alert {
  margin-bottom: 16px;
}
.block-card {
  border-radius: 8px;
}
.head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.title {
  font-weight: 600;
}
.tools {
  display: flex;
  align-items: center;
  gap: 8px;
}
.hint {
  margin: 12px 0 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
</style>
