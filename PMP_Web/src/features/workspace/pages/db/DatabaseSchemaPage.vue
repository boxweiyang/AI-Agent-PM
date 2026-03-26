<template>
  <div class="db-schema-page">
    <el-card shadow="never" class="top-card">
      <template #header>
        <div class="top-head">
          <div class="top-title-wrap">
            <span class="top-title">数据库结构</span>
            <el-tag size="small" type="info">REQ-M02D</el-tag>
          </div>
          <div class="top-tools">
            <el-select v-model="dialect" placeholder="选择数据库类型" style="width: 180px" @change="onDialectChange">
              <el-option label="SQLite" value="sqlite" />
              <el-option label="SQL Server" value="sqlserver" />
              <el-option label="MySQL" value="mysql" />
            </el-select>
            <el-button type="primary" :disabled="!dialect" :loading="aiGenerating" @click="onAiGenerate">
              AI 生成数据库结构
            </el-button>
            <el-button :disabled="!dialect" @click="openDdlDialog('all')">一键生成建库 script</el-button>
            <el-button :disabled="!dialect" :loading="designDocGenerating" @click="onGenerateDesignDoc">
              生成数据库设计文档
            </el-button>
          </div>
        </div>
      </template>
      <el-alert
        type="info"
        show-icon
        :closable="false"
        class="top-hint"
        title="V1：结构化表/字段 CRUD + DDL 导出 + Mock AI 生成；保存后每张表仅保留最新一条结构变更脚本（可查看）。"
      />
    </el-card>

    <div class="main-layout">
      <el-card shadow="never" class="left-card">
        <template #header>
          <div class="left-head">
            <span class="left-title">表</span>
            <div class="left-actions">
              <el-button size="small" type="primary" plain @click="openCreateTable">新增表</el-button>
              <el-button size="small" :disabled="!selectedTableId" type="danger" plain @click="removeSelectedTable">删除表</el-button>
            </div>
          </div>
        </template>
        <el-scrollbar class="left-scroll">
          <el-empty v-if="!tables.length" description="暂无表结构" />
          <div v-else class="table-tree">
            <div
              v-for="t in tables"
              :key="t.id"
              class="table-node"
              :class="{ 'is-selected': selectedTableId === t.id }"
              @click="selectTable(t.id)"
            >
              <div class="table-node-title">
                <span class="table-physical">{{ t.physical_name }}</span>
                <span class="table-logical">{{ t.logical_name }}</span>
              </div>
              <div class="table-node-desc">{{ t.description || '—' }}</div>
            </div>
          </div>
        </el-scrollbar>
      </el-card>

      <el-card shadow="never" class="right-card">
        <template #header>
          <div class="right-head">
            <span class="right-title">表结构</span>
            <div class="right-actions">
              <el-button size="small" :disabled="!selectedTableId" @click="openLatestAlterDialog">查看本次变更 SQL</el-button>
              <el-button size="small" type="primary" :disabled="!selectedTableId || !dialect" @click="openTableCreateScriptDialog">一键生成建表script</el-button>
              <el-button
                v-if="rightViewMode === 'view'"
                size="small"
                type="primary"
                :disabled="!selectedTableId"
                @click="rightViewMode = 'edit'"
              >
                编辑
              </el-button>
              <el-button
                v-else
                size="small"
                type="primary"
                :disabled="!selectedTableId"
                :loading="saving"
                @click="saveTable"
              >
                保存
              </el-button>
            </div>
          </div>
        </template>

        <div class="right-scroll">
          <el-empty v-if="!selectedTable" description="请选择左侧一张表" />
          <template v-else>
            <template v-if="rightViewMode === 'edit'">
              <div class="table-form">
                <div class="form-row">
                  <div class="form-label">逻辑表名</div>
                  <el-input v-model="editTable.logical_name" placeholder="如：用户" />
                </div>
                <div class="form-row">
                  <div class="form-label">物理表名</div>
                  <el-input v-model="editTable.physical_name" placeholder="如下划线命名，如：pmp_user" />
                </div>
                <div class="form-row">
                  <div class="form-label">说明</div>
                  <el-input v-model="editTable.description" placeholder="可选" />
                </div>
                <div class="form-row">
                  <div class="form-label">主键说明</div>
                  <el-input v-model="editTable.primary_key_notes" placeholder="可选" />
                </div>
              </div>

              <div class="fields-head">
                <span class="fields-title">字段</span>
                <el-button size="small" @click="addField">新增字段</el-button>
              </div>

              <el-table :data="editTable.fields" size="small" border class="fields-table">
                <el-table-column label="字段名" min-width="140">
                  <template #default="{ row }"><el-input v-model="row.name" size="small" /></template>
                </el-table-column>
                <el-table-column label="描述" min-width="160">
                  <template #default="{ row }"><el-input v-model="row.description" size="small" /></template>
                </el-table-column>
                <el-table-column label="类型" width="140">
                  <template #default="{ row }"><el-input v-model="row.logical_type" size="small" placeholder="如 string/int/datetime" /></template>
                </el-table-column>
                <el-table-column label="长度" width="90">
                  <template #default="{ row }">
                    <el-input-number v-model="row.length" size="small" :min="0" :controls="false" style="width: 100%" />
                  </template>
                </el-table-column>
                <el-table-column label="可空" width="70">
                  <template #default="{ row }"><el-switch v-model="row.nullable" size="small" /></template>
                </el-table-column>
                <el-table-column label="默认值" min-width="120">
                  <template #default="{ row }"><el-input v-model="row.default_value" size="small" placeholder="可选" /></template>
                </el-table-column>
                <el-table-column label="主键" width="70">
                  <template #default="{ row }"><el-switch v-model="row.primary_key" size="small" /></template>
                </el-table-column>
                <el-table-column label="自增" width="70">
                  <template #default="{ row }"><el-switch v-model="row.auto_increment" size="small" /></template>
                </el-table-column>
                <el-table-column label="唯一" width="70">
                  <template #default="{ row }"><el-switch v-model="row.unique" size="small" /></template>
                </el-table-column>
                <el-table-column label="外键" min-width="140">
                  <template #default="{ row }"><el-input v-model="row.foreign_key_ref" size="small" placeholder="如 pmp_project.id" /></template>
                </el-table-column>
                <el-table-column label="操作" width="70" fixed="right">
                  <template #default="{ $index }">
                    <el-button type="danger" link @click="removeField($index)">删</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </template>

            <template v-else>
              <div class="view-summary">
                <div class="view-row">
                  <div class="view-label">逻辑表名</div>
                  <div class="view-value">{{ selectedTable.logical_name }}</div>
                </div>
                <div class="view-row">
                  <div class="view-label">物理表名</div>
                  <div class="view-value mono">{{ selectedTable.physical_name }}</div>
                </div>
                <div class="view-row">
                  <div class="view-label">说明</div>
                  <div class="view-value">{{ selectedTable.description || '—' }}</div>
                </div>
                <div class="view-row">
                  <div class="view-label">主键说明</div>
                  <div class="view-value">{{ selectedTable.primary_key_notes || '—' }}</div>
                </div>
              </div>

              <div class="fields-head">
                <span class="fields-title">字段</span>
              </div>

              <el-table :data="selectedTable.fields" size="small" border class="fields-table">
                <el-table-column label="字段名" min-width="140">
                  <template #default="{ row }"><span class="mono">{{ row.name }}</span></template>
                </el-table-column>
                <el-table-column label="描述" min-width="160">
                  <template #default="{ row }">{{ row.description || '—' }}</template>
                </el-table-column>
                <el-table-column label="类型" width="140">
                  <template #default="{ row }">{{ row.logical_type }}{{ row.length ? `(${row.length})` : '' }}</template>
                </el-table-column>
                <el-table-column label="可空" width="70">
                  <template #default="{ row }">{{ row.nullable ? '是' : '否' }}</template>
                </el-table-column>
                <el-table-column label="默认值" min-width="120">
                  <template #default="{ row }">{{ row.default_value || '—' }}</template>
                </el-table-column>
                <el-table-column label="主键" width="70">
                  <template #default="{ row }">{{ row.primary_key ? '是' : '否' }}</template>
                </el-table-column>
                <el-table-column label="自增" width="70">
                  <template #default="{ row }">{{ row.auto_increment ? '是' : '否' }}</template>
                </el-table-column>
                <el-table-column label="唯一" width="70">
                  <template #default="{ row }">{{ row.unique ? '是' : '否' }}</template>
                </el-table-column>
                <el-table-column label="外键" min-width="140">
                  <template #default="{ row }">{{ row.foreign_key_ref || '—' }}</template>
                </el-table-column>
              </el-table>
            </template>
          </template>
        </div>
      </el-card>
    </div>

    <el-dialog v-model="ddlDialogVisible" title="建库 / 建表脚本" width="860px" class="pmp-viewport-dialog" destroy-on-close>
      <div class="ddl-options">
        <el-checkbox v-model="ddlIncludeDatabase">包含建库语句</el-checkbox>
        <el-checkbox v-model="ddlIncludeMockData">顺便创建模拟数据</el-checkbox>
      </div>
      <el-input v-model="ddlSql" type="textarea" :rows="22" readonly class="mono-textarea" />
      <template #footer>
        <el-button @click="ddlDialogVisible = false">关闭</el-button>
        <el-button type="primary" :disabled="!ddlSql" @click="copyText(ddlSql)">复制</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="alterDialogVisible" title="本次结构变更脚本（仅保留最新一条）" width="860px" class="pmp-viewport-dialog" destroy-on-close>
      <el-input v-model="latestAlterSql" type="textarea" :rows="18" readonly class="mono-textarea" />
      <template #footer>
        <el-button @click="alterDialogVisible = false">关闭</el-button>
        <el-button type="primary" :disabled="!latestAlterSql" @click="copyText(latestAlterSql)">复制</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="designDocDialogVisible"
      title="数据库设计文档（编辑 / 预览 / AI 辅助）"
      width="980px"
      class="pmp-viewport-dialog"
      destroy-on-close
    >
      <template #default>
        <div class="design-doc-top">
          <div class="design-doc-top-left">
            <el-radio-group v-model="designDocViewMode" size="small">
              <el-radio-button label="edit">编辑</el-radio-button>
              <el-radio-button label="preview">预览</el-radio-button>
            </el-radio-group>
          </div>
          <div class="design-doc-top-right">
            <el-button size="small" @click="designDocAiVisible = true">AI 辅助</el-button>
            <el-dropdown trigger="click" @command="onDesignDocExportCommand">
              <el-button size="small" type="primary" plain>
                导出
                <el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="md">Markdown (.md)</el-dropdown-item>
                  <el-dropdown-item command="html">HTML (.html)</el-dropdown-item>
                  <el-dropdown-item command="pdf">PDF（打印为 PDF）</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>

        <div class="design-doc-body">
          <div v-show="designDocViewMode === 'edit'" class="editor-pane">
            <el-input v-model="designDocMarkdown" type="textarea" :rows="22" class="md-input" />
          </div>
          <div v-show="designDocViewMode === 'preview'" class="preview-pane markdown-body" v-html="designDocRenderedHtml" />
        </div>
      </template>
      <template #footer>
        <el-button @click="designDocDialogVisible = false">关闭</el-button>
        <el-button type="primary" :disabled="!designDocMarkdown" @click="copyText(designDocMarkdown)">复制 Markdown</el-button>
      </template>
    </el-dialog>

    <AiAssistDrawer
      v-model="designDocAiVisible"
      title="AI 辅助（数据库设计文档）"
      capability="db_catalog_design_doc_assist"
      :default-prompt="designDocDefaultAiPrompt"
      :external-prompt="designDocExternalAiPrompt"
      :payload-base="designDocAiPayloadBase"
      :memory-key="designDocAiMemoryKey"
      :document-text="designDocMarkdown"
      :anchor-assistant-id="designDocLastAppliedAssistantId"
      @apply="onDesignDocAiApply"
    />
  </div>
</template>

<script setup lang="ts">
import { ArrowDown } from '@element-plus/icons-vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { apiClient } from '@/api/client'
import type { ApiEnvelope } from '@/types/api-contract'
import AiAssistDrawer from '@/components/AiAssistDrawer'
import { exportRequirementHtml, exportRequirementMarkdown, markdownToHtmlFragment, printMarkdownAsPdf } from '@/utils/requirementDocExport'

type DbDialect = 'sqlite' | 'sqlserver' | 'mysql' | ''

type DbCatalogField = {
  id: string
  name: string
  logical_type: string
  length: number | null
  description: string
  nullable: boolean
  default_value: string | null
  primary_key: boolean
  auto_increment: boolean
  unique: boolean
  foreign_key_ref: string | null
}

type DbCatalogTable = {
  id: string
  logical_name: string
  physical_name: string
  description: string
  primary_key_notes: string
  fields: DbCatalogField[]
  updated_at: string
}

const route = useRoute()
const projectId = computed(() => (typeof route.params.projectId === 'string' ? route.params.projectId : ''))

const dialect = ref<DbDialect>('')
const tables = ref<DbCatalogTable[]>([])
const selectedTableId = ref('')
const saving = ref(false)
const aiGenerating = ref(false)
const designDocGenerating = ref(false)

const selectedTable = computed(() => tables.value.find((t) => t.id === selectedTableId.value) ?? null)

const editTable = ref<DbCatalogTable>({
  id: '',
  logical_name: '',
  physical_name: '',
  description: '',
  primary_key_notes: '',
  fields: [],
  updated_at: '',
})

const rightViewMode = ref<'edit' | 'view'>('edit')

watch(
  selectedTable,
  (t) => {
    if (!t) return
    editTable.value = JSON.parse(JSON.stringify(t)) as DbCatalogTable
    rightViewMode.value = 'edit'
  },
  { immediate: true },
)

async function fetchConfigAndTables() {
  if (!projectId.value) return
  const [cfg, list] = await Promise.all([
    apiClient.get<ApiEnvelope<{ dialect: DbDialect }>>(`/api/v1/projects/${projectId.value}/db-catalog/config`),
    apiClient.get<ApiEnvelope<{ items: DbCatalogTable[] }>>(`/api/v1/projects/${projectId.value}/db-catalog/tables`),
  ])
  dialect.value = (cfg.data.data?.dialect ?? '') as DbDialect
  tables.value = list.data.data?.items ?? []
  if (!selectedTableId.value && tables.value.length) selectedTableId.value = tables.value[0].id
}

onMounted(() => {
  void fetchConfigAndTables()
})

function selectTable(id: string) {
  selectedTableId.value = id
}

async function onDialectChange() {
  if (!projectId.value) return
  await apiClient.patch(`/api/v1/projects/${projectId.value}/db-catalog/config`, { dialect: dialect.value || null })
}

function openCreateTable() {
  createTableDialog()
}

async function createTableDialog() {
  let logical = ''
  let physical = ''
  try {
    const { value } = await ElMessageBox.prompt('请输入逻辑表名（业务名）', '新增表', { confirmButtonText: '下一步', cancelButtonText: '取消' })
    logical = String(value || '').trim()
  } catch {
    return
  }
  try {
    const { value } = await ElMessageBox.prompt('请输入物理表名（如下划线）', '新增表', { confirmButtonText: '创建', cancelButtonText: '取消' })
    physical = String(value || '').trim()
  } catch {
    return
  }
  if (!projectId.value) return
  const { data } = await apiClient.post<ApiEnvelope<DbCatalogTable>>(`/api/v1/projects/${projectId.value}/db-catalog/tables`, {
    logical_name: logical,
    physical_name: physical,
    description: '',
    primary_key_notes: '',
    fields: [],
  })
  const row = data.data
  if (row) {
    tables.value = [...tables.value, row]
    selectedTableId.value = row.id
    ElMessage.success('已新增表')
  }
}

async function removeSelectedTable() {
  if (!projectId.value || !selectedTableId.value) return
  const t = selectedTable.value
  if (!t) return
  try {
    await ElMessageBox.confirm(`确定删除表「${t.physical_name}」？此操作不可恢复。`, '删除表', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  await apiClient.delete(`/api/v1/projects/${projectId.value}/db-catalog/tables/${selectedTableId.value}`)
  tables.value = tables.value.filter((x) => x.id !== selectedTableId.value)
  selectedTableId.value = tables.value[0]?.id ?? ''
  ElMessage.success('已删除')
}

function addField() {
  if (!selectedTableId.value) return
  editTable.value.fields.push({
    id: `col-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: '',
    logical_type: 'string',
    length: null,
    description: '',
    nullable: true,
    default_value: null,
    primary_key: false,
    auto_increment: false,
    unique: false,
    foreign_key_ref: null,
  })
}

function removeField(idx: number) {
  editTable.value.fields.splice(idx, 1)
}

function validateTable(): string | null {
  const t = editTable.value
  if (!t.logical_name.trim()) return '逻辑表名必填'
  if (!t.physical_name.trim()) return '物理表名必填'
  const dupPhysical = tables.value.some((x) => x.id !== t.id && x.physical_name.trim() === t.physical_name.trim())
  if (dupPhysical) return '物理表名重复：同一项目内建议唯一'
  const names = t.fields.map((f) => f.name.trim()).filter(Boolean)
  const set = new Set(names)
  if (set.size !== names.length) return '字段名重复'
  return null
}

async function saveTable() {
  if (!projectId.value || !selectedTableId.value) return
  const err = validateTable()
  if (err) {
    ElMessage.error(err)
    return
  }
  saving.value = true
  try {
    const { data } = await apiClient.patch<ApiEnvelope<{ table: DbCatalogTable; latest_alter: { table_id: string; sql: string } }>>(
      `/api/v1/projects/${projectId.value}/db-catalog/tables/${selectedTableId.value}`,
      editTable.value,
    )
    const row = data.data?.table
    if (row) {
      tables.value = tables.value.map((x) => (x.id === row.id ? row : x))
      ElMessage.success('已保存')
      rightViewMode.value = 'view'
    }
  } finally {
    saving.value = false
  }
}

const ddlDialogVisible = ref(false)
const ddlScope = ref<'all' | 'table'>('all')
const ddlIncludeDatabase = ref(true)
const ddlIncludeMockData = ref(false)
const ddlSql = ref('')

async function openDdlDialog(scope: 'all' | 'table') {
  if (!projectId.value || !dialect.value) return
  ddlScope.value = scope
  ddlDialogVisible.value = true
  ddlSql.value = ''
  const body = {
    dialect: dialect.value,
    scope,
    table_id: scope === 'table' ? selectedTableId.value : null,
    include_database: ddlIncludeDatabase.value,
    include_mock_data: ddlIncludeMockData.value,
  }
  const { data } = await apiClient.post<ApiEnvelope<{ sql: string }>>(`/api/v1/projects/${projectId.value}/db-catalog/ddl`, body)
  ddlSql.value = data.data?.sql ?? ''
}

watch([ddlIncludeDatabase, ddlIncludeMockData], () => {
  if (!ddlDialogVisible.value) return
  void openDdlDialog(ddlScope.value)
})

async function openTableCreateScriptDialog() {
  ddlScope.value = 'table'
  // 建表脚本通常不需要建库语句；如需可在弹窗里手动勾选。
  ddlIncludeDatabase.value = false
  ddlIncludeMockData.value = false
  await openDdlDialog('table')
}

const alterDialogVisible = ref(false)
const latestAlterSql = ref('')

async function openLatestAlterDialog() {
  if (!projectId.value || !selectedTableId.value) return
  const { data } = await apiClient.get<ApiEnvelope<{ sql: string }>>(
    `/api/v1/projects/${projectId.value}/db-catalog/tables/${selectedTableId.value}/latest-alter`,
  )
  latestAlterSql.value = data.data?.sql ?? ''
  alterDialogVisible.value = true
}

async function onAiGenerate() {
  if (!projectId.value || !dialect.value) return
  aiGenerating.value = true
  try {
    const { data } = await apiClient.post<ApiEnvelope<{ tables: DbCatalogTable[] }>>(`/api/v1/projects/${projectId.value}/db-catalog/ai-generate`, {
      dialect: dialect.value,
    })
    const incoming = data.data?.tables ?? []
    // V1：先做“合并新增 + 同名覆盖确认”的最简逻辑
    for (const t of incoming) {
      const exist = tables.value.find((x) => x.physical_name.trim().toLowerCase() === t.physical_name.trim().toLowerCase())
      if (!exist) {
        tables.value.push(t)
        continue
      }
      try {
        await ElMessageBox.confirm(`检测到表名冲突：${t.physical_name}。是否用 AI 结果覆盖该表？`, '冲突处理', {
          type: 'warning',
          confirmButtonText: '覆盖本条',
          cancelButtonText: '跳过',
        })
      } catch {
        continue
      }
      tables.value = tables.value.map((x) => (x.id === exist.id ? { ...t, id: exist.id } : x))
    }
    if (!selectedTableId.value && tables.value.length) selectedTableId.value = tables.value[0].id
    ElMessage.success('AI 生成已应用（Mock）')
  } finally {
    aiGenerating.value = false
  }
}

const designDocDialogVisible = ref(false)
const designDocMarkdown = ref('')

const designDocViewMode = ref<'edit' | 'preview'>('edit')
const designDocAiVisible = ref(false)
const designDocLastAppliedAssistantId = ref<string | null>(null)

const designDocRenderedHtml = computed(() => markdownToHtmlFragment(designDocMarkdown.value || ''))

const designDocDefaultAiPrompt = computed(() => {
  const d = dialect.value ? `方言：${dialect.value}` : '方言：未选择'
  return `请基于当前数据库设计文档，补齐缺失内容并优化可落地性。\n\n${d}`
})

const designDocExternalAiPrompt = computed(() => {
  const d = dialect.value ? `方言：${dialect.value}` : '方言：未选择'
  return `你是数据库设计顾问。请根据当前数据库设计文档，给出可直接用于评审/落库的 Markdown 补全建议。\n\n${d}`
})

const designDocAiPayloadBase = computed<Record<string, unknown>>(() => {
  return {
    project_id: projectId.value,
    dialect: dialect.value || null,
    markdown: designDocMarkdown.value || '',
  }
})

const designDocAiMemoryKey = computed(() => {
  return projectId.value ? `${projectId.value}:db_catalog_design_doc_assist` : ''
})

function onDesignDocAiApply(payload: { assistantId: string; text: string }) {
  designDocLastAppliedAssistantId.value = payload.assistantId
  designDocMarkdown.value = payload.text
}

function designDocExportFilenameBase() {
  const pid = projectId.value ? String(projectId.value) : 'project'
  const d = dialect.value ? String(dialect.value) : 'db'
  return `db_design_${pid}_${d}`
}

function onDesignDocExportCommand(command: string | number) {
  const cmd = String(command)
  const md = designDocMarkdown.value || ''
  if (!md.trim()) {
    ElMessage.warning('当前文档为空，无法导出')
    return
  }
  const base = designDocExportFilenameBase()
  const title = `数据库设计文档（${dialect.value || '未选择'}）`
  if (cmd === 'md') exportRequirementMarkdown(base, md)
  else if (cmd === 'html') exportRequirementHtml(base, title, md)
  else if (cmd === 'pdf') printMarkdownAsPdf(title, md)
}

async function onGenerateDesignDoc() {
  if (!projectId.value || !dialect.value) return
  designDocGenerating.value = true
  try {
    const { data } = await apiClient.post<ApiEnvelope<{ markdown: string }>>(
      `/api/v1/projects/${projectId.value}/db-catalog/design-doc/generate`,
      { dialect: dialect.value, include_ddl_snippets: true },
    )
    designDocMarkdown.value = data.data?.markdown ?? ''
    designDocViewMode.value = 'edit'
    designDocLastAppliedAssistantId.value = null
    designDocAiVisible.value = false
    designDocDialogVisible.value = true
  } finally {
    designDocGenerating.value = false
  }
}

async function copyText(text: string) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败，请手动全选复制')
  }
}
</script>

<style scoped>
.db-schema-page {
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.top-card {
  flex-shrink: 0;
}

.top-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.top-title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.top-title {
  font-size: 16px;
  font-weight: 600;
}

.top-tools {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.top-hint {
  margin-top: 6px;
}

.main-layout {
  display: flex;
  gap: 12px;
  height: calc(100vh - 48px - 16px * 2 - 140px);
  min-height: 520px;
}

.left-card,
.right-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
}

.left-card {
  width: 330px;
  flex-shrink: 0;
}

.right-card {
  flex: 1;
}

.left-card :deep(.el-card__body),
.right-card :deep(.el-card__body) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.left-head,
.right-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.left-title,
.right-title {
  font-weight: 600;
}

.left-actions,
.right-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.left-scroll {
  flex: 1;
  min-height: 0;
}

.table-tree {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.table-node {
  padding: 10px 10px;
  border: 1px solid var(--el-border-color);
  border-radius: 10px;
  cursor: pointer;
  user-select: none;
  background: var(--el-bg-color);
}

.table-node:hover {
  border-color: color-mix(in srgb, var(--el-color-primary) 40%, var(--el-border-color));
}

.table-node.is-selected {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--el-color-primary) 18%, transparent);
}

.table-node-title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.table-physical {
  font-weight: 600;
  font-size: 13px;
}

.table-logical {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.table-node-desc {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.right-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding-right: 2px;
}

.table-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 16px;
  margin-bottom: 12px;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.fields-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin: 6px 0 8px;
}

.fields-title {
  font-weight: 600;
}

.fields-table {
  width: 100%;
}

.ddl-options {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.mono-textarea :deep(textarea) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.5;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.view-summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 16px;
  margin-bottom: 10px;
}

.view-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.view-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.view-value {
  font-size: 13px;
  color: var(--el-text-color-regular);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.design-doc-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.design-doc-top-left,
.design-doc-top-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.design-doc-body {
  min-height: 0;
}

.md-input :deep(textarea) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.5;
}

@media (max-width: 980px) {
  .main-layout {
    flex-direction: column;
    height: auto;
    min-height: 0;
  }
  .left-card {
    width: 100%;
    height: 320px;
  }
  .right-card {
    height: 520px;
  }
  .table-form {
    grid-template-columns: 1fr;
  }
}
</style>

