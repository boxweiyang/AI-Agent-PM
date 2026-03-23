<!--
  REQ-M02：单版本 Markdown 编辑/预览；仅最新可保存；保存时弹窗选新建版本或覆盖。
-->
<template>
  <div class="req-doc-detail" v-loading="loading">
    <el-card v-if="!artifactKey" shadow="never">
      <el-empty description="路由配置缺少 artifactKey" />
    </el-card>

    <template v-else-if="!loading && project && !ready">
      <el-card shadow="never">
        <el-result icon="folder-opened" title="尚未生成该模块内容" :sub-title="subTitlePending">
          <template #extra>
            <el-button type="primary" :loading="generating" @click="onGenerate">一键生成（演示）</el-button>
            <el-button @click="goList">返回需求文档列表</el-button>
          </template>
        </el-result>
      </el-card>
    </template>

    <el-card v-else-if="ready && !detail && !loading" shadow="never">
      <el-empty description="未找到该版本或已删除">
        <el-button type="primary" @click="goList">返回列表</el-button>
      </el-empty>
    </el-card>

    <el-card v-else-if="detail" shadow="never" class="detail-card">
      <template #header>
        <div class="detail-head">
          <div class="detail-head-left">
            <el-button text @click="goList">返回列表</el-button>
            <span class="detail-title">需求文档 v{{ detail.version_no }}</span>
            <el-tag v-if="detail.is_latest" size="small" type="success">最新</el-tag>
            <el-tag v-else size="small" type="info">历史</el-tag>
          </div>
          <div class="detail-head-right">
            <el-radio-group v-model="viewMode" size="small">
              <el-radio-button label="edit">编辑</el-radio-button>
              <el-radio-button label="preview">预览</el-radio-button>
            </el-radio-group>
            <el-button size="small" @click="aiVisible = true">AI 辅助</el-button>
            <el-dropdown trigger="click" @command="onExportCommand">
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
            <el-button v-if="detail.is_latest" type="primary" size="small" @click="saveDialogVisible = true">
              保存
            </el-button>
          </div>
        </div>
      </template>

      <div class="detail-content">
        <el-alert
          v-if="!detail.is_latest"
          type="warning"
          show-icon
          :closable="false"
          class="detail-alert"
          title="当前为历史版本，仅可查看与导出。请在列表打开「最新」版本进行编辑与保存。"
        />

        <div v-show="viewMode === 'edit'" class="editor-pane">
          <el-input
            v-model="markdown"
            type="textarea"
            :readonly="!detail.is_latest"
            placeholder="Markdown 正文"
            class="md-input"
          />
        </div>
        <div v-show="viewMode === 'preview'" class="preview-pane markdown-body" v-html="renderedHtml" />
      </div>
    </el-card>

    <el-dialog v-model="saveDialogVisible" title="保存方式" width="480px" destroy-on-close>
      <p class="dialog-lead">请选择如何保存当前正文：</p>
      <ul class="dialog-list">
        <li><strong>新建版本</strong>：保留当前版本记录，新增一条版本（仅当本条为<strong>最新</strong>时可用）。</li>
        <li><strong>覆盖当前版本</strong>：只更新本条版本的正文，不产生新版本（仅<strong>最新</strong>可覆盖）。</li>
      </ul>
      <template #footer>
        <el-button @click="saveDialogVisible = false">取消</el-button>
        <el-button type="primary" plain :loading="saving" @click="doSave('overwrite')">覆盖当前版本</el-button>
        <el-button type="primary" :loading="saving" @click="doSave('new')">新建版本</el-button>
      </template>
    </el-dialog>

    <AiAssistDrawer
      ref="aiDrawerRef"
      v-model="aiVisible"
      title="AI 辅助（需求文档）"
      capability="requirement_doc_assist"
      :default-prompt="defaultAiPrompt"
      :external-prompt="externalAiPrompt"
      :payload-base="aiPayloadBase"
      :memory-key="aiMemoryKey"
      @apply="handleAiApplyWithMeta"
      @propose="handleAiPropose"
    />

    <el-dialog
      v-model="diffDialogVisible"
      title="差异对比"
      width="920px"
      destroy-on-close
      :close-on-click-modal="false"
      @closed="onDiffDialogClosed"
    >
      <p class="dialog-lead">AI 将在当前正文基础上做修改。请确认后选择接受或回退。</p>
      <el-scrollbar height="520px" class="diff-scroll">
        <div class="diff-lines">
          <div
            v-for="(d, idx) in diffLinesRender"
            :key="idx"
            class="diff-line"
            :class="`is-${d.kind}`"
          >
            <span class="diff-prefix">{{ d.kind === 'add' ? '+' : d.kind === 'del' ? '-' : ' ' }}</span>
            <span class="diff-text" :title="d.line">{{ d.line }}</span>
          </div>
        </div>
      </el-scrollbar>
      <template #footer>
        <el-button @click="onRollbackDiff">回退</el-button>
        <el-button type="primary" plain @click="onAcceptDiff">接受</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ArrowDown } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { apiClient } from '@/api/client'
import AiAssistDrawer from '@/components/AiAssistDrawer.vue'
import { buildRequirementDocDefaultPrompt, buildRequirementDocExternalPrompt } from '@/config/aiPromptTemplates'
import type {
  ApiEnvelope,
  ProjectOneData,
  ProjectPatchRequestBody,
  RequirementDocVersionDetail,
} from '@/types/api-contract'
import {
  exportRequirementHtml,
  exportRequirementMarkdown,
  markdownToHtmlFragment,
  printMarkdownAsPdf,
} from '@/utils/requirementDocExport'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const saving = ref(false)
const generating = ref(false)
const project = ref<ProjectOneData | null>(null)
const detail = ref<RequirementDocVersionDetail | null>(null)
const markdown = ref('')
const viewMode = ref<'edit' | 'preview'>('edit')
const saveDialogVisible = ref(false)
const aiVisible = ref(false)
const typingTimer = ref<number | null>(null)

const aiDrawerRef = ref<{ truncateHistoryToAssistantId: (id: string | null) => void } | null>(null)
const lastAppliedAssistantId = ref<string | null>(null)

const diffDialogVisible = ref(false)
const diffOldMd = ref('')
const diffNewMd = ref('')
const proposedAssistantId = ref<string | null>(null)
const diffLinesRender = ref<Array<{ kind: 'equal' | 'add' | 'del'; line: string }>>([])
const diffAction = ref<'accept' | 'rollback' | null>(null)

const artifactKey = computed(() => (route.meta.artifactKey as string) ?? '')
const reqRef = computed(() => (route.meta.reqRef as string) ?? '')

const ready = computed(() => {
  const k = artifactKey.value
  if (!k) return false
  return project.value?.artifacts?.[k] === true
})

const subTitlePending = computed(
  () => `按 ${reqRef.value} 落地后可编辑需求文档。演示环境可先「生成」解锁入口。`,
)

const renderedHtml = computed(() => markdownToHtmlFragment(markdown.value || ''))
const defaultAiPrompt = computed(() => {
  const title = detail.value ? `v${detail.value.version_no}` : ''
  const excerpt = markdown.value.trim().slice(0, 220)
  return buildRequirementDocDefaultPrompt({
    versionLabel: title || '（未命名版本）',
    markdownExcerpt: excerpt || '（正文为空）',
  })
})

const externalAiPrompt = computed(() => {
  const title = detail.value ? `v${detail.value.version_no}` : ''
  const excerpt = markdown.value.trim().slice(0, 220)
  return buildRequirementDocExternalPrompt({
    versionLabel: title || '（未命名版本）',
    markdownExcerpt: excerpt || '（正文为空）',
  })
})

const aiPayloadBase = computed<Record<string, unknown>>(() => {
  const pid = typeof route.params.projectId === 'string' ? route.params.projectId : ''
  return {
    project_id: pid,
    version_id: detail.value?.id ?? '',
    version_no: detail.value?.version_no ?? 0,
    markdown: markdown.value,
  }
})

const aiMemoryKey = computed(() => {
  const pid = typeof route.params.projectId === 'string' ? route.params.projectId : ''
  const vid = detail.value?.id ?? ''
  if (!pid || !vid) return ''
  return `${pid}:${vid}:requirement_doc_assist`
})

const aiAnchorStorageKey = computed(() => (aiMemoryKey.value ? `pmp_ai_assist_history:${aiMemoryKey.value}:anchor` : ''))

watch(
  aiAnchorStorageKey,
  (k) => {
    if (!k) return
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(k)
      if (raw) lastAppliedAssistantId.value = raw
    } catch {
      // ignore
    }
  },
  { immediate: true },
)

function goList() {
  const id = route.params.projectId
  if (typeof id === 'string') void router.push({ name: 'project-m02-requirements', params: { projectId: id } })
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

async function fetchDetail() {
  const pid = route.params.projectId
  const vid = route.params.versionId
  if (typeof pid !== 'string' || typeof vid !== 'string') return
  try {
    const { data } = await apiClient.get<ApiEnvelope<RequirementDocVersionDetail>>(
      `/api/v1/projects/${pid}/requirement-doc/versions/${vid}`,
    )
    const d = data.data
    detail.value = d ?? null
    markdown.value = d?.markdown ?? ''
  } catch {
    detail.value = null
    ElMessage.error('加载版本失败')
  }
}

async function load() {
  loading.value = true
  try {
    await fetchProject()
    if (ready.value) await fetchDetail()
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
    await fetchDetail()
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '生成失败')
  } finally {
    generating.value = false
  }
}

async function doSave(mode: 'new' | 'overwrite') {
  const pid = route.params.projectId
  const vid = route.params.versionId
  if (typeof pid !== 'string' || typeof vid !== 'string' || !detail.value?.is_latest) return
  saving.value = true
  try {
    if (mode === 'overwrite') {
      const { data } = await apiClient.patch<ApiEnvelope<RequirementDocVersionDetail>>(
        `/api/v1/projects/${pid}/requirement-doc/versions/${vid}`,
        { markdown: markdown.value },
      )
      const d = data.data
      if (d) {
        detail.value = d
        markdown.value = d.markdown
      }
      ElMessage.success('已覆盖当前版本')
      saveDialogVisible.value = false
      await router.push({ name: 'project-m02-requirements', params: { projectId: pid } })
    } else {
      const { data } = await apiClient.post<ApiEnvelope<RequirementDocVersionDetail>>(
        `/api/v1/projects/${pid}/requirement-doc/versions`,
        { markdown: markdown.value, based_on_version_id: vid },
      )
      const d = data.data
      if (d?.id) {
        ElMessage.success('已新建版本')
        saveDialogVisible.value = false
        await router.push({ name: 'project-m02-requirements', params: { projectId: pid } })
      }
    }
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    saving.value = false
  }
}

function exportCurrent(kind: 'md' | 'html' | 'pdf') {
  const d = detail.value
  if (!d) return
  const base = `需求文档-v${d.version_no}`
  const title = `需求文档 v${d.version_no}`
  const md = markdown.value
  if (kind === 'md') exportRequirementMarkdown(base, md)
  else if (kind === 'html') exportRequirementHtml(base, title, md)
  else {
    const ok = printMarkdownAsPdf(title, md)
    if (!ok) ElMessage.warning('请允许弹出窗口以使用打印为 PDF')
  }
}

function onExportCommand(command: string) {
  if (command === 'md' || command === 'html' || command === 'pdf') exportCurrent(command)
}

function applyMarkdownWithTyping(text: string, assistantId: string) {
  if (!detail.value?.is_latest) {
    ElMessage.warning('历史版本不允许写入，请打开最新版本')
    return
  }

  lastAppliedAssistantId.value = assistantId
  if (aiAnchorStorageKey.value) {
    try {
      window.localStorage.setItem(aiAnchorStorageKey.value, assistantId)
    } catch {
      // ignore
    }
  }

  const full = text ?? ''
  if (typingTimer.value) {
    window.clearInterval(typingTimer.value)
    typingTimer.value = null
  }

  viewMode.value = 'edit'
  markdown.value = ''

  const len = full.length
  if (!len) return

  const totalTicks = Math.min(240, Math.max(120, Math.ceil(len / 35)))
  const step = Math.max(1, Math.ceil(len / totalTicks))

  let i = 0
  typingTimer.value = window.setInterval(() => {
    i = Math.min(len, i + step)
    markdown.value = full.slice(0, i)

    if (i >= len) {
      if (typingTimer.value) window.clearInterval(typingTimer.value)
      typingTimer.value = null
      markdown.value = full
    }
  }, 16)
}

function handleAiApplyWithMeta(payload: { assistantId: string; text: string }) {
  applyMarkdownWithTyping(payload.text, payload.assistantId)
}

function openDiffDialog(oldText: string, newText: string, assistantId: string) {
  diffOldMd.value = oldText ?? ''
  diffNewMd.value = newText ?? ''
  proposedAssistantId.value = assistantId
  diffLinesRender.value = buildLineDiff(diffOldMd.value, diffNewMd.value)
  diffAction.value = null
  diffDialogVisible.value = true
}

function closeDiffDialog() {
  diffDialogVisible.value = false
  proposedAssistantId.value = null
  diffLinesRender.value = []
}

function onAcceptDiff() {
  if (!proposedAssistantId.value) return
  if (!detail.value?.is_latest) {
    ElMessage.warning('历史版本不允许写入，请打开最新版本')
    return
  }

  diffAction.value = 'accept'
  aiDrawerRef.value?.truncateHistoryToAssistantId(proposedAssistantId.value)
  applyMarkdownWithTyping(diffNewMd.value, proposedAssistantId.value)
  closeDiffDialog()
}

function onRollbackDiff() {
  diffAction.value = 'rollback'
  aiDrawerRef.value?.truncateHistoryToAssistantId(lastAppliedAssistantId.value)
  closeDiffDialog()
}

function onDiffDialogClosed() {
  // 用户点右上角 X 关闭时视为回退：不应用 AI 修改，并回到上次编辑成功后的上下文。
  if (diffAction.value === null) onRollbackDiff()
}

function handleAiPropose(payload: { assistantId: string; markdown: string }) {
  if (!detail.value?.is_latest) {
    ElMessage.warning('当前为历史版本，仅允许查看与导出')
    return
  }
  openDiffDialog(markdown.value, payload.markdown, payload.assistantId)
}

function buildLineDiff(oldText: string, newText: string): Array<{ kind: 'equal' | 'add' | 'del'; line: string }> {
  const oldLines = (oldText ?? '').split('\n')
  const newLines = (newText ?? '').split('\n')

  const m = oldLines.length
  const n = newLines.length
  const maxCells = 600 * 600
  if (m * n > maxCells) {
    const out: Array<{ kind: 'equal' | 'add' | 'del'; line: string }> = []
    for (const line of oldLines) out.push({ kind: 'del', line })
    for (const line of newLines) out.push({ kind: 'add', line })
    return out
  }

  // LCS DP：行级 diff 的最小实现（用于 MVP 展示差别）
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      dp[i][j] = oldLines[i] === newLines[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  const out: Array<{ kind: 'equal' | 'add' | 'del'; line: string }> = []
  let i = 0
  let j = 0
  while (i < m && j < n) {
    if (oldLines[i] === newLines[j]) {
      out.push({ kind: 'equal', line: oldLines[i] })
      i += 1
      j += 1
      continue
    }
    if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ kind: 'del', line: oldLines[i] })
      i += 1
    } else {
      out.push({ kind: 'add', line: newLines[j] })
      j += 1
    }
  }
  while (i < m) {
    out.push({ kind: 'del', line: oldLines[i] })
    i += 1
  }
  while (j < n) {
    out.push({ kind: 'add', line: newLines[j] })
    j += 1
  }
  return out
}

watch(
  () => [route.params.projectId, route.params.versionId],
  () => {
    void load()
  },
  { immediate: true },
)

onUnmounted(() => {
  if (typingTimer.value) window.clearInterval(typingTimer.value)
})
</script>

<style scoped>
.req-doc-detail {
  width: 100%;
  min-width: 0;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.detail-card {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.detail-card :deep(.el-card__body) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.detail-content {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.detail-head-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.detail-title {
  font-weight: 600;
  font-size: 15px;
}

.detail-head-right {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.detail-alert {
  margin-bottom: 12px;
}

.editor-pane {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.md-input {
  height: 100%;
}

.md-input :deep(.el-textarea) {
  height: 100%;
}

.md-input :deep(.el-textarea__inner) {
  height: 100% !important;
  min-height: 100% !important;
  overflow: auto;
  resize: none;
}

.md-input :deep(textarea) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  line-height: 1.5;
}

.preview-pane {
  flex: 1;
  min-height: 0;
  padding: 12px 4px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-blank);
  overflow: auto;
}

.preview-pane :deep(h1),
.preview-pane :deep(h2),
.preview-pane :deep(h3) {
  margin: 0.6em 0 0.35em;
  font-weight: 600;
}

.preview-pane :deep(p) {
  margin: 0.5em 0;
}

.preview-pane :deep(ul) {
  padding-left: 1.4em;
}

.preview-pane :deep(pre) {
  padding: 12px;
  overflow: auto;
  border-radius: 6px;
  background: var(--el-fill-color-light);
}

.dialog-lead {
  margin: 0 0 8px;
  color: var(--el-text-color-regular);
}

.dialog-list {
  margin: 0;
  padding-left: 1.2rem;
  color: var(--el-text-color-regular);
  line-height: 1.6;
}

.diff-scroll {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-blank);
  padding: 8px 10px;
}

.diff-lines {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12.5px;
  line-height: 1.55;
}

.diff-line {
  display: flex;
  gap: 10px;
  white-space: pre-wrap;
  word-break: break-word;
  padding: 2px 0;
}

.diff-prefix {
  width: 18px;
  flex-shrink: 0;
  text-align: right;
  color: var(--el-text-color-secondary);
}

.diff-text {
  flex: 1;
}

.diff-line.is-add {
  color: var(--el-color-success);
}

.diff-line.is-del {
  color: var(--el-color-danger);
}

.diff-line.is-equal {
  color: var(--el-text-color-regular);
}
</style>
