<!--
  站级应用壳（REQ-M09 §3）
  - 左侧：站级模块菜单（`siteNavMenu.ts`：主菜单图标 + 子项；未实现项待开发）。
  - 顶栏：模块标题、深/浅色切换、登录名 + 角色/Mock 标签、退出。
  - 右侧主区：router-view 承载业务页。
  - 进入具体项目后的「项目内侧栏」在后续迭代切换（当前为站级视图）。
  - 用户可见能力说明：docs/FEATURES.md「主壳 MainLayout」。
-->
<template>
  <el-container class="layout-root">
    <el-aside :width="asideWidthPx" class="aside">
      <div class="brand" @click="goHome">
        <span class="brand-mark">PMP</span>
        <span v-if="!asideCollapsed" class="brand-text">智能项目管理系统</span>
      </div>

      <!--
        站级菜单：按 REQ-MASTER 模块分子菜单；主项均用 el-sub-menu 可展开；未实现项 disabled +「待开发」。
        router：仅可点击项会跳转；占位 index 不以 `/` 开头，避免误匹配路由。
      -->
      <el-menu
        :default-active="activeMenuPath"
        :default-openeds="navDefaultOpeneds"
        :collapse="asideCollapsed"
        :collapse-transition="false"
        :unique-opened="false"
        router
        class="side-menu"
      >
        <el-sub-menu v-for="group in visibleNavGroups" :key="group.id" :index="group.id">
          <template #title>
            <el-icon class="nav-group-icon">
              <component :is="group.icon" />
            </el-icon>
            <span>{{ group.title }}</span>
          </template>
          <el-menu-item
            v-for="child in group.children"
            :key="child.index"
            :index="child.index"
            :disabled="child.disabled"
          >
            <span class="menu-item-row">
              <span class="menu-item-title">{{ child.title }}</span>
              <el-tag v-if="child.disabled" type="info" effect="plain" size="small" class="menu-dev-tag">
                待开发
              </el-tag>
            </span>
          </el-menu-item>
        </el-sub-menu>
      </el-menu>

      <div class="aside-footer">
        <el-button text class="collapse-btn" @click="asideCollapsed = !asideCollapsed">
          {{ asideCollapsed ? '展开' : '收起' }}
        </el-button>
      </div>
    </el-aside>

    <el-container direction="vertical" class="main-frame">
      <el-header class="top-header" height="48px">
        <div class="top-left">
          <!-- REQ-M09 §3.3 面包屑可简化为「模块标题」；此处用路由 meta.title -->
          <span class="crumb">{{ route.meta.title ?? '工作台' }}</span>
        </div>
        <div class="top-right">
          <ThemeSegmented />
          <!-- 登录名单独展示；角色与演示态用标签，避免与「系统管理员」文案重复 -->
          <div class="user-block">
            <span class="user-login" :title="auth.user?.display_name ?? ''">
              {{ auth.user?.username ?? '未登录' }}
            </span>
            <span class="user-tags">
              <el-tag v-if="auth.isSystemAdmin" size="small" type="warning">系统管理员</el-tag>
              <el-tag v-if="auth.user?.is_mock_profile" size="small" type="info" effect="plain">Mock</el-tag>
            </span>
          </div>
          <el-button type="danger" link @click="onLogout">退出</el-button>
        </div>
      </el-header>

      <el-main class="content-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'

import ThemeSegmented from '@/components/ThemeSegmented.vue'
import { filterSiteNavGroups, siteNavSubgroupIds } from '@/config/siteNavMenu'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

/** 侧栏折叠：窄屏或偏好；M09 允许 V1 固定宽度，此处提供可选折叠以适配小屏演示 */
const asideCollapsed = ref(false)
const asideWidthPx = computed(() => (asideCollapsed.value ? '64px' : '252px'))

const visibleNavGroups = computed(() => filterSiteNavGroups(auth.isSystemAdmin))

/** 默认展开全部主菜单分组（子菜单均可展开，且允许多组同时展开） */
const navDefaultOpeneds = computed(() => siteNavSubgroupIds(visibleNavGroups.value))

/**
 * 当前应高亮的菜单 index：`/projects/last` 与 `/projects/:id` 均对应侧栏「项目详情」。
 */
const activeMenuPath = computed(() => {
  const p = route.path
  if (p === '/' || p === '') return '/'
  if (route.name === 'project-last-hub') return '/projects/last'
  const pid = route.params.projectId
  if (typeof pid === 'string' && pid.length > 0) return '/projects/last'
  if (p === '/projects') return '/projects'
  return p
})

function goHome() {
  void router.push({ path: '/' })
}

async function onLogout() {
  try {
    await ElMessageBox.confirm('确定退出当前会话？', '退出登录', {
      type: 'warning',
      confirmButtonText: '退出',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  auth.logout()
  await router.replace({ path: '/login' })
}
</script>

<style scoped>
.layout-root {
  height: 100%;
  min-height: 0;
  /* 侧栏品牌区与右侧顶栏同一高度，顶边对齐、消除错位感 */
  --layout-top-strip-height: 48px;
}

.aside {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  border-right: 1px solid var(--el-border-color);
  background: var(--el-menu-bg-color);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  height: var(--layout-top-strip-height);
  min-height: var(--layout-top-strip-height);
  padding: 0 16px;
  box-sizing: border-box;
  cursor: pointer;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 7px;
  font-weight: 700;
  font-size: 12px;
  color: var(--el-color-white);
  background: linear-gradient(135deg, var(--el-color-primary), var(--el-color-primary-light-3));
}

/** 与顶栏 `.crumb` 字号/字重一致，同一「顶带」阅读节奏 */
.brand-text {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.25;
  color: var(--el-text-color-primary);
}

.side-menu {
  border-right: none;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.nav-group-icon {
  margin-right: 10px;
  font-size: 18px;
  vertical-align: middle;
}

.menu-item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  min-width: 0;
}

.menu-item-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.menu-dev-tag {
  flex-shrink: 0;
  font-weight: normal;
  opacity: 0.85;
}

.aside-footer {
  padding: 8px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.collapse-btn {
  width: 100%;
}

.main-frame {
  flex: 1;
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.top-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  height: var(--layout-top-strip-height) !important;
  min-height: var(--layout-top-strip-height);
  padding: 0 16px;
  box-sizing: border-box;
  border-bottom: 1px solid var(--el-border-color);
  background: var(--el-bg-color);
}

.crumb {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.25;
  color: var(--el-text-color-primary);
}

.top-right {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
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

.content-main {
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 20px;
  background: var(--el-bg-color-page);
}
</style>
