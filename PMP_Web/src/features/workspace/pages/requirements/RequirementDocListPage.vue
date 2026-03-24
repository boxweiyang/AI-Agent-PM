<!--
  REQ-M02：需求文档入口 = 版本列表；创建 / 导出 / 删除；点版本进详情编辑。
-->
<template>
  <div class="req-doc-list" v-loading="loading">
    <el-card shadow="never" class="req-card">
      <template #header>
        <div class="req-card-head req-card-head--stacked">
          <div class="req-tabs-wrap">
            <el-tabs v-model="listTab" class="req-main-tabs" type="card" @tab-change="onListTabChange">
              <el-tab-pane label="需求文档" name="overview" />
              <el-tab-pane label="模块细化文档" name="modules" />
            </el-tabs>
          </div>
          <div class="req-card-head-meta">
            <span class="req-title">需求与文档</span>
            <el-tag v-if="reqRef" size="small" type="info">{{ reqRef }}</el-tag>
          </div>
          <div v-if="listTab === 'overview'" class="req-card-head-actions">
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
            <el-button v-if="ready && !list.items.length" type="primary" :loading="creating" @click="createVersion('empty')">
              创建首版文档
            </el-button>
            <template v-else-if="ready && list.items.length">
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

      <template v-if="!artifactKey">
        <el-empty description="路由配置缺少 artifactKey" />
      </template>
      <template v-else-if="loading">
        <el-skeleton :rows="6" animated />
      </template>
      <template v-else-if="!ready">
        <el-result icon="folder-opened" title="尚未生成该模块内容" :sub-title="subTitlePending">
          <template #extra>
            <el-button type="primary" :loading="generating" @click="onGenerate">一键生成（演示）</el-button>
            <el-button @click="goDetail">返回项目详情</el-button>
          </template>
        </el-result>
      </template>
      <template v-else-if="listTab === 'modules'">
        <RequirementModuleDocPanel v-if="projectIdStr" :project-id="projectIdStr" />
      </template>
      <template v-else-if="!list.items.length">
        <el-empty description="暂无版本，请点击「创建首版文档」" />
      </template>
      <template v-else>
        <p v-if="list.items.length >= 2" class="req-diff-hint">
          在表格左侧勾选<strong>两个</strong>版本，点击「对比选中版本」查看正文差异（只读，不修改任何版本）。
        </p>
        <el-table
          :key="versionTableKey"
          :data="list.items"
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
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { apiClient } from '@/api/client'
import DiffDialog from '@/components/DiffDialog'
import RequirementModuleDocPanel from '@/features/workspace/pages/requirements/RequirementModuleDocPanel.vue'
import type {
  ApiEnvelope,
  ProjectOneData,
  ProjectPatchRequestBody,
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

const listTab = ref<'overview' | 'modules'>('overview')

const projectIdStr = computed(() =>
  typeof route.params.projectId === 'string' ? route.params.projectId : '',
)

function syncListTabFromRoute() {
  listTab.value = route.query.tab === 'modules' ? 'modules' : 'overview'
}

function onListTabChange(name: string | number) {
  const tab = name === 'modules' ? 'modules' : 'overview'
  const id = projectIdStr.value
  if (!id) return
  const q = { ...route.query } as Record<string, string | string[] | undefined>
  if (tab === 'modules') q.tab = 'modules'
  else delete q.tab
  void router.replace({ name: route.name ?? undefined, params: { projectId: id }, query: q })
}

const loading = ref(true)
const creating = ref(false)
const generating = ref(false)
const project = ref<ProjectOneData | null>(null)
const list = ref<RequirementDocVersionListData>({ items: [], latest_version_id: null })

const selectedForDiff = ref<RequirementDocVersionListItem[]>([])
const diffVisible = ref(false)
const diffLoading = ref(false)
const diffOldText = ref('')
const diffNewText = ref('')
const diffLeftHeader = ref('')
const diffRightHeader = ref('')

const reqRef = computed(() => (route.meta.reqRef as string) ?? '')
const artifactKey = computed(() => (route.meta.artifactKey as string) ?? '')

const ready = computed(() => {
  const k = artifactKey.value
  if (!k) return false
  return project.value?.artifacts?.[k] === true
})

const latestVersionId = computed(() => list.value.latest_version_id)

/** 列表变更后重挂表格，避免勾选状态与已删版本错位 */
const versionTableKey = computed(() => list.value.items.map((i) => i.id).join('|'))

const subTitlePending = computed(
  () => `按 ${reqRef.value} 落地后可管理需求文档版本。演示环境可先「生成」解锁入口。`,
)

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

function versionRowSelectable(row: RequirementDocVersionListItem) {
  return (
    selectedForDiff.value.length < 2 || selectedForDiff.value.some((r) => r.id === row.id)
  )
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

function goDetail() {
  const id = route.params.projectId
  if (typeof id === 'string') void router.push({ name: 'project-detail', params: { projectId: id } })
}

async function fetchProject() {
  const id = route.params.projectId
  if (typeof id !== 'string') return
  try {
    const { data } = await apiClient.get<ApiEnvelope<ProjectOneData>>(`/api/v1/projects/${id}`)
    project.value = data.data ?? null
  } catch {
    project.value = null
    ElMessage.error('加载项目失败')
  }
}

async function fetchList() {
  const id = route.params.projectId
  if (typeof id !== 'string') return
  try {
    const { data } = await apiClient.get<ApiEnvelope<RequirementDocVersionListData>>(
      `/api/v1/projects/${id}/requirement-doc/versions`,
    )
    list.value = data.data ?? { items: [], latest_version_id: null }
  } catch {
    list.value = { items: [], latest_version_id: null }
    ElMessage.error('加载版本列表失败')
  }
}

async function loadAll() {
  loading.value = true
  try {
    await fetchProject()
    if (ready.value) await fetchList()
  } finally {
    loading.value = false
  }
}

async function onGenerate() {
  const id = route.params.projectId
  const k = artifactKey.value
  if (typeof id !== 'string' || !k) return
  generating.value = true
  try {
    const body: ProjectPatchRequestBody = { artifacts: { [k]: true } }
    const { data } = await apiClient.patch<ApiEnvelope<ProjectOneData>>(`/api/v1/projects/${id}`, body)
    project.value = data.data ?? null
    ElMessage.success('已标记为已生成（演示）')
    await fetchList()
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '生成失败')
  } finally {
    generating.value = false
  }
}

async function createVersion(mode: 'empty' | 'from_latest') {
  const id = route.params.projectId
  if (typeof id !== 'string') return
  creating.value = true
  try {
    const { data } = await apiClient.post<ApiEnvelope<RequirementDocVersionDetail>>(
      `/api/v1/projects/${id}/requirement-doc/versions`,
      { mode },
    )
    const row = data.data
    if (row?.id) {
      ElMessage.success('已创建版本')
      await fetchList()
      void router.push({
        name: 'project-m02-requirements-version',
        params: { projectId: id, versionId: row.id },
      })
    }
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '创建失败')
  } finally {
    creating.value = false
  }
}

function openVersion(versionId: string) {
  const id = route.params.projectId
  if (typeof id !== 'string') return
  void router.push({
    name: 'project-m02-requirements-version',
    params: { projectId: id, versionId },
  })
}

async function fetchVersionMarkdown(versionId: string): Promise<string | null> {
  const id = route.params.projectId
  if (typeof id !== 'string') return null
  try {
    const { data } = await apiClient.get<ApiEnvelope<RequirementDocVersionDetail>>(
      `/api/v1/projects/${id}/requirement-doc/versions/${versionId}`,
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
  const row = list.value.items.find((x) => x.id === versionId)
  const base = `需求文档-v${row?.version_no ?? versionId}`
  const title = `需求文档 v${row?.version_no ?? ''}`
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
  void ElMessageBox.confirm(
    `确定删除 v${row.version_no}？删除后若该版本为最新，将以上一版为最新，可继续从最新保存。`,
    '删除版本',
    { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
  )
    .then(async () => {
      const id = route.params.projectId
      if (typeof id !== 'string') return
      try {
        await apiClient.delete(`/api/v1/projects/${id}/requirement-doc/versions/${row.id}`)
        ElMessage.success('已删除')
        await fetchList()
      } catch (e: unknown) {
        ElMessage.error(e instanceof Error ? e.message : '删除失败')
      }
    })
    .catch(() => {})
}

watch(
  () => route.params.projectId,
  () => {
    void loadAll()
  },
)

watch(
  () => route.query.tab,
  () => syncListTabFromRoute(),
  { immediate: true },
)

watch(versionTableKey, () => {
  selectedForDiff.value = []
})

onMounted(() => {
  void loadAll()
})
</script>

<style scoped>
.req-doc-list {
  width: 100%;
  min-width: 0;
}

.req-card {
  width: 100%;
}

.req-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.req-card-head--stacked {
  flex-direction: column;
  align-items: stretch;
}

.req-tabs-wrap {
  width: 100%;
}

.req-main-tabs :deep(.el-tabs__header) {
  margin: 0 0 8px;
}

.req-card-head-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.req-card-head-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.req-title {
  font-weight: 600;
  font-size: 16px;
}

.req-card-head-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
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
