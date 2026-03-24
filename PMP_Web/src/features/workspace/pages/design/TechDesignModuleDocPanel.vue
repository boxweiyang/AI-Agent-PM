<template>
  <div class="mod-panel" v-loading="loading">
    <div class="mod-panel-toolbar">
      <el-button type="primary" :loading="creatingFirst" :disabled="!selectionReady || modules.length > 0" @click="createFirstBatch">
        首次自动创建技术文档
      </el-button>
    </div>
    <p class="mod-panel-hint">
      按技术选型中的交付部分展示文档；展开后可管理该交付部分版本（打开、导出、删除、对比、创建）。
    </p>
    <el-alert v-if="!selectionReady" type="warning" show-icon :closable="false" title="必须先完成技术选型（形态/技术栈/数据库/架构要点）后，才能创建技术文档。" class="mod-panel-alert" />
    <el-table v-if="modules.length" :data="modulesSorted" row-key="id" class="mod-table" @expand-change="onExpandChange">
      <el-table-column type="expand">
        <template #default="{ row: m }">
          <div class="mod-nested-wrap" v-loading="versionLoading[m.id]">
            <div class="mod-nested-actions">
              <el-button type="primary" plain size="small" :disabled="(selectedByModule[m.id] ?? []).length !== 2" :loading="diffLoading" @click="openModuleVersionsDiff(m.id)">对比选中版本</el-button>
              <el-button type="primary" size="small" :loading="creatingVersionFor === m.id" @click="createModuleVersion(m.id, 'from_latest')">基于最新版创建</el-button>
              <el-button size="small" :loading="creatingVersionFor === m.id" @click="createModuleVersion(m.id, 'empty')">新建空白版本</el-button>
            </div>
            <el-table v-if="nestedVersions[m.id]" :data="nestedVersions[m.id]?.items || []" row-key="id" size="small" class="mod-nested-table" @selection-change="nestedSelectionHandler(m.id)">
              <el-table-column type="selection" width="44" :selectable="nestedSelectableBinder(m.id)" />
              <el-table-column label="版本" width="72"><template #default="{ row }">v{{ row.version_no }}</template></el-table-column>
              <el-table-column prop="created_at" label="创建时间" width="180"><template #default="{ row: ver }">{{ formatTime(ver.created_at) }}</template></el-table-column>
              <el-table-column prop="preview" label="摘要" min-width="160" show-overflow-tooltip />
              <el-table-column label="标记" width="72"><template #default="{ row: ver }"><el-tag v-if="ver.id === nestedVersions[m.id]?.latest_version_id" size="small" type="success">最新</el-tag></template></el-table-column>
              <el-table-column label="操作" width="260" fixed="right">
                <template #default="{ row }">
                  <div class="row-actions">
                    <el-button type="primary" link class="row-action-btn" @click="openModuleVersion(m.id, row.id)">打开</el-button>
                    <el-dropdown trigger="click" @command="onNestedExportCommand(m.id, row.id, $event)">
                      <el-button type="primary" link class="row-action-btn">导出</el-button>
                      <template #dropdown><el-dropdown-menu><el-dropdown-item command="md">Markdown</el-dropdown-item><el-dropdown-item command="html">HTML</el-dropdown-item><el-dropdown-item command="pdf">PDF（打印）</el-dropdown-item></el-dropdown-menu></template>
                    </el-dropdown>
                    <el-button type="danger" link class="row-action-btn" @click="confirmDeleteVersion(m.id, row)">删除</el-button>
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="fixed_doc_name" label="文档名（固定）" min-width="240" show-overflow-tooltip />
      <el-table-column prop="title" label="交付部分" min-width="120" />
      <el-table-column prop="summary" label="摘要" min-width="160" show-overflow-tooltip />
    </el-table>
    <el-empty v-else description="暂无技术设计文档，点击「首次自动创建技术文档」生成。" />

    <DiffDialog v-model="diffVisible" title="版本差异" read-only :old-text="diffOldText" :new-text="diffNewText" :left-header="diffLeftHeader" :right-header="diffRightHeader" />
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { apiClient } from '@/api/client'
import DiffDialog from '@/components/DiffDialog'
import type { ApiEnvelope, RequirementDocVersionDetail, RequirementDocVersionListData, RequirementDocVersionListItem } from '@/types/api-contract'
const props = defineProps<{ projectId: string; selectionReady: boolean }>()
const router = useRouter()
const modules = ref<Array<{ id: string; fixed_doc_name: string; title: string; summary: string; sort_order: number }>>([])
const loading = ref(false)
const creatingFirst = ref(false)
const nestedVersions = ref<Record<string, RequirementDocVersionListData | null>>({})
const versionLoading = ref<Record<string, boolean>>({})
const selectedByModule = ref<Record<string, RequirementDocVersionListItem[]>>({})
const creatingVersionFor = ref<string | null>(null)
const diffVisible = ref(false); const diffLoading = ref(false); const diffOldText = ref(''); const diffNewText = ref(''); const diffLeftHeader = ref(''); const diffRightHeader = ref('')
const modulesSorted = computed(() => [...modules.value].sort((a, b) => a.sort_order - b.sort_order))
function formatTime(iso: string) { try { return new Date(iso).toLocaleString() } catch { return iso } }
async function fetchModules() { loading.value = true; try { const { data } = await apiClient.get<ApiEnvelope<{ items: typeof modules.value }>>(`/api/v1/projects/${props.projectId}/tech-design-doc/modules`); modules.value = data.data?.items ?? [] } catch { modules.value = []; ElMessage.error('加载技术文档列表失败') } finally { loading.value = false } }
watch(() => props.projectId, () => { void fetchModules() }, { immediate: true })
async function createFirstBatch() { if (!props.selectionReady) return; creatingFirst.value = true; try { const { data } = await apiClient.post<ApiEnvelope<{ items: typeof modules.value; created_count: number }>>(`/api/v1/projects/${props.projectId}/tech-design-doc/modules/auto-create-first`); modules.value = data.data?.items ?? []; ElMessage.success(`已创建 ${data.data?.created_count ?? 0} 个交付部分技术文档`) } catch (e: unknown) { ElMessage.error(e instanceof Error ? e.message : '创建失败') } finally { creatingFirst.value = false } }
async function loadNestedModuleVersions(moduleId: string) { versionLoading.value[moduleId] = true; try { const { data } = await apiClient.get<ApiEnvelope<RequirementDocVersionListData>>(`/api/v1/projects/${props.projectId}/tech-design-doc/modules/${moduleId}/versions`); nestedVersions.value[moduleId] = data.data ?? { items: [], latest_version_id: null } } catch { nestedVersions.value[moduleId] = { items: [], latest_version_id: null }; ElMessage.error('加载子版本失败') } finally { versionLoading.value[moduleId] = false } }
async function onExpandChange(row: { id: string }, expandedRows: Array<{ id: string }>) { const open = expandedRows.some((r) => r.id === row.id); if (!open || nestedVersions.value[row.id]) return; await loadNestedModuleVersions(row.id) }
function nestedSelectionHandler(moduleId: string) { return (rows: RequirementDocVersionListItem[]) => { selectedByModule.value[moduleId] = rows } }
function nestedSelectableBinder(moduleId: string) { return (row: RequirementDocVersionListItem) => { const sel = selectedByModule.value[moduleId] ?? []; return sel.length < 2 || sel.some((r) => r.id === row.id) } }
function openModuleVersion(moduleId: string, versionId: string) { void router.push({ name: 'project-m02b-design-module-version', params: { projectId: props.projectId, moduleId, versionId } }) }
async function createModuleVersion(moduleId: string, mode: 'empty' | 'from_latest') { creatingVersionFor.value = moduleId; try { const { data } = await apiClient.post<ApiEnvelope<RequirementDocVersionDetail>>(`/api/v1/projects/${props.projectId}/tech-design-doc/modules/${moduleId}/versions`, { mode }); if (data.data?.id) { ElMessage.success('已创建版本'); nestedVersions.value[moduleId] = null; await loadNestedModuleVersions(moduleId); await fetchModules(); void router.push({ name: 'project-m02b-design-module-version', params: { projectId: props.projectId, moduleId, versionId: data.data.id } }) } } catch (e: unknown) { ElMessage.error(e instanceof Error ? e.message : '创建失败') } finally { creatingVersionFor.value = null } }
async function fetchVersionMarkdown(moduleId: string, versionId: string): Promise<string | null> { try { const { data } = await apiClient.get<ApiEnvelope<RequirementDocVersionDetail>>(`/api/v1/projects/${props.projectId}/tech-design-doc/modules/${moduleId}/versions/${versionId}`); return data.data?.markdown ?? null } catch { return null } }
async function openModuleVersionsDiff(moduleId: string) { const sel = selectedByModule.value[moduleId] ?? []; if (sel.length !== 2) return; const [older, newer] = [...sel].sort((a, b) => a.version_no - b.version_no); diffLoading.value = true; try { const [leftMd, rightMd] = await Promise.all([fetchVersionMarkdown(moduleId, older.id), fetchVersionMarkdown(moduleId, newer.id)]); if (leftMd == null || rightMd == null) { ElMessage.error('无法读取选中版本的正文'); return } diffOldText.value = leftMd; diffNewText.value = rightMd; diffLeftHeader.value = `v${older.version_no} · ${formatTime(older.created_at)}`; diffRightHeader.value = `v${newer.version_no} · ${formatTime(newer.created_at)}`; diffVisible.value = true } finally { diffLoading.value = false } }
async function onNestedExportCommand(moduleId: string, versionId: string, command: unknown) { const kind = String(command); const md = await fetchVersionMarkdown(moduleId, versionId); if (!md) return; const row = nestedVersions.value[moduleId]?.items.find((x) => x.id === versionId); const base = `${modules.value.find((x) => x.id === moduleId)?.title ?? '技术设计'}-v${row?.version_no ?? ''}`; const t = `${modules.value.find((x) => x.id === moduleId)?.title ?? '技术设计'} v${row?.version_no ?? ''}`; const { exportRequirementMarkdown, exportRequirementHtml, printMarkdownAsPdf } = await import('@/utils/requirementDocExport'); if (kind === 'md') exportRequirementMarkdown(base, md); else if (kind === 'html') exportRequirementHtml(base, t, md); else if (kind === 'pdf') { const ok = printMarkdownAsPdf(t, md); if (!ok) ElMessage.warning('请允许弹出窗口以使用打印为 PDF') } }
function confirmDeleteVersion(moduleId: string, row: { id: string; version_no: number }) { void ElMessageBox.confirm(`确定删除 v${row.version_no}？`, '删除版本', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }).then(async () => { try { await apiClient.delete(`/api/v1/projects/${props.projectId}/tech-design-doc/modules/${moduleId}/versions/${row.id}`); ElMessage.success('已删除'); nestedVersions.value[moduleId] = null; await loadNestedModuleVersions(moduleId); await fetchModules() } catch (e: unknown) { ElMessage.error(e instanceof Error ? e.message : '删除失败') } }).catch(() => {}) }
</script>

<style scoped>
.mod-panel-toolbar { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
.mod-panel-hint { margin: 0 0 12px; font-size: 13px; color: var(--el-text-color-secondary); line-height: 1.5; }
.mod-panel-alert { margin-bottom: 12px; }
.mod-table { width: 100%; }
.mod-nested-wrap { padding: 8px 8px 16px 48px; background: var(--el-fill-color-lighter); border-radius: 8px; }
.mod-nested-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
.mod-nested-table { width: 100%; }
.row-actions { display: inline-flex; align-items: center; gap: 8px; }
.row-action-btn { margin: 0; padding-top: 0; padding-bottom: 0; }
</style>
