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

    <div class="tasks-layout">
      <el-card shadow="never" class="tree-card">
        <template #header>
          <div class="tree-head">
            <span class="tree-title">迭代 / Story</span>
            <div class="tree-actions">
              <el-button size="small" :disabled="!selectedIterationId && !selectedStoryId" @click="clearSelection">
                全部
              </el-button>
            </div>
          </div>
        </template>

        <el-scrollbar class="tree-scroll">
          <el-empty v-if="!iterationsList.length" description="暂无迭代与 Story" />
          <div v-else class="tree-root">
            <div v-for="it in iterationsList" :key="it.id" class="iter-group">
              <div class="iter-row" :class="{ 'is-selected': selectedIterationId === it.id }">
                <div class="iter-left" @click="onSelectIteration(it.id)">
                  <el-icon class="caret-icon" @click.stop="toggleIterationExpanded(it.id)">
                    <ArrowDown v-if="isIterationExpanded(it.id)" />
                    <ArrowRight v-else />
                  </el-icon>
                  <span class="iter-title">{{ it.name }}</span>
                </div>
                <div class="iter-right">
                  <el-tooltip :content="`查看迭代「${it.name}」最新版需求文档`" placement="right">
                    <el-button
                      class="eye-btn"
                      link
                      type="primary"
                      size="small"
                      :aria-label="`查看迭代 ${it.name} 最新版需求文档`"
                      @click.stop="openIterationLatestReqDoc(it.id)"
                    >
                      <el-icon><View /></el-icon>
                    </el-button>
                  </el-tooltip>
                </div>
              </div>

              <div v-if="isIterationExpanded(it.id)" class="story-rows">
                <div
                  v-for="s in storiesByIteration[it.id] || []"
                  :key="s.id"
                  class="story-row"
                  :class="{ 'is-selected': selectedStoryId === s.id }"
                  @click="onSelectStory(s.id)"
                >
                  <span class="story-title">{{ s.title }}</span>
                  <div class="story-right">
                    <el-tooltip :content="`查看 Story「${s.title}」最新版需求文档`" placement="right">
                      <el-button
                        class="eye-btn"
                        link
                        type="primary"
                        size="small"
                        :aria-label="`查看 Story ${s.title} 最新版需求文档`"
                        @click.stop="openStoryLatestReqDoc(s.id)"
                      >
                        <el-icon><View /></el-icon>
                      </el-button>
                    </el-tooltip>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </el-scrollbar>

        <div class="tree-footer">
          <el-button type="primary" class="tree-manage-btn" @click="goToIterationPlanning">
            管理迭代 / Story
          </el-button>
        </div>
      </el-card>

      <el-card shadow="never" class="table-card">
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

        <div class="table-scroll">
          <el-table v-loading="loading" :data="displayTasks" row-key="id" stripe>
            <el-table-column prop="title" label="Task" min-width="200" />
            <el-table-column label="迭代" width="140" show-overflow-tooltip>
              <template #default="{ row }">
                {{ storyContext.get(row.story_id)?.iterationName ?? row.iteration_id }}
              </template>
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
            通过左侧树选择迭代/Story 过滤 Task；点击每个节点右侧眼睛图标可预览该节点的最新需求文档（只读）。
          </p>
        </div>
      </el-card>
    </div>

    <el-dialog
      v-model="docDialogVisible"
      :title="docDialogTitle"
      width="860px"
      class="pmp-viewport-dialog"
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
import { ArrowDown, ArrowRight, View } from '@element-plus/icons-vue'

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
const storiesByIteration = ref<Record<string, PlanningStory[]>>({})
const selectedIterationId = ref<string>('')
const selectedStoryId = ref<string>('')
const expandedIterationIds = ref<Set<string>>(new Set())
// 防止路由 query（如来自 Story 页的 story_id/iteration_id）在用户点击树之后反复覆盖选择
const userSelectionDirty = ref(false)
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

function isIterationExpanded(iterationId: string): boolean {
  return expandedIterationIds.value.has(iterationId)
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

async function openIterationLatestReqDoc(iid: string) {
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

async function openStoryLatestReqDoc(sid: string) {
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

function goToIterationPlanning() {
  if (!projectId.value) return
  void router.push({ name: 'project-m03-iterations', params: { projectId: projectId.value } })
}

function toggleIterationExpanded(iterationId: string) {
  const next = new Set(expandedIterationIds.value)
  if (next.has(iterationId)) next.delete(iterationId)
  else next.add(iterationId)
  expandedIterationIds.value = next
}

function onSelectIteration(iterationId: string) {
  userSelectionDirty.value = true
  selectedIterationId.value = iterationId
  selectedStoryId.value = ''

  const next = new Set(expandedIterationIds.value)
  next.add(iterationId)
  expandedIterationIds.value = next

  void loadAll()
}

function onSelectStory(storyId: string) {
  userSelectionDirty.value = true
  selectedStoryId.value = storyId
  selectedIterationId.value = ''

  const st = allStories.value.find((s) => s.id === storyId)
  const iid = st?.iteration_id

  const next = new Set(expandedIterationIds.value)
  if (iid) next.add(iid)
  expandedIterationIds.value = next

  void loadAll()
}

function clearSelection() {
  userSelectionDirty.value = true
  selectedIterationId.value = ''
  selectedStoryId.value = ''
  void loadAll()
}

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
    const byIter: Record<string, PlanningStory[]> = {}
    await Promise.all(
      iters.map(async (it) => {
        const { data: sd } = await apiClient.get<ApiEnvelope<{ items: PlanningStory[] }>>(
          `/api/v1/projects/${projectId.value}/iterations/${it.id}/stories`,
        )
        const sList = sd.data?.items ?? []
        byIter[it.id] = sList
        acc.push(...sList)
      }),
    )
    allStories.value = acc
    storiesByIteration.value = byIter
  } catch {
    iterationsList.value = []
    allStories.value = []
    storiesByIteration.value = {}
  }
}

function applyRouteQueryToSeeds() {
  const ts = route.query.type_suggestion
  if (typeof ts === 'string' && ts) {
    if (!typeFilter.value) typeFilter.value = ts as PlanningTaskTypeSuggestion
  }

  const sid = route.query.story_id
  if (typeof sid === 'string' && sid) {
    if (userSelectionDirty.value) return
    selectedStoryId.value = sid
    selectedIterationId.value = ''

    const st = allStories.value.find((s) => s.id === sid)
    const iid = st?.iteration_id
    if (iid) {
      const next = new Set(expandedIterationIds.value)
      next.add(iid)
      expandedIterationIds.value = next
    }
    return
  }

  const iid = route.query.iteration_id
  if (typeof iid === 'string' && iid) {
    if (userSelectionDirty.value) return
    selectedIterationId.value = iid
    selectedStoryId.value = ''

    const next = new Set(expandedIterationIds.value)
    next.add(iid)
    expandedIterationIds.value = next
  }
}

function buildStoryContextFromLoadedData() {
  const iterNameMap = new Map(iterationsList.value.map((it) => [it.id, it.name]))
  const ctx = new Map<string, { title: string; iterationName: string }>()
  for (const s of allStories.value) {
    ctx.set(s.id, {
      title: s.title,
      iterationName: iterNameMap.get(s.iteration_id) ?? s.iteration_id,
    })
  }
  storyContext.value = ctx
}

async function loadAll() {
  if (!projectId.value) return
  loading.value = true
  try {
    await loadFilterCatalog()
    applyRouteQueryToSeeds()
    const q = new URLSearchParams()
    if (apiEndpointFilter.value) q.set('api_endpoint_id', apiEndpointFilter.value)
    if (typeFilter.value) q.set('type_suggestion', typeFilter.value)
    if (selectedStoryId.value) q.set('story_id', selectedStoryId.value)
    else if (selectedIterationId.value) q.set('iteration_id', selectedIterationId.value)
    const path =
      `/api/v1/projects/${projectId.value}/tasks` + (q.toString() ? `?${q.toString()}` : '')
    const { data } = await apiClient.get<ApiEnvelope<{ items: PlanningTask[] }>>(path)
    tasks.value = data.data?.items ?? []
    buildStoryContextFromLoadedData()
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
  if (typeFilter.value) q.type_suggestion = typeFilter.value
  const ht = route.query.highlight_task_id
  if (typeof ht === 'string' && ht) q.highlight_task_id = ht
  if (selectedStoryId.value) q.story_id = selectedStoryId.value
  else if (selectedIterationId.value) q.iteration_id = selectedIterationId.value
  void router.replace({
    name: 'project-m04-tasks',
    params: { projectId: projectId.value },
    query: q,
  })
}

watch(
  () =>
    [
      route.query.api_endpoint_id,
      route.query.story_id,
      route.query.iteration_id,
      route.query.type_suggestion,
      projectId.value,
    ],
  () => {
    void loadAll()
  },
)

watch(typeFilter, () => {
  void loadAll()
})

onMounted(() => {
  void loadAll()
})
</script>

<style scoped>
.tasks-exec {
  padding: 0;
  /* el-main 在 ProjectLayout 中上下 padding 为 16px，顶部 AppHeaderBar 为 48px */
  height: calc(100vh - 80px);
  min-height: calc(100vh - 80px);
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.filter-alert {
  margin-bottom: 16px;
}
.tasks-layout {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  padding: 0;
  flex: 1;
  min-height: 0;
}
.tree-card {
  width: 340px;
  flex: 0 0 340px;
  height: 100%;
  font-size: 13px;
}
.table-card {
  flex: 1;
  min-width: 0;
  height: 100%;
}

/* 让两张卡片内部 body 变成 flex 纵向布局，确保滚动只发生在标题下方 */
.tree-card :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
}

.table-card :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
}
.tree-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.tree-title {
  font-weight: 600;
}
.tree-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.tree-scroll {
  flex: 1;
  min-height: 0;
  padding-right: 8px;
  height: 100%;
}
.tree-scroll :deep(.el-scrollbar__wrap) {
  height: 100%;
}
.tree-root {
  padding: 2px 2px 6px;
}

.tree-footer {
  padding: 10px 10px 14px;
  flex-shrink: 0;
}

.tree-manage-btn {
  width: 100%;
}
.iter-group + .iter-group {
  margin-top: 12px;
}
.iter-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 10px;
}
.iter-title {
  font-weight: 600;
  cursor: pointer;
  font-size: 13px;
}
.story-rows {
  margin: 8px 0 0;
  padding-left: 12px;
  border-left: 1px dashed var(--el-border-color-lighter);
}
.story-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 8px;
  cursor: pointer;
  border-radius: 10px;
}

.iter-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.caret-icon {
  flex-shrink: 0;
  cursor: pointer;
}

.story-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}

.story-right {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.iter-row.is-selected,
.story-row.is-selected {
  background: var(--el-fill-color-light);
}
.eye-btn {
  flex-shrink: 0;
  padding: 0;
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

.table-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.table-scroll :deep(.el-table) {
  flex: 1;
  min-height: 0;
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
