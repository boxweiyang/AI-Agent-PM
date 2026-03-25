<template>
  <div class="iteration-planning">
    <div class="page-head">
      <span class="page-title">迭代与 Story</span>
      <el-tag v-if="reqRef" size="small" type="info">{{ reqRef }}</el-tag>
    </div>

    <div class="page-stack">
      <RequirementCompareCard
        :project-id="projectId"
        :req-doc-ready="reqDocReady"
        :description="reqCompareDescription"
      />

    <el-card shadow="never" class="block-card">
      <template #header>
        <div class="head-row">
          <span class="title">迭代规划</span>
          <el-button type="primary" @click="openIterDialog()">新建迭代</el-button>
        </div>
      </template>
      <el-table
        v-loading="iterLoading"
        :data="iterations"
        row-key="id"
        highlight-current-row
        @current-change="onSelectIteration"
      >
        <el-table-column prop="name" label="迭代名称" min-width="160" />
        <el-table-column prop="goal_summary" label="目标摘要" min-width="220" show-overflow-tooltip />
        <el-table-column prop="scope_notes" label="范围说明" min-width="160" show-overflow-tooltip />
        <el-table-column label="优先级" width="88">
          <template #default="{ row }">
            <span>{{ row.priority ?? '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click.stop="openIterDialog(row)">编辑</el-button>
            <el-button link type="danger" @click.stop="confirmDeleteIter(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card v-if="selectedIteration" shadow="never" class="block-card">
      <template #header>
        <div class="head-row">
          <span class="title">Story · {{ selectedIteration.name }}</span>
          <el-button type="primary" @click="openStoryDialog()">新建 Story</el-button>
        </div>
      </template>
      <el-table
        v-loading="storyLoading"
        :data="stories"
        row-key="id"
        highlight-current-row
        @current-change="onSelectStory"
      >
        <el-table-column prop="title" label="标题" min-width="180" />
        <el-table-column label="验收标准 AC" min-width="240">
          <template #default="{ row }">
            <span class="ac-preview">{{ row.acceptance_criteria.join('；') }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="requirement_ref" label="关联需求" width="140" show-overflow-tooltip />
        <el-table-column label="优先级" width="88">
          <template #default="{ row }">{{ row.priority }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click.stop="openStoryDialog(row)">编辑</el-button>
            <el-button link type="primary" @click.stop="goTasksForStory(row)">划分 Task</el-button>
            <el-button link type="danger" @click.stop="confirmDeleteStory(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card v-if="selectedStory" shadow="never" class="block-card">
      <template #header>
        <div class="head-row">
          <span class="title">Task 草案 · {{ selectedStory.title }}</span>
          <el-button type="primary" @click="openTaskDialog()">新建 Task</el-button>
        </div>
      </template>
      <el-table v-loading="taskLoading" :data="tasks" row-key="id">
        <el-table-column prop="title" label="标题" min-width="200" />
        <el-table-column label="类型建议" width="110">
          <template #default="{ row }">{{ typeLabel(row.type_suggestion) }}</template>
        </el-table-column>
        <el-table-column label="优先级" width="72">
          <template #default="{ row }">{{ row.priority }}</template>
        </el-table-column>
        <el-table-column label="执行状态" width="110">
          <template #default="{ row }">
            <el-tag size="small" :type="statusTagType(row.status)">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="关联接口数" width="100">
          <template #default="{ row }">{{ (row.linked_endpoint_ids || []).length }}</template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click.stop="openTaskDialog(row)">编辑</el-button>
            <el-button link type="danger" @click.stop="confirmDeleteTask(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <p class="hint">执行与看板请前往「Task 与执行」模块；此处可维护拆分草案与关联接口（M02C）。</p>
    </el-card>
    </div>

    <el-dialog v-model="iterDialog" :title="iterEditId ? '编辑迭代' : '新建迭代'" width="520px" destroy-on-close>
      <el-form label-width="100px">
        <el-form-item label="名称" required>
          <el-input v-model="iterForm.name" placeholder="如迭代1-基础能力" />
        </el-form-item>
        <el-form-item label="目标摘要" required>
          <el-input v-model="iterForm.goal_summary" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="范围说明">
          <el-input v-model="iterForm.scope_notes" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="iterForm.priority" clearable placeholder="可选" style="width: 100%">
            <el-option v-for="p in 5" :key="p - 1" :label="`${p - 1}（${p - 1 === 0 ? '最高' : ''}）`" :value="p - 1" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="iterDialog = false">取消</el-button>
        <el-button type="primary" :loading="iterSaving" @click="saveIteration">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="storyDialog" :title="storyEditId ? '编辑 Story' : '新建 Story'" width="640px" destroy-on-close>
      <el-form label-width="108px">
        <el-form-item label="标题" required>
          <el-input v-model="storyForm.title" />
        </el-form-item>
        <el-form-item label="验收标准" required>
          <div v-for="(ac, i) in storyForm.acceptance_criteria" :key="i" class="ac-row">
            <el-input v-model="storyForm.acceptance_criteria[i]" placeholder="一条 AC" />
            <el-button link type="danger" @click="removeAc(i)">删除</el-button>
          </div>
          <el-button size="small" @click="storyForm.acceptance_criteria.push('')">+ 添加 AC</el-button>
        </el-form-item>
        <el-form-item label="关联需求">
          <el-input v-model="storyForm.requirement_ref" placeholder="模块或章节锚点" />
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="storyForm.priority" style="width: 100%">
            <el-option v-for="p in 5" :key="p - 1" :label="String(p - 1)" :value="p - 1" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="storyForm.notes" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="storyDialog = false">取消</el-button>
        <el-button type="primary" :loading="storySaving" @click="saveStory">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="taskDialog" :title="taskEditId ? '编辑 Task' : '新建 Task'" width="560px" destroy-on-close>
      <el-form label-width="108px">
        <el-form-item label="标题" required>
          <el-input v-model="taskForm.title" />
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="taskForm.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="类型建议" required>
          <el-select v-model="taskForm.type_suggestion" style="width: 100%">
            <el-option label="前端" value="frontend" />
            <el-option label="后端" value="backend" />
            <el-option label="测试" value="qa" />
            <el-option label="运维/DevOps" value="devops" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="taskForm.priority" style="width: 100%">
            <el-option v-for="p in 5" :key="p - 1" :label="String(p - 1)" :value="p - 1" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="taskEditId" label="执行状态">
          <el-select v-model="taskForm.status" style="width: 100%">
            <el-option label="待办" value="todo" />
            <el-option label="进行中" value="in_progress" />
            <el-option label="待测试" value="testing" />
            <el-option label="已完成" value="done" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="taskDialog = false">取消</el-button>
        <el-button type="primary" :loading="taskSaving" @click="saveTask">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

import RequirementCompareCard from '@/components/RequirementCompareCard'
import { apiClient } from '@/api/client'
import type {
  ApiEnvelope,
  PlanningIteration,
  PlanningIterationCreateBody,
  PlanningStory,
  PlanningStoryCreateBody,
  PlanningTask,
  PlanningTaskCreateBody,
  PlanningTaskStatus,
  PlanningTaskTypeSuggestion,
  ProjectOneData,
} from '@/types/api-contract'

const route = useRoute()

const projectId = computed(() => (typeof route.params.projectId === 'string' ? route.params.projectId : ''))
const reqRef = computed(() => (route.meta.reqRef as string) ?? '')

const project = ref<ProjectOneData | null>(null)
const reqDocReady = computed(() => project.value?.artifacts?.req_doc === true)

const reqCompareDescription =
  '划分迭代与 Story 前，建议先对照已确认的最新版需求正文。以下为只读预览，可在弹窗内下载。'

async function fetchProject() {
  if (!projectId.value) {
    project.value = null
    return
  }
  try {
    const { data } = await apiClient.get<ApiEnvelope<ProjectOneData>>(`/api/v1/projects/${projectId.value}`)
    project.value = data.data ?? null
  } catch {
    project.value = null
  }
}

const iterations = ref<PlanningIteration[]>([])
const iterLoading = ref(false)
const selectedIteration = ref<PlanningIteration | null>(null)

const stories = ref<PlanningStory[]>([])
const storyLoading = ref(false)
const selectedStory = ref<PlanningStory | null>(null)

const tasks = ref<PlanningTask[]>([])
const taskLoading = ref(false)

const iterDialog = ref(false)
const iterEditId = ref<string | null>(null)
const iterSaving = ref(false)
const iterForm = ref({
  name: '',
  goal_summary: '',
  scope_notes: '',
  priority: null as number | null,
})

const storyDialog = ref(false)
const storyEditId = ref<string | null>(null)
const storySaving = ref(false)
const storyForm = ref({
  title: '',
  acceptance_criteria: [''] as string[],
  requirement_ref: '',
  priority: 2 as number,
  notes: '',
})

const taskDialog = ref(false)
const taskEditId = ref<string | null>(null)
const taskSaving = ref(false)
const taskForm = ref({
  title: '',
  description: '',
  type_suggestion: 'backend' as PlanningTaskTypeSuggestion,
  priority: 2 as number,
  status: 'todo' as PlanningTaskStatus,
})

async function loadIterations() {
  if (!projectId.value) return
  iterLoading.value = true
  try {
    const { data } = await apiClient.get<ApiEnvelope<{ items: PlanningIteration[] }>>(
      `/api/v1/projects/${projectId.value}/iterations`,
    )
    iterations.value = data.data?.items ?? []
    if (selectedIteration.value) {
      const cur = iterations.value.find((x) => x.id === selectedIteration.value!.id)
      selectedIteration.value = cur ?? null
    }
  } catch {
    iterations.value = []
    ElMessage.error('加载迭代失败')
  } finally {
    iterLoading.value = false
  }
}

function onSelectIteration(row: PlanningIteration | null) {
  selectedIteration.value = row
  selectedStory.value = null
  tasks.value = []
}

function onSelectStory(row: PlanningStory | null) {
  selectedStory.value = row
}

async function loadStories() {
  if (!projectId.value || !selectedIteration.value) {
    stories.value = []
    return
  }
  storyLoading.value = true
  try {
    const { data } = await apiClient.get<ApiEnvelope<{ items: PlanningStory[] }>>(
      `/api/v1/projects/${projectId.value}/iterations/${selectedIteration.value.id}/stories`,
    )
    stories.value = data.data?.items ?? []
    if (selectedStory.value) {
      const cur = stories.value.find((x) => x.id === selectedStory.value!.id)
      selectedStory.value = cur ?? null
    }
  } catch {
    stories.value = []
    ElMessage.error('加载 Story 失败')
  } finally {
    storyLoading.value = false
  }
}

async function loadTasks() {
  if (!projectId.value || !selectedStory.value) {
    tasks.value = []
    return
  }
  taskLoading.value = true
  try {
    const { data } = await apiClient.get<ApiEnvelope<{ items: PlanningTask[] }>>(
      `/api/v1/projects/${projectId.value}/stories/${selectedStory.value.id}/tasks`,
    )
    tasks.value = data.data?.items ?? []
  } catch {
    tasks.value = []
    ElMessage.error('加载 Task 失败')
  } finally {
    taskLoading.value = false
  }
}

watch(
  () => selectedIteration.value?.id,
  () => {
    void loadStories()
  },
)

watch(
  () => selectedStory.value?.id,
  () => {
    void loadTasks()
  },
)

watch(
  () => projectId.value,
  () => {
    selectedIteration.value = null
    selectedStory.value = null
    stories.value = []
    tasks.value = []
    void fetchProject()
    void loadIterations()
  },
)

function openIterDialog(row?: PlanningIteration) {
  iterEditId.value = row?.id ?? null
  if (row) {
    iterForm.value = {
      name: row.name,
      goal_summary: row.goal_summary,
      scope_notes: row.scope_notes,
      priority: row.priority,
    }
  } else {
    iterForm.value = { name: '', goal_summary: '', scope_notes: '', priority: null }
  }
  iterDialog.value = true
}

async function saveIteration() {
  if (!projectId.value) return
  if (!iterForm.value.name.trim() || !iterForm.value.goal_summary.trim()) {
    ElMessage.warning('请填写名称与目标摘要')
    return
  }
  iterSaving.value = true
  try {
    const body: PlanningIterationCreateBody = {
      name: iterForm.value.name.trim(),
      goal_summary: iterForm.value.goal_summary.trim(),
      scope_notes: iterForm.value.scope_notes.trim(),
      priority: iterForm.value.priority ?? undefined,
    }
    if (iterEditId.value) {
      await apiClient.patch(`/api/v1/projects/${projectId.value}/iterations/${iterEditId.value}`, body)
      ElMessage.success('已保存')
    } else {
      await apiClient.post(`/api/v1/projects/${projectId.value}/iterations`, body)
      ElMessage.success('已创建')
    }
    iterDialog.value = false
    await loadIterations()
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    iterSaving.value = false
  }
}

function confirmDeleteIter(row: PlanningIteration) {
  if (!projectId.value) return
  void ElMessageBox.confirm(`确定删除迭代「${row.name}」？将级联删除 Story 与 Task。`, '删除迭代', {
    type: 'warning',
  })
    .then(async () => {
      await apiClient.delete(`/api/v1/projects/${projectId.value}/iterations/${row.id}`)
      ElMessage.success('已删除')
      if (selectedIteration.value?.id === row.id) selectedIteration.value = null
      await loadIterations()
    })
    .catch(() => {})
}

function openStoryDialog(row?: PlanningStory) {
  if (!selectedIteration.value) return
  storyEditId.value = row?.id ?? null
  if (row) {
    storyForm.value = {
      title: row.title,
      acceptance_criteria: row.acceptance_criteria.length ? [...row.acceptance_criteria] : [''],
      requirement_ref: row.requirement_ref,
      priority: row.priority,
      notes: row.notes,
    }
  } else {
    storyForm.value = { title: '', acceptance_criteria: [''], requirement_ref: '', priority: 2, notes: '' }
  }
  storyDialog.value = true
}

function removeAc(i: number) {
  storyForm.value.acceptance_criteria.splice(i, 1)
  if (storyForm.value.acceptance_criteria.length === 0) storyForm.value.acceptance_criteria.push('')
}

async function saveStory() {
  if (!projectId.value || !selectedIteration.value) return
  const ac = storyForm.value.acceptance_criteria.map((x) => x.trim()).filter(Boolean)
  if (!storyForm.value.title.trim() || ac.length === 0) {
    ElMessage.warning('请填写标题与至少一条验收标准')
    return
  }
  storySaving.value = true
  try {
    const body: PlanningStoryCreateBody = {
      title: storyForm.value.title.trim(),
      acceptance_criteria: ac,
      requirement_ref: storyForm.value.requirement_ref.trim(),
      priority: storyForm.value.priority,
      notes: storyForm.value.notes,
    }
    if (storyEditId.value) {
      await apiClient.patch(`/api/v1/projects/${projectId.value}/stories/${storyEditId.value}`, body)
      ElMessage.success('已保存')
    } else {
      await apiClient.post(
        `/api/v1/projects/${projectId.value}/iterations/${selectedIteration.value.id}/stories`,
        body,
      )
      ElMessage.success('已创建')
    }
    storyDialog.value = false
    await loadStories()
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    storySaving.value = false
  }
}

function confirmDeleteStory(row: PlanningStory) {
  if (!projectId.value) return
  void ElMessageBox.confirm(`确定删除 Story「${row.title}」？将级联删除 Story 下 Task。`, '删除 Story', {
    type: 'warning',
  })
    .then(async () => {
      await apiClient.delete(`/api/v1/projects/${projectId.value}/stories/${row.id}`)
      ElMessage.success('已删除')
      if (selectedStory.value?.id === row.id) selectedStory.value = null
      await loadStories()
    })
    .catch(() => {})
}

function goTasksForStory(row: PlanningStory) {
  selectedStory.value = row
  void loadTasks()
  const el = document.querySelector('.iteration-planning .block-card:last-of-type')
  el?.scrollIntoView({ behavior: 'smooth' })
}

function openTaskDialog(row?: PlanningTask) {
  if (!selectedStory.value) return
  taskEditId.value = row?.id ?? null
  if (row) {
    taskForm.value = {
      title: row.title,
      description: row.description,
      type_suggestion: row.type_suggestion,
      priority: row.priority,
      status: row.status,
    }
  } else {
    taskForm.value = {
      title: '',
      description: '',
      type_suggestion: 'backend',
      priority: 2,
      status: 'todo',
    }
  }
  taskDialog.value = true
}

async function saveTask() {
  if (!projectId.value || !selectedStory.value) return
  if (!taskForm.value.title.trim()) {
    ElMessage.warning('请填写标题')
    return
  }
  taskSaving.value = true
  try {
    const body: PlanningTaskCreateBody = {
      title: taskForm.value.title.trim(),
      description: taskForm.value.description.trim(),
      type_suggestion: taskForm.value.type_suggestion,
      priority: taskForm.value.priority,
    }
    if (taskEditId.value) {
      await apiClient.patch(`/api/v1/projects/${projectId.value}/tasks/${taskEditId.value}`, {
        ...body,
        status: taskForm.value.status,
      })
      ElMessage.success('已保存')
    } else {
      await apiClient.post(`/api/v1/projects/${projectId.value}/stories/${selectedStory.value.id}/tasks`, body)
      ElMessage.success('已创建')
    }
    taskDialog.value = false
    await loadTasks()
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    taskSaving.value = false
  }
}

function confirmDeleteTask(row: PlanningTask) {
  if (!projectId.value) return
  void ElMessageBox.confirm(`确定删除 Task「${row.title}」？`, '删除 Task', { type: 'warning' })
    .then(async () => {
      await apiClient.delete(`/api/v1/projects/${projectId.value}/tasks/${row.id}`)
      ElMessage.success('已删除')
      await loadTasks()
    })
    .catch(() => {})
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

function statusLabel(s: PlanningTaskStatus) {
  const m: Record<PlanningTaskStatus, string> = {
    todo: '待办',
    in_progress: '进行中',
    testing: '待测试',
    done: '已完成',
  }
  return m[s]
}

function statusTagType(s: PlanningTaskStatus) {
  if (s === 'done') return 'success'
  if (s === 'in_progress') return 'warning'
  if (s === 'testing') return 'info'
  return ''
}

onMounted(() => {
  void fetchProject()
  void loadIterations()
})
</script>

<style scoped>
.iteration-planning {
  width: 100%;
  min-width: 0;
  padding: 0 0 24px;
}
.page-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}
.page-title {
  font-weight: 600;
  font-size: 18px;
}
.page-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.block-card {
  border-radius: 8px;
}
.head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.title {
  font-weight: 600;
}
.ac-preview {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.ac-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.hint {
  margin: 12px 0 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
</style>
