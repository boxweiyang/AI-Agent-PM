<!--
  REQ-M03：迭代详情 — 元数据（含计划日期、预期人天）与迭代需求文档版本列表；版本区交互对齐 RequirementDocListPage。
-->
<template>
  <div class="iter-detail" v-loading="pageLoading">
    <el-card v-if="!artifactKey" shadow="never">
      <el-empty description="路由配置缺少 artifactKey" />
    </el-card>

    <template v-else-if="!pageLoading && project && !ready">
      <el-card shadow="never">
        <el-result icon="folder-opened" title="尚未解锁迭代模块" :sub-title="subTitlePending">
          <template #extra>
            <el-button @click="goPlanning">返回迭代列表</el-button>
          </template>
        </el-result>
      </el-card>
    </template>

    <template v-else-if="ready && !iteration && !pageLoading">
      <el-card shadow="never">
        <el-empty description="未找到该迭代或已删除">
          <el-button type="primary" @click="goPlanning">返回迭代列表</el-button>
        </el-empty>
      </el-card>
    </template>

    <div v-else-if="iteration" class="iter-detail-stack">
      <el-card shadow="never" class="block-card">
        <template #header>
          <div class="head-row">
            <div class="head-left">
              <el-button text @click="goPlanning">返回迭代列表</el-button>
              <span class="title">迭代详情 · {{ iteration.name }}</span>
              <el-tag v-if="reqRef" size="small" type="info">{{ reqRef }}</el-tag>
            </div>
          </div>
        </template>

        <template v-if="metaEditing">
          <el-form label-width="112px" class="meta-form">
            <el-form-item label="名称" required>
              <el-input v-model="metaForm.name" placeholder="迭代名称" />
            </el-form-item>
            <el-form-item label="目标摘要" required>
              <el-input v-model="metaForm.goal_summary" type="textarea" :rows="3" />
            </el-form-item>
            <el-form-item label="范围说明">
              <el-input v-model="metaForm.scope_notes" type="textarea" :rows="2" />
            </el-form-item>
            <el-form-item label="计划开始">
              <el-date-picker
                v-model="metaForm.planned_start_date"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="可选"
                clearable
                style="width: 100%"
              />
            </el-form-item>
            <el-form-item label="计划结束">
              <el-date-picker
                v-model="metaForm.planned_end_date"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="可选"
                clearable
                style="width: 100%"
              />
            </el-form-item>
            <el-form-item label="预期人天">
              <el-input-number
                v-model="metaForm.expected_person_days"
                :min="0"
                :precision="1"
                :step="0.5"
                controls-position="right"
                placeholder="可选"
                style="width: 220px"
              />
            </el-form-item>
            <el-form-item label="优先级">
              <el-select v-model="metaForm.priority" clearable placeholder="可选" style="width: 220px">
                <el-option v-for="p in 5" :key="p - 1" :label="`${p - 1}`" :value="p - 1" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button @click="metaEditing = false" :disabled="metaSaving">取消</el-button>
              <el-button type="primary" :loading="metaSaving" @click="saveMeta">保存迭代信息</el-button>
            </el-form-item>
          </el-form>
        </template>

        <template v-else>
          <div class="meta-view">
            <div class="meta-view-head">
              <span class="meta-view-title">迭代信息</span>
              <el-button type="primary" size="small" @click="startEditMeta">编辑</el-button>
            </div>
            <el-descriptions :column="2" size="small" border class="meta-descriptions">
              <el-descriptions-item label="名称">{{ iteration?.name ?? '—' }}</el-descriptions-item>
              <el-descriptions-item label="优先级">{{ iteration?.priority ?? '—' }}</el-descriptions-item>
              <el-descriptions-item label="目标摘要" :span="2">
                <span class="meta-long-text">{{ iteration?.goal_summary ?? '—' }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="范围说明" :span="2">
                <span class="meta-long-text">{{ iteration?.scope_notes ?? '—' }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="计划开始">
                {{ apiToDateOnly(iteration?.planned_start_at) ?? '—' }}
              </el-descriptions-item>
              <el-descriptions-item label="计划结束">
                {{ apiToDateOnly(iteration?.planned_end_at) ?? '—' }}
              </el-descriptions-item>
              <el-descriptions-item label="预期人天">
                {{ iteration?.expected_person_days ?? '—' }}
              </el-descriptions-item>
              <el-descriptions-item label="更新时间">
                {{ iteration?.updated_at ? formatTime(iteration.updated_at) : '—' }}
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </template>
      </el-card>

      <el-card shadow="never" class="block-card req-versions-card" v-loading="listLoading">
        <template #header>
          <div class="head-row">
            <span class="title">迭代需求文档</span>
            <div class="head-actions">
              <el-dropdown v-if="latestVersionId" trigger="click" @command="onExportLatestCommand">
                <el-button type="primary" plain>
                  导出最新
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
              <el-button v-if="!docList.items.length" type="primary" :loading="creating" @click="createVersion('empty')">
                创建首版文档
              </el-button>
              <template v-else>
                <el-button
                  type="primary"
                  plain
                  :disabled="selectedForDiff.length !== 2"
                  :loading="diffLoading"
                  @click="openSelectedVersionsDiff"
                >
                  对比选中版本
                </el-button>
                <el-button type="primary" :loading="creating" @click="createVersion('from_latest')">基于最新版创建</el-button>
                <el-button :loading="creating" @click="createVersion('empty')">新建空白版本</el-button>
              </template>
            </div>
          </div>
        </template>

        <template v-if="!docList.items.length">
          <el-empty description="暂无版本，请点击「创建首版文档」" />
        </template>
        <template v-else>
          <p v-if="docList.items.length >= 2" class="req-diff-hint">
            在表格左侧勾选<strong>两个</strong>版本，点击「对比选中版本」查看正文差异（只读，不修改任何版本）。
          </p>
          <el-table
            :key="versionTableKey"
            :data="docList.items"
            row-key="id"
            stripe
            size="default"
            class="req-table"
            @selection-change="onVersionSelectionChange"
          >
            <el-table-column type="selection" width="48" :selectable="versionRowSelectable" />
            <el-table-column prop="version_no" label="版本" width="88">
              <template #default="{ row }">v{{ row.version_no }}</template>
            </el-table-column>
            <el-table-column prop="created_at" label="创建时间" width="200">
              <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
            </el-table-column>
            <el-table-column prop="preview" label="摘要" min-width="220" show-overflow-tooltip />
            <el-table-column label="标记" width="100">
              <template #default="{ row }">
                <el-tag v-if="row.id === latestVersionId" size="small" type="success">最新</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="280" fixed="right">
              <template #default="{ row }">
                <div class="row-actions">
                  <el-button type="primary" link class="row-action-btn" @click="openVersion(row.id)">打开</el-button>
                  <el-dropdown trigger="click" @command="onRowExportCommandForRow(row.id, $event)">
                    <el-button type="primary" link class="row-action-btn">
                      导出
                      <el-icon class="el-icon--right"><ArrowDown /></el-icon>
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="md">Markdown</el-dropdown-item>
                        <el-dropdown-item command="html">HTML</el-dropdown-item>
                        <el-dropdown-item command="pdf">PDF（打印）</el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                  <el-button type="danger" link class="row-action-btn" @click="confirmDelete(row)">删除</el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </template>
      </el-card>
    </div>

    <DiffDialog
      v-model="diffVisible"
      title="版本差异"
      read-only
      :old-text="diffOldText"
      :new-text="diffNewText"
      :left-header="diffLeftHeader"
      :right-header="diffRightHeader"
    />
  </div>
</template>

<script setup lang="ts">
import { ArrowDown } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { apiClient } from '@/api/client'
import DiffDialog from '@/components/DiffDialog'
import type {
  ApiEnvelope,
  PlanningIteration,
  PlanningIterationPatchBody,
  ProjectOneData,
  RequirementDocVersionDetail,
  RequirementDocVersionListData,
  RequirementDocVersionListItem,
} from '@/types/api-contract'
import {
  exportRequirementHtml,
  exportRequirementMarkdown,
  printMarkdownAsPdf,
} from '@/utils/requirementDocExport'

const route = useRoute()
const router = useRouter()

const projectIdStr = computed(() => (typeof route.params.projectId === 'string' ? route.params.projectId : ''))
const iterationIdStr = computed(() => (typeof route.params.iterationId === 'string' ? route.params.iterationId : ''))

const reqRef = computed(() => (route.meta.reqRef as string) ?? '')
const artifactKey = computed(() => (route.meta.artifactKey as string) ?? '')

const pageLoading = ref(true)
const listLoading = ref(false)
const project = ref<ProjectOneData | null>(null)
const iteration = ref<PlanningIteration | null>(null)

const metaSaving = ref(false)
const metaEditing = ref(false)
const metaForm = ref({
  name: '',
  goal_summary: '',
  scope_notes: '',
  planned_start_date: '' as string | null,
  planned_end_date: '' as string | null,
  expected_person_days: null as number | null,
  priority: null as number | null,
})

const docList = ref<RequirementDocVersionListData>({ items: [], latest_version_id: null })
const creating = ref(false)

const selectedForDiff = ref<RequirementDocVersionListItem[]>([])
const diffVisible = ref(false)
const diffLoading = ref(false)
const diffOldText = ref('')
const diffNewText = ref('')
const diffLeftHeader = ref('')
const diffRightHeader = ref('')

const ready = computed(() => {
  const k = artifactKey.value
  if (!k) return false
  return project.value?.artifacts?.[k] === true
})

const subTitlePending = computed(
  () => `按 ${reqRef.value} 在项目中启用「迭代与 Story」后可管理迭代详情与需求文档版本。`,
)

const latestVersionId = computed(() => docList.value.latest_version_id)
const versionTableKey = computed(() => docList.value.items.map((i) => i.id).join('|'))

function isoDateOnlyToApi(dateStr: string | null | undefined): string | null {
  const s = (dateStr ?? '').trim()
  if (!s) return null
  return `${s}T00:00:00.000Z`
}

function apiToDateOnly(iso: string | null | undefined): string | null {
  if (!iso || typeof iso !== 'string') return null
  const m = iso.match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1]! : null
}

function syncMetaFromIteration(it: PlanningIteration) {
  metaForm.value = {
    name: it.name,
    goal_summary: it.goal_summary,
    scope_notes: it.scope_notes ?? '',
    planned_start_date: apiToDateOnly(it.planned_start_at),
    planned_end_date: apiToDateOnly(it.planned_end_at),
    expected_person_days: it.expected_person_days,
    priority: it.priority,
  }
}

function startEditMeta() {
  if (iteration.value) syncMetaFromIteration(iteration.value)
  metaEditing.value = true
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

function versionRowSelectable(row: RequirementDocVersionListItem) {
  return selectedForDiff.value.length < 2 || selectedForDiff.value.some((r) => r.id === row.id)
}

function onVersionSelectionChange(rows: RequirementDocVersionListItem[]) {
  selectedForDiff.value = rows
}

async function openSelectedVersionsDiff() {
  if (selectedForDiff.value.length !== 2) return
  const [older, newer] = [...selectedForDiff.value].sort((a, b) => a.version_no - b.version_no)
  diffLoading.value = true
  try {
    const [leftMd, rightMd] = await Promise.all([
      fetchVersionMarkdown(older.id),
      fetchVersionMarkdown(newer.id),
    ])
    if (leftMd == null || rightMd == null) {
      ElMessage.error('无法读取选中版本的正文')
      return
    }
    diffOldText.value = leftMd
    diffNewText.value = rightMd
    diffLeftHeader.value = `v${older.version_no} · ${formatTime(older.created_at)}`
    diffRightHeader.value = `v${newer.version_no} · ${formatTime(newer.created_at)}`
    diffVisible.value = true
  } finally {
    diffLoading.value = false
  }
}

function goPlanning() {
  const id = projectIdStr.value
  if (id) void router.push({ name: 'project-m03-iterations', params: { projectId: id } })
}

async function fetchProject() {
  const id = projectIdStr.value
  if (!id) return
  try {
    const { data } = await apiClient.get<ApiEnvelope<ProjectOneData>>(`/api/v1/projects/${id}`)
    project.value = data.data ?? null
  } catch {
    project.value = null
    ElMessage.error('加载项目失败')
  }
}

async function fetchIteration() {
  const pid = projectIdStr.value
  const iid = iterationIdStr.value
  if (!pid || !iid) return
  try {
    const { data } = await apiClient.get<ApiEnvelope<PlanningIteration>>(`/api/v1/projects/${pid}/iterations/${iid}`)
    const it = data.data ?? null
    iteration.value = it
    if (it) syncMetaFromIteration(it)
  } catch {
    iteration.value = null
    ElMessage.error('加载迭代失败')
  }
}

async function fetchDocList() {
  const pid = projectIdStr.value
  const iid = iterationIdStr.value
  if (!pid || !iid) return
  listLoading.value = true
  try {
    const { data } = await apiClient.get<ApiEnvelope<RequirementDocVersionListData>>(
      `/api/v1/projects/${pid}/iterations/${iid}/requirement-doc/versions`,
    )
    docList.value = data.data ?? { items: [], latest_version_id: null }
  } catch {
    docList.value = { items: [], latest_version_id: null }
    ElMessage.error('加载文档版本失败')
  } finally {
    listLoading.value = false
  }
}

async function loadPage() {
  pageLoading.value = true
  try {
    await fetchProject()
    if (!ready.value) return
    await fetchIteration()
    if (iteration.value) await fetchDocList()
  } finally {
    pageLoading.value = false
  }
}

async function saveMeta() {
  const pid = projectIdStr.value
  const iid = iterationIdStr.value
  if (!pid || !iid) return
  if (!metaForm.value.name.trim() || !metaForm.value.goal_summary.trim()) {
    ElMessage.warning('请填写名称与目标摘要')
    return
  }
  metaSaving.value = true
  try {
    const body: PlanningIterationPatchBody = {
      name: metaForm.value.name.trim(),
      goal_summary: metaForm.value.goal_summary.trim(),
      scope_notes: metaForm.value.scope_notes.trim(),
      planned_start_at: isoDateOnlyToApi(metaForm.value.planned_start_date),
      planned_end_at: isoDateOnlyToApi(metaForm.value.planned_end_date),
      expected_person_days: metaForm.value.expected_person_days,
      priority: metaForm.value.priority,
    }
    const { data } = await apiClient.patch<ApiEnvelope<PlanningIteration>>(
      `/api/v1/projects/${pid}/iterations/${iid}`,
      body,
    )
    const it = data.data
    if (it) {
      iteration.value = it
      syncMetaFromIteration(it)
    }
    ElMessage.success('已保存')
    metaEditing.value = false
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    metaSaving.value = false
  }
}

async function createVersion(mode: 'empty' | 'from_latest') {
  const pid = projectIdStr.value
  const iid = iterationIdStr.value
  if (!pid || !iid) return
  creating.value = true
  try {
    const { data } = await apiClient.post<ApiEnvelope<RequirementDocVersionDetail>>(
      `/api/v1/projects/${pid}/iterations/${iid}/requirement-doc/versions`,
      { mode },
    )
    const row = data.data
    if (row?.id) {
      ElMessage.success('已创建版本')
      await fetchDocList()
      void router.push({
        name: 'project-m03-iteration-req-version',
        params: { projectId: pid, iterationId: iid, versionId: row.id },
      })
    }
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '创建失败')
  } finally {
    creating.value = false
  }
}

function openVersion(versionId: string) {
  const pid = projectIdStr.value
  const iid = iterationIdStr.value
  if (!pid || !iid) return
  void router.push({
    name: 'project-m03-iteration-req-version',
    params: { projectId: pid, iterationId: iid, versionId },
  })
}

async function fetchVersionMarkdown(versionId: string): Promise<string | null> {
  const pid = projectIdStr.value
  const iid = iterationIdStr.value
  if (!pid || !iid) return null
  try {
    const { data } = await apiClient.get<ApiEnvelope<RequirementDocVersionDetail>>(
      `/api/v1/projects/${pid}/iterations/${iid}/requirement-doc/versions/${versionId}`,
    )
    return data.data?.markdown ?? null
  } catch {
    return null
  }
}

async function runExport(versionId: string, kind: 'md' | 'html' | 'pdf') {
  const md = await fetchVersionMarkdown(versionId)
  if (md == null) {
    ElMessage.error('无法读取该版本正文')
    return
  }
  const row = docList.value.items.find((x) => x.id === versionId)
  const iterName = iteration.value?.name ?? '迭代'
  const base = `迭代需求-${iterName}-v${row?.version_no ?? versionId}`
  const title = `迭代需求文档 v${row?.version_no ?? ''}`
  if (kind === 'md') exportRequirementMarkdown(base, md)
  else if (kind === 'html') exportRequirementHtml(base, title, md)
  else {
    const ok = printMarkdownAsPdf(title, md)
    if (!ok) ElMessage.warning('请允许弹出窗口以使用打印为 PDF')
  }
}

function onRowExportCommand(versionId: string, command: string) {
  if (command === 'md' || command === 'html' || command === 'pdf') {
    void runExport(versionId, command)
  }
}

function onRowExportCommandForRow(versionId: string, command: unknown) {
  onRowExportCommand(versionId, String(command))
}

async function onExportLatestCommand(command: string) {
  const vid = latestVersionId.value
  if (!vid) return
  if (command === 'md' || command === 'html' || command === 'pdf') {
    await runExport(vid, command)
  }
}

function confirmDelete(row: { id: string; version_no: number }) {
  const pid = projectIdStr.value
  const iid = iterationIdStr.value
  if (!pid || !iid) return
  void ElMessageBox.confirm(
    `确定删除 v${row.version_no}？删除后若该版本为最新，将以上一版为最新，可继续从最新保存。`,
    '删除版本',
    { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
  )
    .then(async () => {
      try {
        await apiClient.delete(`/api/v1/projects/${pid}/iterations/${iid}/requirement-doc/versions/${row.id}`)
        ElMessage.success('已删除')
        await fetchDocList()
      } catch (e: unknown) {
        ElMessage.error(e instanceof Error ? e.message : '删除失败')
      }
    })
    .catch(() => {})
}

watch(versionTableKey, () => {
  selectedForDiff.value = []
})

watch(
  () => [projectIdStr.value, iterationIdStr.value],
  () => {
    void loadPage()
  },
  { immediate: true },
)
</script>

<style scoped>
.iter-detail {
  width: 100%;
  min-width: 0;
  padding-bottom: 24px;
}

.iter-detail-stack {
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
  flex-wrap: wrap;
}

.head-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.head-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.title {
  font-weight: 600;
  font-size: 16px;
}

.meta-form {
  max-width: 720px;
}

.meta-view {
  width: 100%;
  padding: 8px 0 2px;
}

.meta-view-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.meta-view-title {
  font-weight: 600;
  font-size: 15px;
}

.meta-descriptions :deep(.el-descriptions__label) {
  width: 96px;
}

.meta-long-text {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}

.req-versions-card :deep(.el-card__body) {
  padding-top: 8px;
}

.req-table {
  width: 100%;
}

.row-actions {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.row-action-btn {
  margin: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.req-diff-hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}
</style>
