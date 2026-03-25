<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    :width="width"
    destroy-on-close
    class="ai-completion-summary-dialog"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-descriptions :column="column" border>
      <el-descriptions-item v-for="(row, i) in rows" :key="i" :label="row.label">
        <div class="ai-completion-cell">
          <div v-if="row.value" class="ai-completion-value">{{ row.value }}</div>
          <ul v-if="row.lines?.length" class="ai-completion-lines">
            <li v-for="(line, j) in row.lines" :key="j">{{ line }}</li>
          </ul>
          <span v-if="!row.value && !(row.lines?.length)" class="ai-completion-empty">—</span>
        </div>
      </el-descriptions-item>
    </el-descriptions>
    <template #footer>
      <el-button type="primary" @click="emit('update:modelValue', false)">{{ confirmText }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { AiCompletionSummaryRow } from './types'

withDefaults(
  defineProps<{
    modelValue: boolean
    /** 弹窗标题，如「接口清单生成结果」「迭代规划应用结果」 */
    title?: string
    rows: AiCompletionSummaryRow[]
    width?: string
    /** el-descriptions 列数，默认与接口管理页一致为 1 */
    column?: number
    confirmText?: string
  }>(),
  {
    title: '操作结果',
    width: '520px',
    column: 1,
    confirmText: '知道了',
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
}>()
</script>

<style scoped>
.ai-completion-cell {
  min-width: 0;
}
.ai-completion-value {
  line-height: 1.5;
}
.ai-completion-lines {
  margin: 6px 0 0;
  padding-left: 1.2em;
  line-height: 1.45;
  font-size: 13px;
  color: var(--el-text-color-regular);
}
.ai-completion-lines li + li {
  margin-top: 2px;
}
.ai-completion-empty {
  color: var(--el-text-color-placeholder);
}
</style>
