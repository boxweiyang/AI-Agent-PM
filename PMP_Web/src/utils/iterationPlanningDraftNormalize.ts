/**
 * 迭代规划 AI 草案：invoke / 外置粘贴 JSON 的解析与 diff 文本（与契约 PlanningAiApplyBody 对齐）。
 */
import type {
  PlanningAiDraftIterationInput,
  PlanningAiDraftStoryInput,
  PlanningPriority,
} from '@/types/api-contract'

export type IterationPlanningDraftNormalized = {
  iterations: PlanningAiDraftIterationInput[]
  stories: PlanningAiDraftStoryInput[]
}

function stripJsonFence(raw: string): string {
  let t = raw.trim()
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/im
  const m = t.match(fence)
  if (m?.[1]) t = m[1].trim()
  return t
}

function asNonEmptyString(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  return s.length ? s : null
}

function asPriority(v: unknown): PlanningPriority | null | undefined {
  if (v === null || v === undefined) return v as null | undefined
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 4) return undefined
  return v as PlanningPriority
}

function normalizeIteration(x: unknown): PlanningAiDraftIterationInput | null {
  if (!x || typeof x !== 'object') return null
  const o = x as Record<string, unknown>
  const name = asNonEmptyString(o.name)
  const goal_summary = asNonEmptyString(o.goal_summary)
  if (!name || !goal_summary) return null
  const scope_notes = typeof o.scope_notes === 'string' ? o.scope_notes : ''
  const priority = asPriority(o.priority)
  const sort_order = typeof o.sort_order === 'number' && Number.isInteger(o.sort_order) ? o.sort_order : undefined
  return { name, goal_summary, scope_notes, priority: priority ?? null, sort_order }
}

function normalizeStory(x: unknown): PlanningAiDraftStoryInput | null {
  if (!x || typeof x !== 'object') return null
  const o = x as Record<string, unknown>
  const title = asNonEmptyString(o.title)
  if (!title) return null
  const idx = o.iteration_index
  if (typeof idx !== 'number' || !Number.isInteger(idx) || idx < 0) return null
  let acceptance_criteria: string[] = []
  if (Array.isArray(o.acceptance_criteria)) {
    acceptance_criteria = o.acceptance_criteria
      .map((a) => (typeof a === 'string' ? a.trim() : ''))
      .filter(Boolean)
  }
  const requirement_ref = typeof o.requirement_ref === 'string' ? o.requirement_ref : ''
  const priority = asPriority(o.priority)
  const sort_order = typeof o.sort_order === 'number' && Number.isInteger(o.sort_order) ? o.sort_order : undefined
  const notes = typeof o.notes === 'string' ? o.notes : ''
  return {
    iteration_index: idx,
    title,
    acceptance_criteria,
    requirement_ref,
    priority: priority ?? 2,
    sort_order,
    notes,
  }
}

export function normalizeIterationPlanningDraftFromUnknown(
  data: Record<string, unknown> | null | undefined,
): IterationPlanningDraftNormalized | null {
  if (!data) return null
  let iterationsRaw: unknown = data.iterations
  let storiesRaw: unknown = data.stories
  if (!Array.isArray(iterationsRaw) && data.draft && typeof data.draft === 'object') {
    const d = data.draft as Record<string, unknown>
    iterationsRaw = d.iterations
    storiesRaw = d.stories
  }
  if (!Array.isArray(iterationsRaw)) return null
  const iterations = iterationsRaw.map(normalizeIteration).filter(Boolean) as PlanningAiDraftIterationInput[]
  if (!iterations.length) return null
  const stories: PlanningAiDraftStoryInput[] = []
  if (Array.isArray(storiesRaw)) {
    for (const s of storiesRaw) {
      const row = normalizeStory(s)
      if (row) stories.push(row)
    }
  }
  return { iterations, stories }
}

export function parseIterationPlanningDraftExternalPaste(raw: string): IterationPlanningDraftNormalized | null {
  const t = stripJsonFence(raw)
  if (!t) return null
  try {
    const parsed = JSON.parse(t) as unknown
    if (Array.isArray(parsed)) return null
    if (!parsed || typeof parsed !== 'object') return null
    return normalizeIterationPlanningDraftFromUnknown(parsed as Record<string, unknown>)
  } catch {
    return null
  }
}

export function formatIterationPlanningDraftForDiff(draft: IterationPlanningDraftNormalized): string {
  const lines: string[] = []
  draft.iterations.forEach((it, i) => {
    lines.push(`## 迭代 ${i + 1}：${it.name}`)
    lines.push(`- 目标：${it.goal_summary}`)
    if (it.scope_notes?.trim()) lines.push(`- 范围：${it.scope_notes.trim()}`)
    if (it.priority != null) lines.push(`- 优先级：${it.priority}`)
    lines.push('')
  })
  lines.push('## Story')
  for (const st of draft.stories) {
    lines.push(`### [迭代#${st.iteration_index + 1}] ${st.title}`)
    const ac = st.acceptance_criteria.length ? st.acceptance_criteria.join('；') : '（无 AC）'
    lines.push(`- AC：${ac}`)
    if (st.requirement_ref?.trim()) lines.push(`- 关联需求：${st.requirement_ref.trim()}`)
    lines.push(`- 优先级：${st.priority ?? 2}`)
    if (st.notes?.trim()) lines.push(`- 备注：${st.notes.trim()}`)
    lines.push('')
  }
  return lines.join('\n').trim() || '（空草案）'
}
