<!--
  项目壳：侧栏三态（全宽 / 仅图标 / 全收起）+ 顶栏上下文；品牌行高与顶栏一致 48px。
-->
<template>
  <el-container class="project-shell" direction="horizontal">
    <div
      class="aside-skin"
      :class="{
        'aside-skin--zero': sidebarMode === 'collapsed',
        'aside-skin--icons': sidebarMode === 'icons',
        'aside-skin--full': sidebarMode === 'full',
      }"
      :style="{ width: `${asideWidthPx}px` }"
    >
      <div
        v-show="sidebarMode !== 'collapsed'"
        class="aside-panel"
        :class="{ 'aside-panel--icons': sidebarMode === 'icons' }"
      >
        <el-aside class="project-aside" :width="'100%'">
          <div class="brand" @click="goHome">
            <PmpBrandMark />
            <span v-show="sidebarMode === 'full'" class="brand-text">{{ PRODUCT_DISPLAY_NAME }}</span>
          </div>
          <div v-show="sidebarMode === 'full'" class="project-aside-sub" :title="projectDisplayName">
            {{ projectDisplayName }}
          </div>
          <el-scrollbar class="aside-scroll">
            <el-menu
              :default-active="activeMenuPath"
              class="project-menu"
              router
              :ellipsis="false"
              :collapse="sidebarMode === 'icons'"
              :collapse-transition="true"
            >
              <template v-for="group in PROJECT_SIDEBAR_GROUPS" :key="group.id">
                <el-menu-item-group :title="group.title">
                  <el-menu-item
                    v-for="item in group.items"
                    :key="item.routeName"
                    :index="resolvePath(item.routeName)"
                    :title="sidebarMode === 'icons' ? item.title : undefined"
                  >
                    <el-icon><component :is="item.icon" /></el-icon>
                    <span v-if="sidebarMode === 'full'">{{ item.title }}</span>
                  </el-menu-item>
                </el-menu-item-group>
              </template>
            </el-menu>
          </el-scrollbar>
        </el-aside>
      </div>

      <el-tooltip :content="toggleTooltip" placement="right">
        <button type="button" class="aside-rail-toggle" :aria-label="toggleTooltip" @click="cycleSidebar">
          <el-icon class="rail-toggle-icon">
            <DArrowRight v-if="sidebarMode === 'collapsed'" />
            <DArrowLeft v-else />
          </el-icon>
        </button>
      </el-tooltip>
    </div>

    <el-container class="project-right" direction="vertical">
      <AppHeaderBar :context-project-name="contextProjectTitle" @switch-project="goProjectList" @logout="onLogout" />
      <el-main class="project-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { DArrowLeft, DArrowRight } from '@element-plus/icons-vue'

import AppHeaderBar from '@/components/AppHeaderBar.vue'
import PmpBrandMark from '@/components/PmpBrandMark.vue'
import { apiClient } from '@/api/client'
import { PRODUCT_DISPLAY_NAME } from '@/config/productBranding'
import { PROJECT_SIDEBAR_GROUPS } from '@/config/projectSidebarNav'
import { useAuthStore } from '@/stores/auth'
import type { ApiEnvelope, ProjectOneData } from '@/types/api-contract'

const SIDEBAR_STORAGE_KEY = 'pmp_project_sidebar_mode'

type SidebarMode = 'full' | 'icons' | 'collapsed'

function loadSidebarMode(): SidebarMode {
  try {
    const v = localStorage.getItem(SIDEBAR_STORAGE_KEY)
    if (v === 'full' || v === 'icons' || v === 'collapsed') return v
  } catch {
    /* ignore */
  }
  return 'full'
}

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const sidebarMode = ref<SidebarMode>(loadSidebarMode())

const projectId = computed(() => String(route.params.projectId ?? ''))

const fetchedProjectName = ref('')

const projectDisplayName = computed(() => {
  if (!projectId.value) return ''
  const n = fetchedProjectName.value.trim()
  if (n) return n
  return `项目 ${projectId.value}`
})

const contextProjectTitle = computed(() => {
  const n = fetchedProjectName.value.trim()
  if (n) return n
  return projectId.value ? `项目 ${projectId.value}` : '—'
})

/** 仅图标模式略窄于 EP 默认 64，更紧凑；与下方菜单宽度覆盖配套 */
const asideWidthPx = computed(() => {
  if (sidebarMode.value === 'full') return 220
  if (sidebarMode.value === 'icons') return 52
  return 0
})

const toggleTooltip = computed(() => {
  if (sidebarMode.value === 'full') return '收起到仅图标'
  if (sidebarMode.value === 'icons') return '完全收起'
  return '展开侧边栏'
})

function cycleSidebar() {
  const order: SidebarMode[] = ['full', 'icons', 'collapsed']
  const i = order.indexOf(sidebarMode.value)
  sidebarMode.value = order[(i + 1) % order.length]
  try {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, sidebarMode.value)
  } catch {
    /* ignore */
  }
}

watch(
  projectId,
  async (id) => {
    fetchedProjectName.value = ''
    if (!id) return
    try {
      const { data } = await apiClient.get<ApiEnvelope<ProjectOneData>>(`/api/v1/projects/${id}`)
      const name = data.data?.name?.trim()
      fetchedProjectName.value = name ?? ''
    } catch {
      fetchedProjectName.value = ''
    }
  },
  { immediate: true },
)

const activeMenuPath = computed(() => route.path)

function resolvePath(routeName: string): string {
  return router.resolve({ name: routeName, params: { projectId: projectId.value } }).path
}

function goHome() {
  if (sidebarMode.value === 'collapsed') return
  void router.push({ name: 'workspace-home' })
}

function goProjectList() {
  void router.push({ name: 'workspace-projects' })
}

async function onLogout() {
  await auth.logout()
  await router.replace({ name: 'login' })
}
</script>

<style scoped>
.project-shell {
  height: 100vh;
  min-height: 100vh;
  width: 100%;
}

.aside-skin {
  position: relative;
  flex-shrink: 0;
  align-self: stretch;
  min-height: 100vh;
  transition: width 0.22s ease;
  overflow: visible;
  box-sizing: border-box;
}

.aside-skin--zero {
  border-right: none;
}

.aside-panel {
  height: 100%;
  min-height: 100vh;
  overflow: hidden;
  border-right: 1px solid var(--el-border-color);
  box-sizing: border-box;
  background: var(--el-menu-bg-color);
}

.aside-panel--icons .brand {
  justify-content: center;
  padding-left: 0;
  padding-right: 0;
}

.project-aside {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 100vh;
  border-right: none !important;
  background: transparent;
}

.brand {
  height: 48px;
  min-height: 48px;
  max-height: 48px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  cursor: pointer;
  user-select: none;
  border-bottom: 1px solid var(--el-border-color);
  flex-shrink: 0;
}

.brand-text {
  font-weight: 700;
  letter-spacing: 0.02em;
  font-size: 12px;
  line-height: 1.2;
  color: var(--el-text-color-primary);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-aside-sub {
  padding: 6px 12px 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.35;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  word-break: break-all;
  flex-shrink: 0;
}

.aside-scroll {
  flex: 1;
  min-height: 0;
}

.project-menu {
  border-right: none;
  background: transparent;
}

/*
 * 仅图标模式：`el-menu-item-group` 的分组标题仍会占位显示文案，需强制隐藏；
 * 子项文案已由 `v-if="sidebarMode === 'full'"` 去掉，保留图标 + 原生 title 提示。
 */
.aside-panel--icons .project-menu:deep(.el-menu-item-group__title) {
  display: none !important;
  padding: 0 !important;
  height: 0 !important;
  min-height: 0 !important;
  line-height: 0 !important;
  overflow: hidden !important;
}

/* 折叠菜单：整行与触发器均水平居中，去掉 EP 为文字预留的左右不对称 padding */
.aside-panel--icons .project-menu:deep(.el-menu.el-menu--collapse) {
  width: 52px !important;
}

.aside-panel--icons .project-menu:deep(.el-menu--collapse .el-menu-item) {
  padding: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.aside-panel--icons .project-menu:deep(.el-menu--collapse .el-menu-item .el-menu-tooltip__trigger) {
  display: flex !important;
  width: 100% !important;
  min-height: 56px;
  align-items: center !important;
  justify-content: center !important;
  padding: 0 !important;
  box-sizing: border-box;
}

.aside-panel--icons .project-menu:deep(.el-menu--collapse .el-menu-item .el-icon) {
  margin-right: 0 !important;
  margin-left: 0 !important;
}

.aside-panel--icons .project-menu:deep(.el-menu--collapse .el-menu-item .el-icon svg) {
  display: block;
}

/* 腰钮：左缘与侧栏右缘对齐（不压菜单），仅纵向居中；无左边框，与菜单右边框共用一条分界 */
.aside-rail-toggle {
  position: absolute;
  left: 100%;
  top: 50%;
  transform: translateY(-50%);
  z-index: 25;
  width: 16px;
  height: 48px;
  padding: 0;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
  border: 1px solid var(--el-border-color);
  border-left: none;
  border-radius: 0 10px 10px 0;
  background: var(--el-bg-color);
  color: var(--el-text-color-secondary);
  cursor: pointer;
  box-shadow: 2px 0 12px rgba(0, 0, 0, 0.08);
  transition:
    color 0.18s ease,
    background 0.18s ease,
    box-shadow 0.22s ease,
    width 0.22s ease,
    height 0.22s ease;
}

.aside-rail-toggle {
  box-shadow:
    2px 0 12px rgba(0, 0, 0, 0.08),
    0 0 22px color-mix(in srgb, var(--el-color-primary) 28%, transparent),
    0 0 1px color-mix(in srgb, var(--el-color-primary) 38%, transparent);
}

.aside-rail-toggle:hover {
  color: var(--el-color-primary);
  background: var(--el-fill-color-light);
  box-shadow: 2px 0 16px rgba(0, 0, 0, 0.1);
}

.aside-rail-toggle:hover {
  box-shadow:
    2px 0 16px rgba(0, 0, 0, 0.1),
    0 0 34px color-mix(in srgb, var(--el-color-primary) 45%, transparent),
    0 0 2px color-mix(in srgb, var(--el-color-primary) 55%, transparent);
}

/* 全收起：腰钮略加宽；悬停向右弹性位移（cubic-bezier 略过冲模拟弹动） */
.aside-skin--zero .aside-rail-toggle {
  width: 26px;
  height: 54px;
  border-radius: 0 12px 12px 0;
  box-shadow: 2px 0 14px rgba(0, 0, 0, 0.1);
  transform: translateY(-50%);
  transition:
    color 0.18s ease,
    background 0.18s ease,
    box-shadow 0.22s ease,
    width 0.22s ease,
    height 0.22s ease,
    transform 0.48s cubic-bezier(0.22, 1.55, 0.38, 1);
}

.aside-skin--zero .aside-rail-toggle {
  box-shadow:
    2px 0 14px rgba(0, 0, 0, 0.1),
    0 0 30px color-mix(in srgb, var(--el-color-primary) 36%, transparent),
    0 0 2px color-mix(in srgb, var(--el-color-primary) 45%, transparent);
}

.aside-skin--zero .aside-rail-toggle:hover {
  box-shadow: 2px 0 18px rgba(0, 0, 0, 0.12);
}

.aside-skin--zero .aside-rail-toggle:hover {
  box-shadow:
    2px 0 18px rgba(0, 0, 0, 0.12),
    0 0 44px color-mix(in srgb, var(--el-color-primary) 52%, transparent),
    0 0 3px color-mix(in srgb, var(--el-color-primary) 60%, transparent);
  transform: translateY(-50%) translateX(12px);
}

@media (prefers-reduced-motion: reduce) {
  .aside-skin--zero .aside-rail-toggle {
    transition:
      color 0.18s ease,
      background 0.18s ease,
      box-shadow 0.22s ease,
      width 0.22s ease,
      height 0.22s ease;
  }

  .aside-skin--zero .aside-rail-toggle:hover {
    transform: translateY(-50%);
  }
}

.rail-toggle-icon {
  font-size: 15px;
  transition: font-size 0.22s ease;
}

.aside-skin--zero .rail-toggle-icon {
  font-size: 19px;
}

.project-right {
  flex: 1;
  min-width: 0;
  min-height: 0;
}

.project-main {
  flex: 1;
  min-height: 0;
  min-width: 0;
  width: 100%;
  padding: 16px 50px;
  box-sizing: border-box;
}

</style>
