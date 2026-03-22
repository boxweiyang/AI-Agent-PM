<!--
  顶栏：标题区 + 功能下拉 + 主题 + 用户 + 退出。
  项目壳：左侧为「项目名称 [切换] - 页标题」；工作台：左侧为 route 标题。
-->
<template>
  <el-header class="app-header" height="48px">
    <div class="app-header-left">
      <div v-if="hasProjectContext" class="header-project-ctx">
        <span class="ctx-proj" :title="contextProjectName">{{ contextProjectName }}</span>
        <el-tooltip content="切换项目" placement="bottom">
          <el-button class="ctx-switch" type="primary" link @click="emit('switchProject')">
            <el-icon><Switch /></el-icon>
          </el-button>
        </el-tooltip>
        <span class="ctx-sep" aria-hidden="true">-</span>
        <span class="ctx-page">{{ contextPageTitle }}</span>
      </div>
      <span v-else-if="showLeftTitle && title.trim()" class="crumb">{{ title }}</span>
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
  </el-header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ArrowDown, Switch } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'

import ThemeSegmented from '@/components/ThemeSegmented.vue'
import { useAuthStore } from '@/stores/auth'

const props = withDefaults(
  defineProps<{
    /** 工作台等：单列标题 */
    title?: string
    /** 项目壳：顶栏「项目名称」段（可与切换按钮组合） */
    contextProjectName?: string
    /** 项目壳：顶栏「-」后的当前页标题（如 meta.title） */
    contextPageTitle?: string
    showLeftTitle?: boolean
  }>(),
  {
    title: '',
    contextProjectName: '',
    contextPageTitle: '',
    showLeftTitle: true,
  },
)

const emit = defineEmits<{
  logout: []
  switchProject: []
}>()

const router = useRouter()
const auth = useAuthStore()

const hasProjectContext = computed(() => Boolean(props.contextProjectName?.trim()))

function onFeatureCommand(cmd: string) {
  if (cmd === 'ai') void router.push({ name: 'settings-ai' })
  else if (cmd === 'profile') void router.push({ name: 'settings-profile' })
  else if (cmd === 'system') void router.push({ name: 'settings-system' })
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
}

.header-project-ctx {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px 6px;
  min-width: 0;
  font-size: 14px;
  line-height: 1.25;
}

.ctx-proj {
  font-weight: 600;
  color: var(--el-text-color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: min(40vw, 320px);
}

.ctx-switch {
  flex-shrink: 0;
  padding: 4px !important;
  min-height: auto;
  height: auto;
}

.ctx-switch :deep(.el-icon) {
  font-size: 16px;
}

.ctx-sep {
  color: var(--el-text-color-placeholder);
  font-weight: 400;
  flex-shrink: 0;
  margin: 0 2px;
}

.ctx-page {
  color: var(--el-text-color-regular);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: min(36vw, 280px);
}

.crumb {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.25;
  color: var(--el-text-color-primary);
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
