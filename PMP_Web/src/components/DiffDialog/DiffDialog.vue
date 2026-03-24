<!--
  公用：Git 风格双栏文本差异弹窗（行级 +「修改」行行内高亮）。
  任意业务（AI 辅助、配置对比、版本对比等）均可使用。说明见同目录 README.md。
-->
<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    width="1180px"
    class="pmp-diff-dialog"
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="onUpdateVisible"
    @closed="onDialogClosed"
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
      title="差异计算量较大，已改用简化对比（整块删除再整块新增）。若需更细对比可缩短文本后再试。"
    />
    <div class="diff-unified-scroll" role="region" aria-label="行级差异对照">
      <div class="diff-grid-head" aria-hidden="true">
        <span class="diff-h-gutter">行</span>
        <span class="diff-h-code">{{ leftHeader }}</span>
        <span class="diff-h-gutter">行</span>
        <span class="diff-h-code">{{ rightHeader }}</span>
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
      <template v-if="readOnly">
        <el-button type="primary" @click="onCloseReadOnly">关闭</el-button>
      </template>
      <template v-else>
        <el-button @click="onRollbackClick">回退</el-button>
        <el-button type="primary" plain @click="onAcceptClick">接受</el-button>
      </template>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, ref, watch } from 'vue'

import { buildDiffGridRows, diffPrefixLeft, diffPrefixRight } from '@/utils/aiAssistDiffGrid'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    oldText: string
    newText: string
    /** 弹窗标题 */
    title?: string
    leftHeader?: string
    rightHeader?: string
    /** 仅查看：不展示「回退 / 接受」，关窗不触发 `rollback` */
    readOnly?: boolean
    /** 为 false 时点「接受」仅提示，不关弹窗（由父组件控制业务条件） */
    allowAccept?: boolean
    denyAcceptMessage?: string
  }>(),
  {
    title: '差异对比',
    leftHeader: '左侧',
    rightHeader: '右侧',
    readOnly: false,
    allowAccept: true,
    denyAcceptMessage: '',
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'accept'): void
  (e: 'rollback'): void
}>()

const diffAction = ref<'accept' | 'rollback' | null>(null)

const diffView = computed(() => buildDiffGridRows(props.oldText, props.newText))

watch(
  () => props.modelValue,
  (v) => {
    if (v) diffAction.value = null
  },
)

function onUpdateVisible(v: boolean) {
  emit('update:modelValue', v)
}

function onAcceptClick() {
  if (!props.allowAccept) {
    ElMessage.warning(props.denyAcceptMessage || '当前不允许应用修改')
    return
  }
  diffAction.value = 'accept'
  emit('accept')
  emit('update:modelValue', false)
}

function onRollbackClick() {
  diffAction.value = 'rollback'
  emit('rollback')
  emit('update:modelValue', false)
}

function onCloseReadOnly() {
  emit('update:modelValue', false)
}

function onDialogClosed() {
  if (!props.readOnly && diffAction.value === null) {
    emit('rollback')
  }
  diffAction.value = null
}
</script>

<style scoped>
.dialog-lead {
  margin: 0 0 8px;
  color: var(--el-text-color-regular);
}

.pmp-diff-dialog :deep(.el-dialog__body) {
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
