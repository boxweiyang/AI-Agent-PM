<!--
  需求对照卡片：查看最新版需求文档（只读预览 + 下载）。
  原技术设计页首段抽离，供 M02B / M03 等模块复用。
-->
<template>
  <el-card shadow="never" class="req-compare-card">
    <template #header>
      <span class="req-compare-title">需求对照</span>
    </template>
    <p class="req-compare-desc">{{ descriptionText }}</p>
    <div class="req-compare-actions">
      <el-button type="primary" :disabled="!effectiveReqDocReady" @click="openReqPreview">
        查看最新版需求文档
      </el-button>
      <p v-if="!effectiveReqDocReady" class="req-compare-hint-row">
        <span class="req-compare-muted">
          请先在「需求与文档」中生成并维护需求，再使用本入口。
        </span>
        <router-link
          v-if="projectId"
          class="req-compare-link"
          :to="{ name: 'project-m02-requirements', params: { projectId } }"
        >
          前往创建
        </router-link>
      </p>
    </div>

    <el-dialog
      v-model="reqDialogVisible"
      :title="reqDialogTitle"
      width="920px"
      destroy-on-close
      class="req-preview-dialog"
      @closed="onReqDialogClosed"
    >
      <div v-loading="reqLoading" class="req-dialog-inner">
        <template v-if="!reqLoading && reqPreviewMarkdown !== ''">
          <p class="req-dialog-meta">
            摘要来自当前项目的<strong>最新</strong>需求版本（只读）
            <template v-if="reqPreviewCreatedAt"> · {{ formatTime(reqPreviewCreatedAt) }}</template>
          </p>
          <div class="markdown-body req-md-preview" v-html="reqPreviewHtml" />
        </template>
        <el-empty v-else-if="!reqLoading" description="暂无正文" />
      </div>
      <template #footer>
        <el-dropdown trigger="click" :disabled="!reqPreviewMarkdown" @command="onReqExportCommand">
          <el-button type="primary" plain :disabled="!reqPreviewMarkdown">
            下载
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
        <el-button @click="reqDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { ArrowDown } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { computed, onMounted, ref, watch } from 'vue'

import { apiClient } from '@/api/client'
import type { ApiEnvelope, ProjectOneData, RequirementDocVersionDetail, RequirementDocVersionListData } from '@/types/api-contract'
import {
  exportRequirementHtml,
  exportRequirementMarkdown,
  markdownToHtmlFragment,
  printMarkdownAsPdf,
} from '@/utils/requirementDocExport'

const DEFAULT_DESCRIPTION =
  '编写技术设计前，建议先对照已确认的最新版需求正文。以下为只读预览，可在弹窗内下载。'

const props = withDefaults(
  defineProps<{
    /** 项目 id */
    projectId: string
    /**
     * 若父组件已加载项目并掌握 `artifacts.req_doc`，可传入以避免重复 GET。
     * 不传时组件会自行请求 `GET /projects/:id` 判断。
     */
    reqDocReady?: boolean
    /** 卡片说明文案（模块可自定义） */
    description?: string
  }>(),
  {
    description: '',
  },
)

const descriptionText = computed(() => (props.description?.trim() ? props.description : DEFAULT_DESCRIPTION))

/** 未传 reqDocReady 时由 GET 项目得到 artifacts.req_doc */
const reqReadyFromProject = ref<boolean | null>(null)
/** 在 artifact 已就绪时，是否仍存在至少一条需求版本（删光版本后应为 false） */
const hasRequirementVersions = ref<boolean | null>(null)

const artifactReqDocOk = computed(() => {
  if (props.reqDocReady !== undefined) return props.reqDocReady
  return reqReadyFromProject.value === true
})

const effectiveReqDocReady = computed(() => {
  if (!artifactReqDocOk.value) return false
  return hasRequirementVersions.value === true
})

/**
 * 同步「需求模块标记 + 版本是否存在」。
 * 仅 artifacts.req_doc 不能代表仍有正文：用户可能已删光版本，此时按钮应禁用并走「前往创建」提示。
 */
async function refreshRequirementGates() {
  if (!props.projectId) {
    reqReadyFromProject.value = null
    hasRequirementVersions.value = null
    return
  }

  if (props.reqDocReady === undefined) {
    try {
      const { data } = await apiClient.get<ApiEnvelope<ProjectOneData>>(`/api/v1/projects/${props.projectId}`)
      reqReadyFromProject.value = data.data?.artifacts?.req_doc === true
    } catch {
      reqReadyFromProject.value = false
    }
  }

  const artifactOk =
    props.reqDocReady !== undefined ? props.reqDocReady : reqReadyFromProject.value === true

  if (!artifactOk) {
    hasRequirementVersions.value = null
    return
  }

  try {
    const { data } = await apiClient.get<ApiEnvelope<RequirementDocVersionListData>>(
      `/api/v1/projects/${props.projectId}/requirement-doc/versions`,
    )
    const d = data.data
    const lid = d?.latest_version_id
    const n = d?.items?.length ?? 0
    hasRequirementVersions.value = Boolean(lid) || n > 0
  } catch {
    hasRequirementVersions.value = false
  }
}

const reqDialogVisible = ref(false)
const reqLoading = ref(false)
const reqPreviewMarkdown = ref('')
const reqPreviewVersionNo = ref<number | null>(null)
const reqPreviewCreatedAt = ref('')

const reqDialogTitle = computed(() => {
  const v = reqPreviewVersionNo.value
  return v != null ? `需求文档（最新 · v${v}）` : '需求文档（最新版）'
})

const reqPreviewHtml = computed(() => markdownToHtmlFragment(reqPreviewMarkdown.value || ''))

async function openReqPreview() {
  const pid = props.projectId
  if (!pid || !effectiveReqDocReady.value) return
  reqDialogVisible.value = true
  reqPreviewMarkdown.value = ''
  reqPreviewVersionNo.value = null
  reqPreviewCreatedAt.value = ''
  reqLoading.value = true
  try {
    const { data } = await apiClient.get<ApiEnvelope<RequirementDocVersionListData>>(
      `/api/v1/projects/${pid}/requirement-doc/versions`,
    )
    const lid = data.data?.latest_version_id
    if (!lid) {
      hasRequirementVersions.value = false
      ElMessage.warning('当前项目尚无需求文档版本')
      reqDialogVisible.value = false
      return
    }
    const { data: d2 } = await apiClient.get<ApiEnvelope<RequirementDocVersionDetail>>(
      `/api/v1/projects/${pid}/requirement-doc/versions/${lid}`,
    )
    const d = d2.data
    if (!d) {
      ElMessage.error('无法读取需求版本')
      reqDialogVisible.value = false
      return
    }
    reqPreviewMarkdown.value = d.markdown ?? ''
    reqPreviewVersionNo.value = d.version_no
    reqPreviewCreatedAt.value = d.created_at
  } catch {
    ElMessage.error('加载需求文档失败')
    reqDialogVisible.value = false
  } finally {
    reqLoading.value = false
  }
}

function onReqDialogClosed() {
  reqPreviewMarkdown.value = ''
  reqPreviewVersionNo.value = null
  reqPreviewCreatedAt.value = ''
}

function onReqExportCommand(cmd: string) {
  const md = reqPreviewMarkdown.value
  if (!md) return
  const vn = reqPreviewVersionNo.value ?? ''
  const base = `需求文档-v${vn}`
  const title = `需求文档 v${vn}`
  if (cmd === 'md') exportRequirementMarkdown(base, md)
  else if (cmd === 'html') exportRequirementHtml(base, title, md)
  else if (cmd === 'pdf') {
    const ok = printMarkdownAsPdf(title, md)
    if (!ok) ElMessage.warning('请允许弹出窗口以使用打印为 PDF')
  }
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

watch(
  () => props.projectId,
  () => {
    reqReadyFromProject.value = null
    hasRequirementVersions.value = null
    void refreshRequirementGates()
  },
)

watch(
  () => props.reqDocReady,
  () => {
    void refreshRequirementGates()
  },
)

onMounted(() => {
  void refreshRequirementGates()
})
</script>

<style scoped>
.req-compare-card {
  width: 100%;
}

.req-compare-title {
  font-weight: 600;
}

.req-compare-desc {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.55;
}

.req-compare-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.req-compare-hint-row {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 10px;
  font-size: 13px;
  line-height: 1.55;
}

.req-compare-muted {
  color: var(--el-text-color-secondary);
}

.req-compare-link {
  color: var(--el-color-primary);
  font-weight: 500;
  text-decoration: none;
  white-space: nowrap;
}

.req-compare-link:hover {
  text-decoration: underline;
}

.req-dialog-inner {
  min-height: 200px;
  max-height: min(70vh, 640px);
  overflow: auto;
}

.req-dialog-meta {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.req-md-preview {
  padding: 4px 0;
}
</style>
