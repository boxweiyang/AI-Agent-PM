<!--
  顶栏：返回箭头 + 完整路径面包屑（可点任意一级）+ 项目内切换项目；
  设置页保留「回到项目列表」；右侧功能 / 主题 / 用户 / 退出。
-->
<template>
  <el-header class="app-header" height="48px">
    <div class="app-header-left">
      <el-tooltip content="返回上一级" placement="bottom">
        <el-button class="back-btn" type="primary" link @click="goBreadcrumbBack">
          <el-icon><ArrowLeft /></el-icon>
        </el-button>
      </el-tooltip>

      <el-breadcrumb class="header-bc" separator="/">
        <el-breadcrumb-item v-for="(bc, i) in breadcrumbs" :key="i" :to="bc.to">
          {{ bc.label }}
        </el-breadcrumb-item>
      </el-breadcrumb>

      <template v-if="showSettingsProjectListBack">
        <span class="wb-sep" aria-hidden="true">·</span>
        <el-button class="wb-back-list" type="primary" link @click="goProjectList">
          回到项目列表
        </el-button>
      </template>

      <template v-if="isProjectShell">
        <el-button class="ctx-switch" type="primary" link @click="emit('switchProject')">
          <el-icon><Switch /></el-icon>
          <span class="ctx-switch-text">切换项目</span>
        </el-button>
      </template>
    </div>
    <div class="app-header-right">
      <el-dropdown trigger="click" @command="onFeatureCommand">
        <el-button text type="primary">
          功能
          <el-icon class="el-icon--right"><ArrowDown /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="ai">AI 设置</el-dropdown-item>
            <el-dropdown-item command="profile">个人设置</el-dropdown-item>
            <el-dropdown-item v-if="auth.isSystemAdmin" command="system">系统设置</el-dropdown-item>
            <el-dropdown-item v-else disabled>系统设置（仅管理员）</el-dropdown-item>
            <el-dropdown-item divided command="last">进入最近项目</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <ThemeSegmented />
      <div class="user-block">
        <span class="user-login" :title="auth.user?.display_name ?? ''">
          {{ auth.user?.username ?? '未登录' }}
        </span>
        <span class="user-tags">
          <el-tag v-if="auth.isSystemAdmin" size="small" type="warning">系统管理员</el-tag>
          <el-tag v-if="auth.user?.is_mock_profile" size="small" type="info" effect="plain">Mock</el-tag>
        </span>
      </div>
      <el-button type="danger" link @click="emit('logout')">退出</el-button>
    </div>

    <SystemSettingsDialog v-model="systemSettingsDialogVisible" />
  </el-header>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowDown, ArrowLeft, Switch } from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'

import ThemeSegmented from '@/components/ThemeSegmented'
import SystemSettingsDialog from '@/features/settings/components/SystemSettingsDialog.vue'
import { useAuthStore } from '@/stores/auth'
import { buildHeaderBreadcrumbs } from '@/utils/headerBreadcrumbs'

const props = withDefaults(
  defineProps<{
    /**
     * 项目壳：面包屑中「项目名」段展示用（与 `GET /projects/:id` 一致；未加载时内部有 `项目 id` 兜底）
     */
    contextProjectName?: string
  }>(),
  {
    contextProjectName: '',
  },
)

const emit = defineEmits<{
  logout: []
  switchProject: []
}>()

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const systemSettingsDialogVisible = ref(false)

const isProjectShell = computed(() => {
  const id = route.params.projectId
  return typeof id === 'string' && id.length > 0
})

const breadcrumbs = computed(() => buildHeaderBreadcrumbs(route, props.contextProjectName ?? ''))

/** 设置页：保留快捷入口（与面包屑中「项目管理」等价，用户习惯） */
const showSettingsProjectListBack = computed(() => {
  const n = route.name
  return n === 'settings-ai' || n === 'settings-profile' || n === 'settings-system'
})

function goProjectList() {
  void router.push({ name: 'workspace-projects' })
}

/**
 * 优先回到面包屑中「离当前页最近、且目标路由不同于当前」的一级；
 * 否则浏览器 history.back；再否则回工作台。
 */
function goBreadcrumbBack() {
  const items = breadcrumbs.value
  const cur = route.fullPath
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i]
    if (!it.to) continue
    try {
      const r = router.resolve(it.to)
      if (r.fullPath !== cur) {
        void router.push(it.to)
        return
      }
    } catch {
      /* ignore */
    }
  }
  if (typeof window !== 'undefined' && window.history.length > 1) {
    router.back()
    return
  }
  void router.push({ name: 'workspace-home' })
}

function onFeatureCommand(cmd: string) {
  if (cmd === 'ai') void router.push({ name: 'settings-ai' })
  else if (cmd === 'profile') void router.push({ name: 'settings-profile' })
  else if (cmd === 'system') systemSettingsDialogVisible.value = true
  else if (cmd === 'last') void router.push({ name: 'enter-last-project' })
}
</script>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  height: 48px !important;
  min-height: 48px;
  padding: 0 16px;
  box-sizing: border-box;
  border-bottom: 1px solid var(--el-border-color);
  background: var(--el-bg-color);
}

.app-header-left {
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.back-btn {
  flex-shrink: 0;
  padding: 4px !important;
  min-height: auto;
  height: auto;
}

.back-btn :deep(.el-icon) {
  font-size: 18px;
}

.header-bc {
  min-width: 0;
  flex: 1;
  font-size: 14px;
  line-height: 1.25;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
  scrollbar-width: thin;
}

.header-bc :deep(.el-breadcrumb__item) {
  float: none;
  display: inline-flex;
  align-items: center;
}

.header-bc :deep(.el-breadcrumb__inner) {
  font-weight: 500;
  color: var(--el-text-color-regular);
}

.header-bc :deep(.el-breadcrumb__item:last-child .el-breadcrumb__inner) {
  color: var(--el-text-color-primary);
  font-weight: 600;
}

.header-bc :deep(a.el-breadcrumb__inner) {
  color: var(--el-color-primary);
  font-weight: 500;
}

.header-bc :deep(a.el-breadcrumb__inner:hover) {
  opacity: 0.85;
}

.wb-sep {
  color: var(--el-text-color-placeholder);
  user-select: none;
  flex-shrink: 0;
}

.wb-back-list {
  flex-shrink: 0;
  padding: 0 !important;
}

.ctx-switch {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 2px !important;
  min-height: auto;
  height: auto;
}

.ctx-switch :deep(.el-icon) {
  font-size: 16px;
}

.ctx-switch-text {
  font-size: 14px;
  white-space: nowrap;
}

.app-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.user-block {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.user-login {
  font-size: 14px;
  color: var(--el-text-color-regular);
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-tags {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
</style>
