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
      width="1180px"
      class="diff-dialog"
      destroy-on-close
      :close-on-click-modal="false"
      @closed="onDiffDialogClosed"
    >
      <p class="dialog-lead">
        Git 风格对照：<strong>−</strong> 删除 / 旧行，<strong>+</strong> 新增 / 新行；<strong>修改</strong>行在左右两侧对<strong>差异片段</strong>单独着色（字词或字符级）。图例：
        <span class="diff-legend">
          <span class="diff-legend-chip is-equal">未改</span>
          <span class="diff-legend-chip is-del"><span class="diff-legend-sign">−</span>删除</span>
          <span class="diff-legend-chip is-add"><span class="diff-legend-sign">+</span>新增</span>
          <span class="diff-legend-chip is-change"><span class="diff-legend-sign">−</span>/<span class="diff-legend-sign">+</span>修改（行内着色）</span>
        </span>
      </p>
      <el-alert
        v-if="diffView.truncated"
        type="warning"
        :closable="false"
        show-icon
        class="diff-truncate-alert"
        title="差异计算量较大，已改用简化对比（整块删除再整块新增）。若需更细对比可缩短文档后再试。"
      />
      <div ref="diffScrollUnifiedRef" class="diff-unified-scroll" role="region" aria-label="行级差异对照">
        <div class="diff-grid-head" aria-hidden="true">
          <span class="diff-h-gutter">行</span>
          <span class="diff-h-code">原版（当前正文）</span>
          <span class="diff-h-gutter">行</span>
          <span class="diff-h-code">新版（AI 建议）</span>
        </div>
        <div v-if="diffView.rows.length === 0" class="diff-empty">两版内容相同或均为空。</div>
        <div
          v-for="(row, idx) in diffView.rows"
          v-else
          :key="idx"
          class="diff-grid-row"
          :class="`diff-grid-row--${row.variant}`"
        >
          <div class="diff-gutter diff-gutter--old">{{ row.oldNum === null ? '—' : row.oldNum }}</div>
          <div class="diff-code diff-code--old" :class="`tone-${row.leftTone}`">
            <span class="diff-prefix-char" aria-hidden="true">{{ diffPrefixLeft(row) }}</span>
            <span class="diff-code-inner">
              <template v-if="row.variant === 'change' && row.inlineLeft?.length">
                <span
                  v-for="(seg, si) in row.inlineLeft"
                  :key="`L${idx}-${si}`"
                  class="diff-inline"
                  :class="`diff-inline--${seg.mark}`"
                >{{ seg.value }}</span>
              </template>
              <template v-else>{{ row.left }}</template>
            </span>
          </div>
          <div class="diff-gutter diff-gutter--new">{{ row.newNum === null ? '—' : row.newNum }}</div>
          <div class="diff-code diff-code--new" :class="`tone-${row.rightTone}`">
            <span class="diff-prefix-char" aria-hidden="true">{{ diffPrefixRight(row) }}</span>
            <span class="diff-code-inner">
              <template v-if="row.variant === 'change' && row.inlineRight?.length">
                <span
                  v-for="(seg, si) in row.inlineRight"
                  :key="`R${idx}-${si}`"
                  class="diff-inline"
                  :class="`diff-inline--${seg.mark}`"
                >{{ seg.value }}</span>
              </template>
              <template v-else>{{ row.right }}</template>
            </span>
          </div>
        </div>
      </div>
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
import { buildChangeInlineSegments, type InlineSeg } from '@/utils/inlineTextDiff'
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
const diffAction = ref<'accept' | 'rollback' | null>(null)

/** 单行滚动容器：左右列在同一行网格内天然对齐 */
const diffScrollUnifiedRef = ref<HTMLElement | null>(null)

/** 行级 diff：LCS + 连续「删块+增块」按行 zip 为「修改」，供左右行号与底色 */
type LineOpKind = 'equal' | 'del' | 'add'
type LineOp = { kind: LineOpKind; line: string }
type RefinedKind = 'equal' | 'change' | 'del' | 'add'
type DiffRowVariant = 'equal' | 'del' | 'add' | 'change'
type DiffGridRow = {
  variant: DiffRowVariant
  oldNum: number | null
  newNum: number | null
  left: string
  right: string
  leftTone: 'eq' | 'del' | 'pad' | 'chgL'
  rightTone: 'eq' | 'add' | 'pad' | 'chgR'
  /** 仅「修改」行：左右行内片段（字词/字符级高亮） */
  inlineLeft?: InlineSeg[]
  inlineRight?: InlineSeg[]
}

const DIFF_LCS_MAX_CELLS = 520 * 520

function lineDiffLCS(oldLines: string[], newLines: string[]): { ops: LineOp[]; truncated: boolean } {
  const m = oldLines.length
  const n = newLines.length
  if (m === 0 && n === 0) return { ops: [], truncated: false }
  if (m * n > DIFF_LCS_MAX_CELLS) {
    const ops: LineOp[] = []
    for (const line of oldLines) ops.push({ kind: 'del', line })
    for (const line of newLines) ops.push({ kind: 'add', line })
    return { ops, truncated: true }
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      dp[i][j] =
        oldLines[i] === newLines[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  const ops: LineOp[] = []
  let i = 0
  let j = 0
  while (i < m && j < n) {
    if (oldLines[i] === newLines[j]) {
      ops.push({ kind: 'equal', line: oldLines[i] })
      i += 1
      j += 1
      continue
    }
    if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ kind: 'del', line: oldLines[i] })
      i += 1
    } else {
      ops.push({ kind: 'add', line: newLines[j] })
      j += 1
    }
  }
  while (i < m) {
    ops.push({ kind: 'del', line: oldLines[i] })
    i += 1
  }
  while (j < n) {
    ops.push({ kind: 'add', line: newLines[j] })
    j += 1
  }
  return { ops, truncated: false }
}

/** 将 LCS 输出的 del 连续块 + 紧随其后的 add 连续块，按行号 zip 成「修改」；剩余删/增单独成行 */
function refineLineOpsToPairs(ops: LineOp[]): Array<{ kind: RefinedKind; left: string; right: string }> {
  const out: Array<{ kind: RefinedKind; left: string; right: string }> = []
  let idx = 0
  while (idx < ops.length) {
    const op = ops[idx]
    if (op.kind === 'equal') {
      out.push({ kind: 'equal', left: op.line, right: op.line })
      idx += 1
      continue
    }
    if (op.kind === 'del') {
      const dels: string[] = []
      while (idx < ops.length && ops[idx].kind === 'del') {
        dels.push(ops[idx].line)
        idx += 1
      }
      const adds: string[] = []
      while (idx < ops.length && ops[idx].kind === 'add') {
        adds.push(ops[idx].line)
        idx += 1
      }
      const maxLen = Math.max(dels.length, adds.length)
      for (let k = 0; k < maxLen; k += 1) {
        const d = dels[k]
        const a = adds[k]
        if (d !== undefined && a !== undefined) {
          out.push({ kind: 'change', left: d, right: a })
        } else if (d !== undefined) {
          out.push({ kind: 'del', left: d, right: '' })
        } else if (a !== undefined) {
          out.push({ kind: 'add', left: '', right: a })
        }
      }
      continue
    }
    // 开头或中间的孤立 add
    const adds: string[] = []
    while (idx < ops.length && ops[idx].kind === 'add') {
      adds.push(ops[idx].line)
      idx += 1
    }
    for (const a of adds) {
      out.push({ kind: 'add', left: '', right: a })
    }
  }
  return out
}

function emptyCell(s: string): string {
  return s.length ? s : '\u00a0'
}

function buildDiffGridRows(oldText: string, newText: string): { rows: DiffGridRow[]; truncated: boolean } {
  const oldLines = (oldText ?? '').split('\n')
  const newLines = (newText ?? '').split('\n')
  const { ops, truncated } = lineDiffLCS(oldLines, newLines)
  const pairs = refineLineOpsToPairs(ops)
  const rows: DiffGridRow[] = []
  let oldNum = 1
  let newNum = 1
  for (const p of pairs) {
    if (p.kind === 'equal') {
      rows.push({
        variant: 'equal',
        oldNum,
        newNum,
        left: p.left,
        right: p.right,
        leftTone: 'eq',
        rightTone: 'eq',
      })
      oldNum += 1
      newNum += 1
    } else if (p.kind === 'change') {
      const { left: inlineLeft, right: inlineRight } = buildChangeInlineSegments(p.left, p.right)
      rows.push({
        variant: 'change',
        oldNum,
        newNum,
        left: p.left,
        right: p.right,
        leftTone: 'chgL',
        rightTone: 'chgR',
        inlineLeft,
        inlineRight,
      })
      oldNum += 1
      newNum += 1
    } else if (p.kind === 'del') {
      rows.push({
        variant: 'del',
        oldNum,
        newNum: null,
        left: p.left,
        right: emptyCell(p.right),
        leftTone: 'del',
        rightTone: 'pad',
      })
      oldNum += 1
    } else {
      rows.push({
        variant: 'add',
        oldNum: null,
        newNum,
        left: emptyCell(p.left),
        right: p.right,
        leftTone: 'pad',
        rightTone: 'add',
      })
      newNum += 1
    }
  }
  return { rows, truncated }
}

/** 行首符号：与 Git diff 一致，便于扫读 */
function diffPrefixLeft(row: DiffGridRow): string {
  if (row.leftTone === 'del' || row.leftTone === 'chgL') return '-'
  return ' '
}

function diffPrefixRight(row: DiffGridRow): string {
  if (row.rightTone === 'add' || row.rightTone === 'chgR') return '+'
  return ' '
}

const diffView = computed(() => buildDiffGridRows(diffOldMd.value, diffNewMd.value))

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
  diffAction.value = null
  diffDialogVisible.value = true
}

function closeDiffDialog() {
  diffDialogVisible.value = false
  proposedAssistantId.value = null
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
  aiVisible.value = false
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

.diff-dialog :deep(.el-dialog__body) {
  padding-top: 8px;
}

.diff-legend {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-left: 8px;
  vertical-align: middle;
}

.diff-legend-sign {
  display: inline-block;
  margin-right: 3px;
  font-weight: 700;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.diff-legend-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.diff-legend-chip.is-equal {
  background: var(--diff-legend-bg-ctx, var(--el-fill-color-light));
  color: var(--el-text-color-secondary);
}

.diff-legend-chip.is-del {
  background: var(--diff-legend-bg-del);
  color: var(--diff-legend-fg-del);
}

.diff-legend-chip.is-add {
  background: var(--diff-legend-bg-add);
  color: var(--diff-legend-fg-add);
}

.diff-legend-chip.is-change {
  background: var(--diff-legend-bg-chg);
  color: var(--el-text-color-regular);
  border: 1px solid var(--el-border-color-lighter);
}

.diff-truncate-alert {
  margin-bottom: 10px;
}

/* GitHub 系配色：浅色底用柔和红绿底 + 深红深绿字；深色底用半透明底 + 高亮前景 */
.diff-unified-scroll {
  --diff-legend-bg-del: #ffeef0;
  --diff-legend-fg-del: #cf222e;
  --diff-legend-bg-add: #e6ffec;
  --diff-legend-fg-add: #1a7f37;
  --diff-legend-bg-chg: #fff8c5;
  --diff-bg-ctx: transparent;
  --diff-fg-ctx: var(--el-text-color-primary);
  --diff-bg-pad: var(--el-fill-color-light);
  --diff-fg-pad: var(--el-text-color-placeholder);
  --diff-bg-del: #ffebe9;
  --diff-fg-del: #a40e26;
  --diff-border-del: #ff818266;
  --diff-bg-add: #dafbe1;
  --diff-fg-add: #116329;
  --diff-border-add: #4ae16866;
  --diff-bg-chg-old: #fff5e8;
  --diff-bg-chg-new: #e8fff0;
  --diff-fg-chg-old: #9a3412;
  --diff-fg-chg-new: #116329;
  --diff-inline-patch-del: rgba(164, 14, 38, 0.26);
  --diff-inline-patch-add: rgba(17, 99, 41, 0.26);

  max-height: 520px;
  overflow: auto;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-blank);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12.5px;
  line-height: 1.55;
  tab-size: 2;
}

html.dark .diff-unified-scroll {
  --diff-legend-bg-del: rgba(248, 81, 73, 0.22);
  --diff-legend-fg-del: #ff9492;
  --diff-legend-bg-add: rgba(46, 160, 67, 0.22);
  --diff-legend-fg-add: #6fdd96;
  --diff-legend-bg-chg: rgba(210, 153, 34, 0.18);
  --diff-bg-ctx: rgba(110, 118, 129, 0.08);
  --diff-fg-ctx: var(--el-text-color-primary);
  --diff-bg-pad: rgba(110, 118, 129, 0.12);
  --diff-fg-pad: var(--el-text-color-placeholder);
  --diff-bg-del: rgba(248, 81, 73, 0.28);
  --diff-fg-del: #ff9492;
  --diff-border-del: rgba(255, 123, 114, 0.45);
  --diff-bg-add: rgba(46, 160, 67, 0.28);
  --diff-fg-add: #6fdd96;
  --diff-border-add: rgba(86, 211, 100, 0.45);
  --diff-bg-chg-old: rgba(248, 81, 73, 0.2);
  --diff-bg-chg-new: rgba(46, 160, 67, 0.2);
  --diff-fg-chg-old: #ff9492;
  --diff-fg-chg-new: #6fdd96;
  --diff-inline-patch-del: rgba(255, 148, 146, 0.4);
  --diff-inline-patch-add: rgba(111, 221, 150, 0.4);
}

.diff-grid-head {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 44px minmax(0, 1fr);
  position: sticky;
  top: 0;
  z-index: 1;
  font-size: 11px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-light);
  border-bottom: 1px solid var(--el-border-color);
}

.diff-h-gutter {
  padding: 6px 4px;
  text-align: right;
  border-right: 1px solid var(--el-border-color-lighter);
}

.diff-h-code {
  padding: 6px 8px;
  border-right: 1px solid var(--el-border-color-lighter);
}

.diff-h-code:last-child {
  border-right: none;
}

.diff-empty {
  padding: 24px;
  text-align: center;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.diff-grid-row {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 44px minmax(0, 1fr);
  align-items: stretch;
  border-bottom: 1px solid var(--el-border-color-extra-light);
}

.diff-grid-row:last-child {
  border-bottom: none;
}

.diff-gutter {
  flex-shrink: 0;
  padding: 2px 6px;
  text-align: right;
  color: var(--el-text-color-secondary);
  font-size: 11px;
  user-select: none;
  border-right: 1px solid var(--el-border-color-extra-light);
  background: var(--el-fill-color-light);
  white-space: nowrap;
}

.diff-code {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 1px 6px 1px 0;
  min-height: calc(1.55em + 4px);
  border-right: 1px solid var(--el-border-color-extra-light);
  word-break: break-word;
  white-space: pre-wrap;
}

.diff-code--new {
  border-right: none;
}

.diff-prefix-char {
  flex: 0 0 14px;
  text-align: center;
  font-weight: 700;
  user-select: none;
  line-height: inherit;
}

.diff-code-inner {
  flex: 1;
  min-width: 0;
  min-height: 1.55em;
}

.diff-code.tone-eq {
  background: var(--diff-bg-ctx);
  color: var(--diff-fg-ctx);
}

.diff-code.tone-eq .diff-prefix-char {
  color: var(--el-text-color-placeholder);
}

.diff-code.tone-del {
  background: var(--diff-bg-del);
  color: var(--diff-fg-del);
  border-left: 3px solid var(--diff-border-del);
  padding-left: 5px;
}

.diff-code.tone-del .diff-prefix-char {
  color: var(--diff-fg-del);
}

.diff-code.tone-add {
  background: var(--diff-bg-add);
  color: var(--diff-fg-add);
  border-left: 3px solid var(--diff-border-add);
  padding-left: 5px;
}

.diff-code.tone-add .diff-prefix-char {
  color: var(--diff-fg-add);
}

.diff-code.tone-pad {
  background: var(--diff-bg-pad);
  color: var(--diff-fg-pad);
}

.diff-code.tone-pad .diff-prefix-char {
  color: var(--diff-fg-pad);
  opacity: 0.5;
}

.diff-code.tone-chgL {
  background: var(--diff-bg-chg-old);
  color: var(--diff-fg-chg-old);
  border-left: 3px solid var(--diff-border-del);
  padding-left: 5px;
}

.diff-code.tone-chgL .diff-prefix-char {
  color: var(--diff-fg-chg-old);
}

.diff-code.tone-chgR {
  background: var(--diff-bg-chg-new);
  color: var(--diff-fg-chg-new);
  border-left: 3px solid var(--diff-border-add);
  padding-left: 5px;
}

.diff-code.tone-chgR .diff-prefix-char {
  color: var(--diff-fg-chg-new);
}

/* 「修改」行：字词/字符级垫色（与整行浅底叠加） */
.diff-code.tone-chgL .diff-inline--del {
  background: var(--diff-inline-patch-del);
  color: var(--diff-fg-chg-old);
  border-radius: 3px;
  padding: 0 3px;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}

.diff-code.tone-chgR .diff-inline--add {
  background: var(--diff-inline-patch-add);
  color: var(--diff-fg-chg-new);
  border-radius: 3px;
  padding: 0 3px;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}
</style>
