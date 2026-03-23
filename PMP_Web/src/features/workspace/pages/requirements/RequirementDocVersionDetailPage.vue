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
          :autosize="{ minRows: 22, maxRows: 48 }"
          :readonly="!detail.is_latest"
          placeholder="Markdown 正文"
          class="md-input"
        />
      </div>
      <div v-show="viewMode === 'preview'" class="preview-pane markdown-body" v-html="renderedHtml" />
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
  </div>
</template>

<script setup lang="ts">
import { ArrowDown } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { apiClient } from '@/api/client'
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
    } else {
      const { data } = await apiClient.post<ApiEnvelope<RequirementDocVersionDetail>>(
        `/api/v1/projects/${pid}/requirement-doc/versions`,
        { markdown: markdown.value, based_on_version_id: vid },
      )
      const d = data.data
      if (d?.id) {
        ElMessage.success('已新建版本')
        saveDialogVisible.value = false
        await router.replace({
          name: 'project-m02-requirements-version',
          params: { projectId: pid, versionId: d.id },
        })
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

watch(
  () => [route.params.projectId, route.params.versionId],
  () => {
    void load()
  },
  { immediate: true },
)
</script>

<style scoped>
.req-doc-detail {
  width: 100%;
  min-width: 0;
}

.detail-card {
  width: 100%;
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
  min-height: 320px;
}

.md-input :deep(textarea) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  line-height: 1.5;
}

.preview-pane {
  min-height: 320px;
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
