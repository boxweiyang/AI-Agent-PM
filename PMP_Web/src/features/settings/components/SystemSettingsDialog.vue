<!--
  系统设置弹窗（非页面跳转）
  - 目前仅包含：菜单栏自动隐藏（none/icons/collapsed）
  - 配置持久化到 localStorage
  - 视觉遵循全局弹窗满视口滚动约定：class="pmp-viewport-dialog"
-->
<template>
  <el-dialog
    :model-value="modelValue"
    title="系统设置"
    width="720px"
    destroy-on-close
    class="pmp-viewport-dialog"
    :close-on-click-modal="false"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-form label-position="left" label-width="160px" :model="form">
      <el-form-item label="菜单栏自动隐藏">
        <el-radio-group v-model="form.sidebar_auto_hide_mode">
          <el-radio value="none">不隐藏</el-radio>
          <el-radio value="icons">隐藏成只剩图标</el-radio>
          <el-radio value="collapsed">隐藏全部（只剩箭头）</el-radio>
        </el-radio-group>
        <p class="help">
          生效时机：仅当进入项目页面后，点击 `el-main` 任意位置时自动收缩侧栏到对应模式。
        </p>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" plain :loading="saving" @click="onSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'

const SIDEBAR_AUTO_HIDE_MODE_KEY = 'pmp_project_sidebar_auto_hide_mode'

type SidebarAutoHideMode = 'none' | 'icons' | 'collapsed'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
  }>(),
  {},
)

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
}>()

const saving = ref(false)

function loadMode(): SidebarAutoHideMode {
  try {
    const v = window.localStorage.getItem(SIDEBAR_AUTO_HIDE_MODE_KEY)
    if (v === 'none' || v === 'icons' || v === 'collapsed') return v
  } catch {
    /* ignore */
  }
  return 'none'
}

const form = reactive<{ sidebar_auto_hide_mode: SidebarAutoHideMode }>({
  sidebar_auto_hide_mode: loadMode(),
})

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    // 每次打开都从存储刷新，避免多标签页不同步
    form.sidebar_auto_hide_mode = loadMode()
  },
)

async function onSave() {
  saving.value = true
  try {
    window.localStorage.setItem(SIDEBAR_AUTO_HIDE_MODE_KEY, form.sidebar_auto_hide_mode)
    ElMessage.success('已保存系统设置')
    emit('update:modelValue', false)
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.help {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}
</style>

