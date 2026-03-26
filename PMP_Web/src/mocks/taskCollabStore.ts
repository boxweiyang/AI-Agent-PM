import type {
  PlanningTaskAttachment,
  PlanningTaskAttachmentCreateBody,
  PlanningTaskComment,
  PlanningTaskCommentCreateBody,
  PlanningTaskTestSubmission,
  PlanningTaskTestSubmissionCreateBody,
} from '@/types/api-contract'

type TaskCollabState = {
  commentsByTask: Record<string, PlanningTaskComment[]>
  attachmentsByTask: Record<string, PlanningTaskAttachment[]>
  testSubmissionsByTask: Record<string, PlanningTaskTestSubmission[]>
}

const byProject = new Map<string, TaskCollabState>()

function nowIso() {
  return new Date().toISOString()
}

function nextId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function ensureState(projectId: string): TaskCollabState {
  if (!byProject.has(projectId)) {
    byProject.set(projectId, {
      commentsByTask: {},
      attachmentsByTask: {},
      testSubmissionsByTask: {},
    })
  }
  return byProject.get(projectId)!
}

function ensureTaskArrays(state: TaskCollabState, taskId: string) {
  if (!state.commentsByTask[taskId]) state.commentsByTask[taskId] = []
  if (!state.attachmentsByTask[taskId]) state.attachmentsByTask[taskId] = []
  if (!state.testSubmissionsByTask[taskId]) state.testSubmissionsByTask[taskId] = []
}

export function listTaskComments(projectId: string, taskId: string) {
  const s = ensureState(projectId)
  ensureTaskArrays(s, taskId)
  return { items: s.commentsByTask[taskId] }
}

export function createTaskComment(projectId: string, taskId: string, body: PlanningTaskCommentCreateBody) {
  const s = ensureState(projectId)
  ensureTaskArrays(s, taskId)
  const row: PlanningTaskComment = {
    id: nextId('tc'),
    task_id: taskId,
    content: (body.content || '').trim(),
    created_by: '当前用户（Mock）',
    created_at: nowIso(),
  }
  s.commentsByTask[taskId].push(row)
  return row
}

export function listTaskAttachments(projectId: string, taskId: string) {
  const s = ensureState(projectId)
  ensureTaskArrays(s, taskId)
  return { items: s.attachmentsByTask[taskId] }
}

export function createTaskAttachment(projectId: string, taskId: string, body: PlanningTaskAttachmentCreateBody) {
  const s = ensureState(projectId)
  ensureTaskArrays(s, taskId)
  const row: PlanningTaskAttachment = {
    id: nextId('ta'),
    task_id: taskId,
    name: (body.name || '').trim(),
    url: (body.url || '').trim(),
    created_by: '当前用户（Mock）',
    created_at: nowIso(),
  }
  s.attachmentsByTask[taskId].push(row)
  return row
}

export function listTaskTestSubmissions(projectId: string, taskId: string) {
  const s = ensureState(projectId)
  ensureTaskArrays(s, taskId)
  return { items: s.testSubmissionsByTask[taskId] }
}

export function createTaskTestSubmission(projectId: string, taskId: string, body: PlanningTaskTestSubmissionCreateBody) {
  const s = ensureState(projectId)
  ensureTaskArrays(s, taskId)
  const seq = s.testSubmissionsByTask[taskId].length + 1
  const row: PlanningTaskTestSubmission = {
    id: nextId('ts'),
    task_id: taskId,
    submission_no: `ST-${String(seq).padStart(3, '0')}`,
    status: 'pending',
    environment_notes: (body.environment_notes || '').trim(),
    test_notes: (body.test_notes || '').trim(),
    reject_reason: null,
    created_by: '当前用户（Mock）',
    created_at: nowIso(),
  }
  s.testSubmissionsByTask[taskId].push(row)
  return row
}

