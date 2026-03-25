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
          <div class="head-actions">
            <el-button @click="openPlanningAiModeDialog">AI 辅助规划</el-button>
            <el-button type="primary" @click="openIterDialog()">新建迭代</el-button>
          </div>
        </div>
      </template>
      <el-table
        v-loading="iterLoading"
        :data="iterations"
        row-key="id"
        highlight-current-row
        ref="iterTableRef"
        @current-change="onSelectIteration"
      >
        <el-table-column prop="name" label="迭代名称" min-width="160" />
        <el-table-column prop="goal_summary" label="目标摘要" min-width="220" show-overflow-tooltip />
        <el-table-column prop="scope_notes" label="范围说明" min-width="160" show-overflow-tooltip />
        <el-table-column label="计划" min-width="148" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ formatPlanRange(row) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="预期人天" width="96">
          <template #default="{ row }">
            <span>{{ row.expected_person_days != null ? row.expected_person_days : '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="优先级" width="88">
          <template #default="{ row }">
            <span>{{ row.priority ?? '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click.stop="goIterationDetail(row)">详情</el-button>
            <el-button link type="danger" @click.stop="confirmDeleteIter(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card v-if="selectedIteration" ref="storyCardRef" shadow="never" class="block-card">
      <template #header>
        <div class="head-row">
          <span class="title">Story · {{ selectedIteration.name }}</span>
          <el-button type="primary" @click="openStoryDialog()">新建 Story</el-button>
        </div>
      </template>
      <el-table v-loading="storyLoading" :data="stories" row-key="id">
        <el-table-column prop="title" label="标题" min-width="180" />
        <el-table-column label="验收标准 AC" min-width="240">
          <template #default="{ row }">
            <span class="ac-preview">{{ row.acceptance_criteria.join('；') }}</span>
          </template>
        </el-table-column>
        <el-table-column label="Task总数" width="110">
          <template #default="{ row }">
            <span>{{ getStoryTaskTotal(row.id) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="进行中" width="96">
          <template #default="{ row }">
            <el-tag v-if="storyTasksLoading" size="small" type="info">—</el-tag>
            <el-tag v-else size="small" type="warning">{{ getStoryTaskDoing(row.id) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="已完成" width="96">
          <template #default="{ row }">
            <el-tag v-if="storyTasksLoading" size="small" type="info">—</el-tag>
            <el-tag v-else size="small" type="success">{{ getStoryTaskDone(row.id) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="优先级" width="88">
          <template #default="{ row }">{{ row.priority }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click.stop="goStoryDetail(row)">详情</el-button>
            <el-button link type="primary" @click.stop="goTasksForStory(row)">查看 Task</el-button>
            <el-button link type="danger" @click.stop="confirmDeleteStory(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <p class="page-foot-hint">Task 拆分与执行态请在「Task 与执行」中维护；Story 行可跳转并自动按 Story 筛选。</p>
    </div>

    <el-dialog v-model="planningAiModeDialog" title="AI 生成迭代与 Story" width="560px" destroy-on-close>
      <p class="mode-hint">打开 AI 抽屉前请选择接受草案后的落库方式（与「需求模块 · AI 模块化拆分」两种模式对齐）：</p>
      <el-radio-group v-model="planningAiModePick" class="mode-radios">
        <el-radio label="replace_all" border>
          <div class="mode-option">
            <div class="mode-option-title">全部覆盖（重建）</div>
            <div class="mode-option-desc">
              将<strong>删除当前所有迭代</strong>并<strong>级联删除</strong>其下 Story 与 Task，再按 AI 草案重建。
            </div>
          </div>
        </el-radio>
        <el-radio label="incremental" border>
          <div class="mode-option">
            <div class="mode-option-title">增量匹配覆盖</div>
            <div class="mode-option-desc">
              按<strong>规范化迭代名称</strong>匹配到已有迭代时，用草案<strong>整字段覆盖</strong>该迭代。Story 在所属迭代内按<strong>规范化标题</strong>匹配：已存在则<strong>整字段覆盖</strong>，否则<strong>新增</strong>。无法落库的草案（如空标题）将跳过。
            </div>
          </div>
        </el-radio>
      </el-radio-group>
      <template #footer>
        <el-button @click="planningAiModeDialog = false">取消</el-button>
        <el-button type="primary" :loading="planningAiBaselineLoading" @click="confirmPlanningAiMode">继续</el-button>
      </template>
    </el-dialog>

    <AiCompletionSummaryDialog
      v-model="planningAiSummaryVisible"
      title="迭代规划应用结果"
      :rows="planningAiSummaryRows"
    />

    <AiAssistDrawer
      v-model="aiPlanningOpen"
      title="AI 辅助（迭代规划）"
      capability="iteration_planning_assist"
      assist-kind="iteration_planning"
      :default-prompt="iterationPlanningDefaultPrompt"
      :external-prompt="iterationPlanningExternalPrompt"
      :payload-base="aiPlanningPayloadBase"
      :memory-key="aiPlanningMemoryKey"
      :iteration-planning-baseline-text="planningBaselineForAi"
      @apply-iteration-planning="onApplyIterationPlanningFromAi"
    />

    <el-dialog v-model="iterDialog" title="新建迭代" width="520px" destroy-on-close>
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
        <el-form-item label="计划开始">
          <el-date-picker
            v-model="iterForm.planned_start_date"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="可选"
            clearable
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="计划结束">
          <el-date-picker
            v-model="iterForm.planned_end_date"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="可选"
            clearable
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="预期人天">
          <el-input-number
            v-model="iterForm.expected_person_days"
            :min="0"
            :precision="1"
            :step="0.5"
            controls-position="right"
            placeholder="可选"
            style="width: 100%"
          />
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

  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

import RequirementCompareCard from '@/components/RequirementCompareCard'
import AiAssistDrawer from '@/components/AiAssistDrawer'
import AiCompletionSummaryDialog from '@/components/AiCompletionSummaryDialog'
import type { AiCompletionSummaryRow } from '@/components/AiCompletionSummaryDialog'
import {
  buildIterationPlanningDefaultPrompt,
  buildIterationPlanningExternalPrompt,
} from '@/config/aiPromptTemplates'
import { apiClient } from '@/api/client'
import type {
  ApiEnvelope,
  PlanningAiApplyMode,
  PlanningAiApplyRequestBody,
  PlanningAiApplyResultData,
  PlanningIteration,
  PlanningIterationCreateBody,
  PlanningTask,
  PlanningStory,
  PlanningStoryCreateBody,
  ProjectOneData,
} from '@/types/api-contract'
import type { IterationPlanningDraftNormalized } from '@/utils/iterationPlanningDraftNormalize'

const route = useRoute()
const router = useRouter()

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
const iterTableRef = ref<any>(null)
const selectedIteration = ref<PlanningIteration | null>(null)
const storyCardRef = ref<any>(null)

const routeIterationId = computed(() => {
  const raw = route.query.iteration_id
  return typeof raw === 'string' ? raw : ''
})

async function syncIterationSelectionFromQuery() {
  if (!routeIterationId.value) return
  const target = iterations.value.find((x) => x.id === routeIterationId.value) ?? null
  if (!target) return
  selectedIteration.value = target
  await nextTick()
  // Element Plus 表格 current-row 需要通过 setCurrentRow 手动同步，才能保持选中态一致。
  iterTableRef.value?.setCurrentRow?.(target)
  // 回到列表页时，自动滚动到 Story 区块，让用户立刻看到对应迭代的 Story 列表。
  const el = storyCardRef.value?.$el as HTMLElement | undefined
  if (el && typeof el.scrollIntoView === 'function') {
    try {
      el.scrollIntoView({ block: 'start', behavior: 'smooth' })
    } catch {
      el.scrollIntoView()
    }
  }
}

const stories = ref<PlanningStory[]>([])
const storyLoading = ref(false)
const tasksForIteration = ref<PlanningTask[]>([])
const storyTasksLoading = ref(false)

const storyTaskStatsById = computed(() => {
  const m = new Map<string, { total: number; doing: number; done: number }>()
  for (const t of tasksForIteration.value) {
    if (!t.story_id) continue
    const cur = m.get(t.story_id) ?? { total: 0, doing: 0, done: 0 }
    cur.total += 1
    if (t.status === 'done') cur.done += 1
    else if (t.status === 'in_progress' || t.status === 'testing') cur.doing += 1
    m.set(t.story_id, cur)
  }
  return m
})

function getStoryTaskTotal(storyId: string) {
  return storyTaskStatsById.value.get(storyId)?.total ?? 0
}

function getStoryTaskDoing(storyId: string) {
  return storyTaskStatsById.value.get(storyId)?.doing ?? 0
}

function getStoryTaskDone(storyId: string) {
  return storyTaskStatsById.value.get(storyId)?.done ?? 0
}

const planningAiModeDialog = ref(false)
const planningAiModePick = ref<PlanningAiApplyMode>('incremental')
const planningAiApplyMode = ref<PlanningAiApplyMode | null>(null)
const planningBaselineForAi = ref('')
const planningAiBaselineLoading = ref(false)
const aiPlanningOpen = ref(false)

const planningAiSummaryVisible = ref(false)
const planningAiSummaryRows = ref<AiCompletionSummaryRow[]>([])

const iterDialog = ref(false)
const iterSaving = ref(false)
const iterForm = ref({
  name: '',
  goal_summary: '',
  scope_notes: '',
  planned_start_date: '' as string | null,
  planned_end_date: '' as string | null,
  expected_person_days: null as number | null,
  priority: null as number | null,
})

const storyDialog = ref(false)
const storyEditId = ref<string | null>(null)
const storySaving = ref(false)
const storyForm = ref({
  title: '',
  acceptance_criteria: [''] as string[],
  priority: 2 as number,
  notes: '',
})

const iterationPlanningDefaultPrompt = computed(() =>
  buildIterationPlanningDefaultPrompt({
    projectName: project.value?.name?.trim() || '（未命名项目）',
    planningBaselineSummary: planningBaselineForAi.value.trim() || '（当前无迭代与 Story）',
  }),
)

const iterationPlanningExternalPrompt = computed(() =>
  buildIterationPlanningExternalPrompt({
    projectName: project.value?.name?.trim() || '（未命名项目）',
    planningBaselineSummary: planningBaselineForAi.value.trim() || '（当前无迭代与 Story）',
  }),
)

const aiPlanningPayloadBase = computed(() => ({
  project_id: projectId.value,
  project_name: project.value?.name ?? '',
}))

const aiPlanningMemoryKey = computed(() => (projectId.value ? `iteration_planning:${projectId.value}` : ''))

async function loadIterations() {
  if (!projectId.value) return
  iterLoading.value = true
  try {
    const { data } = await apiClient.get<ApiEnvelope<{ items: PlanningIteration[] }>>(
      `/api/v1/projects/${projectId.value}/iterations`,
    )
    iterations.value = data.data?.items ?? []
    if (routeIterationId.value) {
      await syncIterationSelectionFromQuery()
    } else if (selectedIteration.value) {
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
  } catch {
    stories.value = []
    ElMessage.error('加载 Story 失败')
  } finally {
    storyLoading.value = false
  }
}

async function loadTasksForIteration() {
  if (!projectId.value || !selectedIteration.value) {
    tasksForIteration.value = []
    return
  }
  storyTasksLoading.value = true
  try {
    const { data } = await apiClient.get<ApiEnvelope<{ items: PlanningTask[] }>>(
      `/api/v1/projects/${projectId.value}/tasks?iteration_id=${selectedIteration.value.id}`,
    )
    tasksForIteration.value = data.data?.items ?? []
  } catch {
    tasksForIteration.value = []
    ElMessage.error('加载 Story 任务统计失败')
  } finally {
    storyTasksLoading.value = false
  }
}

watch(
  () => selectedIteration.value?.id,
  () => {
    void loadStories()
    void loadTasksForIteration()
  },
)

watch(
  () => projectId.value,
  () => {
    selectedIteration.value = null
    stories.value = []
    tasksForIteration.value = []
    void fetchProject()
    void loadIterations()
  },
)

watch(
  () => routeIterationId.value,
  () => {
    if (!iterations.value.length) return
    void syncIterationSelectionFromQuery()
  },
)

async function buildPlanningBaselineMarkdown(): Promise<string> {
  if (!projectId.value) return '（无项目）'
  try {
    const { data } = await apiClient.get<ApiEnvelope<{ items: PlanningIteration[] }>>(
      `/api/v1/projects/${projectId.value}/iterations`,
    )
    const iters = [...(data.data?.items ?? [])].sort((a, b) => a.sort_order - b.sort_order)
    if (!iters.length) return '（当前无迭代与 Story）'
    const lines: string[] = []
    for (const it of iters) {
      lines.push(`## 迭代：${it.name}`)
      lines.push(`- 目标：${it.goal_summary}`)
      if (it.scope_notes?.trim()) lines.push(`- 范围：${it.scope_notes.trim()}`)
      const { data: sd } = await apiClient.get<ApiEnvelope<{ items: PlanningStory[] }>>(
        `/api/v1/projects/${projectId.value}/iterations/${it.id}/stories`,
      )
      const stList = [...(sd.data?.items ?? [])].sort((a, b) => a.sort_order - b.sort_order)
      for (const s of stList) {
        lines.push(`### Story：${s.title}`)
        lines.push(`- AC：${s.acceptance_criteria.join('；')}`)
        lines.push('')
      }
      lines.push('')
    }
    return lines.join('\n').trim()
  } catch {
    return '（加载当前规划失败）'
  }
}

function openPlanningAiModeDialog() {
  planningAiModePick.value = 'incremental'
  planningAiModeDialog.value = true
}

function formatCompletedAt(iso: string) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

function formatPlanRange(row: PlanningIteration) {
  const a = row.planned_start_at
  const b = row.planned_end_at
  if (!a && !b) return '—'
  const da = a ? a.slice(0, 10) : '—'
  const db = b ? b.slice(0, 10) : '—'
  return `${da} ~ ${db}`
}

function buildPlanningAiSummaryRows(
  mode: PlanningAiApplyMode,
  stats: PlanningAiApplyResultData,
  completedAtIso: string,
): AiCompletionSummaryRow[] {
  const modeLabel = mode === 'replace_all' ? '全部覆盖（重建）' : '增量匹配覆盖'
  return [
    { label: '落库模式', value: modeLabel },
    {
      label: '新建迭代',
      value: `${stats.added_iteration_names.length} 个`,
      lines: stats.added_iteration_names.length ? [...stats.added_iteration_names] : undefined,
    },
    {
      label: '覆盖迭代',
      value: `${stats.updated_iteration_names.length} 个`,
      lines: stats.updated_iteration_names.length ? [...stats.updated_iteration_names] : undefined,
    },
    {
      label: '新增 Story',
      value: `${stats.added_story_titles.length} 条`,
      lines: stats.added_story_titles.length ? [...stats.added_story_titles] : undefined,
    },
    {
      label: '覆盖 Story',
      value: `${stats.updated_story_titles.length} 条`,
      lines: stats.updated_story_titles.length ? [...stats.updated_story_titles] : undefined,
    },
    {
      label: '跳过 Story',
      value: `${stats.skipped_story_titles.length} 条（无法落库）`,
      lines: stats.skipped_story_titles.length ? [...stats.skipped_story_titles] : undefined,
    },
    { label: '完成时间', value: formatCompletedAt(completedAtIso) },
  ]
}

async function confirmPlanningAiMode() {
  planningAiBaselineLoading.value = true
  try {
    planningBaselineForAi.value = await buildPlanningBaselineMarkdown()
    planningAiApplyMode.value = planningAiModePick.value
    planningAiModeDialog.value = false
    aiPlanningOpen.value = true
  } finally {
    planningAiBaselineLoading.value = false
  }
}

async function onApplyIterationPlanningFromAi(payload: {
  assistantId: string
  draft: IterationPlanningDraftNormalized
}) {
  if (!projectId.value || !planningAiApplyMode.value) {
    ElMessage.error('缺少落库模式，请关闭后重新打开 AI 辅助')
    return
  }
  const body: PlanningAiApplyRequestBody = {
    mode: planningAiApplyMode.value,
    iterations: payload.draft.iterations,
    stories: payload.draft.stories,
  }
  try {
    const { data: env } = await apiClient.post<ApiEnvelope<PlanningAiApplyResultData | null>>(
      `/api/v1/projects/${projectId.value}/planning/ai-apply`,
      body,
    )
    const stats = env.data
    const modeUsed = planningAiApplyMode.value
    const completedAt = new Date().toISOString()
    planningAiApplyMode.value = null
    if (stats && modeUsed) {
      planningAiSummaryRows.value = buildPlanningAiSummaryRows(modeUsed, stats, completedAt)
    } else {
      planningAiSummaryRows.value = [
        { label: '状态', value: '已落库，但未返回统计明细' },
        { label: '完成时间', value: formatCompletedAt(completedAt) },
      ]
    }
    planningAiSummaryVisible.value = true
    ElMessage.success('已完成')
    selectedIteration.value = null
    stories.value = []
    await loadIterations()
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'response' in e
        ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
        : ''
    ElMessage.error(msg || (e instanceof Error ? e.message : '落库失败'))
  }
}

function openIterDialog() {
  iterForm.value = {
    name: '',
    goal_summary: '',
    scope_notes: '',
    planned_start_date: null,
    planned_end_date: null,
    expected_person_days: null,
    priority: null,
  }
  iterDialog.value = true
}

function goIterationDetail(row: PlanningIteration) {
  if (!projectId.value) return
  void router.push({
    name: 'project-m03-iteration-detail',
    params: { projectId: projectId.value, iterationId: row.id },
  })
}

async function saveIteration() {
  if (!projectId.value) return
  if (!iterForm.value.name.trim() || !iterForm.value.goal_summary.trim()) {
    ElMessage.warning('请填写名称与目标摘要')
    return
  }
  iterSaving.value = true
  try {
    const plannedStartAt = iterForm.value.planned_start_date ? `${iterForm.value.planned_start_date}T00:00:00.000Z` : null
    const plannedEndAt = iterForm.value.planned_end_date ? `${iterForm.value.planned_end_date}T00:00:00.000Z` : null
    const body: PlanningIterationCreateBody = {
      name: iterForm.value.name.trim(),
      goal_summary: iterForm.value.goal_summary.trim(),
      scope_notes: iterForm.value.scope_notes.trim(),
      planned_start_at: plannedStartAt,
      planned_end_at: plannedEndAt,
      expected_person_days: iterForm.value.expected_person_days,
      priority: iterForm.value.priority ?? undefined,
    }
    const { data } = await apiClient.post<ApiEnvelope<PlanningIteration>>(
      `/api/v1/projects/${projectId.value}/iterations`,
      body,
    )
    const row = data.data
    ElMessage.success('已创建')
    iterDialog.value = false
    await loadIterations()
    if (row?.id) {
      void router.push({
        name: 'project-m03-iteration-detail',
        params: { projectId: projectId.value, iterationId: row.id },
      })
    }
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
      priority: row.priority,
      notes: row.notes,
    }
  } else {
    storyForm.value = { title: '', acceptance_criteria: [''], priority: 2, notes: '' }
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
      await loadStories()
    })
    .catch(() => {})
}

function goStoryDetail(row: PlanningStory) {
  if (!projectId.value) return
  void router.push({
    name: 'project-m03-story-detail',
    params: { projectId: projectId.value, iterationId: row.iteration_id, storyId: row.id },
  })
}

function goTasksForStory(row: PlanningStory) {
  if (!projectId.value) return
  void router.push({
    name: 'project-m04-tasks',
    params: { projectId: projectId.value },
    query: { story_id: row.id },
  })
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
.head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.mode-hint {
  margin: 0 0 12px;
  font-size: 14px;
  color: var(--el-text-color-regular);
}
.mode-radios {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
}
/* 与 RequirementModuleDocPanel 一致：border 型 el-radio 默认固定高度 + 垂直居中，多行内容会挤出标题错位 */
.mode-radios :deep(.el-radio) {
  height: auto;
  margin-right: 0;
  align-items: flex-start;
  padding: 12px;
  width: 100%;
  box-sizing: border-box;
}
.mode-radios :deep(.el-radio__label) {
  flex: 1;
  min-width: 0;
  white-space: normal;
  line-height: 1.45;
}
.mode-option-title {
  font-weight: 600;
  margin-bottom: 4px;
}
.mode-option-desc {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.45;
  white-space: normal;
}
.page-foot-hint {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
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
