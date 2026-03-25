<!--
  REQ-M03：Story 需求文档单版本编辑；交互对齐 RequirementDocVersionDetailPage，API 前缀为 stories/{id}/requirement-doc。
-->
<template>
  <div class="req-doc-detail" v-loading="loading">
    <el-card v-if="!artifactKey" shadow="never">
      <el-empty description="路由配置缺少 artifactKey" />
    </el-card>

    <template v-else-if="!loading && project && !ready">
      <el-card shadow="never">
        <el-result icon="folder-opened" title="尚未解锁 Story 模块" :sub-title="subTitlePending">
          <template #extra>
            <el-button @click="goBackToStoryDetail">返回 Story 详情</el-button>
          </template>
        </el-result>
      </el-card>
    </template>

    <el-card v-else-if="ready && !detail && !loading" shadow="never">
      <el-empty description="未找到该版本或已删除">
        <el-button type="primary" @click="goBackToStoryDetail">返回 Story 详情</el-button>
      </el-empty>
    </el-card>

    <el-card v-else-if="detail" shadow="never" class="detail-card">
      <template #header>
        <div class="detail-head">
          <div class="detail-head-left">
            <el-button text @click="goBackToStoryDetail">返回 Story 详情</el-button>
            <span class="detail-title">Story 需求文档 v{{ detail.version_no }}</span>
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
      v-model="aiVisible"
      title="AI 辅助（Story 需求文档）"
      capability="story_requirement_doc_assist"
      :default-prompt="defaultAiPrompt"
      :external-prompt="externalAiPrompt"
      :payload-base="aiPayloadBase"
      :memory-key="aiMemoryKey"
      :document-text="markdown"
      :anchor-assistant-id="lastAppliedAssistantId"
      :allow-apply="allowAiDocumentApply"
      @apply="handleAiApplyWithMeta"
    />
  </div>
</template>

<script setup lang="ts">
import { ArrowDown } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { apiClient } from '@/api/client'
import AiAssistDrawer from '@/components/AiAssistDrawer'
import { buildRequirementDocDefaultPrompt, buildRequirementDocExternalPrompt } from '@/config/aiPromptTemplates'
import type { ApiEnvelope, PlanningStory, ProjectOneData, RequirementDocVersionDetail } from '@/types/api-contract'
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
const project = ref<ProjectOneData | null>(null)
const detail = ref<RequirementDocVersionDetail | null>(null)
const markdown = ref('')
const viewMode = ref<'edit' | 'preview'>('edit')
const saveDialogVisible = ref(false)
const aiVisible = ref(false)
const typingTimer = ref<number | null>(null)

const lastAppliedAssistantId = ref<string | null>(null)

const allowAiDocumentApply = computed(() => detail.value?.is_latest === true)

const artifactKey = computed(() => (route.meta.artifactKey as string) ?? '')
const reqRef = computed(() => (route.meta.reqRef as string) ?? '')

const ready = computed(() => {
  const k = artifactKey.value
  if (!k) return false
  return project.value?.artifacts?.[k] === true
})

const subTitlePending = computed(() => `按 ${reqRef.value} 在项目中启用「迭代与 Story」后可编辑 Story 需求文档。`)

const renderedHtml = computed(() => markdownToHtmlFragment(markdown.value || ''))

const storyNameForAi = ref('')

const defaultAiPrompt = computed(() => {
  const title = detail.value ? `v${detail.value.version_no}` : ''
  const excerpt = markdown.value.trim().slice(0, 220)
  return buildRequirementDocDefaultPrompt({
    versionLabel: `Story需求 ${storyNameForAi.value || '（未命名 Story）'} · ${title || '（未命名版本）'}`,
    markdownExcerpt: excerpt || '（正文为空）',
  })
})

const externalAiPrompt = computed(() => {
  const title = detail.value ? `v${detail.value.version_no}` : ''
  const excerpt = markdown.value.trim().slice(0, 220)
  return buildRequirementDocExternalPrompt({
    versionLabel: `Story需求 ${storyNameForAi.value || '（未命名 Story）'} · ${title || '（未命名版本）'}`,
    markdownExcerpt: excerpt || '（正文为空）',
  })
})

const aiPayloadBase = computed<Record<string, unknown>>(() => {
  const pid = typeof route.params.projectId === 'string' ? route.params.projectId : ''
  const sid = typeof route.params.storyId === 'string' ? route.params.storyId : ''
  return {
    project_id: pid,
    story_id: sid,
    story_name: storyNameForAi.value,
    version_id: detail.value?.id ?? '',
    version_no: detail.value?.version_no ?? 0,
    markdown: markdown.value,
  }
})

const aiMemoryKey = computed(() => {
  const pid = typeof route.params.projectId === 'string' ? route.params.projectId : ''
  const sid = typeof route.params.storyId === 'string' ? route.params.storyId : ''
  const vid = detail.value?.id ?? ''
  if (!pid || !sid || !vid) return ''
  return `${pid}:${sid}:${vid}:story_requirement_doc_assist`
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

function goBackToStoryDetail() {
  const pid = route.params.projectId
  const iid = route.params.iterationId
  const sid = route.params.storyId
  if (typeof pid === 'string' && typeof iid === 'string' && typeof sid === 'string') {
    void router.push({ name: 'project-m03-story-detail', params: { projectId: pid, iterationId: iid, storyId: sid } })
  }
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

async function fetchStoryName() {
  const pid = route.params.projectId
  const sid = route.params.storyId
  if (typeof pid !== 'string' || typeof sid !== 'string') return
  try {
    const { data } = await apiClient.get<ApiEnvelope<PlanningStory>>(`/api/v1/projects/${pid}/stories/${sid}`)
    storyNameForAi.value = data.data?.title?.trim() ?? ''
  } catch {
    storyNameForAi.value = ''
  }
}

async function fetchDetail() {
  const pid = route.params.projectId
  const sid = route.params.storyId
  const vid = route.params.versionId
  if (typeof pid !== 'string' || typeof sid !== 'string' || typeof vid !== 'string') return
  try {
    const { data } = await apiClient.get<ApiEnvelope<RequirementDocVersionDetail>>(
      `/api/v1/projects/${pid}/stories/${sid}/requirement-doc/versions/${vid}`,
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
    if (ready.value) {
      await fetchStoryName()
      await fetchDetail()
    }
  } finally {
    loading.value = false
  }
}

async function doSave(mode: 'new' | 'overwrite') {
  const pid = route.params.projectId
  const sid = route.params.storyId
  const vid = route.params.versionId
  if (typeof pid !== 'string' || typeof sid !== 'string' || typeof vid !== 'string' || !detail.value?.is_latest) return
  saving.value = true
  try {
    if (mode === 'overwrite') {
      const { data } = await apiClient.patch<ApiEnvelope<RequirementDocVersionDetail>>(
        `/api/v1/projects/${pid}/stories/${sid}/requirement-doc/versions/${vid}`,
        { markdown: markdown.value },
      )
      const d = data.data
      if (d) {
        detail.value = d
        markdown.value = d.markdown
      }
      ElMessage.success('已覆盖当前版本')
      saveDialogVisible.value = false
      goBackToStoryDetail()
    } else {
      const { data } = await apiClient.post<ApiEnvelope<RequirementDocVersionDetail>>(
        `/api/v1/projects/${pid}/stories/${sid}/requirement-doc/versions`,
        { markdown: markdown.value, based_on_version_id: vid },
      )
      const d = data.data
      if (d?.id) {
        ElMessage.success('已新建版本')
        saveDialogVisible.value = false
        goBackToStoryDetail()
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
  const base = `Story需求文档-v${d.version_no}`
  const title = `Story需求文档 v${d.version_no}`
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

watch(
  () => [route.params.projectId, route.params.storyId, route.params.versionId],
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
</style>

