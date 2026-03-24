<template>
  <div class="req-doc-detail" v-loading="loading">
    <el-card v-if="!detail && !loading" shadow="never">
      <el-empty description="未找到该版本或已删除">
        <el-button type="primary" @click="goList">返回接口管理</el-button>
      </el-empty>
    </el-card>

    <el-card v-else-if="detail" shadow="never" class="detail-card">
      <template #header>
        <div class="detail-head">
          <div class="detail-head-left">
            <el-button text @click="goList">返回接口管理</el-button>
            <span class="detail-title">通用接口约束 v{{ detail.version_no }}</span>
            <el-tag v-if="detail.is_latest" size="small" type="success">最新</el-tag>
            <el-tag v-else size="small" type="info">历史</el-tag>
          </div>
          <div class="detail-head-right">
            <el-radio-group v-model="viewMode" size="small">
              <el-radio-button label="edit">编辑</el-radio-button>
              <el-radio-button label="preview">预览</el-radio-button>
            </el-radio-group>
            <el-button size="small" @click="aiVisible = true">AI 辅助</el-button>
            <el-button v-if="detail.is_latest" type="primary" size="small" @click="saveDialogVisible = true">保存</el-button>
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
          title="当前为历史版本，仅可查看。请打开最新版本进行编辑与保存。"
        />
        <div v-show="viewMode === 'edit'" class="editor-pane">
          <el-input v-model="markdown" type="textarea" :readonly="!detail.is_latest" placeholder="Markdown 正文" class="md-input" />
        </div>
        <div v-show="viewMode === 'preview'" class="preview-pane markdown-body" v-html="renderedHtml" />
      </div>
    </el-card>

    <el-dialog v-model="saveDialogVisible" title="保存方式" width="480px" destroy-on-close>
      <p class="dialog-lead">请选择如何保存当前正文：</p>
      <ul class="dialog-list">
        <li><strong>新建版本</strong>：保留当前版本记录，新增一条版本。</li>
        <li><strong>覆盖当前版本</strong>：只更新本条版本正文，不产生新版本。</li>
      </ul>
      <template #footer>
        <el-button @click="saveDialogVisible = false">取消</el-button>
        <el-button type="primary" plain :loading="saving" @click="doSave('overwrite')">覆盖当前版本</el-button>
        <el-button type="primary" :loading="saving" @click="doSave('new')">新建版本</el-button>
      </template>
    </el-dialog>

    <AiAssistDrawer
      v-model="aiVisible"
      title="AI 辅助（通用接口约束）"
      capability="api_catalog_constraint_assist"
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
import { ElMessage } from 'element-plus'
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiClient } from '@/api/client'
import AiAssistDrawer from '@/components/AiAssistDrawer'
import { buildRequirementDocDefaultPrompt, buildRequirementDocExternalPrompt } from '@/config/aiPromptTemplates'
import type { ApiCatalogConstraintVersionDetail, ApiEnvelope } from '@/types/api-contract'
import { markdownToHtmlFragment } from '@/utils/requirementDocExport'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const saving = ref(false)
const detail = ref<ApiCatalogConstraintVersionDetail | null>(null)
const markdown = ref('')
const viewMode = ref<'edit' | 'preview'>('edit')
const saveDialogVisible = ref(false)
const aiVisible = ref(false)
const typingTimer = ref<number | null>(null)
const lastAppliedAssistantId = ref<string | null>(null)
const allowAiDocumentApply = computed(() => detail.value?.is_latest === true)
const renderedHtml = computed(() => markdownToHtmlFragment(markdown.value || ''))
const defaultAiPrompt = computed(() => buildRequirementDocDefaultPrompt({ versionLabel: detail.value ? `通用接口约束 v${detail.value.version_no}` : '通用接口约束', markdownExcerpt: markdown.value.trim().slice(0, 220) || '（正文为空）' }))
const externalAiPrompt = computed(() => buildRequirementDocExternalPrompt({ versionLabel: detail.value ? `通用接口约束 v${detail.value.version_no}` : '通用接口约束', markdownExcerpt: markdown.value.trim().slice(0, 220) || '（正文为空）' }))
const aiPayloadBase = computed<Record<string, unknown>>(() => {
  const pid = typeof route.params.projectId === 'string' ? route.params.projectId : ''
  return { project_id: pid, version_id: detail.value?.id ?? '', version_no: detail.value?.version_no ?? 0, markdown: markdown.value }
})
const aiMemoryKey = computed(() => {
  const pid = typeof route.params.projectId === 'string' ? route.params.projectId : ''
  const vid = detail.value?.id ?? ''
  if (!pid || !vid) return ''
  return `${pid}:${vid}:api_catalog_constraint_assist`
})
const aiAnchorStorageKey = computed(() => (aiMemoryKey.value ? `pmp_ai_assist_history:${aiMemoryKey.value}:anchor` : ''))

watch(aiAnchorStorageKey, (k) => {
  if (!k || typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem(k)
    if (raw) lastAppliedAssistantId.value = raw
  } catch {
    // ignore
  }
}, { immediate: true })

function goList() {
  const id = route.params.projectId
  if (typeof id === 'string') void router.push({ name: 'project-m02c-apis', params: { projectId: id } })
}

async function fetchDetail() {
  const pid = route.params.projectId
  const vid = route.params.versionId
  if (typeof pid !== 'string' || typeof vid !== 'string') return
  const { data } = await apiClient.get<ApiEnvelope<ApiCatalogConstraintVersionDetail>>(`/api/v1/projects/${pid}/api-catalog/constraints/versions/${vid}`)
  detail.value = data.data ?? null
  markdown.value = data.data?.content_markdown ?? ''
}

async function load() {
  loading.value = true
  try {
    await fetchDetail()
  } catch {
    detail.value = null
    ElMessage.error('加载约束版本失败')
  } finally {
    loading.value = false
  }
}

async function doSave(mode: 'new' | 'overwrite') {
  const pid = route.params.projectId
  const vid = route.params.versionId
  if (typeof pid !== 'string' || typeof vid !== 'string' || !detail.value?.is_latest) return
  saving.value = true
  try {
    if (mode === 'overwrite') {
      await apiClient.patch(`/api/v1/projects/${pid}/api-catalog/constraints`, { content_markdown: markdown.value })
      ElMessage.success('已覆盖当前版本')
      saveDialogVisible.value = false
      await router.push({ name: 'project-m02c-apis', params: { projectId: pid } })
      return
    }
    await apiClient.post(`/api/v1/projects/${pid}/api-catalog/constraints/versions`, {
      markdown: markdown.value,
      based_on_version_id: vid,
    })
    ElMessage.success('已新建版本')
    saveDialogVisible.value = false
    await router.push({ name: 'project-m02c-apis', params: { projectId: pid } })
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    saving.value = false
  }
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
  if (!full.length) return
  const totalTicks = Math.min(240, Math.max(120, Math.ceil(full.length / 35)))
  const step = Math.max(1, Math.ceil(full.length / totalTicks))
  let i = 0
  typingTimer.value = window.setInterval(() => {
    i = Math.min(full.length, i + step)
    markdown.value = full.slice(0, i)
    if (i >= full.length) {
      if (typingTimer.value) window.clearInterval(typingTimer.value)
      typingTimer.value = null
    }
  }, 16)
}
function handleAiApplyWithMeta(payload: { assistantId: string; text: string }) { applyMarkdownWithTyping(payload.text, payload.assistantId) }

watch(() => [route.params.projectId, route.params.versionId], () => { void load() }, { immediate: true })
onUnmounted(() => { if (typingTimer.value) window.clearInterval(typingTimer.value) })
</script>

<style scoped>
.req-doc-detail { width: 100%; min-width: 0; height: 100%; min-height: 0; overflow: hidden; }
.detail-card { width: 100%; height: 100%; min-height: 0; display: flex; flex-direction: column; }
.detail-card :deep(.el-card__body) { flex: 1; min-height: 0; overflow: hidden; }
.detail-content { height: 100%; min-height: 0; display: flex; flex-direction: column; }
.detail-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.detail-head-left { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.detail-title { font-weight: 600; font-size: 15px; }
.detail-head-right { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.detail-alert { margin-bottom: 12px; }
.editor-pane { flex: 1; min-height: 0; overflow: hidden; }
.md-input { height: 100%; }
.md-input :deep(.el-textarea) { height: 100%; }
.md-input :deep(.el-textarea__inner) { height: 100% !important; min-height: 100% !important; overflow: auto; resize: none; }
.md-input :deep(textarea) { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 13px; line-height: 1.5; }
.preview-pane { flex: 1; min-height: 0; padding: 12px 4px; border: 1px solid var(--el-border-color-lighter); border-radius: 8px; background: var(--el-fill-color-blank); overflow: auto; }
.dialog-lead { margin: 0 0 8px; color: var(--el-text-color-regular); }
.dialog-list { margin: 0; padding-left: 1.2rem; color: var(--el-text-color-regular); line-height: 1.6; }
</style>
