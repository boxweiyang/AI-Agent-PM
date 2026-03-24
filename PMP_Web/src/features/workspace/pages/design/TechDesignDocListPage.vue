<!--
  REQ-M02B：技术设计入口 — 需求对照 → 技术选型 → 技术设计文档版本列表。
-->
<template>
  <div class="tdoc-list">
    <template v-if="!artifactKey">
      <el-card shadow="never">
        <el-empty description="路由配置缺少 artifactKey" />
      </el-card>
    </template>

    <template v-else-if="pageLoading && !project">
      <el-card shadow="never">
        <el-skeleton :rows="8" animated />
      </el-card>
    </template>

    <template v-else-if="!project">
      <el-card shadow="never">
        <el-empty description="加载项目失败" />
      </el-card>
    </template>

    <template v-else>
      <div class="tdoc-page-head">
        <span class="tdoc-title">技术设计</span>
        <el-tag v-if="reqRef" size="small" type="info">{{ reqRef }}</el-tag>
      </div>

      <div class="tdoc-stack">
        <!-- 1. 需求对照 -->
        <el-card shadow="never" class="tdoc-section-card">
          <template #header>
            <span class="tdoc-section-title">需求对照</span>
          </template>
          <p class="tdoc-section-desc">
            编写技术设计前，建议先对照已确认的最新版需求正文。以下为只读预览，可在弹窗内下载。
          </p>
          <div class="tdoc-section-actions">
            <el-button type="primary" :disabled="!reqDocReady" @click="openReqPreview">查看最新版需求文档</el-button>
            <span v-if="!reqDocReady" class="tdoc-muted">请先在「需求与文档」中生成并维护需求，再使用本入口。</span>
          </div>
        </el-card>

        <!-- 2. 技术选型 -->
        <el-card shadow="never" class="tdoc-section-card">
          <template #header>
            <div class="selection-card-head">
              <span class="tdoc-section-title">技术选型</span>
              <el-button v-if="project" size="small" type="primary" plain @click="aiTechOpen = true">
                AI 辅助选型
              </el-button>
            </div>
          </template>
          <p class="tdoc-section-desc">
            将项目按交付形态拆分（如网站、App、小程序、后端服务等），分别记录技术栈、数据库与架构要点。可使用
            <strong>AI 辅助选型</strong>与模型讨论后生成草案，在对比弹窗确认后自动填入表单；再点击「确定保存」写入项目，作为后续技术设计文档的依据。
          </p>

          <div v-for="(row, idx) in selectionParts" :key="row.id" class="selection-block">
            <div class="selection-block-head">
              <span class="selection-block-label">交付部分 {{ idx + 1 }}</span>
              <el-button
                type="danger"
                link
                :disabled="selectionParts.length <= 1"
                @click="removeSelectionRow(idx)"
              >
                删除
              </el-button>
            </div>
            <el-form label-width="96px" class="selection-form">
              <el-form-item label="形态">
                <el-select v-model="row.delivery_kind" placeholder="选择类型" style="width: 100%; max-width: 360px">
                  <el-option
                    v-for="opt in TECH_DELIVERY_KIND_OPTIONS"
                    :key="opt.value"
                    :label="opt.label"
                    :value="opt.value"
                  />
                </el-select>
              </el-form-item>
              <el-form-item v-if="row.delivery_kind === 'other'" label="自定义名">
                <el-input v-model="row.custom_label" maxlength="120" show-word-limit placeholder="如：嵌入式固件、数据管道等" />
              </el-form-item>
              <el-form-item label="技术栈">
                <el-input
                  v-model="row.technologies"
                  type="textarea"
                  :rows="2"
                  placeholder="框架、语言、运行时等（可多行）"
                />
              </el-form-item>
              <el-form-item label="数据库">
                <el-input v-model="row.database" type="textarea" :rows="2" placeholder="库表、缓存、对象存储等；无则写「无」或「共用」" />
              </el-form-item>
              <el-form-item label="架构要点">
                <el-input
                  v-model="row.architecture"
                  type="textarea"
                  :rows="2"
                  placeholder="分层、部署、与其它部分如何协作"
                />
              </el-form-item>
              <el-form-item label="备注">
                <el-input v-model="row.notes" type="textarea" :rows="2" placeholder="可选" />
              </el-form-item>
            </el-form>
          </div>

          <div class="selection-toolbar">
            <el-button @click="addSelectionRow">添加交付部分</el-button>
            <el-button type="primary" :loading="selectionSaving" @click="saveTechSelection">确定保存</el-button>
          </div>
        </el-card>

        <!-- 3. 技术设计文档 -->
        <el-card v-if="!ready" shadow="never" class="tdoc-section-card">
          <el-result icon="folder-opened" title="尚未生成技术设计模块" :sub-title="subTitlePending">
            <template #extra>
              <el-button type="primary" :loading="generating" @click="onGenerate">一键生成（演示）</el-button>
              <el-button @click="goDetail">返回项目详情</el-button>
            </template>
          </el-result>
        </el-card>

        <el-card v-else shadow="never" class="tdoc-card" v-loading="docListLoading">
          <template #header>
            <div class="tdoc-card-head">
              <div class="tdoc-card-head-left">
                <span class="tdoc-card-title">技术设计文档</span>
                <span class="tdoc-muted">版本列表 · 编辑与 AI 辅助在详情页</span>
              </div>
              <div class="tdoc-card-head-actions">
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
                <el-button v-if="!list.items.length" type="primary" :loading="creating" @click="createVersion('empty')">
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

          <template v-if="!list.items.length">
            <el-empty description="暂无版本，请点击「创建首版文档」" />
          </template>
          <template v-else>
            <p v-if="list.items.length >= 2" class="tdoc-diff-hint">
              在表格左侧勾选<strong>两个</strong>版本，点击「对比选中版本」查看正文差异（只读，不修改任何版本）。
            </p>
            <el-table
              :key="versionTableKey"
              :data="list.items"
              row-key="id"
              stripe
              size="default"
              class="tdoc-table"
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
    </template>

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

    <AiAssistDrawer
      v-model="aiTechOpen"
      title="AI 辅助（技术选型）"
      capability="tech_selection_assist"
      assist-kind="tech_selection"
      :default-prompt="techSelectionDefaultPrompt"
      :external-prompt="techSelectionExternalPrompt"
      :payload-base="aiTechPayloadBase"
      :memory-key="aiTechMemoryKey"
      :tech-selection-parts="selectionParts"
      :anchor-assistant-id="lastAppliedTechSelectionAssistantId"
      @apply-tech-parts="onApplyTechPartsFromAi"
    />

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
import AiAssistDrawer from '@/components/AiAssistDrawer'
import DiffDialog from '@/components/DiffDialog'
import {
  buildTechSelectionDefaultPrompt,
  buildTechSelectionExternalPrompt,
} from '@/config/aiPromptTemplates'
import { TECH_DELIVERY_KIND_OPTIONS } from '@/config/techDeliveryPartKinds'
import type {
  ApiEnvelope,
  ProjectOneData,
  ProjectPatchRequestBody,
  RequirementDocVersionDetail,
  RequirementDocVersionListData,
  TechDesignDocVersionDetail,
  TechDesignDocVersionListData,
  TechDesignDocVersionListItem,
  TechDeliveryPart,
} from '@/types/api-contract'
import {
  exportRequirementHtml,
  exportRequirementMarkdown,
  markdownToHtmlFragment,
  printMarkdownAsPdf,
} from '@/utils/requirementDocExport'
import { formatTechDeliveryPartsForDiff } from '@/utils/techDeliveryPartsNormalize'

const route = useRoute()
const router = useRouter()

const pageLoading = ref(true)
const docListLoading = ref(false)
const creating = ref(false)
const generating = ref(false)
const selectionSaving = ref(false)
const project = ref<ProjectOneData | null>(null)
const list = ref<TechDesignDocVersionListData>({ items: [], latest_version_id: null })

const selectionParts = ref<TechDeliveryPart[]>([])

const aiTechOpen = ref(false)
const lastAppliedTechSelectionAssistantId = ref<string | null>(null)

const reqDialogVisible = ref(false)
const reqLoading = ref(false)
const reqPreviewMarkdown = ref('')
const reqPreviewVersionNo = ref<number | null>(null)
const reqPreviewCreatedAt = ref('')

const selectedForDiff = ref<TechDesignDocVersionListItem[]>([])
const diffVisible = ref(false)
const diffLoading = ref(false)
const diffOldText = ref('')
const diffNewText = ref('')
const diffLeftHeader = ref('')
const diffRightHeader = ref('')

const reqRef = computed(() => (route.meta.reqRef as string) ?? '')
const artifactKey = computed(() => (route.meta.artifactKey as string) ?? '')

const projectIdStr = computed(() => (typeof route.params.projectId === 'string' ? route.params.projectId : ''))

const ready = computed(() => {
  const k = artifactKey.value
  if (!k) return false
  return project.value?.artifacts?.[k] === true
})

const reqDocReady = computed(() => project.value?.artifacts?.req_doc === true)

const latestVersionId = computed(() => list.value.latest_version_id)

const versionTableKey = computed(() => list.value.items.map((i) => i.id).join('|'))

const subTitlePending = computed(
  () => `完成上方技术选型后，可一键解锁本模块，管理技术设计文档版本（${reqRef.value}）。`,
)

const reqDialogTitle = computed(() => {
  const v = reqPreviewVersionNo.value
  return v != null ? `需求文档（最新 · v${v}）` : '需求文档（最新版）'
})

const reqPreviewHtml = computed(() => markdownToHtmlFragment(reqPreviewMarkdown.value || ''))

const techSelectionExistingSummary = computed(() => {
  const parts = selectionParts.value
  if (!parts.length) return '（尚无条目）'
  const t = formatTechDeliveryPartsForDiff(parts)
  return t.length > 800 ? `${t.slice(0, 800)}…` : t
})

const techSelectionDefaultPrompt = computed(() =>
  buildTechSelectionDefaultPrompt({
    projectName: project.value?.name ?? '本项目',
    existingSummary: techSelectionExistingSummary.value,
  }),
)

const techSelectionExternalPrompt = computed(() =>
  buildTechSelectionExternalPrompt({
    projectName: project.value?.name ?? '本项目',
    existingSummary: techSelectionExistingSummary.value,
  }),
)

const aiTechPayloadBase = computed<Record<string, unknown>>(() => ({
  project_id: projectIdStr.value,
  project_name: project.value?.name ?? '',
  tech_delivery_parts: selectionParts.value.map((p) => ({ ...p })),
}))

const aiTechMemoryKey = computed(() => {
  const pid = projectIdStr.value
  if (!pid) return ''
  return `${pid}:tech_selection_assist`
})

const aiTechAnchorStorageKey = computed(() =>
  aiTechMemoryKey.value ? `pmp_ai_assist_history:${aiTechMemoryKey.value}:anchor` : '',
)

watch(
  aiTechAnchorStorageKey,
  (k) => {
    if (!k || typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(k)
      if (raw) lastAppliedTechSelectionAssistantId.value = raw
    } catch {
      // ignore
    }
  },
  { immediate: true },
)

function onApplyTechPartsFromAi(payload: { assistantId: string; parts: TechDeliveryPart[] }) {
  lastAppliedTechSelectionAssistantId.value = payload.assistantId
  if (aiTechAnchorStorageKey.value) {
    try {
      window.localStorage.setItem(aiTechAnchorStorageKey.value, payload.assistantId)
    } catch {
      // ignore
    }
  }
  selectionParts.value = payload.parts.map((p) => ({ ...p }))
}

function newSelectionRow(): TechDeliveryPart {
  return {
    id: `tdp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    delivery_kind: 'website',
    custom_label: '',
    technologies: '',
    database: '',
    architecture: '',
    notes: '',
  }
}

function syncSelectionFromProject() {
  const parts = project.value?.tech_delivery_parts
  if (parts && parts.length > 0) {
    selectionParts.value = parts.map((p) => ({ ...p }))
  } else {
    selectionParts.value = [newSelectionRow()]
  }
}

function addSelectionRow() {
  selectionParts.value.push(newSelectionRow())
}

function removeSelectionRow(idx: number) {
  if (selectionParts.value.length <= 1) return
  selectionParts.value.splice(idx, 1)
}

async function saveTechSelection() {
  const pid = projectIdStr.value
  if (!pid) return

  for (let i = 0; i < selectionParts.value.length; i++) {
    const row = selectionParts.value[i]
    if (!row.delivery_kind?.trim()) {
      ElMessage.warning(`请为「交付部分 ${i + 1}」选择形态`)
      return
    }
    if (row.delivery_kind === 'other' && !row.custom_label?.trim()) {
      ElMessage.warning(`「交付部分 ${i + 1}」选择「其它」时请填写自定义名称`)
      return
    }
  }

  const payload: TechDeliveryPart[] = selectionParts.value.map((r) => ({
    id: r.id,
    delivery_kind: r.delivery_kind.trim(),
    custom_label: r.custom_label?.trim() || undefined,
    technologies: r.technologies?.trim() || undefined,
    database: r.database?.trim() || undefined,
    architecture: r.architecture?.trim() || undefined,
    notes: r.notes?.trim() || undefined,
  }))

  selectionSaving.value = true
  try {
    const body: ProjectPatchRequestBody = { tech_delivery_parts: payload }
    const { data } = await apiClient.patch<ApiEnvelope<ProjectOneData>>(`/api/v1/projects/${pid}`, body)
    project.value = data.data ?? null
    syncSelectionFromProject()
    ElMessage.success('技术选型已保存到项目')
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    selectionSaving.value = false
  }
}

async function openReqPreview() {
  const pid = projectIdStr.value
  if (!pid || !reqDocReady.value) return
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

function versionRowSelectable(row: TechDesignDocVersionListItem) {
  return selectedForDiff.value.length < 2 || selectedForDiff.value.some((r) => r.id === row.id)
}

function onVersionSelectionChange(rows: TechDesignDocVersionListItem[]) {
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
  const id = projectIdStr.value
  if (id) void router.push({ name: 'project-detail', params: { projectId: id } })
}

async function fetchProject() {
  const id = projectIdStr.value
  if (!id) return
  try {
    const { data } = await apiClient.get<ApiEnvelope<ProjectOneData>>(`/api/v1/projects/${id}`)
    project.value = data.data ?? null
    syncSelectionFromProject()
  } catch {
    project.value = null
    ElMessage.error('加载项目失败')
  }
}

async function fetchDocListOnly() {
  const id = projectIdStr.value
  if (!id) return
  docListLoading.value = true
  try {
    const { data } = await apiClient.get<ApiEnvelope<TechDesignDocVersionListData>>(
      `/api/v1/projects/${id}/tech-design-doc/versions`,
    )
    list.value = data.data ?? { items: [], latest_version_id: null }
  } catch {
    list.value = { items: [], latest_version_id: null }
    ElMessage.error('加载版本列表失败')
  } finally {
    docListLoading.value = false
  }
}

async function loadAll() {
  pageLoading.value = true
  try {
    await fetchProject()
    if (ready.value) await fetchDocListOnly()
    else list.value = { items: [], latest_version_id: null }
  } finally {
    pageLoading.value = false
  }
}

async function onGenerate() {
  const id = projectIdStr.value
  const k = artifactKey.value
  if (!id || !k) return
  generating.value = true
  try {
    const body: ProjectPatchRequestBody = { artifacts: { [k]: true } }
    const { data } = await apiClient.patch<ApiEnvelope<ProjectOneData>>(`/api/v1/projects/${id}`, body)
    project.value = data.data ?? null
    syncSelectionFromProject()
    ElMessage.success('已标记为已生成（演示）')
    await fetchDocListOnly()
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '生成失败')
  } finally {
    generating.value = false
  }
}

async function createVersion(mode: 'empty' | 'from_latest') {
  const id = projectIdStr.value
  if (!id) return
  creating.value = true
  try {
    const { data } = await apiClient.post<ApiEnvelope<TechDesignDocVersionDetail>>(
      `/api/v1/projects/${id}/tech-design-doc/versions`,
      { mode },
    )
    const row = data.data
    if (row?.id) {
      ElMessage.success('已创建版本')
      await fetchDocListOnly()
      void router.push({
        name: 'project-m02b-design-version',
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
  const id = projectIdStr.value
  if (!id) return
  void router.push({
    name: 'project-m02b-design-version',
    params: { projectId: id, versionId },
  })
}

async function fetchVersionMarkdown(versionId: string): Promise<string | null> {
  const id = projectIdStr.value
  if (!id) return null
  try {
    const { data } = await apiClient.get<ApiEnvelope<TechDesignDocVersionDetail>>(
      `/api/v1/projects/${id}/tech-design-doc/versions/${versionId}`,
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
  const base = `技术设计文档-v${row?.version_no ?? versionId}`
  const title = `技术设计文档 v${row?.version_no ?? ''}`
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
      const id = projectIdStr.value
      if (!id) return
      try {
        await apiClient.delete(`/api/v1/projects/${id}/tech-design-doc/versions/${row.id}`)
        ElMessage.success('已删除')
        await fetchDocListOnly()
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

watch(versionTableKey, () => {
  selectedForDiff.value = []
})

onMounted(() => {
  void loadAll()
})
</script>

<style scoped>
.tdoc-list {
  width: 100%;
  min-width: 0;
}

.tdoc-page-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.tdoc-title {
  font-weight: 600;
  font-size: 18px;
}

.tdoc-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tdoc-section-card {
  width: 100%;
}

.tdoc-section-title {
  font-weight: 600;
}

.selection-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.tdoc-section-desc {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.55;
}

.tdoc-section-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.tdoc-muted {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.selection-block {
  margin-bottom: 20px;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-blank);
}

.selection-block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.selection-block-label {
  font-weight: 600;
  font-size: 14px;
}

.selection-form :deep(.el-form-item) {
  margin-bottom: 14px;
}

.selection-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 8px;
}

.tdoc-card {
  width: 100%;
}

.tdoc-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.tdoc-card-head-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tdoc-card-title {
  font-weight: 600;
  font-size: 15px;
}

.tdoc-card-head-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.tdoc-table {
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

.tdoc-diff-hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
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
