<!--
  REQ-M03：Story 详情（查看/编辑）与该 Story 下 Task 列表。
  交互风格对齐 IterationDetailPage：默认展示紧凑信息，点“编辑”进入表单模式。
-->
<template>
  <div class="story-detail" v-loading="pageLoading">
    <el-card v-if="!artifactKey" shadow="never">
      <el-empty description="路由配置缺少 artifactKey" />
    </el-card>

    <template v-else-if="!pageLoading && project && !ready">
      <el-card shadow="never">
        <el-result icon="folder-opened" title="尚未解锁迭代模块" :sub-title="subTitlePending">
          <template #extra>
            <el-button @click="goBackToIterationPlanning">返回迭代与 Story</el-button>
          </template>
        </el-result>
      </el-card>
    </template>

    <el-card v-else-if="ready && !story && !pageLoading" shadow="never">
      <el-empty description="未找到该 Story 或已删除">
        <el-button type="primary" @click="goBackToIterationPlanning">返回迭代与 Story</el-button>
      </el-empty>
    </el-card>

    <div v-else-if="story" class="story-detail-stack">
      <el-card shadow="never" class="block-card">
        <template #header>
          <div class="head-row">
            <div class="head-left">
              <el-button text @click="goBackToIterationPlanning">返回迭代与 Story</el-button>
              <span class="title">Story 详情 · {{ story.title }}</span>
              <el-tag size="small" type="info">优先级 {{ story.priority ?? '—' }}</el-tag>
            </div>
            <div class="head-actions">
              <template v-if="!metaEditing">
                <el-button type="primary" size="small" @click="startEditMeta">编辑</el-button>
                <el-button type="danger" size="small" @click="confirmDeleteStory">删除</el-button>
              </template>
            </div>
          </div>
        </template>

        <div v-if="!metaEditing" class="meta-view">
          <el-descriptions :column="2" size="small" border class="meta-descriptions">
            <el-descriptions-item label="标题">{{ story.title || '—' }}</el-descriptions-item>
            <el-descriptions-item label="优先级">{{ story.priority ?? '—' }}</el-descriptions-item>
            <el-descriptions-item label="验收标准 AC" :span="2">
              <div class="ac-block">
                <div v-if="story.acceptance_criteria.length">
                  <div v-for="(ac, i) in story.acceptance_criteria" :key="i" class="ac-line">• {{ ac }}</div>
                </div>
                <div v-else class="ac-empty">—</div>
              </div>
            </el-descriptions-item>
            <el-descriptions-item label="备注" :span="2">
              <span class="meta-long-text">{{ story.notes || '—' }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="更新时间" :span="2">
              {{ story.updated_at ? formatTime(story.updated_at) : '—' }}
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <div v-else class="meta-edit-form">
          <el-form label-width="108px">
            <el-form-item label="标题" required>
              <el-input v-model="metaForm.title" placeholder="Story 标题" />
            </el-form-item>

            <el-form-item label="验收标准" required>
              <div v-for="(ac, i) in metaForm.acceptance_criteria" :key="i" class="ac-row">
                <el-input v-model="metaForm.acceptance_criteria[i]" placeholder="一条 AC" />
                <el-button link type="danger" @click="removeAc(i)">删除</el-button>
              </div>
              <el-button size="small" @click="metaForm.acceptance_criteria.push('')">+ 添加 AC</el-button>
            </el-form-item>

            <el-form-item label="优先级">
              <el-select v-model="metaForm.priority" clearable placeholder="可选" style="width: 100%">
                <el-option v-for="p in 5" :key="p - 1" :label="String(p - 1)" :value="p - 1" />
              </el-select>
            </el-form-item>

            <el-form-item label="备注">
              <el-input v-model="metaForm.notes" type="textarea" :rows="3" />
            </el-form-item>
          </el-form>

          <div class="edit-actions">
            <el-button @click="metaEditing = false" :disabled="metaSaving">取消</el-button>
            <el-button type="primary" :loading="metaSaving" @click="saveMeta">保存</el-button>
          </div>
        </div>
      </el-card>

      <el-card shadow="never" class="block-card req-versions-card" v-loading="listLoading">
        <template #header>
          <div class="head-row">
            <span class="title">Story 需求文档</span>
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
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import DiffDialog from '@/components/DiffDialog'
import { apiClient } from '@/api/client'
import type {
  ApiEnvelope,
  PlanningPriority,
  PlanningStory,
  PlanningStoryPatchBody,
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

const projectId = computed(() => (typeof route.params.projectId === 'string' ? route.params.projectId : ''))
const iterationId = computed(() => (typeof route.params.iterationId === 'string' ? route.params.iterationId : ''))
const storyId = computed(() => (typeof route.params.storyId === 'string' ? route.params.storyId : ''))

const artifactKey = computed(() => (route.meta.artifactKey as string) ?? '')
const reqRef = computed(() => (route.meta.reqRef as string) ?? '')

const pageLoading = ref(true)
const project = ref<ProjectOneData | null>(null)
const ready = computed(() => {
  const k = artifactKey.value
  if (!k) return false
  return project.value?.artifacts?.[k] === true
})

const subTitlePending = computed(
  () => `按 ${reqRef.value} 在项目中启用「迭代与 Story」后可管理 Story 及其 Task。`,
)

const story = ref<PlanningStory | null>(null)
const listLoading = ref(false)
const docList = ref<RequirementDocVersionListData>({ items: [], latest_version_id: null })
const creating = ref(false)

const selectedForDiff = ref<RequirementDocVersionListItem[]>([])
const diffVisible = ref(false)
const diffLoading = ref(false)
const diffOldText = ref('')
const diffNewText = ref('')
const diffLeftHeader = ref('')
const diffRightHeader = ref('')

const metaSaving = ref(false)
const metaEditing = ref(false)
const metaForm = ref({
  title: '',
  acceptance_criteria: [''] as string[],
  priority: null as PlanningPriority | null,
  notes: '',
})

const latestVersionId = computed(() => docList.value.latest_version_id)
const versionTableKey = computed(() => docList.value.items.map((i) => i.id).join('|'))

function syncMetaFromStory(s: PlanningStory) {
  metaForm.value = {
    title: s.title,
    acceptance_criteria: s.acceptance_criteria?.length ? [...s.acceptance_criteria] : [''],
    priority: s.priority ?? null,
    notes: s.notes ?? '',
  }
}

function startEditMeta() {
  if (!story.value) return
  syncMetaFromStory(story.value)
  metaEditing.value = true
}

function removeAc(i: number) {
  metaForm.value.acceptance_criteria.splice(i, 1)
  if (!metaForm.value.acceptance_criteria.length) metaForm.value.acceptance_criteria.push('')
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

function goBackToIterationPlanning() {
  if (!projectId.value) return
  void router.push({
    name: 'project-m03-iterations',
    params: { projectId: projectId.value },
    query: { iteration_id: iterationId.value, story_id: storyId.value },
  })
}

async function fetchProject() {
  const pid = projectId.value
  if (!pid) return
  try {
    const { data } = await apiClient.get<ApiEnvelope<ProjectOneData>>(`/api/v1/projects/${pid}`)
    project.value = data.data ?? null
  } catch {
    project.value = null
    ElMessage.error('加载项目失败')
  }
}

async function fetchStory() {
  const pid = projectId.value
  const sid = storyId.value
  if (!pid || !sid) return
  try {
    const { data } = await apiClient.get<ApiEnvelope<PlanningStory>>(`/api/v1/projects/${pid}/stories/${sid}`)
    story.value = data.data ?? null
    if (story.value) syncMetaFromStory(story.value)
  } catch {
    story.value = null
    ElMessage.error('加载 Story 失败')
  }
}

async function fetchDocList() {
  const pid = projectId.value
  const sid = storyId.value
  if (!pid || !sid) return
  listLoading.value = true
  try {
    const { data } = await apiClient.get<ApiEnvelope<RequirementDocVersionListData>>(
      `/api/v1/projects/${pid}/stories/${sid}/requirement-doc/versions`,
    )
    docList.value = data.data ?? { items: [], latest_version_id: null }
  } catch {
    docList.value = { items: [], latest_version_id: null }
    ElMessage.error('加载 Story 需求文档版本失败')
  } finally {
    listLoading.value = false
  }
}

async function loadPage() {
  pageLoading.value = true
  try {
    await fetchProject()
    if (!ready.value) return
    await fetchStory()
    if (story.value) await fetchDocList()
  } finally {
    pageLoading.value = false
  }
}

async function saveMeta() {
  const pid = projectId.value
  const sid = storyId.value
  if (!pid || !sid || !story.value) return

  const ac = metaForm.value.acceptance_criteria.map((x) => x.trim()).filter(Boolean)
  if (!metaForm.value.title.trim() || ac.length === 0) {
    ElMessage.warning('请填写标题与至少一条验收标准')
    return
  }

  metaSaving.value = true
  try {
    const body: PlanningStoryPatchBody = {
      title: metaForm.value.title.trim(),
      acceptance_criteria: ac,
      priority: metaForm.value.priority ?? undefined,
      notes: metaForm.value.notes ?? '',
    }
    const { data } = await apiClient.patch<ApiEnvelope<PlanningStory>>(`/api/v1/projects/${pid}/stories/${sid}`, body)
    const updated = data.data
    if (updated) {
      story.value = updated
      syncMetaFromStory(updated)
    }
    metaEditing.value = false
    ElMessage.success('已保存')
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    metaSaving.value = false
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
    const [leftMd, rightMd] = await Promise.all([fetchVersionMarkdown(older.id), fetchVersionMarkdown(newer.id)])
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

async function fetchVersionMarkdown(versionId: string): Promise<string | null> {
  const pid = projectId.value
  const sid = storyId.value
  if (!pid || !sid) return null
  try {
    const { data } = await apiClient.get<ApiEnvelope<RequirementDocVersionDetail>>(
      `/api/v1/projects/${pid}/stories/${sid}/requirement-doc/versions/${versionId}`,
    )
    return data.data?.markdown ?? null
  } catch {
    return null
  }
}

async function createVersion(mode: 'empty' | 'from_latest') {
  const pid = projectId.value
  const sid = storyId.value
  if (!pid || !sid) return
  creating.value = true
  try {
    const { data } = await apiClient.post<ApiEnvelope<RequirementDocVersionDetail>>(
      `/api/v1/projects/${pid}/stories/${sid}/requirement-doc/versions`,
      { mode },
    )
    const row = data.data
    if (row?.id) {
      ElMessage.success('已创建版本')
      await fetchDocList()
      void router.push({
        name: 'project-m03-story-req-version',
        params: { projectId: pid, iterationId: iterationId.value, storyId: sid, versionId: row.id },
      })
    }
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '创建失败')
  } finally {
    creating.value = false
  }
}

function openVersion(versionId: string) {
  const pid = projectId.value
  const sid = storyId.value
  if (!pid || !sid) return
  void router.push({
    name: 'project-m03-story-req-version',
    params: { projectId: pid, iterationId: iterationId.value, storyId: sid, versionId },
  })
}

function onRowExportCommandForRow(versionId: string, command: unknown) {
  onRowExportCommand(versionId, String(command))
}

async function runExport(versionId: string, kind: 'md' | 'html' | 'pdf') {
  const md = await fetchVersionMarkdown(versionId)
  if (md == null) {
    ElMessage.error('无法读取该版本正文')
    return
  }
  const row = docList.value.items.find((x) => x.id === versionId)
  const storyName = story.value?.title?.trim() || 'story'
  const base = `Story需求文档-${storyName}-v${row?.version_no ?? versionId}`
  const title = `Story需求文档 v${row?.version_no ?? ''}`
  if (kind === 'md') exportRequirementMarkdown(base, md)
  else if (kind === 'html') exportRequirementHtml(base, title, md)
  else {
    const ok = printMarkdownAsPdf(title, md)
    if (!ok) ElMessage.warning('请允许弹出窗口以使用打印为 PDF')
  }
}

function onRowExportCommand(versionId: string, command: string) {
  if (command === 'md' || command === 'html' || command === 'pdf') void runExport(versionId, command)
}

async function onExportLatestCommand(command: string) {
  const vid = latestVersionId.value
  if (!vid) return
  if (command === 'md' || command === 'html' || command === 'pdf') {
    await runExport(vid, command)
  }
}

function confirmDelete(row: { id: string; version_no: number }) {
  const pid = projectId.value
  const sid = storyId.value
  if (!pid || !sid) return
  void ElMessageBox.confirm(
    `确定删除 v${row.version_no}？删除后若该版本为最新，将以上一版为最新，可继续从最新保存。`,
    '删除版本',
    { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
  )
    .then(async () => {
      try {
        await apiClient.delete(`/api/v1/projects/${pid}/stories/${sid}/requirement-doc/versions/${row.id}`)
        ElMessage.success('已删除')
        await fetchDocList()
      } catch (e: unknown) {
        ElMessage.error(e instanceof Error ? e.message : '删除失败')
      }
    })
    .catch(() => {})
}

function confirmDeleteStory() {
  const pid = projectId.value
  const sid = storyId.value
  if (!pid || !sid || !story.value) return
  void ElMessageBox.confirm(`确定删除 Story「${story.value.title}」？将级联删除 Story 下 Task。`, '删除 Story', {
    type: 'warning',
  })
    .then(async () => {
      await apiClient.delete(`/api/v1/projects/${pid}/stories/${sid}`)
      ElMessage.success('已删除')
      goBackToIterationPlanning()
    })
    .catch(() => {})
}

watch(versionTableKey, () => {
  selectedForDiff.value = []
})

watch(
  () => [projectId.value, iterationId.value, storyId.value],
  () => {
    void loadPage()
  },
)

onMounted(() => {
  void loadPage()
})
</script>

<style scoped>
.story-detail {
  width: 100%;
  min-width: 0;
  padding-bottom: 24px;
}

.story-detail-stack {
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

.meta-view {
  width: 100%;
  padding: 8px 0 2px;
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

.ac-block {
  width: 100%;
}

.ac-line {
  line-height: 1.6;
}

.ac-empty {
  color: var(--el-text-color-secondary);
}

.meta-edit-form {
  padding-top: 6px;
}

.ac-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.edit-actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.req-versions-card :deep(.el-card__body) {
  padding-top: 8px;
}

.req-table {
  width: 100%;
}

.req-diff-hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
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
</style>

