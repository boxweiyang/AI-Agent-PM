<!--
  REQ-M02：模块细化文档 — 可展开表格（模块 → 版本子表），与总文档列表操作对齐。
-->
<template>
  <div class="mod-panel" v-loading="loading">
    <div class="mod-panel-toolbar">
      <el-button type="primary" :loading="splitLoading" @click="onClickAiSplit"> AI 模块化拆分 </el-button>
      <el-button @click="openAddModule">新增模块</el-button>
    </div>
    <p class="mod-panel-hint">
      先从总需求文档生成模块与初稿；展开行可管理该模块的版本（打开、导出、删除、对比、创建），与「需求文档」页一致。
    </p>
    <el-table
      v-if="modules.length"
      :data="modulesSorted"
      row-key="id"
      class="mod-table"
      @expand-change="onExpandChange"
    >
      <el-table-column type="expand">
        <template #default="{ row: m }">
          <div class="mod-nested-wrap" v-loading="versionLoading[m.id]">
            <div class="mod-nested-actions">
              <el-button
                type="primary"
                plain
                size="small"
                :disabled="(selectedByModule[m.id] ?? []).length !== 2"
                :loading="diffLoading"
                @click="openModuleVersionsDiff(m.id)"
              >
                对比选中版本
              </el-button>
              <el-button
                type="primary"
                size="small"
                :loading="creatingVersionFor === m.id"
                @click="createModuleVersion(m.id, 'from_latest')"
              >
                基于最新版创建
              </el-button>
              <el-button
                size="small"
                :loading="creatingVersionFor === m.id"
                @click="createModuleVersion(m.id, 'empty')"
              >
                新建空白版本
              </el-button>
            </div>
            <p v-if="(nestedVersions[m.id]?.items?.length ?? 0) >= 2" class="req-diff-hint">
              子表左侧勾选两个版本可对比差异（只读）。
            </p>
            <el-table
              v-if="nestedVersions[m.id]"
              :data="nestedVersions[m.id]!.items"
              row-key="id"
              size="small"
              class="mod-nested-table"
              @selection-change="nestedSelectionHandler(m.id)"
            >
              <el-table-column type="selection" width="44" :selectable="nestedSelectableBinder(m.id)" />
              <el-table-column label="版本" width="72">
                <template #default="{ row }">v{{ row.version_no }}</template>
              </el-table-column>
              <el-table-column prop="created_at" label="创建时间" width="180">
                <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
              </el-table-column>
              <el-table-column prop="preview" label="摘要" min-width="160" show-overflow-tooltip />
              <el-table-column label="标记" width="72">
                <template #default="{ row }">
                  <el-tag v-if="row.id === nestedVersions[m.id]!.latest_version_id" size="small" type="success">
                    最新
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="260" fixed="right">
                <template #default="{ row }">
                  <div class="row-actions">
                    <el-button type="primary" link class="row-action-btn" @click="openModuleVersion(m.id, row.id)">
                      打开
                    </el-button>
                    <el-dropdown trigger="click" @command="onNestedExportCommand(m.id, row.id, $event)">
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
                    <el-button type="danger" link class="row-action-btn" @click="confirmDeleteVersion(m.id, row)">
                      删除
                    </el-button>
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="title" label="模块名称" min-width="160" show-overflow-tooltip />
      <el-table-column prop="summary" label="摘要" min-width="180" show-overflow-tooltip />
      <el-table-column label="操作" width="260" fixed="right">
        <template #default="{ row }">
          <div class="mod-row-actions">
            <el-button type="primary" link class="row-action-btn" @click="openEditModule(row)">编辑</el-button>
            <el-button
              link
              type="primary"
              class="row-action-btn"
              :disabled="isFirstModule(row.id)"
              @click="moveModule(row.id, -1)"
            >
              上移
            </el-button>
            <el-button
              link
              type="primary"
              class="row-action-btn"
              :disabled="isLastModule(row.id)"
              @click="moveModule(row.id, 1)"
            >
              下移
            </el-button>
            <el-button type="danger" link class="row-action-btn" @click="confirmDeleteModule(row)">删除</el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>
    <el-empty v-else description="暂无模块，请先完成总需求文档，再点击「AI 模块化拆分」" />

    <el-dialog v-model="splitDialogVisible" title="AI 模块化拆分" width="560px" destroy-on-close>
      <div class="split-dialog-body">
        <p class="split-dialog-lead">
          将读取项目下<strong>最新一版总需求文档</strong>，由 AI 生成结构化模块及<strong>各模块 v1 初稿正文</strong>（具体模型与提示词由后端实现）。
        </p>
        <el-alert type="warning" show-icon :closable="false" class="split-alert" title="请选择拆分方式" />
        <el-radio-group v-model="splitMode" class="split-radio">
          <el-radio label="full_replace" border>
            <div class="split-option">
              <div class="split-option-title">全部覆盖（重建）</div>
              <div class="split-option-desc">
                将<strong>删除当前所有模块</strong>及其<strong>全部版本</strong>，再按最新总需求重新生成模块与初稿。
              </div>
            </div>
          </el-radio>
          <el-radio label="incremental" border>
            <div class="split-option">
              <div class="split-option-title">仅增量新增</div>
              <div class="split-option-desc">
                <strong>不会修改</strong>已有模块的<strong>任何信息</strong>（名称、摘要、版本链等）；仅当 AI 给出的<strong>模块标题</strong>与现有模块在规范化比对后<strong>均不相同</strong>时，<strong>新增</strong>该模块及其
                v1。标题已存在的建议会被跳过。
              </div>
            </div>
          </el-radio>
        </el-radio-group>
      </div>
      <template #footer>
        <el-button @click="splitDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="splitLoading" @click="confirmSplitDialog">开始拆分</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="moduleFormVisible"
      :title="editingModuleId ? '编辑模块' : '新增模块'"
      width="480px"
      destroy-on-close
      @closed="resetModuleForm"
    >
      <el-form label-width="100px">
        <el-form-item label="名称" required>
          <el-input v-model="moduleForm.title" maxlength="120" show-word-limit placeholder="模块显示名称" />
        </el-form-item>
        <el-form-item label="摘要">
          <el-input v-model="moduleForm.summary" type="textarea" :rows="3" maxlength="500" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="moduleFormVisible = false">取消</el-button>
        <el-button type="primary" :loading="moduleSaving" @click="submitModuleForm">保存</el-button>
      </template>
    </el-dialog>

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
import { useRouter } from 'vue-router'

import { apiClient } from '@/api/client'
import DiffDialog from '@/components/DiffDialog'
import type {
  ApiEnvelope,
  RequirementDocModuleAiSplitResultData,
  RequirementDocModuleListData,
  RequirementDocModuleSummary,
  RequirementDocVersionDetail,
  RequirementDocVersionListData,
  RequirementDocVersionListItem,
} from '@/types/api-contract'
import {
  exportRequirementHtml,
  exportRequirementMarkdown,
  printMarkdownAsPdf,
} from '@/utils/requirementDocExport'

const props = defineProps<{
  projectId: string
}>()

const router = useRouter()

const modules = ref<RequirementDocModuleSummary[]>([])
const loading = ref(false)
const splitLoading = ref(false)
const splitDialogVisible = ref(false)
const splitMode = ref<'full_replace' | 'incremental'>('incremental')

const nestedVersions = ref<Record<string, RequirementDocVersionListData | null>>({})
const versionLoading = ref<Record<string, boolean>>({})
const selectedByModule = ref<Record<string, RequirementDocVersionListItem[]>>({})
const creatingVersionFor = ref<string | null>(null)

const moduleFormVisible = ref(false)
const moduleSaving = ref(false)
const editingModuleId = ref<string | null>(null)
const moduleForm = ref({ title: '', summary: '' })

const diffVisible = ref(false)
const diffLoading = ref(false)
const diffOldText = ref('')
const diffNewText = ref('')
const diffLeftHeader = ref('')
const diffRightHeader = ref('')

const modulesSorted = computed(() => [...modules.value].sort((a, b) => a.sort_order - b.sort_order))

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

async function fetchModules() {
  loading.value = true
  try {
    const { data } = await apiClient.get<ApiEnvelope<RequirementDocModuleListData>>(
      `/api/v1/projects/${props.projectId}/requirement-doc/modules`,
    )
    modules.value = data.data?.items ?? []
  } catch {
    modules.value = []
    ElMessage.error('加载模块列表失败')
  } finally {
    loading.value = false
  }
}

watch(
  () => props.projectId,
  () => {
    void fetchModules()
  },
  { immediate: true },
)

function isFirstModule(id: string) {
  const s = modulesSorted.value
  return s.length === 0 || s[0]?.id === id
}

function isLastModule(id: string) {
  const s = modulesSorted.value
  return s.length === 0 || s[s.length - 1]?.id === id
}

async function onClickAiSplit() {
  if (modules.value.length === 0) {
    try {
      await ElMessageBox.confirm(
        '将根据项目下「最新一版总需求文档」自动生成若干模块，并为每个模块创建含 AI 初稿正文的 v1。是否继续？',
        'AI 模块化拆分',
        {
          type: 'info',
          confirmButtonText: '开始拆分',
          cancelButtonText: '取消',
        },
      )
    } catch {
      return
    }
    await runAiSplit('full_replace')
    return
  }
  splitMode.value = 'incremental'
  splitDialogVisible.value = true
}

async function confirmSplitDialog() {
  splitDialogVisible.value = false
  await runAiSplit(splitMode.value)
}

async function runAiSplit(mode: 'full_replace' | 'incremental') {
  splitLoading.value = true
  try {
    const { data } = await apiClient.post<ApiEnvelope<RequirementDocModuleAiSplitResultData>>(
      `/api/v1/projects/${props.projectId}/requirement-doc/modules/ai-split`,
      { mode },
    )
    const d = data.data
    if (d) {
      modules.value = d.items
      nestedVersions.value = {}
      selectedByModule.value = {}
      if (mode === 'full_replace') {
        ElMessage.success(`已重新拆分，共 ${d.added_titles.length} 个模块（各含初稿 v1）。`)
      } else {
        ElMessage.success(
          `增量完成：新增 ${d.added_titles.length} 个模块；因标题已存在跳过 ${d.skipped_titles.length} 条建议。`,
        )
      }
    }
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '拆分失败')
  } finally {
    splitLoading.value = false
  }
}

async function loadNestedModuleVersions(moduleId: string) {
  versionLoading.value[moduleId] = true
  try {
    const { data } = await apiClient.get<ApiEnvelope<RequirementDocVersionListData>>(
      `/api/v1/projects/${props.projectId}/requirement-doc/modules/${moduleId}/versions`,
    )
    nestedVersions.value[moduleId] = data.data ?? { items: [], latest_version_id: null }
  } catch {
    nestedVersions.value[moduleId] = { items: [], latest_version_id: null }
    ElMessage.error('加载子版本失败')
  } finally {
    versionLoading.value[moduleId] = false
  }
}

async function onExpandChange(row: RequirementDocModuleSummary, expandedRows: RequirementDocModuleSummary[]) {
  const open = expandedRows.some((r) => r.id === row.id)
  if (!open) return
  if (nestedVersions.value[row.id]) return
  await loadNestedModuleVersions(row.id)
}

function onNestedSelectionChange(moduleId: string, rows: RequirementDocVersionListItem[]) {
  selectedByModule.value[moduleId] = rows
}

function nestedSelectionHandler(moduleId: string) {
  return (rows: RequirementDocVersionListItem[]) => onNestedSelectionChange(moduleId, rows)
}

function nestedSelectableBinder(moduleId: string) {
  return (row: RequirementDocVersionListItem) => nestedRowSelectable(moduleId, row)
}

function nestedRowSelectable(moduleId: string, row: RequirementDocVersionListItem) {
  const sel = selectedByModule.value[moduleId] ?? []
  return sel.length < 2 || sel.some((r) => r.id === row.id)
}

function openModuleVersion(moduleId: string, versionId: string) {
  void router.push({
    name: 'project-m02-requirements-module-version',
    params: { projectId: props.projectId, moduleId, versionId },
  })
}

async function createModuleVersion(moduleId: string, mode: 'empty' | 'from_latest') {
  creatingVersionFor.value = moduleId
  try {
    const { data } = await apiClient.post<ApiEnvelope<RequirementDocVersionDetail>>(
      `/api/v1/projects/${props.projectId}/requirement-doc/modules/${moduleId}/versions`,
      { mode },
    )
    if (data.data?.id) {
      ElMessage.success('已创建版本')
      nestedVersions.value[moduleId] = null
      await loadNestedModuleVersions(moduleId)
      await fetchModules()
      void router.push({
        name: 'project-m02-requirements-module-version',
        params: { projectId: props.projectId, moduleId, versionId: data.data.id },
      })
    }
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '创建失败')
  } finally {
    creatingVersionFor.value = null
  }
}

async function fetchVersionMarkdown(moduleId: string, versionId: string): Promise<string | null> {
  try {
    const { data } = await apiClient.get<ApiEnvelope<RequirementDocVersionDetail>>(
      `/api/v1/projects/${props.projectId}/requirement-doc/modules/${moduleId}/versions/${versionId}`,
    )
    return data.data?.markdown ?? null
  } catch {
    return null
  }
}

async function openModuleVersionsDiff(moduleId: string) {
  const sel = selectedByModule.value[moduleId] ?? []
  if (sel.length !== 2) return
  const [older, newer] = [...sel].sort((a, b) => a.version_no - b.version_no)
  diffLoading.value = true
  try {
    const [leftMd, rightMd] = await Promise.all([
      fetchVersionMarkdown(moduleId, older.id),
      fetchVersionMarkdown(moduleId, newer.id),
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

function onNestedExportCommand(moduleId: string, versionId: string, command: string) {
  if (command === 'md' || command === 'html' || command === 'pdf') {
    void runExport(moduleId, versionId, command)
  }
}

function exportFileSlug(title: string, fallbackId: string) {
  const s = title
    .trim()
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/\s+/g, '-')
    .slice(0, 48)
  return s || fallbackId.replace(/^rdm-/, '').slice(0, 12)
}

async function runExport(moduleId: string, versionId: string, kind: 'md' | 'html' | 'pdf') {
  const md = await fetchVersionMarkdown(moduleId, versionId)
  if (md == null) {
    ElMessage.error('无法读取该版本正文')
    return
  }
  const list = nestedVersions.value[moduleId]?.items
  const row = list?.find((x) => x.id === versionId)
  const mod = modules.value.find((m) => m.id === moduleId)
  const base = `模块细化-${exportFileSlug(mod?.title ?? '', moduleId)}-v${row?.version_no ?? versionId}`
  const title = `${mod?.title ?? '模块'} v${row?.version_no ?? ''}`
  if (kind === 'md') exportRequirementMarkdown(base, md)
  else if (kind === 'html') exportRequirementHtml(base, title, md)
  else {
    const ok = printMarkdownAsPdf(title, md)
    if (!ok) ElMessage.warning('请允许弹出窗口以使用打印为 PDF')
  }
}

function confirmDeleteVersion(moduleId: string, row: { id: string; version_no: number }) {
  void ElMessageBox.confirm(`确定删除 v${row.version_no}？`, '删除版本', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消',
  })
    .then(async () => {
      try {
        await apiClient.delete(
          `/api/v1/projects/${props.projectId}/requirement-doc/modules/${moduleId}/versions/${row.id}`,
        )
        ElMessage.success('已删除')
        nestedVersions.value[moduleId] = null
        await loadNestedModuleVersions(moduleId)
        await fetchModules()
      } catch (e: unknown) {
        ElMessage.error(e instanceof Error ? e.message : '删除失败')
      }
    })
    .catch(() => {})
}

async function moveModule(id: string, delta: number) {
  const s = modulesSorted.value
  const idx = s.findIndex((m) => m.id === id)
  const j = idx + delta
  if (idx < 0 || j < 0 || j >= s.length) return
  const ids = s.map((m) => m.id)
  const t = ids[idx]!
  ids[idx] = ids[j]!
  ids[j] = t
  try {
    await apiClient.put(`/api/v1/projects/${props.projectId}/requirement-doc/modules/reorder`, {
      ordered_module_ids: ids,
    })
    await fetchModules()
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '调整顺序失败')
  }
}

function openAddModule() {
  editingModuleId.value = null
  moduleForm.value = { title: '', summary: '' }
  moduleFormVisible.value = true
}

function openEditModule(row: RequirementDocModuleSummary) {
  editingModuleId.value = row.id
  moduleForm.value = { title: row.title, summary: row.summary }
  moduleFormVisible.value = true
}

function resetModuleForm() {
  editingModuleId.value = null
  moduleForm.value = { title: '', summary: '' }
}

async function submitModuleForm() {
  const title = moduleForm.value.title.trim()
  if (!title) {
    ElMessage.warning('请填写模块名称')
    return
  }
  moduleSaving.value = true
  try {
    if (editingModuleId.value) {
      await apiClient.patch(
        `/api/v1/projects/${props.projectId}/requirement-doc/modules/${editingModuleId.value}`,
        { title, summary: moduleForm.value.summary.trim() },
      )
      ElMessage.success('已更新')
    } else {
      await apiClient.post(`/api/v1/projects/${props.projectId}/requirement-doc/modules`, {
        title,
        summary: moduleForm.value.summary.trim(),
      })
      ElMessage.success('已创建模块')
    }
    moduleFormVisible.value = false
    await fetchModules()
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    moduleSaving.value = false
  }
}

function confirmDeleteModule(row: RequirementDocModuleSummary) {
  void ElMessageBox.confirm(
    `确定删除模块「${row.title}」？将同时删除其下全部版本，且不可恢复。`,
    '删除模块',
    { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
  )
    .then(async () => {
      try {
        await apiClient.delete(`/api/v1/projects/${props.projectId}/requirement-doc/modules/${row.id}`)
        ElMessage.success('已删除')
        delete nestedVersions.value[row.id]
        await fetchModules()
      } catch (e: unknown) {
        ElMessage.error(e instanceof Error ? e.message : '删除失败')
      }
    })
    .catch(() => {})
}
</script>

<style scoped>
.mod-panel-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.mod-panel-hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.mod-table {
  width: 100%;
}

.mod-nested-wrap {
  padding: 8px 8px 16px 48px;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
}

.mod-nested-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.mod-nested-table {
  width: 100%;
}

.mod-row-actions {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
}

.row-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.row-action-btn {
  margin: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.req-diff-hint {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.split-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.split-dialog-lead {
  margin: 0;
  font-size: 14px;
  color: var(--el-text-color-regular);
  line-height: 1.55;
}

.split-alert {
  align-items: flex-start;
}

.split-radio {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
}

.split-radio :deep(.el-radio) {
  height: auto;
  margin-right: 0;
  align-items: flex-start;
  padding: 12px;
}

.split-option-title {
  font-weight: 600;
  margin-bottom: 4px;
}

.split-option-desc {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
  white-space: normal;
}

.split-option-desc code {
  font-size: 12px;
}
</style>
