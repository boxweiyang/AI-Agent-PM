<!--
  工作台 / 项目管理（REQ-M09 §4）
  - 按 **项目状态** 分组，`el-collapse` 可展开/收起；组内 **一行两列** 卡片（中屏起）。
  - 数据：GET /api/v1/projects；新建：弹窗 POST /api/v1/projects；字段见契约与 `projectPresentation.ts`。
  - 功能说明：docs/FEATURES.md「工作台」。
-->
<template>
  <div class="workbench">
    <div class="toolbar">
      <div class="toolbar-text">
        <h1 class="page-title">{{ pageTitle }}</h1>
        <p class="page-desc">
          {{
            isProjectRoute
              ? '「项目管理」视图：与工作台共享数据，按状态分组浏览。'
              : '登录后首页：项目按状态折叠展示；点击卡片进入该项目 Dashboard（左侧菜单仅在项目内出现）。'
          }}
        </p>
      </div>
      <div class="toolbar-actions">
        <el-button v-if="auth.isSystemAdmin" type="primary" @click="createVisible = true">新建项目</el-button>
        <el-button text type="primary" :loading="loading" @click="loadProjects">刷新</el-button>
      </div>
    </div>

    <el-skeleton v-if="loading && !items.length" :rows="6" animated />

    <el-empty v-else-if="!loading && items.length === 0" description="暂无可见项目">
      <el-button v-if="auth.isSystemAdmin" type="primary" @click="createVisible = true">新建项目</el-button>
    </el-empty>

    <el-collapse v-else v-model="activeStatuses" class="status-collapse">
      <el-collapse-item v-for="g in statusGroups" :key="g.status" :name="g.status">
        <template #title>
          <div class="collapse-title">
            <span class="collapse-title-text">{{ g.status }}</span>
            <el-tag size="small" :type="statusTagType(g.status)" effect="light" round>
              {{ g.items.length }} 个项目
            </el-tag>
          </div>
        </template>

        <el-row :gutter="20" class="group-card-row">
          <el-col v-for="p in g.items" :key="p.id" :xs="24" :sm="24" :md="12" :lg="12">
            <el-card class="project-card" shadow="hover" @click="openProject(p)">
              <template #header>
                <div class="card-head">
                  <span class="proj-name">{{ p.name }}</span>
                  <el-tag size="small" :type="statusTagType(p.status)">{{ p.status }}</el-tag>
                </div>
              </template>

              <p class="proj-desc">{{ p.description ?? '暂无描述' }}</p>

              <!-- 细条形进度：不占用过高行高 -->
              <div class="progress-row">
                <span class="progress-label">完成度</span>
                <el-progress
                  :percentage="clampProgress(p)"
                  :stroke-width="4"
                  :show-text="false"
                  class="progress-bar"
                />
                <span class="progress-pct">{{ clampProgress(p) }}%</span>
              </div>

              <div class="stat-line">
                <span>
                  <template v-if="iterationLabel(p)">
                    {{ iterationLabel(p) }}<span class="stat-dot" aria-hidden="true">·</span>
                  </template>
                  Story <strong>{{ fmtNum(p.story_count) }}</strong>
                </span>
                <span class="stat-dot" aria-hidden="true">·</span>
                <span>Task 待办 <strong>{{ taskOpenTotalSummary(p) }}</strong></span>
                <span class="stat-dot" aria-hidden="true">·</span>
                <span>Bug <strong>{{ fmtNum(p.bug_open_count) }}</strong></span>
              </div>

              <div v-if="planRow(p)" class="plan-row">
                <span class="plan-date">预计完成：{{ planRow(p)?.dateLabel }}</span>
                <span class="plan-days" :class="{ 'plan-days--overdue': Boolean(planRow(p)?.overdue) }">
                  {{ planRow(p)?.daysLine }}
                </span>
              </div>

              <div v-if="p.updated_at" class="proj-meta">更新：{{ formatUpdated(p.updated_at) }}</div>
            </el-card>
          </el-col>
        </el-row>
      </el-collapse-item>
    </el-collapse>

    <ProjectCreateDialog v-model="createVisible" @created="onProjectCreated" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

import { apiClient } from '@/api/client'
import { setLastProjectId } from '@/api/last-project'
import ProjectCreateDialog from '@/features/workspace/components/ProjectCreateDialog.vue'
import { useAuthStore } from '@/stores/auth'
import type { ApiEnvelope, ProjectListData, ProjectSummary } from '@/types/api-contract'
import {
  clampProgress,
  groupProjectsByStatus,
  plannedEndParts,
  statusTagType,
  taskOpenTotalSummary,
} from '@/features/workspace/projectPresentation'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const loading = ref(false)
const createVisible = ref(false)
const items = ref<ProjectSummary[]>([])
/** 折叠面板：默认展开全部分组；用户可手动收起 */
const activeStatuses = ref<string[]>([])

const isProjectRoute = computed(() => route.name === 'workspace-projects')
const pageTitle = computed(() => (route.meta.title as string) ?? '工作台')

const statusGroups = computed(() => groupProjectsByStatus(items.value))

watch(
  statusGroups,
  (groups) => {
    activeStatuses.value = groups.map((g) => g.status)
  },
  { immediate: true },
)

async function loadProjects() {
  loading.value = true
  try {
    const { data } = await apiClient.get<ApiEnvelope<ProjectListData>>('/api/v1/projects')
    items.value = data.data?.items ?? []
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    ElMessage.error(msg)
    items.value = []
  } finally {
    loading.value = false
  }
}

function fmtNum(n: number | undefined): string | number {
  return n == null ? '—' : n
}

/** 工作台统计行：Story 前展示「第 N 次迭代」（契约字段 `iteration_number`，缺省则不展示） */
function iterationLabel(p: ProjectSummary): string {
  const n = p.iteration_number
  if (n == null || n < 1) return ''
  return `第 ${n} 次迭代`
}

function planRow(p: ProjectSummary) {
  return plannedEndParts(p.planned_end_at)
}

/** 更新时间：简化为本地日期时间一行 */
function formatUpdated(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('zh-CN', { hour12: false })
}

function onProjectCreated(p: ProjectSummary) {
  setLastProjectId(p.id)
  void loadProjects()
  void router.push({ name: 'project-dashboard', params: { projectId: p.id } })
}

function openProject(p: ProjectSummary) {
  setLastProjectId(p.id)
  void router.push({ name: 'project-dashboard', params: { projectId: p.id } })
}

onMounted(() => {
  void loadProjects()
})
</script>

<style scoped>
.workbench {
  max-width: 1560px;
  margin: 0 auto;
  padding-left: 12px;
  padding-right: 12px;
  box-sizing: border-box;
}

.toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.page-title {
  margin: 0 0 8px;
  font-size: 22px;
}

.page-desc {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 14px;
  max-width: 640px;
  line-height: 1.5;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.status-collapse {
  border: none;
  --el-collapse-header-height: 48px;
  /* 与主区内边距叠加后仍保持与侧栏/顶栏的视觉呼吸感 */
  padding-left: 8px;
  padding-right: 8px;
}

.status-collapse :deep(.el-collapse-item) {
  margin-bottom: 14px;
}

.status-collapse :deep(.el-collapse-item:last-child) {
  margin-bottom: 0;
}

/* 分类标题栏：上下边线与正文区分 */
.status-collapse :deep(.el-collapse-item__header) {
  font-size: 15px;
  font-weight: 600;
  padding-left: 20px;
  padding-right: 20px;
  border-top: 1px solid var(--el-border-color-lighter);
  border-bottom: 1px solid var(--el-border-color-lighter);
  background-color: var(--el-bg-color);
  box-sizing: border-box;
}

/* 展开区：浅底与标题栏形成层次（暗色主题下同样可读） */
.status-collapse :deep(.el-collapse-item__wrap) {
  border-bottom: none;
  background-color: var(--el-fill-color-lighter);
}

/* 卡片区：抵消 gutter 负边距贴左边的问题，并与标题左缘对齐 */
.status-collapse :deep(.el-collapse-item__content) {
  padding-left: 20px;
  padding-right: 20px;
  /* 与标题栏下边框拉开距离；预留 translateY(-2px) 的余量，避免悬停时与标题栏边线重合 */
  padding-top: 22px;
  padding-bottom: 16px;
  background-color: transparent;
}

.collapse-title {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding-right: 4px;
}

.collapse-title-text {
  flex: 1;
  min-width: 0;
}

.group-card-row {
  margin-bottom: 8px;
  /* 首行卡片与内容区顶内边距叠加，避免与分类标题栏抢同一视觉线 */
  margin-top: 4px;
}

.project-card {
  margin-bottom: 20px;
  min-height: 220px;
  cursor: pointer;
  border-radius: 12px;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.project-card:hover {
  transform: translateY(-2px);
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.proj-name {
  font-size: 16px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.proj-desc {
  margin: 0 0 14px;
  color: var(--el-text-color-regular);
  font-size: 14px;
  line-height: 1.55;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  min-height: 2.8em;
}

.progress-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.progress-label {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  width: 3em;
}

.progress-bar {
  flex: 1;
  min-width: 0;
}

.progress-bar :deep(.el-progress-bar__outer) {
  border-radius: 4px;
}

.progress-pct {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-regular);
  width: 2.5rem;
  text-align: right;
}

.stat-line {
  font-size: 13px;
  color: var(--el-text-color-regular);
  margin-bottom: 10px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.stat-dot {
  color: var(--el-text-color-placeholder);
  user-select: none;
}

.plan-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
  margin-bottom: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--el-fill-color-light);
}

.plan-date {
  color: var(--el-text-color-regular);
}

.plan-days {
  font-weight: 600;
  color: var(--el-color-success);
}

.plan-days--overdue {
  color: var(--el-color-danger);
}

.proj-meta {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
