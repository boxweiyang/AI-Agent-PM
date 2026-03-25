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

    <div class="filter-cards">
      <el-card shadow="never" class="block-card filter-card">
        <template #header>
          <span class="card-title">选择迭代</span>
        </template>
        <el-select
          v-model="iterationFilter"
          clearable
          placeholder="选择迭代"
          style="width: 100%"
          filterable
        >
          <el-option v-for="it in iterationsList" :key="it.id" :label="it.name" :value="it.id" />
        </el-select>
      </el-card>

      <el-card shadow="never" class="block-card filter-card">
        <template #header>
          <span class="card-title">选择 Story</span>
        </template>
        <el-select v-model="storyFilter" clearable placeholder="选择 Story" style="width: 100%" filterable>
          <el-option v-for="s in storySelectOptions" :key="s.id" :label="s.label" :value="s.id" />
        </el-select>
      </el-card>

      <el-card shadow="never" class="block-card filter-card">
        <template #header>
          <span class="card-title">查看最新版需求文档</span>
        </template>
        <div class="doc-card-actions">
          <el-button type="primary" plain :disabled="!iterationFilter" @click="openIterationLatestReqDoc">
            查看迭代最新版
          </el-button>
          <el-button type="primary" plain :disabled="!storyFilter" @click="openStoryLatestReqDoc">
            查看 Story 最新版
          </el-button>
        </div>
        <p class="doc-card-hint">
          读取对应迭代/Story 的最新版本正文，只用于预览。
        </p>
      </el-card>
    </div>

    <el-card shadow="never" class="block-card">
      <template #header>
        <div class="head-row">
          <el-button
            v-if="showBackToStory"
            type="primary"
            size="small"
            @click="goBackToPrevious"
          >
            返回story列表
          </el-button>
          <span class="title">Task 与执行</span>
          <div class="tools">
            <el-select v-model="statusFilter" clearable placeholder="状态" style="width: 120px">
              <el-option label="待办" value="todo" />
              <el-option label="进行中" value="in_progress" />
              <el-option label="待测试" value="testing" />
              <el-option label="已完成" value="done" />
            </el-select>
            <el-select v-model="typeFilter" clearable placeholder="类型" style="width: 120px">
              <el-option label="前端" value="frontend" />
              <el-option label="后端" value="backend" />
              <el-option label="测试" value="qa" />
              <el-option label="运维" value="devops" />
              <el-option label="其他" value="other" />
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
        Task 在「迭代与 Story」页从 Story 跳转可带 <code>story_id</code> 筛选；此处调整执行状态。状态为「已完成」且已绑定接口时，将按类型回写接口管理中的前端/后端/测试完成态（Mock）。
      </p>
    </el-card>

    <el-dialog
      v-model="docDialogVisible"
      :title="docDialogTitle"
      width="860px"
      destroy-on-close
    >
      <template #default>
        <el-alert v-if="docDialogMetaText" type="info" show-icon :closable="false" class="doc-meta-alert">
          {{ docDialogMetaText }}
        </el-alert>
        <div class="doc-preview-pane markdown-body" v-loading="docDialogLoading">
          <div v-if="docDialogMarkdown" v-html="docDialogRenderedHtml" />
          <el-empty v-else description="暂无最新版本正文" />
        </div>
      </template>
    </el-dialog>
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
  RequirementDocVersionDetail,
  RequirementDocVersionListData,
} from '@/types/api-contract'
import { markdownToHtmlFragment } from '@/utils/requirementDocExport'

const route = useRoute()
const router = useRouter()

const projectId = computed(() => (typeof route.params.projectId === 'string' ? route.params.projectId : ''))

const loading = ref(false)
const tasks = ref<PlanningTask[]>([])
const storyContext = ref(
  new Map<string, { title: string; iterationName: string }>(),
)
const iterationsList = ref<PlanningIteration[]>([])
const allStories = ref<PlanningStory[]>([])
const iterationFilter = ref('')
const storyFilter = ref('')
const statusFilter = ref<PlanningTaskStatus | ''>('')
const typeFilter = ref<PlanningTaskTypeSuggestion | ''>('')

const apiEndpointFilter = computed(() => {
  const raw = route.query.api_endpoint_id
  return typeof raw === 'string' ? raw : ''
})

const highlightTaskId = computed(() => {
  const raw = route.query.highlight_task_id
  return typeof raw === 'string' ? raw : ''
})

const showBackToStory = computed(() => {
  const sid = route.query.story_id
  return typeof sid === 'string' && sid.trim().length > 0
})

const docDialogVisible = ref(false)
const docDialogLoading = ref(false)
const docDialogKind = ref<'iteration' | 'story'>('iteration')
const docDialogMarkdown = ref('')
const docDialogMetaText = ref('')

const docDialogTitle = computed(() => {
  const label = docDialogKind.value === 'iteration' ? '迭代' : 'Story'
  return `查看 ${label} 最新版需求文档`
})

const docDialogRenderedHtml = computed(() => markdownToHtmlFragment(docDialogMarkdown.value || ''))

function iterationNameById(id: string) {
  return iterationsList.value.find((x) => x.id === id)?.name ?? id
}

function storyTitleById(id: string) {
  return storyContext.value.get(id)?.title ?? id
}

async function fetchLatestIterationReqDoc(iterationId: string): Promise<RequirementDocVersionDetail | null> {
  const pid = projectId.value
  if (!pid) return null
  try {
    const { data } = await apiClient.get<ApiEnvelope<RequirementDocVersionListData>>(
      `/api/v1/projects/${pid}/iterations/${iterationId}/requirement-doc/versions`,
    )
    const latestId = data.data?.latest_version_id
    if (!latestId) return null
    const { data: d } = await apiClient.get<ApiEnvelope<RequirementDocVersionDetail>>(
      `/api/v1/projects/${pid}/iterations/${iterationId}/requirement-doc/versions/${latestId}`,
    )
    return d.data ?? null
  } catch {
    return null
  }
}

async function fetchLatestStoryReqDoc(storyId: string): Promise<RequirementDocVersionDetail | null> {
  const pid = projectId.value
  if (!pid) return null
  try {
    const { data } = await apiClient.get<ApiEnvelope<RequirementDocVersionListData>>(
      `/api/v1/projects/${pid}/stories/${storyId}/requirement-doc/versions`,
    )
    const latestId = data.data?.latest_version_id
    if (!latestId) return null
    const { data: d } = await apiClient.get<ApiEnvelope<RequirementDocVersionDetail>>(
      `/api/v1/projects/${pid}/stories/${storyId}/requirement-doc/versions/${latestId}`,
    )
    return d.data ?? null
  } catch {
    return null
  }
}

async function openIterationLatestReqDoc() {
  const iid = iterationFilter.value
  if (!projectId.value || !iid) return

  docDialogKind.value = 'iteration'
  docDialogMetaText.value = `迭代：${iterationNameById(iid)} · 正在加载...`
  docDialogMarkdown.value = ''
  docDialogLoading.value = true
  docDialogVisible.value = true

  const d = await fetchLatestIterationReqDoc(iid)
  if (!d) {
    ElMessage.warning(`迭代「${iterationNameById(iid)}」暂无需求文档最新版本`)
    docDialogLoading.value = false
    return
  }

  docDialogMetaText.value = `迭代：${iterationNameById(iid)} · v${d.version_no} · ${d.created_at}`
  docDialogMarkdown.value = d.markdown ?? ''

  docDialogLoading.value = false
}

async function openStoryLatestReqDoc() {
  const sid = storyFilter.value
  if (!projectId.value || !sid) return

  docDialogKind.value = 'story'
  docDialogMetaText.value = `Story：${storyTitleById(sid)} · 正在加载...`
  docDialogMarkdown.value = ''
  docDialogLoading.value = true
  docDialogVisible.value = true

  const d = await fetchLatestStoryReqDoc(sid)
  if (!d) {
    ElMessage.warning(`Story「${storyTitleById(sid)}」暂无需求文档最新版本`)
    docDialogLoading.value = false
    return
  }

  docDialogMetaText.value = `Story：${storyTitleById(sid)} · v${d.version_no} · ${d.created_at}`
  docDialogMarkdown.value = d.markdown ?? ''

  docDialogLoading.value = false
}

function goBackToPrevious() {
  // 优先返回到进入 Task 前的页面（通常是 Story 列表页）。
  if (typeof window !== 'undefined' && window.history.length > 1) {
    router.back()
    return
  }
  // 兜底：回到迭代与 Story 列表页。
  if (projectId.value) void router.push({ name: 'project-m03-iterations', params: { projectId: projectId.value } })
}

const storySelectOptions = computed(() => {
  const iter = iterationFilter.value
  let list = allStories.value
  if (iter) list = list.filter((s) => s.iteration_id === iter)
  return list.map((s) => ({ id: s.id, label: s.title }))
})

const displayTasks = computed(() => {
  let list = tasks.value
  if (statusFilter.value) list = list.filter((t) => t.status === statusFilter.value)
  if (apiEndpointFilter.value) {
    list = list.filter((t) => (t.linked_endpoint_ids || []).includes(apiEndpointFilter.value))
  }
  return list
})

async function loadFilterCatalog() {
  if (!projectId.value) return
  try {
    const { data } = await apiClient.get<ApiEnvelope<{ items: PlanningIteration[] }>>(
      `/api/v1/projects/${projectId.value}/iterations`,
    )
    const iters = data.data?.items ?? []
    iterationsList.value = iters
    const acc: PlanningStory[] = []
    await Promise.all(
      iters.map(async (it) => {
        const { data: sd } = await apiClient.get<ApiEnvelope<{ items: PlanningStory[] }>>(
          `/api/v1/projects/${projectId.value}/iterations/${it.id}/stories`,
        )
        acc.push(...(sd.data?.items ?? []))
      }),
    )
    allStories.value = acc
  } catch {
    iterationsList.value = []
    allStories.value = []
  }
}

function applyRouteQueryToFilters() {
  const sid = route.query.story_id
  if (typeof sid === 'string' && sid) {
    storyFilter.value = sid
    const st = allStories.value.find((s) => s.id === sid)
    if (st) iterationFilter.value = st.iteration_id
    return
  }
  const iid = route.query.iteration_id
  if (typeof iid === 'string' && iid) {
    iterationFilter.value = iid
  }
}

function syncFiltersToRoute() {
  if (!projectId.value) return
  const q: Record<string, string> = {}
  if (apiEndpointFilter.value) q.api_endpoint_id = apiEndpointFilter.value
  if (iterationFilter.value) q.iteration_id = iterationFilter.value
  if (storyFilter.value) q.story_id = storyFilter.value
  const ht = route.query.highlight_task_id
  if (typeof ht === 'string' && ht) q.highlight_task_id = ht
  void router.replace({ name: 'project-m04-tasks', params: { projectId: projectId.value }, query: q })
}

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
    await loadFilterCatalog()
    applyRouteQueryToFilters()
    const q = new URLSearchParams()
    if (apiEndpointFilter.value) q.set('api_endpoint_id', apiEndpointFilter.value)
    if (iterationFilter.value) q.set('iteration_id', iterationFilter.value)
    if (storyFilter.value) q.set('story_id', storyFilter.value)
    if (typeFilter.value) q.set('type_suggestion', typeFilter.value)
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
  const q: Record<string, string> = {}
  if (iterationFilter.value) q.iteration_id = iterationFilter.value
  if (storyFilter.value) q.story_id = storyFilter.value
  if (typeFilter.value) q.type_suggestion = typeFilter.value
  const ht = route.query.highlight_task_id
  if (typeof ht === 'string' && ht) q.highlight_task_id = ht
  void router.replace({
    name: 'project-m04-tasks',
    params: { projectId: projectId.value },
    query: q,
  })
}

watch(iterationFilter, (next) => {
  if (!storyFilter.value) return
  const st = allStories.value.find((s) => s.id === storyFilter.value)
  if (!st || (next && st.iteration_id !== next)) storyFilter.value = ''
})

watch([iterationFilter, storyFilter, typeFilter], () => {
  syncFiltersToRoute()
})

watch(
  () => [route.query.api_endpoint_id, route.query.story_id, route.query.iteration_id, projectId.value],
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
.filter-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 0 0 16px;
}
.filter-card {
  min-width: 260px;
  flex: 1;
}
.card-title {
  font-weight: 600;
}
.doc-card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.doc-card-hint {
  margin: 10px 0 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
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
.doc-meta-alert {
  margin-bottom: 12px;
}
.doc-preview-pane {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-blank);
  padding: 12px 10px;
  max-height: 68vh;
  overflow: auto;
  min-height: 240px;
}
.doc-preview-pane :deep(pre) {
  overflow: auto;
}
</style>
