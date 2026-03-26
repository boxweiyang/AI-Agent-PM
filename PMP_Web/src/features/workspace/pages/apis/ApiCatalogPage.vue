<template>
  <div class="api-page" v-loading="loading">
    <el-card shadow="never" class="api-card">
      <template #header>
        <div class="api-head">
          <div class="api-title-wrap">
            <span class="api-title">接口管理</span>
            <el-tag v-if="reqRef" size="small" type="info">{{ reqRef }}</el-tag>
          </div>
          <div class="api-actions">
            <el-select v-model="groupBy" style="width: 180px">
              <el-option label="按需求模块" value="requirement_module" />
              <el-option label="按交付部分" value="delivery_part" />
              <el-option label="按公共功能" value="common_group" />
            </el-select>
            <el-select v-model="statusFilter" style="width: 130px">
              <el-option label="全部状态" value="" />
              <el-option label="草稿" value="draft" />
              <el-option label="已评审" value="reviewed" />
              <el-option label="已冻结" value="frozen" />
              <el-option label="已废弃" value="deprecated" />
            </el-select>
            <el-input v-model="keyword" style="width: 220px" placeholder="搜索 路径/名称/说明" clearable />
            <el-button @click="openLatestResult">最新生成结果</el-button>
            <el-button @click="openCreate">新增接口</el-button>
            <el-button type="primary" @click="openAiGenerate">AI 生成接口清单</el-button>
          </div>
        </div>
      </template>

      <el-card shadow="never" class="constraint-card">
        <template #header>
          <div class="constraint-head">
            <span>通用接口约束</span>
            <div class="constraint-actions">
              <el-button size="small" type="primary" plain :disabled="selectedConstraintRows.length !== 2" @click="openConstraintDiff">
                对比选中版本
              </el-button>
              <el-button size="small" @click="createConstraintVersion('from_latest')">基于最新版创建</el-button>
              <el-button size="small" @click="createConstraintVersion('empty')">新建空白版本</el-button>
              <el-button size="small" @click="onAiConstraint">AI 生成新版本</el-button>
            </div>
          </div>
        </template>
        <p class="constraint-preview">参考需求文档交互：版本化管理、两两对比、最新可编辑。</p>
        <el-table :data="constraintVersions.items" row-key="id" size="small" @selection-change="onConstraintSelectionChange">
          <el-table-column type="selection" width="44" :selectable="constraintRowSelectable" />
          <el-table-column label="版本" width="72"><template #default="{ row }">v{{ row.version_no }}</template></el-table-column>
          <el-table-column prop="created_at" label="创建时间" width="180"><template #default="{ row }">{{ formatTime(row.created_at) }}</template></el-table-column>
          <el-table-column prop="preview" label="摘要" min-width="180" show-overflow-tooltip />
          <el-table-column label="标记" width="72">
            <template #default="{ row }"><el-tag v-if="row.id === constraintVersions.latest_version_id" size="small" type="success">最新</el-tag></template>
          </el-table-column>
          <el-table-column label="操作" width="160" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link @click="openConstraintVersion(row.id)">打开</el-button>
              <el-button type="danger" link @click="removeConstraintVersion(row.id, row.version_no)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-collapse>
        <el-collapse-item v-for="g in grouped" :key="g.name" :title="`${g.name}（${g.items.length}）`" :name="g.name">
          <el-table :data="g.items" row-key="id" size="small">
            <el-table-column type="expand" width="40">
              <template #default="{ row }">
                <div class="api-expand">
                  <p class="api-expand-title">详细接口说明</p>
                  <p class="api-detail-text">{{ row.detail_description?.trim() || row.summary || '暂无详细说明' }}</p>
                  <p class="api-expand-title">请求参数</p>
                  <el-table :data="row.request_params || []" size="small" border>
                    <el-table-column prop="name" label="参数名" min-width="120" />
                    <el-table-column prop="in" label="位置" width="90" />
                    <el-table-column prop="type" label="类型" width="100" />
                    <el-table-column label="必填" width="80"><template #default="{ row: p }">{{ p.required ? '是' : '否' }}</template></el-table-column>
                    <el-table-column prop="description" label="说明" min-width="180" />
                  </el-table>
                  <p class="api-expand-title">成功返回参数</p>
                  <el-table :data="row.response_success_params || []" size="small" border>
                    <el-table-column prop="name" label="字段名" min-width="120" />
                    <el-table-column prop="type" label="类型" width="100" />
                    <el-table-column prop="description" label="说明" min-width="180" />
                  </el-table>
                  <p class="api-expand-title">错误返回参数</p>
                  <el-table :data="row.response_error_params || []" size="small" border>
                    <el-table-column prop="name" label="字段名" min-width="120" />
                    <el-table-column prop="type" label="类型" width="100" />
                    <el-table-column prop="description" label="说明" min-width="180" />
                  </el-table>
                  <p class="api-expand-title">已绑定 Task</p>
                  <el-space wrap>
                    <el-tag v-for="tid in row.bound_task_ids || []" :key="tid" size="small">
                      {{ taskTitleMap[tid] || tid }}
                    </el-tag>
                    <span v-if="!(row.bound_task_ids || []).length" class="constraint-preview">暂无绑定</span>
                  </el-space>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="method" label="方法" width="88">
              <template #default="{ row }"><el-tag :type="methodTagType(row.method)" size="small">{{ row.method }}</el-tag></template>
            </el-table-column>
            <el-table-column prop="path" label="地址" min-width="260" show-overflow-tooltip />
            <el-table-column prop="summary" label="说明" min-width="180" show-overflow-tooltip />
            <el-table-column label="详细说明（简略）" min-width="260" show-overflow-tooltip>
              <template #default="{ row }">
                <span class="detail-brief">{{ row.detail_description?.trim() || row.summary || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="联动状态" width="320">
              <template #default="{ row }">
                <el-space wrap>
                  <el-tag v-if="row.fe_status === 'done'" type="success" size="small">前端已对接</el-tag>
                  <el-tag v-if="row.be_status === 'done'" type="success" size="small">后端已实现</el-tag>
                  <el-tag v-if="row.qa_status === 'done'" type="success" size="small">测试已完成</el-tag>
                  <el-tag v-if="row.fe_status !== 'done' && row.be_status !== 'done' && row.qa_status !== 'done'" size="small">待推进</el-tag>
                </el-space>
              </template>
            </el-table-column>
            <el-table-column label="绑定Task" width="100">
              <template #default="{ row }">
                <el-tag size="small" type="info">{{ (row.bound_task_ids || []).length }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="160" fixed="right">
              <template #default="{ row }">
                <el-dropdown trigger="click" @command="onEndpointActionCommand(row, $event)">
                  <el-button text class="action-more-btn" title="更多操作">
                    <el-icon><MoreFilled /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="edit">编辑</el-dropdown-item>
                      <el-dropdown-item command="bind">绑定Task</el-dropdown-item>
                      <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </template>
            </el-table-column>
          </el-table>
        </el-collapse-item>
      </el-collapse>
    </el-card>

    <DiffDialog
      v-model="constraintDiffVisible"
      title="约束版本差异"
      read-only
      :old-text="constraintDiffOldText"
      :new-text="constraintDiffNewText"
      :left-header="constraintDiffLeftHeader"
      :right-header="constraintDiffRightHeader"
    />

    <el-dialog v-model="editDialog" :title="editingId ? '编辑接口' : '新增接口'" width="900px" class="pmp-viewport-dialog">
      <el-form label-width="100px">
        <el-form-item label="接口名"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="方法/地址">
          <div class="line">
            <el-select v-model="form.method" style="width: 130px"><el-option v-for="m in METHODS" :key="m" :label="m" :value="m" /></el-select>
            <el-input v-model="form.path" placeholder="/api/v1/..." />
          </div>
        </el-form-item>
        <el-form-item label="功能说明"><el-input v-model="form.summary" /></el-form-item>
        <el-form-item label="详细说明">
          <el-input v-model="form.detail_description" type="textarea" :rows="4" placeholder="补充接口业务语义、调用时机、边界规则、幂等/权限/错误处理等" />
        </el-form-item>
        <el-form-item label="需求模块"><el-input v-model="form.group_refs.requirement_module" /></el-form-item>
        <el-form-item label="交付部分"><el-input v-model="form.group_refs.delivery_part" /></el-form-item>
        <el-form-item label="公共分组"><el-input v-model="form.group_refs.common_group" /></el-form-item>
        <el-form-item label="接口状态">
          <el-select v-model="form.status" style="width: 200px">
            <el-option label="草稿" value="draft" />
            <el-option label="已评审" value="reviewed" />
            <el-option label="已冻结" value="frozen" />
            <el-option label="已废弃" value="deprecated" />
          </el-select>
        </el-form-item>
        <el-form-item label="入参">
          <div class="param-mode-row">
            <el-radio-group v-model="requestParamMode">
              <el-radio value="form">表单</el-radio>
              <el-radio value="json">JSON</el-radio>
            </el-radio-group>
          </div>

          <div v-if="requestParamMode === 'form'" class="param-editor">
            <div v-for="(p, idx) in form.request_params" :key="`req-${idx}`" class="param-row">
              <el-input v-model="p.name" placeholder="参数名" />
              <el-select v-model="p.in" style="width: 110px">
                <el-option label="path" value="path" />
                <el-option label="query" value="query" />
                <el-option label="header" value="header" />
                <el-option label="body" value="body" />
              </el-select>
              <el-input v-model="p.type" placeholder="类型" />
              <el-switch v-model="p.required" active-text="必填" />
              <el-input v-model="p.description" placeholder="说明" />
              <el-button type="danger" link @click="form.request_params.splice(idx, 1)">删除</el-button>
            </div>
            <el-button @click="form.request_params.push({ name: '', in: 'query', type: 'string', required: false, description: '' })">
              新增入参
            </el-button>
          </div>

          <div v-else class="json-editor">
            <el-input
              v-model="requestParamsJson"
              type="textarea"
              :rows="6"
              placeholder="入参 JSON（数组）。示例：[{name,in,type,required,description}]"
            />
          </div>
        </el-form-item>

        <el-form-item label="返回出参">
          <div class="param-mode-row">
            <el-radio-group v-model="responseParamMode">
              <el-radio value="form">表单</el-radio>
              <el-radio value="json">JSON</el-radio>
            </el-radio-group>
          </div>

          <div v-if="responseParamMode === 'form'" class="param-editor">
            <div v-for="(p, idx) in form.response_success_params" :key="`ret-${idx}`" class="param-row">
              <el-input v-model="p.name" placeholder="字段名" />
              <el-input v-model="p.type" placeholder="类型" />
              <el-input v-model="p.description" placeholder="说明" />
              <el-button type="danger" link @click="form.response_success_params.splice(idx, 1)">删除</el-button>
            </div>
            <el-button @click="form.response_success_params.push({ name: '', type: 'string', description: '' })">
              新增返回字段
            </el-button>
          </div>

          <div v-else class="json-editor">
            <el-input
              v-model="responseParamsJson"
              type="textarea"
              :rows="6"
              placeholder="返回出参 JSON（数组）。示例：[{name,type,description}]"
            />
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="edit-footer-wrap">
          <el-button type="primary" plain @click="openDevPrompt">一键生成提示词</el-button>
          <div class="edit-footer-actions">
            <el-button @click="editDialog = false">取消</el-button>
            <el-button type="primary" @click="saveEndpoint">保存</el-button>
          </div>
        </div>
      </template>
    </el-dialog>

    <el-dialog v-model="devPromptDialogVisible" title="开发提示词（可粘贴到 AI IDE）" width="720px" class="pmp-viewport-dialog" destroy-on-close>
      <el-input v-model="devPromptText" type="textarea" :rows="22" readonly class="dev-prompt-textarea" />
      <template #footer>
        <el-button @click="devPromptDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="copyDevPrompt">复制全文</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="aiDialog" title="AI 生成接口清单" width="420px">
      <el-radio-group v-model="aiMode">
        <el-radio label="incremental">增量新增</el-radio>
        <el-radio label="full_replace">全量覆盖</el-radio>
      </el-radio-group>
      <template #footer>
        <el-button @click="aiDialog = false">取消</el-button>
        <el-button type="primary" @click="runAiGenerate">开始生成</el-button>
      </template>
    </el-dialog>
    <AiCompletionSummaryDialog
      v-model="generateResultDialog"
      title="接口清单生成结果"
      :rows="aiGenerateSummaryRows"
    />
    <el-dialog v-model="taskBindDialog" title="绑定Task" width="560px">
      <p class="constraint-preview">当前接口：{{ bindingEndpointTitle }}</p>
      <el-select v-model="selectedTaskIds" multiple style="width: 100%" placeholder="选择一个或多个Task">
        <el-option v-for="t in taskOptions" :key="t.id" :label="t.title" :value="t.id" />
      </el-select>
      <template #footer>
        <el-button @click="goTaskPage">去 Task 页面</el-button>
        <el-button @click="taskBindDialog = false">取消</el-button>
        <el-button type="primary" @click="saveTaskBinding">保存绑定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { MoreFilled } from '@element-plus/icons-vue'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiClient } from '@/api/client'
import AiCompletionSummaryDialog from '@/components/AiCompletionSummaryDialog'
import type { AiCompletionSummaryRow } from '@/components/AiCompletionSummaryDialog'
import DiffDialog from '@/components/DiffDialog'
import type { ApiCatalogAiGenerateMode, ApiCatalogConstraint, ApiCatalogConstraintVersionListData, ApiCatalogConstraintVersionListItem, ApiCatalogEndpoint, ApiCatalogTaskSummary, ApiEnvelope, ApiHttpMethod } from '@/types/api-contract'

const route = useRoute()
const router = useRouter()
const projectId = computed(() => (typeof route.params.projectId === 'string' ? route.params.projectId : ''))
const reqRef = computed(() => (route.meta.reqRef as string) ?? '')
const loading = ref(false)
const groupBy = ref<'requirement_module' | 'delivery_part' | 'common_group'>('requirement_module')
const METHODS: ApiHttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
const keyword = ref('')
const statusFilter = ref<'draft' | 'reviewed' | 'frozen' | 'deprecated' | ''>('')
const endpoints = ref<ApiCatalogEndpoint[]>([])
const constraintVersions = ref<ApiCatalogConstraintVersionListData>({ items: [], latest_version_id: null })
const selectedConstraintRows = ref<ApiCatalogConstraintVersionListItem[]>([])
const constraintDiffVisible = ref(false)
const constraintDiffOldText = ref('')
const constraintDiffNewText = ref('')
const constraintDiffLeftHeader = ref('')
const constraintDiffRightHeader = ref('')
const editDialog = ref(false)
const editingId = ref('')
const form = ref<ApiCatalogEndpoint>({ id: '', name: '', method: 'GET', path: '', summary: '', status: 'draft', group_refs: {}, request_params: [], response_success_params: [], response_error_params: [], fe_status: 'todo', be_status: 'todo', qa_status: 'todo', updated_at: '' })
const aiDialog = ref(false); const aiMode = ref<ApiCatalogAiGenerateMode>('incremental')

type ParamEditMode = 'form' | 'json'
const requestParamMode = ref<ParamEditMode>('form')
const responseParamMode = ref<ParamEditMode>('form')
const requestParamsJson = ref('')
const responseParamsJson = ref('')
const devPromptDialogVisible = ref(false)
const devPromptText = ref('')

const taskBindDialog = ref(false)
const taskOptions = ref<ApiCatalogTaskSummary[]>([])
const bindingEndpointId = ref('')
const bindingEndpointTitle = ref('')
const selectedTaskIds = ref<string[]>([])
const generateResultDialog = ref(false)
const latestGenerateResult = ref<{
  mode: ApiCatalogAiGenerateMode
  added: number
  skipped: number
  total_after: number
  constraint_version: string
  generated_at: string
}>({
  mode: 'incremental',
  added: 0,
  skipped: 0,
  total_after: 0,
  constraint_version: '-',
  generated_at: '',
})
const taskTitleMap = computed<Record<string, string>>(() => {
  const m: Record<string, string> = {}
  taskOptions.value.forEach((t) => {
    m[t.id] = t.title
  })
  return m
})

const aiGenerateSummaryRows = computed<AiCompletionSummaryRow[]>(() => {
  const r = latestGenerateResult.value
  return [
    { label: '生成模式', value: r.mode === 'full_replace' ? '全量覆盖' : '增量新增' },
    { label: '本次新增', value: String(r.added) },
    { label: '本次跳过', value: String(r.skipped) },
    { label: '生成后总数', value: String(r.total_after) },
    { label: '约束版本', value: r.constraint_version },
    { label: '生成时间', value: r.generated_at ? formatTime(r.generated_at) : '—' },
  ]
})

const grouped = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  const map = new Map<string, ApiCatalogEndpoint[]>()
  endpoints.value
    .filter((e) => {
      if (statusFilter.value && e.status !== statusFilter.value) return false
      if (!kw) return true
      return [e.name, e.path, e.summary].some((s) => (s || '').toLowerCase().includes(kw))
    })
    .forEach((e) => {
    const k = e.group_refs[groupBy.value] || '未分组'
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(e)
  })
  return [...map.entries()].map(([name, items]) => ({ name, items }))
})

function methodTagType(m: ApiHttpMethod) { return m === 'GET' ? 'success' : m === 'POST' ? 'primary' : m === 'DELETE' ? 'danger' : 'warning' }
function formatTime(iso: string) { try { return new Date(iso).toLocaleString() } catch { return iso } }

async function fetchAll() {
  if (!projectId.value) return
  loading.value = true
  try {
    const [c, e, t] = await Promise.all([
      apiClient.get<ApiEnvelope<ApiCatalogConstraintVersionListData>>(`/api/v1/projects/${projectId.value}/api-catalog/constraints/versions`),
      apiClient.get<ApiEnvelope<{ items: ApiCatalogEndpoint[] }>>(`/api/v1/projects/${projectId.value}/api-catalog/endpoints`),
      apiClient.get<ApiEnvelope<{ items: ApiCatalogTaskSummary[] }>>(`/api/v1/projects/${projectId.value}/api-catalog/tasks`),
    ])
    constraintVersions.value = c.data.data ?? { items: [], latest_version_id: null }
    endpoints.value = e.data.data?.items ?? []
    taskOptions.value = t.data.data?.items ?? []
  } finally { loading.value = false }
}
watch(
  projectId,
  () => {
    void fetchAll()
  },
  { immediate: true },
)

function constraintRowSelectable(row: ApiCatalogConstraintVersionListItem) {
  return selectedConstraintRows.value.length < 2 || selectedConstraintRows.value.some((x) => x.id === row.id)
}
function onConstraintSelectionChange(rows: ApiCatalogConstraintVersionListItem[]) { selectedConstraintRows.value = rows }
async function loadConstraintVersion(versionId: string) {
  if (!projectId.value) return
  await router.push({
    name: 'project-m02c-apis-constraint-version',
    params: { projectId: projectId.value, versionId },
  })
}
function onAiConstraint() { if (!projectId.value) return; void apiClient.post(`/api/v1/projects/${projectId.value}/api-catalog/constraints/ai-generate`).then(() => fetchAll()) }
function openConstraintVersion(versionId?: string) {
  const vid = versionId || constraintVersions.value.latest_version_id
  if (!vid) {
    ElMessage.info('暂无约束版本')
    return
  }
  void loadConstraintVersion(vid)
}
async function createConstraintVersion(mode: 'empty' | 'from_latest') {
  if (!projectId.value) return
  await apiClient.post(`/api/v1/projects/${projectId.value}/api-catalog/constraints/versions`, { mode })
  await fetchAll()
}
async function removeConstraintVersion(versionId: string, versionNo: number) {
  if (!projectId.value) return
  try {
    await ElMessageBox.confirm(`确定删除约束版本 v${versionNo}？`, '删除版本', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' })
  } catch {
    return
  }
  await apiClient.delete(`/api/v1/projects/${projectId.value}/api-catalog/constraints/versions/${versionId}`)
  await fetchAll()
}
async function openConstraintDiff() {
  if (!projectId.value || selectedConstraintRows.value.length !== 2) return
  const [older, newer] = [...selectedConstraintRows.value].sort((a, b) => a.version_no - b.version_no)
  const [left, right] = await Promise.all([
    apiClient.get<ApiEnvelope<ApiCatalogConstraint>>(`/api/v1/projects/${projectId.value}/api-catalog/constraints/versions/${older.id}`),
    apiClient.get<ApiEnvelope<ApiCatalogConstraint>>(`/api/v1/projects/${projectId.value}/api-catalog/constraints/versions/${newer.id}`),
  ])
  const toDiffText = (d: ApiCatalogConstraint | undefined) => {
    if (!d) return ''
    return [
      `# ${d.title}`,
      '',
      d.content_markdown,
      '',
      '## 响应 JSON',
      d.response_schema_json,
      '',
      '## 错误码字典',
      ...(d.error_codes || []).map((x) => `- ${x.code}: ${x.meaning}`),
    ].join('\n')
  }
  constraintDiffOldText.value = toDiffText(left.data.data)
  constraintDiffNewText.value = toDiffText(right.data.data)
  constraintDiffLeftHeader.value = `v${older.version_no} · ${formatTime(older.created_at)}`
  constraintDiffRightHeader.value = `v${newer.version_no} · ${formatTime(newer.created_at)}`
  constraintDiffVisible.value = true
}
function openAiGenerate() { aiDialog.value = true }
async function runAiGenerate() {
  if (!projectId.value) return
  const { data } = await apiClient.post<ApiEnvelope<typeof latestGenerateResult.value>>(
    `/api/v1/projects/${projectId.value}/api-catalog/endpoints/ai-generate`,
    { mode: aiMode.value },
  )
  if (data.data) {
    latestGenerateResult.value = data.data
    generateResultDialog.value = true
  }
  aiDialog.value = false
  ElMessage.success('生成完成')
  await fetchAll()
}
async function openLatestResult() {
  if (!projectId.value) return
  try {
    const { data } = await apiClient.get<ApiEnvelope<typeof latestGenerateResult.value>>(
      `/api/v1/projects/${projectId.value}/api-catalog/endpoints/ai-generate/latest`,
    )
    if (data.data) {
      latestGenerateResult.value = data.data
      generateResultDialog.value = true
    }
  } catch {
    ElMessage.info('暂无生成记录')
  }
}
function openCreate() {
  editingId.value = ''
  form.value = {
    id: '',
    name: '',
    method: 'GET',
    path: '',
    summary: '',
    detail_description: '',
    status: 'draft',
    group_refs: {},
    request_params: [],
    response_success_params: [],
    response_error_params: [],
    fe_status: 'todo',
    be_status: 'todo',
    qa_status: 'todo',
    updated_at: '',
  }
  requestParamMode.value = 'form'
  responseParamMode.value = 'form'
  requestParamsJson.value = JSON.stringify(form.value.request_params ?? [], null, 2)
  responseParamsJson.value = JSON.stringify(form.value.response_success_params ?? [], null, 2)
  editDialog.value = true
}

function openEdit(row: ApiCatalogEndpoint) {
  editingId.value = row.id
  // UI 将“成功/错误”合并为“返回出参”；在保存时统一落到 response_success_params，response_error_params 置空。
  const returnParams = [...(row.response_success_params || []), ...(row.response_error_params || [])]
  form.value = {
    ...row,
    group_refs: { ...(row.group_refs || {}) },
    request_params: [...(row.request_params || [])],
    response_success_params: returnParams,
    response_error_params: [],
  }
  requestParamMode.value = 'form'
  responseParamMode.value = 'form'
  requestParamsJson.value = JSON.stringify(form.value.request_params ?? [], null, 2)
  responseParamsJson.value = JSON.stringify(form.value.response_success_params ?? [], null, 2)
  editDialog.value = true
}

function parseJsonToArray<T>(raw: string): T[] | null {
  try {
    const v = JSON.parse(raw)
    return Array.isArray(v) ? (v as T[]) : null
  } catch {
    return null
  }
}

watch(requestParamMode, (mode) => {
  if (mode === 'json') {
    requestParamsJson.value = JSON.stringify(form.value.request_params ?? [], null, 2)
    return
  }
  // mode === 'form'：切回表单前尝试解析 JSON，避免“JSON 编辑了但切回表单丢失”
  const parsed = parseJsonToArray<ApiCatalogEndpoint['request_params'][number]>(requestParamsJson.value)
  if (!parsed) {
    ElMessage.error('入参 JSON 格式错误：需要 JSON 数组')
    requestParamMode.value = 'json'
    return
  }
  form.value.request_params = parsed
})

watch(responseParamMode, (mode) => {
  if (mode === 'json') {
    responseParamsJson.value = JSON.stringify(form.value.response_success_params ?? [], null, 2)
    return
  }
  const parsed = parseJsonToArray<ApiCatalogEndpoint['response_success_params'][number]>(responseParamsJson.value)
  if (!parsed) {
    ElMessage.error('返回出参 JSON 格式错误：需要 JSON 数组')
    responseParamMode.value = 'json'
    return
  }
  form.value.response_success_params = parsed
})

/** 与保存前一致：把 JSON 编辑区解析进 form，供保存与生成提示词共用 */
function syncParamsFromEditorsToForm(): boolean {
  if (requestParamMode.value === 'json') {
    const parsed = parseJsonToArray<ApiCatalogEndpoint['request_params'][number]>(requestParamsJson.value)
    if (!parsed) {
      ElMessage.error('入参 JSON 格式错误：需要 JSON 数组')
      return false
    }
    form.value.request_params = parsed
  }
  if (responseParamMode.value === 'json') {
    const parsed = parseJsonToArray<ApiCatalogEndpoint['response_success_params'][number]>(responseParamsJson.value)
    if (!parsed) {
      ElMessage.error('返回出参 JSON 格式错误：需要 JSON 数组')
      return false
    }
    form.value.response_success_params = parsed
  }
  return true
}

function endpointStatusLabel(s: ApiCatalogEndpoint['status']) {
  const map: Record<string, string> = {
    draft: '草稿',
    reviewed: '已评审',
    frozen: '已冻结',
    deprecated: '已废弃',
  }
  return map[s] ?? s
}

function buildDevPrompt(): string {
  const f = form.value
  const gr = f.group_refs || {}
  const taskLines = (f.bound_task_ids || [])
    .map((id) => `- ${taskTitleMap.value[id] || id}`)
  const reqPretty = JSON.stringify(f.request_params ?? [], null, 2)
  const resPretty = JSON.stringify(f.response_success_params ?? [], null, 2)

  return [
    '你是一名熟悉本技术栈的后端/全栈工程师。请根据以下「接口规格」在现有项目中实现该 HTTP 接口（或补全 handler / 路由 / 校验 / 序列化）。',
    '',
    '## 项目上下文',
    `- 项目 ID（路由参数）：${projectId.value || '（当前未解析到 projectId）'}`,
    '',
    '## 接口标识',
    `- 接口名称：${f.name?.trim() || '（未填写）'}`,
    `- HTTP 方法：${f.method}`,
    `- 路径：${f.path?.trim() || '（未填写）'}`,
    `- 功能说明：${f.summary?.trim() || '—'}`,
    `- 文档状态：${endpointStatusLabel(f.status)}`,
    '',
    '## 归属与分组（便于定位代码目录/模块边界）',
    `- 需求模块：${(gr.requirement_module as string | undefined)?.trim() || '—'}`,
    `- 交付部分：${(gr.delivery_part as string | undefined)?.trim() || '—'}`,
    `- 公共分组：${(gr.common_group as string | undefined)?.trim() || '—'}`,
    '',
    '## 详细说明（业务语义、调用时机、边界条件）',
    f.detail_description?.trim() || '（未填写：请结合功能说明与参数表推断合理行为，并在实现前与产品/接口约定确认。）',
    '',
    '## 请求入参',
    '以下为约定字段（name / in / type / required / description）；实现时请按 in 区分 path、query、header、body，并做类型与必填校验。',
    '```json',
    reqPretty,
    '```',
    '',
    '## 返回出参（成功响应体字段约定）',
    '以下为响应 JSON 中应包含或对外暴露的字段（name / type / description）。若项目有统一 envelope（如 code/message/data），请把业务数据放在约定位置。',
    '```json',
    resPretty,
    '```',
    '',
    '## 关联 Task（若有，请与验收标准对齐）',
    taskLines.length ? taskLines.join('\n') : '— 当前未绑定 Task',
    '',
    '## 实现时请一并考虑',
    '- **鉴权与权限**：该接口应对哪些角色/租户开放；是否需要登录态、项目成员校验等。',
    '- **错误与 HTTP 状态码**：参数校验失败、业务规则不满足、下游失败时，使用项目统一的错误响应结构；必要时补充文档中的错误码说明。',
    '- **幂等与并发**：若涉及创建/扣款/发通知等副作用，说明是否要求幂等键或去重策略。',
    '- **性能与安全**：分页/限流/敏感字段脱敏/SQL 注入与 XSS 防护等按项目规范处理。',
    '- **可测试性**：补充或更新最小单测、契约测试或接口快照，便于回归。',
    '',
    '请先简要说明你将修改或新增的文件与主要步骤，再给出实现代码。',
  ].join('\n')
}

function openDevPrompt() {
  if (!syncParamsFromEditorsToForm()) return
  devPromptText.value = buildDevPrompt()
  devPromptDialogVisible.value = true
}

async function copyDevPrompt() {
  const text = devPromptText.value
  if (!text) {
    ElMessage.warning('没有可复制的内容')
    return
  }
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败，请手动全选复制')
  }
}

async function saveEndpoint() {
  if (!projectId.value) return

  if (!syncParamsFromEditorsToForm()) return

  // UI 不再区分成功/错误：保存时统一回写到 response_success_params，清空 response_error_params
  form.value.response_error_params = []

  if (editingId.value)
    await apiClient.patch(`/api/v1/projects/${projectId.value}/api-catalog/endpoints/${editingId.value}`, form.value)
  else
    await apiClient.post(`/api/v1/projects/${projectId.value}/api-catalog/endpoints`, form.value)

  editDialog.value = false
  await fetchAll()
}
async function removeEndpoint(id: string) { if (!projectId.value) return; await apiClient.delete(`/api/v1/projects/${projectId.value}/api-catalog/endpoints/${id}`); await fetchAll() }
function onEndpointActionCommand(row: ApiCatalogEndpoint, command: string | number) {
  const cmd = String(command)
  if (cmd === 'edit') {
    openEdit(row)
    return
  }
  if (cmd === 'bind') {
    void bindTask(row)
    return
  }
  if (cmd === 'delete') {
    void removeEndpoint(row.id)
  }
}
async function bindTask(row: ApiCatalogEndpoint) {
  if (!projectId.value) return
  const { data } = await apiClient.get<ApiEnvelope<{ items: ApiCatalogTaskSummary[] }>>(`/api/v1/projects/${projectId.value}/api-catalog/tasks`)
  taskOptions.value = data.data?.items ?? []
  bindingEndpointId.value = row.id
  bindingEndpointTitle.value = `${row.method} ${row.path}`
  selectedTaskIds.value = [...(row.bound_task_ids || [])]
  taskBindDialog.value = true
}
async function saveTaskBinding() {
  if (!projectId.value || !bindingEndpointId.value) return
  await apiClient.put(`/api/v1/projects/${projectId.value}/api-catalog/endpoints/${bindingEndpointId.value}/task-bindings`, { task_ids: selectedTaskIds.value })
  taskBindDialog.value = false
  await fetchAll()
}
function goTaskPage() {
  if (!projectId.value) return
  void router.push({
    name: 'project-m04-tasks',
    params: { projectId: projectId.value },
    query: { api_endpoint_id: bindingEndpointId.value || '' },
  })
}
</script>

<style scoped>
.api-page { width: 100%; min-width: 0; }
.api-card { width: 100%; }
.api-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.api-title-wrap { display: flex; align-items: center; gap: 10px; }
.api-title { font-size: 16px; font-weight: 600; }
.api-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.constraint-card { margin-bottom: 12px; }
.constraint-head { display: flex; align-items: center; justify-content: space-between; }
.constraint-preview { margin: 0; color: var(--el-text-color-secondary); }
.line { display: flex; width: 100%; gap: 8px; }
.param-editor { width: 100%; display: flex; flex-direction: column; gap: 8px; }
.param-row { display: grid; grid-template-columns: 1fr 120px 1fr 120px 1fr 60px; gap: 8px; align-items: center; }
.param-mode-row { margin-bottom: 8px; }
.json-editor { width: 100%; }
.api-expand { padding: 8px 12px; background: var(--el-fill-color-lighter); border-radius: 8px; }
.api-expand-title { margin: 8px 0; font-weight: 600; }
.action-more-btn {
  padding: 4px 8px;
  color: var(--el-text-color-regular);
}
.detail-brief {
  display: inline-block;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.api-detail-text {
  margin: 0 0 8px;
  line-height: 1.6;
  white-space: pre-wrap;
  color: var(--el-text-color-regular);
}
.edit-footer-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  flex-wrap: wrap;
}
.edit-footer-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}
.dev-prompt-textarea :deep(textarea) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.5;
}
</style>
