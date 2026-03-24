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
            <el-button @click="openCreate">新增接口</el-button>
            <el-button type="primary" @click="openAiGenerate">AI 生成接口清单</el-button>
          </div>
        </div>
      </template>

      <el-card shadow="never" class="constraint-card">
        <template #header>
          <div class="constraint-head">
            <span>通用接口约束（{{ constraint.version || '-' }}）</span>
            <div class="constraint-actions">
              <el-button size="small" @click="onAiConstraint">AI 辅助</el-button>
              <el-button size="small" type="primary" @click="openConstraintDialog">查看/编辑</el-button>
            </div>
          </div>
        </template>
        <p class="constraint-preview">{{ constraint.title || '未设置' }}</p>
      </el-card>

      <el-collapse>
        <el-collapse-item v-for="g in grouped" :key="g.name" :title="`${g.name}（${g.items.length}）`" :name="g.name">
          <el-table :data="g.items" row-key="id" size="small">
            <el-table-column type="expand" width="40">
              <template #default="{ row }">
                <div class="api-expand">
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
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="method" label="方法" width="88">
              <template #default="{ row }"><el-tag :type="methodTagType(row.method)" size="small">{{ row.method }}</el-tag></template>
            </el-table-column>
            <el-table-column prop="path" label="地址" min-width="260" show-overflow-tooltip />
            <el-table-column prop="summary" label="说明" min-width="180" show-overflow-tooltip />
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
            <el-table-column label="操作" width="160" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link @click="openEdit(row)">编辑</el-button>
                <el-button type="warning" link @click="bindTask(row)">绑定Task</el-button>
                <el-button type="danger" link @click="removeEndpoint(row.id)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-collapse-item>
      </el-collapse>
    </el-card>

    <el-dialog v-model="constraintDialog" title="通用接口约束" width="760px">
      <el-form label-width="110px">
        <el-form-item label="版本"><el-input v-model="constraintForm.version" /></el-form-item>
        <el-form-item label="标题"><el-input v-model="constraintForm.title" /></el-form-item>
        <el-form-item label="约束说明"><el-input v-model="constraintForm.content_markdown" type="textarea" :rows="7" /></el-form-item>
        <el-form-item label="响应JSON"><el-input v-model="constraintForm.response_schema_json" type="textarea" :rows="6" /></el-form-item>
        <el-form-item label="错误码字典">
          <div class="param-editor">
            <div v-for="(row, idx) in constraintErrorCodes" :key="idx" class="param-row">
              <el-input v-model="row.code" placeholder="错误码" />
              <el-input v-model="row.meaning" placeholder="错误含义" />
              <el-button type="danger" link @click="constraintErrorCodes.splice(idx, 1)">删除</el-button>
            </div>
            <el-button @click="constraintErrorCodes.push({ code: '', meaning: '' })">新增错误码</el-button>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="constraintDialog = false">取消</el-button>
        <el-button type="primary" @click="saveConstraint">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="editDialog" :title="editingId ? '编辑接口' : '新增接口'" width="900px">
      <el-form label-width="100px">
        <el-form-item label="接口名"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="方法/地址">
          <div class="line">
            <el-select v-model="form.method" style="width: 130px"><el-option v-for="m in METHODS" :key="m" :label="m" :value="m" /></el-select>
            <el-input v-model="form.path" placeholder="/api/v1/..." />
          </div>
        </el-form-item>
        <el-form-item label="功能说明"><el-input v-model="form.summary" /></el-form-item>
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
          <div class="param-editor">
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
            <el-button @click="form.request_params.push({ name: '', in: 'query', type: 'string', required: false, description: '' })">新增入参</el-button>
          </div>
        </el-form-item>
        <el-form-item label="成功出参">
          <div class="param-editor">
            <div v-for="(p, idx) in form.response_success_params" :key="`ok-${idx}`" class="param-row">
              <el-input v-model="p.name" placeholder="字段名" />
              <el-input v-model="p.type" placeholder="类型" />
              <el-input v-model="p.description" placeholder="说明" />
              <el-button type="danger" link @click="form.response_success_params.splice(idx, 1)">删除</el-button>
            </div>
            <el-button @click="form.response_success_params.push({ name: '', type: 'string', description: '' })">新增成功字段</el-button>
          </div>
        </el-form-item>
        <el-form-item label="错误出参">
          <div class="param-editor">
            <div v-for="(p, idx) in form.response_error_params" :key="`err-${idx}`" class="param-row">
              <el-input v-model="p.name" placeholder="字段名" />
              <el-input v-model="p.type" placeholder="类型" />
              <el-input v-model="p.description" placeholder="说明" />
              <el-button type="danger" link @click="form.response_error_params.splice(idx, 1)">删除</el-button>
            </div>
            <el-button @click="form.response_error_params.push({ name: '', type: 'string', description: '' })">新增错误字段</el-button>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialog = false">取消</el-button>
        <el-button type="primary" @click="saveEndpoint">保存</el-button>
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
    <el-dialog v-model="taskBindDialog" title="绑定Task" width="560px">
      <p class="constraint-preview">当前接口：{{ bindingEndpointTitle }}</p>
      <el-select v-model="selectedTaskIds" multiple style="width: 100%" placeholder="选择一个或多个Task">
        <el-option v-for="t in taskOptions" :key="t.id" :label="t.title" :value="t.id" />
      </el-select>
      <template #footer>
        <el-button @click="taskBindDialog = false">取消</el-button>
        <el-button type="primary" @click="saveTaskBinding">保存绑定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { apiClient } from '@/api/client'
import type { ApiCatalogAiGenerateMode, ApiCatalogConstraint, ApiCatalogEndpoint, ApiCatalogTaskSummary, ApiEnvelope, ApiHttpMethod } from '@/types/api-contract'

const route = useRoute()
const projectId = computed(() => (typeof route.params.projectId === 'string' ? route.params.projectId : ''))
const reqRef = computed(() => (route.meta.reqRef as string) ?? '')
const loading = ref(false)
const groupBy = ref<'requirement_module' | 'delivery_part' | 'common_group'>('requirement_module')
const METHODS: ApiHttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
const keyword = ref('')
const statusFilter = ref<'draft' | 'reviewed' | 'frozen' | 'deprecated' | ''>('')
const constraint = ref<ApiCatalogConstraint>({ id: '', version: '', title: '', content_markdown: '', response_schema_json: '', error_codes: [], updated_at: '' })
const endpoints = ref<ApiCatalogEndpoint[]>([])
const constraintDialog = ref(false)
const constraintForm = ref({ version: '', title: '', content_markdown: '', response_schema_json: '' })
const constraintErrorCodes = ref<Array<{ code: string; meaning: string }>>([])
const editDialog = ref(false)
const editingId = ref('')
const form = ref<ApiCatalogEndpoint>({ id: '', name: '', method: 'GET', path: '', summary: '', status: 'draft', group_refs: {}, request_params: [], response_success_params: [], response_error_params: [], fe_status: 'todo', be_status: 'todo', qa_status: 'todo', updated_at: '' })
const aiDialog = ref(false); const aiMode = ref<ApiCatalogAiGenerateMode>('incremental')
const taskBindDialog = ref(false)
const taskOptions = ref<ApiCatalogTaskSummary[]>([])
const bindingEndpointId = ref('')
const bindingEndpointTitle = ref('')
const selectedTaskIds = ref<string[]>([])

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

async function fetchAll() {
  if (!projectId.value) return
  loading.value = true
  try {
    const [c, e] = await Promise.all([
      apiClient.get<ApiEnvelope<ApiCatalogConstraint>>(`/api/v1/projects/${projectId.value}/api-catalog/constraints`),
      apiClient.get<ApiEnvelope<{ items: ApiCatalogEndpoint[] }>>(`/api/v1/projects/${projectId.value}/api-catalog/endpoints`),
    ])
    constraint.value = c.data.data
    endpoints.value = e.data.data?.items ?? []
  } finally { loading.value = false }
}
watch(
  projectId,
  () => {
    void fetchAll()
  },
  { immediate: true },
)

function onAiConstraint() { if (!projectId.value) return; void apiClient.post(`/api/v1/projects/${projectId.value}/api-catalog/constraints/ai-generate`).then(() => fetchAll()) }
function openConstraintDialog() { constraintForm.value = { version: constraint.value.version || '', title: constraint.value.title || '', content_markdown: constraint.value.content_markdown || '', response_schema_json: constraint.value.response_schema_json || '' }; constraintErrorCodes.value = [...(constraint.value.error_codes || [])]; constraintDialog.value = true }
function openAiGenerate() { aiDialog.value = true }
async function runAiGenerate() { if (!projectId.value) return; await apiClient.post(`/api/v1/projects/${projectId.value}/api-catalog/endpoints/ai-generate`, { mode: aiMode.value }); aiDialog.value = false; ElMessage.success('生成完成'); await fetchAll() }
function openCreate() { editingId.value = ''; form.value = { id: '', name: '', method: 'GET', path: '', summary: '', status: 'draft', group_refs: {}, request_params: [], response_success_params: [], response_error_params: [], fe_status: 'todo', be_status: 'todo', qa_status: 'todo', updated_at: '' }; editDialog.value = true }
function openEdit(row: ApiCatalogEndpoint) { editingId.value = row.id; form.value = { ...row, group_refs: { ...row.group_refs }, request_params: [...(row.request_params || [])], response_success_params: [...(row.response_success_params || [])], response_error_params: [...(row.response_error_params || [])] }; editDialog.value = true }
async function saveEndpoint() { if (!projectId.value) return; if (editingId.value) await apiClient.patch(`/api/v1/projects/${projectId.value}/api-catalog/endpoints/${editingId.value}`, form.value); else await apiClient.post(`/api/v1/projects/${projectId.value}/api-catalog/endpoints`, form.value); editDialog.value = false; await fetchAll() }
async function removeEndpoint(id: string) { if (!projectId.value) return; await apiClient.delete(`/api/v1/projects/${projectId.value}/api-catalog/endpoints/${id}`); await fetchAll() }
function saveConstraint() { if (!projectId.value) return; void apiClient.patch(`/api/v1/projects/${projectId.value}/api-catalog/constraints`, { ...constraintForm.value, error_codes: constraintErrorCodes.value.filter((x) => x.code.trim() && x.meaning.trim()) }).then(async () => { constraintDialog.value = false; await fetchAll() }) }
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
.api-expand { padding: 8px 12px; background: var(--el-fill-color-lighter); border-radius: 8px; }
.api-expand-title { margin: 8px 0; font-weight: 600; }
</style>
