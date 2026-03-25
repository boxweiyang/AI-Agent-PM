/**
 * REQ-M03 迭代 / Story / Task（草案）与 REQ-M04 执行态 — MSW 内存存储。
 * 契约见 contracts/openapi/openapi.yaml（planning 相关 path）。
 */
import { deleteAllIterationRequirementDocVersions } from '@/mocks/iterationRequirementDocStore'
import { deleteAllStoryRequirementDocVersions } from '@/mocks/storyRequirementDocStore'
import type {
  ApiCatalogTaskSummary,
  PlanningAiApplyMode,
  PlanningAiApplyResultData,
  PlanningAiDraftIterationInput,
  PlanningAiDraftStoryInput,
  PlanningIteration,
  PlanningIterationCreateBody,
  PlanningIterationPatchBody,
  PlanningReorderBody,
  PlanningStory,
  PlanningStoryCreateBody,
  PlanningStoryPatchBody,
  PlanningTask,
  PlanningTaskCreateBody,
  PlanningTaskPatchBody,
  PlanningTaskStatus,
  PlanningTaskTypeSuggestion,
} from '@/types/api-contract'

type ProjectPlanningState = {
  iterations: PlanningIteration[]
  stories: PlanningStory[]
  tasks: PlanningTask[]
}

const byProject = new Map<string, ProjectPlanningState>()

function nowIso() {
  return new Date().toISOString()
}

function nextId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function seedDemo1(): ProjectPlanningState {
  const t0 = nowIso()
  const iter1: PlanningIteration = {
    id: 'iter-demo1-1',
    name: '迭代1-基础能力',
    goal_summary: '完成认证、项目壳与接口管理基础能力，可联调闭环。',
    planned_start_at: null,
    planned_end_at: null,
    expected_person_days: 25,
    scope_notes: '需求模块：用户与权限、接口管理；交付：Web + 后端',
    sort_order: 0,
    priority: 1,
    created_at: t0,
    updated_at: t0,
  }
  const iter2: PlanningIteration = {
    id: 'iter-demo1-2',
    name: '迭代2-协同与看板',
    goal_summary: 'Task 执行、与接口清单联动、Dashboard 数据同源。',
    planned_start_at: null,
    planned_end_at: null,
    expected_person_days: 18,
    scope_notes: 'REQ-M03/M04/M08',
    sort_order: 1,
    priority: 2,
    created_at: t0,
    updated_at: t0,
  }

  const story1: PlanningStory = {
    id: 'story-demo1-1',
    iteration_id: iter1.id,
    title: '用户登录与权限摘要',
    acceptance_criteria: ['未登录访问受保护路由跳转登录', '登录后 /auth/me 返回权限列表'],
    requirement_ref: 'REQ-M02 · 用户与权限',
    priority: 0,
    sort_order: 0,
    notes: '',
    created_at: t0,
    updated_at: t0,
  }
  const story2: PlanningStory = {
    id: 'story-demo1-2',
    iteration_id: iter1.id,
    title: '接口管理 CRUD 与 AI 生成',
    acceptance_criteria: ['接口清单可维护', '与通用约束版本联动'],
    requirement_ref: 'REQ-M02C',
    priority: 1,
    sort_order: 1,
    notes: '',
    created_at: t0,
    updated_at: t0,
  }
  const story3: PlanningStory = {
    id: 'story-demo1-3',
    iteration_id: iter2.id,
    title: 'Task 与接口双向绑定',
    acceptance_criteria: ['Task 可绑定接口', '接口页可反查 Task'],
    requirement_ref: 'REQ-M04 + M02C',
    priority: 0,
    sort_order: 0,
    notes: '',
    created_at: t0,
    updated_at: t0,
  }

  const tasks: PlanningTask[] = [
    {
      id: 'task-demo1-1',
      story_id: story1.id,
      iteration_id: iter1.id,
      title: '实现登录页与 Token 存储',
      description: '对齐 TECH-004 包络与拦截器',
      type_suggestion: 'frontend',
      priority: 0,
      sort_order: 0,
      status: 'done',
      assigned_user_id: null,
      linked_endpoint_ids: [],
      ai_batch_id: null,
      created_at: t0,
      updated_at: t0,
    },
    {
      id: 'task-demo1-2',
      story_id: story1.id,
      iteration_id: iter1.id,
      title: '后端 /auth/me 与鉴权中间件',
      description: '',
      type_suggestion: 'backend',
      priority: 1,
      sort_order: 1,
      status: 'in_progress',
      assigned_user_id: null,
      linked_endpoint_ids: [],
      ai_batch_id: null,
      created_at: t0,
      updated_at: t0,
    },
    {
      id: 'task-demo1-3',
      story_id: story2.id,
      iteration_id: iter1.id,
      title: '接口清单列表与筛选 UI',
      description: '',
      type_suggestion: 'frontend',
      priority: 0,
      sort_order: 0,
      status: 'testing',
      assigned_user_id: null,
      linked_endpoint_ids: [],
      ai_batch_id: null,
      created_at: t0,
      updated_at: t0,
    },
    {
      id: 'task-demo1-4',
      story_id: story3.id,
      iteration_id: iter2.id,
      title: '接口绑定 Task 与状态回写',
      description: '消费 planning task + api-catalog 绑定',
      type_suggestion: 'backend',
      priority: 0,
      sort_order: 0,
      status: 'todo',
      assigned_user_id: null,
      linked_endpoint_ids: [],
      ai_batch_id: null,
      created_at: t0,
      updated_at: t0,
    },
  ]

  return {
    iterations: [iter1, iter2],
    stories: [story1, story2, story3],
    tasks,
  }
}

function seedMinimal(projectId: string): ProjectPlanningState {
  const t0 = nowIso()
  const iter: PlanningIteration = {
    id: nextId('iter'),
    name: '迭代1',
    goal_summary: '在本迭代完成核心交付目标（可编辑）。',
    planned_start_at: null,
    planned_end_at: null,
    expected_person_days: null,
    scope_notes: '',
    sort_order: 0,
    priority: 2,
    created_at: t0,
    updated_at: t0,
  }
  const story: PlanningStory = {
    id: nextId('story'),
    iteration_id: iter.id,
    title: '初始 Story',
    acceptance_criteria: ['在此补充验收标准'],
    requirement_ref: '',
    priority: 2,
    sort_order: 0,
    notes: '',
    created_at: t0,
    updated_at: t0,
  }
  const task: PlanningTask = {
    id: nextId('task'),
    story_id: story.id,
    iteration_id: iter.id,
    title: '示例 Task（从 Story 拆分）',
    description: '',
    type_suggestion: 'other',
    priority: 2,
    sort_order: 0,
    status: 'todo',
    assigned_user_id: null,
    linked_endpoint_ids: [],
    ai_batch_id: null,
    created_at: t0,
    updated_at: t0,
  }
  return { iterations: [iter], stories: [story], tasks: [task] }
}

function ensureState(projectId: string): ProjectPlanningState {
  if (!byProject.has(projectId)) {
    byProject.set(projectId, projectId === 'proj-demo-1' ? seedDemo1() : seedMinimal(projectId))
  }
  return byProject.get(projectId)!
}

export function listPlanningIterations(projectId: string) {
  const s = ensureState(projectId)
  return {
    items: [...s.iterations].sort((a, b) => a.sort_order - b.sort_order),
  }
}

export function getPlanningIteration(projectId: string, iterationId: string) {
  const s = ensureState(projectId)
  return s.iterations.find((x) => x.id === iterationId) ?? null
}

export function createPlanningIteration(projectId: string, body: PlanningIterationCreateBody) {
  const s = ensureState(projectId)
  const t0 = nowIso()
  const sort_order =
    s.iterations.length === 0 ? 0 : Math.max(...s.iterations.map((x) => x.sort_order), 0) + 1
  const row: PlanningIteration = {
    id: nextId('iter'),
    name: body.name,
    goal_summary: body.goal_summary,
    planned_start_at: body.planned_start_at ?? null,
    planned_end_at: body.planned_end_at ?? null,
    expected_person_days: body.expected_person_days ?? null,
    scope_notes: body.scope_notes ?? '',
    sort_order,
    priority: body.priority ?? null,
    created_at: t0,
    updated_at: t0,
  }
  s.iterations.push(row)
  return row
}

export function patchPlanningIteration(projectId: string, iterationId: string, patch: PlanningIterationPatchBody) {
  const s = ensureState(projectId)
  const row = s.iterations.find((x) => x.id === iterationId)
  if (!row) return { ok: false as const, message: '迭代不存在' }
  Object.assign(row, patch, { updated_at: nowIso() })
  return { ok: true as const, data: row }
}

export function deletePlanningIteration(projectId: string, iterationId: string) {
  const s = ensureState(projectId)
  const idx = s.iterations.findIndex((x) => x.id === iterationId)
  if (idx < 0) return { ok: false as const, message: '迭代不存在' }
  deleteAllIterationRequirementDocVersions(projectId, iterationId)
  const storyIds = s.stories.filter((st) => st.iteration_id === iterationId).map((st) => st.id)
  // 级联删除时，同时清理该迭代下所有 Story 的需求文档版本链
  for (const storyId of storyIds) {
    deleteAllStoryRequirementDocVersions(projectId, storyId)
  }
  s.tasks = s.tasks.filter((t) => !storyIds.includes(t.story_id))
  s.stories = s.stories.filter((st) => st.iteration_id !== iterationId)
  s.iterations.splice(idx, 1)
  return { ok: true as const }
}

export function reorderPlanningIterations(projectId: string, body: PlanningReorderBody) {
  const s = ensureState(projectId)
  const indexMap = new Map(body.ordered_ids.map((id, i) => [id, i]))
  for (const it of s.iterations) {
    const i = indexMap.get(it.id)
    if (i !== undefined) it.sort_order = i
  }
  s.iterations.forEach((it) => {
    it.updated_at = nowIso()
  })
  return { ok: true as const }
}

export function listPlanningStories(projectId: string, iterationId: string) {
  const s = ensureState(projectId)
  return {
    items: s.stories
      .filter((x) => x.iteration_id === iterationId)
      .sort((a, b) => a.sort_order - b.sort_order),
  }
}

export function getPlanningStory(projectId: string, storyId: string) {
  const s = ensureState(projectId)
  return s.stories.find((x) => x.id === storyId) ?? null
}

export function createPlanningStory(projectId: string, iterationId: string, body: PlanningStoryCreateBody) {
  const s = ensureState(projectId)
  if (!s.iterations.some((x) => x.id === iterationId)) return { ok: false as const, message: '迭代不存在' }
  const t0 = nowIso()
  const inIter = s.stories.filter((x) => x.iteration_id === iterationId)
  const sort_order = inIter.length === 0 ? 0 : Math.max(...inIter.map((x) => x.sort_order), 0) + 1
  const row: PlanningStory = {
    id: nextId('story'),
    iteration_id: iterationId,
    title: body.title,
    acceptance_criteria: body.acceptance_criteria?.length ? body.acceptance_criteria : ['待补充'],
    requirement_ref: body.requirement_ref ?? '',
    priority: body.priority ?? 2,
    sort_order,
    notes: body.notes ?? '',
    created_at: t0,
    updated_at: t0,
  }
  s.stories.push(row)
  return { ok: true as const, data: row }
}

export function patchPlanningStory(projectId: string, storyId: string, patch: PlanningStoryPatchBody) {
  const s = ensureState(projectId)
  const row = s.stories.find((x) => x.id === storyId)
  if (!row) return { ok: false as const, message: 'Story 不存在' }
  if (patch.title !== undefined) row.title = patch.title
  if (patch.acceptance_criteria !== undefined) row.acceptance_criteria = patch.acceptance_criteria
  if (patch.requirement_ref !== undefined) row.requirement_ref = patch.requirement_ref
  if (patch.priority !== undefined) row.priority = patch.priority
  if (patch.sort_order !== undefined) row.sort_order = patch.sort_order
  if (patch.notes !== undefined) row.notes = patch.notes
  row.updated_at = nowIso()
  return { ok: true as const, data: row }
}

export function deletePlanningStory(projectId: string, storyId: string) {
  const s = ensureState(projectId)
  const idx = s.stories.findIndex((x) => x.id === storyId)
  if (idx < 0) return { ok: false as const, message: 'Story 不存在' }
  deleteAllStoryRequirementDocVersions(projectId, storyId)
  s.tasks = s.tasks.filter((t) => t.story_id !== storyId)
  s.stories.splice(idx, 1)
  return { ok: true as const }
}

export function reorderPlanningStories(projectId: string, iterationId: string, body: PlanningReorderBody) {
  const s = ensureState(projectId)
  const indexMap = new Map(body.ordered_ids.map((id, i) => [id, i]))
  for (const st of s.stories.filter((x) => x.iteration_id === iterationId)) {
    const i = indexMap.get(st.id)
    if (i !== undefined) st.sort_order = i
    st.updated_at = nowIso()
  }
  return { ok: true as const }
}

export function listPlanningTasksByStory(projectId: string, storyId: string) {
  const s = ensureState(projectId)
  return {
    items: s.tasks.filter((x) => x.story_id === storyId).sort((a, b) => a.sort_order - b.sort_order),
  }
}

export function listPlanningTasks(
  projectId: string,
  filters?: {
    iteration_id?: string
    story_id?: string
    api_endpoint_id?: string
    type_suggestion?: PlanningTaskTypeSuggestion
  },
) {
  const s = ensureState(projectId)
  let items = [...s.tasks]
  if (filters?.iteration_id) items = items.filter((t) => t.iteration_id === filters.iteration_id)
  if (filters?.story_id) items = items.filter((t) => t.story_id === filters.story_id)
  if (filters?.type_suggestion) items = items.filter((t) => t.type_suggestion === filters.type_suggestion)
  if (filters?.api_endpoint_id) {
    items = items.filter((t) => (t.linked_endpoint_ids || []).includes(filters.api_endpoint_id!))
  }
  items.sort((a, b) => {
    const ia = a.iteration_id.localeCompare(b.iteration_id)
    if (ia !== 0) return ia
    const sa = a.story_id.localeCompare(b.story_id)
    if (sa !== 0) return sa
    return a.sort_order - b.sort_order
  })
  return { items }
}

export function getPlanningTask(projectId: string, taskId: string) {
  const s = ensureState(projectId)
  return s.tasks.find((x) => x.id === taskId) ?? null
}

export function createPlanningTask(projectId: string, storyId: string, body: PlanningTaskCreateBody) {
  const s = ensureState(projectId)
  const story = s.stories.find((x) => x.id === storyId)
  if (!story) return { ok: false as const, message: 'Story 不存在' }
  const t0 = nowIso()
  const inStory = s.tasks.filter((x) => x.story_id === storyId)
  const sort_order = inStory.length === 0 ? 0 : Math.max(...inStory.map((x) => x.sort_order), 0) + 1
  const row: PlanningTask = {
    id: nextId('task'),
    story_id: storyId,
    iteration_id: story.iteration_id,
    title: body.title,
    description: body.description ?? '',
    type_suggestion: body.type_suggestion as PlanningTaskTypeSuggestion,
    priority: body.priority ?? 2,
    sort_order,
    status: 'todo',
    assigned_user_id: null,
    linked_endpoint_ids: body.linked_endpoint_ids ? [...body.linked_endpoint_ids] : [],
    ai_batch_id: null,
    created_at: t0,
    updated_at: t0,
  }
  s.tasks.push(row)
  return { ok: true as const, data: row }
}

export function patchPlanningTask(projectId: string, taskId: string, patch: PlanningTaskPatchBody) {
  const s = ensureState(projectId)
  const row = s.tasks.find((x) => x.id === taskId)
  if (!row) return { ok: false as const, message: 'Task 不存在' }
  if (patch.title !== undefined) row.title = patch.title
  if (patch.description !== undefined) row.description = patch.description
  if (patch.type_suggestion !== undefined) row.type_suggestion = patch.type_suggestion
  if (patch.priority !== undefined) row.priority = patch.priority
  if (patch.sort_order !== undefined) row.sort_order = patch.sort_order
  if (patch.status !== undefined) row.status = patch.status as PlanningTaskStatus
  if (patch.assigned_user_id !== undefined) row.assigned_user_id = patch.assigned_user_id
  if (patch.linked_endpoint_ids !== undefined) row.linked_endpoint_ids = [...patch.linked_endpoint_ids]
  if (patch.ai_batch_id !== undefined) row.ai_batch_id = patch.ai_batch_id
  row.updated_at = nowIso()
  return { ok: true as const, data: row }
}

export function deletePlanningTask(projectId: string, taskId: string) {
  const s = ensureState(projectId)
  const idx = s.tasks.findIndex((x) => x.id === taskId)
  if (idx < 0) return { ok: false as const, message: 'Task 不存在' }
  s.tasks.splice(idx, 1)
  return { ok: true as const }
}

export function reorderPlanningTasks(projectId: string, storyId: string, body: PlanningReorderBody) {
  const s = ensureState(projectId)
  const indexMap = new Map(body.ordered_ids.map((id, i) => [id, i]))
  for (const t of s.tasks.filter((x) => x.story_id === storyId)) {
    const i = indexMap.get(t.id)
    if (i !== undefined) t.sort_order = i
    t.updated_at = nowIso()
  }
  return { ok: true as const }
}

/** 供 M02C 下拉：与契约 ApiCatalogTaskSummary 一致 */
export function listPlanningTaskSummaries(projectId: string): { items: ApiCatalogTaskSummary[] } {
  const s = ensureState(projectId)
  return {
    items: s.tasks.map((t) => ({ id: t.id, title: t.title })),
  }
}

/** 与需求模块 AI 拆分的 `normalizeModuleTitle` 一致：去首尾空白、合并空白、小写 */
function normalizePlanningTitle(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLowerCase()
}

/**
 * AI 迭代规划落库（Mock）。
 * - replace_all：清空迭代（级联 Story/Task）后按草案新建。
 * - incremental：按规范化名称匹配已有迭代/Story 则 **整字段覆盖**（PATCH），否则新建。
 */
export function applyIterationPlanningAi(
  projectId: string,
  mode: PlanningAiApplyMode,
  draft: { iterations: PlanningAiDraftIterationInput[]; stories: PlanningAiDraftStoryInput[] },
): { ok: true; result: PlanningAiApplyResultData } | { ok: false; message: string } {
  const s = ensureState(projectId)
  if (!draft.iterations.length) {
    return { ok: false, message: '草案至少需包含 1 个迭代。' }
  }

  if (mode === 'replace_all') {
    const ids = [...s.iterations.map((x) => x.id)]
    for (const id of ids) {
      deletePlanningIteration(projectId, id)
    }
  }

  const result: PlanningAiApplyResultData = {
    added_iteration_names: [],
    updated_iteration_names: [],
    added_story_titles: [],
    updated_story_titles: [],
    skipped_story_titles: [],
  }

  const iterIdByDraftIndex: string[] = []

  for (const it of draft.iterations) {
    const nameTrim = it.name.trim()
    const key = normalizePlanningTitle(nameTrim)
    if (!key) {
      return { ok: false, message: '草案中存在空的迭代名称，无法落库。' }
    }

    if (mode === 'incremental') {
      const existing = s.iterations.find((x) => normalizePlanningTitle(x.name) === key)
      if (existing) {
        const patch: PlanningIterationPatchBody = {
          name: nameTrim,
          goal_summary: it.goal_summary.trim(),
          scope_notes: (it.scope_notes ?? '').trim(),
          priority: it.priority ?? null,
        }
        if (it.sort_order !== undefined) patch.sort_order = it.sort_order
        patchPlanningIteration(projectId, existing.id, patch)
        iterIdByDraftIndex.push(existing.id)
        result.updated_iteration_names.push(nameTrim)
        continue
      }
    }

    const row = createPlanningIteration(projectId, {
      name: nameTrim,
      goal_summary: it.goal_summary.trim(),
      scope_notes: (it.scope_notes ?? '').trim(),
      priority: it.priority ?? undefined,
    })
    if (it.sort_order !== undefined) {
      patchPlanningIteration(projectId, row.id, { sort_order: it.sort_order })
    }
    iterIdByDraftIndex.push(row.id)
    result.added_iteration_names.push(row.name)
  }

  for (const st of draft.stories) {
    if (st.iteration_index < 0 || st.iteration_index >= iterIdByDraftIndex.length) {
      return { ok: false, message: `Story「${st.title}」的 iteration_index 无效。` }
    }
    const iterationId = iterIdByDraftIndex[st.iteration_index]!
    const rawTitle = st.title.trim()
    if (!rawTitle) {
      result.skipped_story_titles.push('（空标题草案已忽略）')
      continue
    }
    const titleKey = normalizePlanningTitle(rawTitle)
    const inIter = s.stories.filter((x) => x.iteration_id === iterationId)
    const existingStory = inIter.find((x) => normalizePlanningTitle(x.title) === titleKey)
    const ac = st.acceptance_criteria.map((x) => x.trim()).filter(Boolean)

    if (existingStory) {
      const sp: PlanningStoryPatchBody = {
        title: rawTitle,
        acceptance_criteria: ac.length ? ac : ['待补充'],
        requirement_ref: (st.requirement_ref ?? '').trim(),
        priority: st.priority ?? 2,
        notes: (st.notes ?? '').trim(),
      }
      if (st.sort_order !== undefined) sp.sort_order = st.sort_order
      const pr = patchPlanningStory(projectId, existingStory.id, sp)
      if (!pr.ok) return { ok: false, message: pr.message }
      result.updated_story_titles.push(rawTitle)
      continue
    }

    const r = createPlanningStory(projectId, iterationId, {
      title: rawTitle,
      acceptance_criteria: ac.length ? ac : ['待补充'],
      requirement_ref: (st.requirement_ref ?? '').trim(),
      priority: st.priority ?? 2,
      notes: (st.notes ?? '').trim(),
    })
    if (!r.ok) return { ok: false, message: r.message }
    if (st.sort_order !== undefined) {
      patchPlanningStory(projectId, r.data.id, { sort_order: st.sort_order })
    }
    result.added_story_titles.push(rawTitle)
  }

  return { ok: true, result }
}

export function syncTasksLinkedEndpointsForBinding(projectId: string, endpointId: string, nextTaskIds: string[]) {
  const s = ensureState(projectId)
  const want = new Set(nextTaskIds)
  for (const t of s.tasks) {
    const ids = new Set(t.linked_endpoint_ids || [])
    if (want.has(t.id)) ids.add(endpointId)
    else ids.delete(endpointId)
    const next = [...ids]
    const prevKey = [...(t.linked_endpoint_ids || [])].sort().join('\0')
    const nextKey = [...next].sort().join('\0')
    if (prevKey !== nextKey) {
      t.linked_endpoint_ids = next
      t.updated_at = nowIso()
    }
  }
}
