<template>
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
          placeholder="像你现在这样补充需求/澄清问题，然后发送"
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
            按现有需求生成文档并应用到正文
          </el-button>
        </div>
      </div>
    </div>

    <div v-else class="external-body">
      <p class="ai-sub-hint">复制提示词到外部 AI 使用。</p>
      <div class="ai-actions">
        <el-button size="small" @click="copyExternalPrompt">复制提示词</el-button>
      </div>
      <el-input v-model="externalPromptText" type="textarea" readonly class="external-prompt-input" />
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { nextTick, ref, watch } from 'vue'

import { apiClient } from '@/api/client'
import type { ApiEnvelope } from '@/types/api-contract'

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
  }>(),
  {
    title: 'AI 辅助',
    description: '先生成建议，确认后再应用到正文。',
    defaultPrompt: '',
    externalPrompt: '',
    payloadBase: () => ({}),
    memoryKey: '',
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'apply', text: string): void
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
const hasInitedPrompt = ref(false)
const historyEl = ref<HTMLElement | null>(null)
const sending = ref(false)
const generatingDoc = ref(false)
const assistantStreamTimer = ref<number | null>(null)

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
  userInput.value = ''
  sending.value = false
  generatingDoc.value = false
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

async function invokeAi(action: 'chat' | 'generate_doc', message?: string) {
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

async function generateDoc() {
  if (mode.value !== 'builtin') return
  if (generatingDoc.value) return
  if (messages.value.filter((m) => m.role === 'user').length === 0) {
    ElMessage.warning('请先发送至少一条需求沟通')
    return
  }

  if (messages.value.some((m) => m.role === 'assistant' && m.streaming)) return

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

    // md 一次性回填给编辑器；编辑器侧做打字动画（避免 drawer 关闭时打断动画）
    emit('apply', md)
    ElMessage.success('已生成并应用到正文')
    emit('update:modelValue', false)
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : 'AI 生成失败')
  } finally {
    generatingDoc.value = false
  }
}

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
