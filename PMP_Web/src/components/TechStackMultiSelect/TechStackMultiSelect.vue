<!--
  技术栈多选：预设 + 可输入新项（allow-create），与 API 字符串字段通过父级 parse/join 同步。
-->
<template>
  <el-select
    :model-value="modelValue"
    multiple
    filterable
    allow-create
    default-first-option
    collapse-tags
    collapse-tags-tooltip
    :max-collapse-tags="maxCollapseTags"
    :placeholder="placeholder"
    class="tech-stack-select"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-option v-for="opt in options" :key="opt" :label="opt" :value="opt" />
  </el-select>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: string[]
    options: readonly string[] | string[]
    placeholder?: string
    /** 折叠前最多展示几个标签；超出部分才显示「+N」（Element Plus 按个数而非宽度折叠） */
    maxCollapseTags?: number
  }>(),
  { maxCollapseTags: 12 },
)

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()
</script>

<style scoped>
.tech-stack-select {
  width: 100%;
  max-width: 640px;
}
</style>
