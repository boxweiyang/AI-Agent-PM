/**
 * 项目详情编辑：表单模型与 PATCH 载荷（REQ-M01 可编辑字段；度量字段不在此提交）。
 */
import type { ProjectPatchRequestBody, ProjectSummary } from '@/types/api-contract'

export type ProjectEditForm = {
  name: string
  status: string
  description: string
  introduction: string
  background: string
  plannedStartDay: string
  plannedEndDay: string
  technical_lead_name: string
  headcount_frontend: string
  headcount_backend: string
  headcount_qa: string
  stack_frontend: string
  stack_backend: string
  stack_database: string
  stack_middleware: string
  goalsText: string
  scope_in: string
  scope_out: string
  risk_notes: string
  manpower_stack_deferred: boolean
}

function isoToDay(iso?: string): string {
  if (!iso?.trim()) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function dayToIsoStart(day: string): string | undefined {
  const t = day.trim()
  if (!t) return undefined
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return `${t}T00:00:00+08:00`
  return undefined
}

function parseCount(s: string): number | undefined {
  const t = s.trim()
  if (!t) return undefined
  const n = Number.parseInt(t, 10)
  if (Number.isNaN(n) || n < 0) return undefined
  return n
}

export function emptyProjectEditForm(): ProjectEditForm {
  return {
    name: '',
    status: '立项流程中',
    description: '',
    introduction: '',
    background: '',
    plannedStartDay: '',
    plannedEndDay: '',
    technical_lead_name: '',
    headcount_frontend: '',
    headcount_backend: '',
    headcount_qa: '',
    stack_frontend: '',
    stack_backend: '',
    stack_database: '',
    stack_middleware: '',
    goalsText: '',
    scope_in: '',
    scope_out: '',
    risk_notes: '',
    manpower_stack_deferred: false,
  }
}

export function editFormFromProject(p: ProjectSummary): ProjectEditForm {
  return {
    name: p.name ?? '',
    status: p.status ?? '立项流程中',
    description: p.description ?? '',
    introduction: p.introduction ?? '',
    background: p.background ?? '',
    plannedStartDay: isoToDay(p.planned_start_at),
    plannedEndDay: isoToDay(p.planned_end_at),
    technical_lead_name: p.technical_lead_name ?? '',
    headcount_frontend: p.headcount_frontend != null ? String(p.headcount_frontend) : '',
    headcount_backend: p.headcount_backend != null ? String(p.headcount_backend) : '',
    headcount_qa: p.headcount_qa != null ? String(p.headcount_qa) : '',
    stack_frontend: p.stack_frontend ?? '',
    stack_backend: p.stack_backend ?? '',
    stack_database: p.stack_database ?? '',
    stack_middleware: p.stack_middleware ?? '',
    goalsText: p.goals?.length ? p.goals.join('\n') : '',
    scope_in: p.scope_in ?? '',
    scope_out: p.scope_out ?? '',
    risk_notes: p.risk_notes ?? '',
    manpower_stack_deferred: Boolean(p.manpower_stack_deferred),
  }
}

export function patchBodyFromEditForm(f: ProjectEditForm): ProjectPatchRequestBody {
  const goals = f.goalsText
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
  const body: ProjectPatchRequestBody = {
    name: f.name.trim(),
    status: f.status.trim(),
    description: f.description.trim() || undefined,
    introduction: f.introduction.trim() || undefined,
    background: f.background.trim() || undefined,
    planned_start_at: dayToIsoStart(f.plannedStartDay),
    planned_end_at: dayToIsoStart(f.plannedEndDay),
    technical_lead_name: f.technical_lead_name.trim() || undefined,
    headcount_frontend: parseCount(f.headcount_frontend),
    headcount_backend: parseCount(f.headcount_backend),
    headcount_qa: parseCount(f.headcount_qa),
    stack_frontend: f.stack_frontend.trim() || undefined,
    stack_backend: f.stack_backend.trim() || undefined,
    stack_database: f.stack_database.trim() || undefined,
    stack_middleware: f.stack_middleware.trim() || undefined,
    goals: goals.length ? goals : undefined,
    scope_in: f.scope_in.trim() || undefined,
    scope_out: f.scope_out.trim() || undefined,
    risk_notes: f.risk_notes.trim() || undefined,
    manpower_stack_deferred: f.manpower_stack_deferred,
  }
  return body
}
