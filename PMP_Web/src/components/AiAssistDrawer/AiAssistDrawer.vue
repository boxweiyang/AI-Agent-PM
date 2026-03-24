<template>
  <!-- 组合：抽屉 + 公用 DiffDialog（见 @/components/DiffDialog） -->
  <DiffDialog
    v-model="proposeDiffOpen"
    :old-text="proposeOldText"
    :new-text="proposeNewText"
    :left-header="diffLeftHeaderEffective"
    :right-header="diffRightHeaderEffective"
    :allow-accept="allowApply"
    :deny-accept-message="allowApplyMessage"
    @accept="onProposeDiffAccept"
    @rollback="onProposeDiffRollback"
  />
  <el-drawer
    :model-value="modelValue"
    size="460px"
    destroy-on-close
    @update:model-value="onUpdateModelValue"
    @open="onOpen"
  >
    <template #title>
      <div class="drawer-title">
        <span class="drawer-title-text">{{ title }}</span>
        <el-radio-group v-model="mode" size="small" class="drawer-tabs">
          <el-radio-button label="builtin">站内 AI</el-radio-button>
          <el-radio-button label="external">外置 AI 回填</el-radio-button>
        </el-radio-group>
      </div>
    </template>

    <div v-if="mode === 'builtin'" class="chat-body">
      <div ref="historyEl" class="chat-history">
        <div
          v-for="m in messages"
          :key="m.id"
          class="chat-row"
          :class="{ 'chat-row--me': m.role === 'user', 'chat-row--ai': m.role === 'assistant' }"
        >
          <div class="chat-bubble">
            <div class="chat-content">
              <template v-if="m.waiting">
                <span class="wait-dots">···</span>
                <span class="wait-spinner" aria-hidden="true">
                  <span class="wait-spinner-dot" />
                </span>
              </template>
              <template v-else>
                {{ m.content }}
                <span v-if="m.streaming" class="chat-cursor">|</span>
              </template>
            </div>
          </div>
        </div>
      </div>

      <div class="chat-composer">
        <div class="composer-top">
          <el-select v-model="provider" size="small" style="width: 160px">
            <el-option label="千问（qwen）" value="qwen" />
            <el-option label="豆包（doubao）" value="doubao" />
            <el-option label="Kimi（kimi）" value="kimi" />
            <el-option label="Gemini（gemini）" value="gemini" />
          </el-select>

          <el-button size="small" type="primary" :loading="sending" @click="sendMessage">
            发送
          </el-button>
        </div>

        <el-input
          v-model="userInput"
          type="textarea"
          :rows="3"
          :placeholder="chatInputPlaceholder"
          class="chat-input"
          @keyup.enter="onEnterToSend"
        />

        <div class="composer-bottom">
          <el-button
            type="primary"
            class="generate-doc-btn"
            :loading="generatingDoc"
            @click="generateDoc"
          >
            {{ generateButtonLabel }}
          </el-button>
        </div>
      </div>
    </div>

    <div v-else class="external-body">
      <template v-if="assistKind === 'tech_selection'">
        <p class="ai-sub-hint">
          ① 复制提示词到外置 AI 讨论；② 请外置 AI 按提示输出 **JSON**；③ 将完整回复粘贴到「回填结果」，点击 **解析并预览填入**（与站内一致，先 diff 再接受）。
        </p>
        <div class="ai-actions">
          <el-button size="small" @click="copyExternalPrompt">复制提示词</el-button>
        </div>
        <el-input
          v-model="externalPromptText"
          type="textarea"
          readonly
          :rows="7"
          class="external-prompt-readonly"
        />
        <p class="ai-sub-hint external-paste-title">回填结果</p>
        <el-input
          v-model="externalPasteJson"
          type="textarea"
          :rows="11"
          class="external-paste-input"
          placeholder='粘贴 JSON：支持 [ {...}, {...} ] 或 { "tech_delivery_parts": [...] }，也可带 ```json 代码块'
        />
        <div class="ai-actions">
          <el-button type="primary" size="small" :loading="externalParsing" @click="applyExternalTechSelectionPaste">
            解析并预览填入
          </el-button>
        </div>
      </template>
      <template v-else>
        <p class="ai-sub-hint">复制提示词到外部 AI；将生成内容自行粘贴回 **编辑区** 或切换到 **站内 AI** 继续。</p>
        <div class="ai-actions">
          <el-button size="small" @click="copyExternalPrompt">复制提示词</el-button>
        </div>
        <el-input v-model="externalPromptText" type="textarea" readonly :rows="12" class="external-prompt-input" />
      </template>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, nextTick, ref, watch } from 'vue'

import DiffDialog from '@/components/DiffDialog'
import { apiClient } from '@/api/client'
import type { ApiEnvelope, TechDeliveryPart } from '@/types/api-contract'
import {
  formatTechDeliveryPartsForDiff,
  normalizeTechDeliveryPartsFromUnknown,
  parseTechDeliveryPartsExternalPaste,
} from '@/utils/techDeliveryPartsNormalize'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title?: string
    description?: string
    capability: string
    defaultPrompt?: string
    externalPrompt?: string
    payloadBase?: Record<string, unknown>
    memoryKey?: string
    /**
     * 与编辑区同步的当前正文，用于「已有文档 → 生成建议稿」时 diff 左侧。
     * 不传则回退用 payloadBase.markdown（可能与 UI 不同步，建议业务页显式传入）。
     */
    documentText?: string | null
    /**
     * 上次「接受」生成结果时的 assistant 消息 id，用于 diff「回退」时截断对话上下文（与业务页 localStorage 锚点一致）。
     */
    anchorAssistantId?: string | null
    /** 为 false 时 diff 弹窗内「接受」将被拦截（如历史版本只读） */
    allowApply?: boolean
    allowApplyMessage?: string
    /** `markdown_doc`：生成 Markdown 正文；`tech_selection`：生成 `tech_delivery_parts` 并 diff 后写入表单 */
    assistKind?: 'markdown_doc' | 'tech_selection'
    /** `assistKind=tech_selection` 时传入，用于 diff 左侧与 payload */
    techSelectionParts?: TechDeliveryPart[]
    diffLeftHeader?: string
    diffRightHeader?: string
  }>(),
  {
    title: 'AI 辅助',
    description: '先生成建议，确认后再应用到正文。',
    defaultPrompt: '',
    externalPrompt: '',
    payloadBase: () => ({}),
    memoryKey: '',
    documentText: undefined,
    anchorAssistantId: null,
    allowApply: true,
    allowApplyMessage: '历史版本不允许写入，请打开最新版本',
    assistKind: 'markdown_doc',
    techSelectionParts: () => [],
    diffLeftHeader: '',
    diffRightHeader: '',
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'apply', payload: { assistantId: string; text: string }): void
  (e: 'apply-tech-parts', payload: { assistantId: string; parts: TechDeliveryPart[] }): void
  (e: 'generated', text: string): void
}>()

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
  waiting?: boolean
}

const mode = ref<'builtin' | 'external'>('builtin')
const provider = ref<'qwen' | 'doubao' | 'kimi' | 'gemini'>('qwen')
const userInput = ref('')
const messages = ref<ChatMessage[]>([])
const externalPromptText = ref('')
/** 外置 AI 结构化回填（技术选型）：用户粘贴 JSON */
const externalPasteJson = ref('')
const externalParsing = ref(false)
const hasInitedPrompt = ref(false)
const historyEl = ref<HTMLElement | null>(null)
const sending = ref(false)
const generatingDoc = ref(false)
const assistantStreamTimer = ref<number | null>(null)

/** 内置差异弹窗（与 generate_doc 的 propose 流程绑定） */
const proposeDiffOpen = ref(false)
const proposeOldText = ref('')
const proposeNewText = ref('')
const proposeAssistantId = ref<string | null>(null)
/** `assistKind=tech_selection` 且 diff 打开时，接受后写入表单的结构化数据 */
const proposePendingTechParts = ref<TechDeliveryPart[] | null>(null)

const diffLeftHeaderEffective = computed(() => {
  if (props.diffLeftHeader?.trim()) return props.diffLeftHeader.trim()
  return props.assistKind === 'tech_selection' ? '当前选型（表单）' : '原版（当前正文）'
})

const diffRightHeaderEffective = computed(() => {
  if (props.diffRightHeader?.trim()) return props.diffRightHeader.trim()
  return props.assistKind === 'tech_selection' ? 'AI 建议选型' : '新版（AI 建议）'
})

const generateButtonLabel = computed(() =>
  props.assistKind === 'tech_selection'
    ? '根据对话生成技术选型并预览'
    : '按现有需求生成文档并应用到正文',
)

const chatInputPlaceholder = computed(() =>
  props.assistKind === 'tech_selection'
    ? '描述业务场景、性能/安全约束、团队技能偏好等，与 AI 讨论后再生成选型表'
    : '像你现在这样补充需求/澄清问题，然后发送',
)

const effectiveDocumentBaseline = computed(() => {
  if (props.documentText !== undefined && props.documentText !== null) return props.documentText
  const m = props.payloadBase?.markdown
  return typeof m === 'string' ? m : ''
})

const MEMORY_PREFIX = 'pmp_ai_assist_history:'

function getMemoryStorageKey(): string {
  const k = props.memoryKey?.trim()
  if (!k) return ''
  return `${MEMORY_PREFIX}${k}`
}

function loadHistoryFromMemory() {
  const storageKey = getMemoryStorageKey()
  if (!storageKey) return
  if (typeof window === 'undefined') return

  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return

    const restored: ChatMessage[] = (parsed as Array<unknown>).map((x) => {
      const r = x as Partial<ChatMessage> | null
      const role: ChatMessage['role'] = r?.role === 'user' ? 'user' : 'assistant'
      return {
        id: typeof r?.id === 'string' ? r.id : nextId('m'),
        role,
        content: typeof r?.content === 'string' ? r.content : '',
        streaming: false,
        waiting: false,
      }
    })

    messages.value = restored.filter((m) => m.content.trim().length > 0)
  } catch {
    // ignore memory errors
  }
}

function persistHistoryToMemory() {
  const storageKey = getMemoryStorageKey()
  if (!storageKey) return
  if (typeof window === 'undefined') return

  try {
    const rows = messages.value.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
    }))
    window.localStorage.setItem(storageKey, JSON.stringify(rows))
  } catch {
    // ignore memory errors
  }
}

function onUpdateModelValue(v: boolean) {
  emit('update:modelValue', v)
  if (!v) {
    hasInitedPrompt.value = false
    if (assistantStreamTimer.value) {
      window.clearInterval(assistantStreamTimer.value)
      assistantStreamTimer.value = null
    }
    persistHistoryToMemory()
  }
}

function onOpen() {
  externalPromptText.value = (props.externalPrompt ?? props.defaultPrompt ?? '').trim()
  externalPasteJson.value = ''
  userInput.value = ''
  sending.value = false
  generatingDoc.value = false
  externalParsing.value = false
  hasInitedPrompt.value = true

  // 每次打开都尝试加载长期记忆（按 project + version）
  loadHistoryFromMemory()
}

watch(
  () => props.externalPrompt,
  (v) => {
    if (!hasInitedPrompt.value) return
    externalPromptText.value = (v ?? props.defaultPrompt ?? '').trim()
  },
)

function nextId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function scrollToBottom() {
  void nextTick(() => {
    if (!historyEl.value) return
    historyEl.value.scrollTop = historyEl.value.scrollHeight
  })
}

function pickText(resp: unknown): string {
  const r = resp as Record<string, unknown> | null
  if (!r) return JSON.stringify(resp ?? {}, null, 2)
  if (typeof r.markdown === 'string') return r.markdown
  if (typeof r.document === 'string') return r.document
  if (typeof r.suggestion === 'string') return r.suggestion
  if (typeof r.summary === 'string') return r.summary
  return JSON.stringify(r, null, 2)
}

async function invokeAi(action: 'chat' | 'generate_doc' | 'generate_tech_selection', message?: string) {
  const historyLite = messages.value
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content }))
    .filter((m) => m.content.trim().length > 0)

  const { data } = await apiClient.post<ApiEnvelope<Record<string, unknown>>>('/api/v1/ai/invoke', {
    capability: props.capability,
    payload: {
      ...props.payloadBase,
      provider: provider.value,
      action,
      message: message ?? '',
      default_prompt: props.defaultPrompt ?? '',
      history: historyLite,
    },
  })

  return data.data ?? {}
}

function streamAssistantText(
  assistantId: string,
  fullText: string,
  onChunk?: (chunk: string) => void,
): Promise<void> {
  const text = fullText ?? ''
  const m = messages.value.find((x) => x.id === assistantId)
  if (!m) return Promise.resolve()

  if (assistantStreamTimer.value) {
    window.clearInterval(assistantStreamTimer.value)
    assistantStreamTimer.value = null
  }

  const len = text.length
  const totalTicks = Math.min(220, Math.max(80, Math.ceil(len / 40)))
  const step = Math.max(1, Math.ceil(len / totalTicks))

  return new Promise((resolve) => {
    let i = 0
    assistantStreamTimer.value = window.setInterval(() => {
      i = Math.min(len, i + step)
      const row = messages.value.find((x) => x.id === assistantId)
      if (!row) return
      row.content = text.slice(0, i)
      onChunk?.(row.content)

      if (i >= len) {
        if (assistantStreamTimer.value) window.clearInterval(assistantStreamTimer.value)
        assistantStreamTimer.value = null
        row.streaming = false
        resolve()
      }
    }, 16)
  })
}

async function sendMessage() {
  if (mode.value !== 'builtin') return
  const msg = userInput.value.trim()
  if (!msg) return
  if (sending.value || generatingDoc.value) return

  // 如仍在流式输出，则不再打断（后续可做「停止」按钮）
  if (messages.value.some((m) => m.role === 'assistant' && m.streaming)) return

  sending.value = true
  try {
    messages.value.push({ id: nextId('u'), role: 'user', content: msg })
    userInput.value = ''
    const assistantId = nextId('a')
    messages.value.push({ id: assistantId, role: 'assistant', content: '', streaming: true })
    scrollToBottom()

    const resp = await invokeAi('chat', msg)
    const text = pickText(resp)
    emit('generated', text)
    await streamAssistantText(assistantId, text)
    scrollToBottom()
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : 'AI 生成失败')
  } finally {
    sending.value = false
  }
}

async function generateTechSelection() {
  if (mode.value !== 'builtin') return
  if (generatingDoc.value) return
  if (messages.value.filter((m) => m.role === 'user').length === 0) {
    ElMessage.warning('请先发送至少一条对话，说明目标与约束')
    return
  }
  if (messages.value.some((m) => m.role === 'assistant' && m.streaming)) return

  generatingDoc.value = true
  try {
    const assistantId = nextId('a')
    messages.value.push({ id: assistantId, role: 'assistant', content: '', waiting: true })
    scrollToBottom()

    const resp = await invokeAi('generate_tech_selection')
    const data = resp as Record<string, unknown>
    const parts = normalizeTechDeliveryPartsFromUnknown(data.tech_delivery_parts)
    const summary =
      typeof data.summary_markdown === 'string' && data.summary_markdown.trim()
        ? data.summary_markdown.trim()
        : `已生成 **${parts.length}** 条交付部分建议，请在对比弹窗中核对后点击「接受」填入表单。`

    const row = messages.value.find((x) => x.id === assistantId)
    if (row) {
      row.waiting = false
      row.streaming = false
      row.content = summary
    }

    if (!parts.length) {
      ElMessage.error('AI 未返回有效的技术选型数据，请重试')
      return
    }

    proposePendingTechParts.value = parts
    proposeOldText.value = formatTechDeliveryPartsForDiff(props.techSelectionParts ?? [])
    proposeNewText.value = formatTechDeliveryPartsForDiff(parts)
    proposeAssistantId.value = assistantId
    proposeDiffOpen.value = true
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : 'AI 生成失败')
  } finally {
    generatingDoc.value = false
  }
}

async function generateDoc() {
  if (mode.value !== 'builtin') return
  if (generatingDoc.value) return
  if (props.assistKind === 'tech_selection') {
    await generateTechSelection()
    return
  }
  if (messages.value.filter((m) => m.role === 'user').length === 0) {
    ElMessage.warning('请先发送至少一条需求沟通')
    return
  }

  if (messages.value.some((m) => m.role === 'assistant' && m.streaming)) return

  const baseline = effectiveDocumentBaseline.value
  const hasExistingDoc = baseline.trim().length > 0

  generatingDoc.value = true
  try {
    const assistantId = nextId('a')
    messages.value.push({ id: assistantId, role: 'assistant', content: '', waiting: true })
    scrollToBottom()

    const resp = await invokeAi('generate_doc')
    const md = pickText(resp)

    const row = messages.value.find((x) => x.id === assistantId)
    if (row) {
      row.waiting = false
      row.streaming = false
      row.content = md
    }

    if (hasExistingDoc) {
      proposeOldText.value = baseline
      proposeNewText.value = md
      proposeAssistantId.value = assistantId
      proposeDiffOpen.value = true
    } else {
      // 无正文：沿用现有交互，直接应用到编辑框（并关闭抽屉）
      emit('apply', { assistantId, text: md })
      ElMessage.success('已生成并应用到正文')
      emit('update:modelValue', false)
    }
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : 'AI 生成失败')
  } finally {
    generatingDoc.value = false
  }
}

function truncateHistoryToAssistantId(assistantId: string | null) {
  if (assistantStreamTimer.value) {
    window.clearInterval(assistantStreamTimer.value)
    assistantStreamTimer.value = null
  }

  if (!assistantId) {
    messages.value = []
    persistHistoryToMemory()
    return
  }

  const idx = messages.value.findIndex((m) => m.id === assistantId)
  if (idx < 0) {
    messages.value = []
    persistHistoryToMemory()
    return
  }

  messages.value = messages.value.slice(0, idx + 1)
  persistHistoryToMemory()
}

function onProposeDiffAccept() {
  const aid = proposeAssistantId.value
  if (!aid) return
  truncateHistoryToAssistantId(aid)
  const pending = proposePendingTechParts.value
  if (pending && pending.length > 0) {
    emit('apply-tech-parts', { assistantId: aid, parts: pending })
    proposePendingTechParts.value = null
    ElMessage.success('已填入表单，可继续编辑后点「确定保存」写入项目')
  } else {
    emit('apply', { assistantId: aid, text: proposeNewText.value })
    ElMessage.success('已接受修改并应用到正文')
  }
  emit('update:modelValue', false)
  proposeAssistantId.value = null
}

function onProposeDiffRollback() {
  truncateHistoryToAssistantId(props.anchorAssistantId ?? null)
  proposeAssistantId.value = null
  proposePendingTechParts.value = null
}

defineExpose({
  truncateHistoryToAssistantId,
})

function onEnterToSend(e: KeyboardEvent) {
  // Enter 发送；Shift+Enter 换行
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    void sendMessage()
  }
}

async function copyExternalPrompt() {
  const text = externalPromptText.value.trim()
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('提示词已复制')
  } catch {
    ElMessage.warning('复制失败，请手动复制')
  }
}

function applyExternalTechSelectionPaste() {
  if (props.assistKind !== 'tech_selection') return
  externalParsing.value = true
  try {
    const parts = parseTechDeliveryPartsExternalPaste(externalPasteJson.value)
    if (!parts?.length) {
      ElMessage.error(
        '无法解析：请粘贴合法 JSON 数组，或含 tech_delivery_parts 的对象（支持 ```json 代码块）。字段需含 delivery_kind。',
      )
      return
    }
    proposePendingTechParts.value = parts
    proposeOldText.value = formatTechDeliveryPartsForDiff(props.techSelectionParts ?? [])
    proposeNewText.value = formatTechDeliveryPartsForDiff(parts)
    proposeAssistantId.value = nextId('ext')
    proposeDiffOpen.value = true
    ElMessage.success('已打开对比，确认后点击「接受」填入表单')
  } finally {
    externalParsing.value = false
  }
}
</script>

<style scoped>
.ai-hint {
  margin: 0 0 10px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.ai-mode {
  margin-bottom: 10px;
}

.drawer-title {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0;
}

.drawer-title-text {
  font-weight: 600;
  font-size: 14px;
}

.drawer-tabs {
  margin-left: 20px;
}

.drawer-tabs :deep(.el-radio-button__inner) {
  padding: 0 6px;
  font-size: 11px;
  height: 22px;
  line-height: 22px;
}

.ai-sub-hint {
  margin: 0 0 6px;
  color: var(--el-text-color-regular);
  font-size: 12px;
}

.ai-actions {
  display: flex;
  gap: 8px;
  margin: 0 0 6px;
}

.chat-body {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.chat-history {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 10px 12px;
}

.chat-row {
  display: flex;
  margin-bottom: 10px;
}

.chat-row--me {
  justify-content: flex-end;
}

.chat-row--ai {
  justify-content: flex-start;
}

.chat-bubble {
  max-width: 92%;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-blank);
}

.chat-content {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 13px;
  line-height: 1.55;
}

.chat-row--me .chat-bubble {
  background: color-mix(in srgb, var(--el-color-primary) 12%, var(--el-fill-color-blank));
  border-color: color-mix(in srgb, var(--el-color-primary) 18%, var(--el-border-color-lighter));
}

.chat-cursor {
  display: inline-block;
  margin-left: 2px;
  color: var(--el-color-primary);
  animation: ai-cursor-blink 1s steps(2, start) infinite;
}

/* 等待图标（外部/生成中） */
.wait-dots {
  display: inline-block;
  letter-spacing: 2px;
  color: var(--el-text-color-secondary);
}

.wait-spinner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
}

.wait-spinner-dot {
  width: 12px;
  height: 12px;
  border: 2px solid color-mix(in srgb, var(--el-color-primary) 60%, transparent);
  border-top-color: transparent;
  border-radius: 50%;
  animation: ai-wait-spin 0.9s linear infinite;
}

@keyframes ai-wait-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes ai-cursor-blink {
  to {
    visibility: hidden;
  }
}

.chat-composer {
  border-top: 1px solid var(--el-border-color-lighter);
  padding: 8px 12px 0;
  flex-shrink: 0;
}

.composer-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.chat-input :deep(.el-textarea__inner) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  line-height: 1.5;
  resize: vertical !important;
  overflow: auto;
  min-height: 72px;
}

.composer-bottom {
  margin-top: 6px;
}

.generate-doc-btn {
  width: 100%;
}

.external-body {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.external-paste-title {
  margin-top: 12px;
  font-weight: 600;
}

.external-paste-input {
  margin-top: 4px;
  flex-shrink: 0;
}

.external-paste-input :deep(.el-textarea__inner) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.45;
}

.external-prompt-readonly {
  flex: 0 0 auto;
}

.external-prompt-readonly :deep(.el-textarea__inner) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.45;
}

.external-prompt-input {
  flex: 1;
  min-height: 0;
  margin-top: 0;
}

.external-prompt-input :deep(.el-textarea) {
  height: 100%;
}

.external-prompt-input :deep(.el-textarea__inner) {
  height: 100% !important;
  min-height: 100% !important;
  overflow: auto;
  resize: none;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  line-height: 1.5;
}
</style>
