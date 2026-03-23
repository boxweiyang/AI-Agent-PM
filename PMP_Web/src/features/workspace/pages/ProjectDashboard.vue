<!--
  REQ-M08：项目内首屏 Dashboard；数据来自 GET /api/v1/projects/:id/dashboard（MSW 演示）。
  风险与关注卡置顶；指标卡两列、宽度随主区；图表轮播加高；点击放大；「查看」在卡片标题栏右侧。
-->
<template>
  <div class="proj-dash" v-loading="loading">
    <div class="dash-toolbar">
      <div class="scope">
        <span class="scope-label">迭代范围</span>
        <el-select
          v-model="iterationKey"
          class="scope-select"
          filterable
          placeholder="选择统计范围"
          @change="loadDashboard"
        >
          <el-option label="全部迭代" value="all" />
          <el-option label="当前迭代（进行中优先）" value="current" />
          <el-option
            v-for="it in iterationOptions"
            :key="it.id"
            :label="it.name + (it.is_current ? ' · 标记为当前' : '')"
            :value="it.id"
          />
        </el-select>
      </div>
      <div class="toolbar-actions">
        <el-button type="primary" plain @click="goDetail">项目详情</el-button>
        <el-button @click="openAiDrawer">AI：本周摘要</el-button>
      </div>
    </div>

    <p v-if="scopeLabel" class="scope-hint">{{ scopeLabel }}</p>

    <el-alert
      v-if="loadError"
      type="error"
      :closable="false"
      show-icon
      :title="loadError"
      class="dash-alert"
    />

    <el-card v-if="!loadError && riskItems.length" class="risk-card" shadow="never">
      <template #header>
        <div class="card-head-inline">
          <span>风险与关注</span>
          <el-tag size="small" type="warning">REQ-M08 §5</el-tag>
        </div>
      </template>
      <p class="risk-lead">阻塞 Task、高优缺陷、待评审 CR、驳回提测等（Mock 数据已排序）。</p>
      <el-table :data="riskItems" stripe size="small" class="risk-table">
        <el-table-column label="类型" width="120">
          <template #default="{ row }">
            <el-tag size="small" :type="riskTagType(row.kind)">{{ riskKindLabel(row.kind) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="200" />
        <el-table-column prop="subtitle" label="说明" min-width="220" />
      </el-table>
    </el-card>

    <div v-if="!loadError && cards.length" class="card-grid">
      <el-card v-for="card in cards" :key="card.kind" class="metric-card" shadow="never">
        <template #header>
          <div class="card-head">
            <div class="card-head-left">
              <span class="card-head-title">{{ card.title }}</span>
              <el-tag size="small" type="info" effect="plain">{{ cardKindLabel(card.kind) }}</el-tag>
            </div>
            <el-button
              v-if="card.drill?.route_name"
              type="primary"
              link
              class="card-head-drill"
              @click.stop="drill(card)"
            >
              查看
            </el-button>
          </div>
        </template>

        <div class="card-inner">
          <ul class="metric-list">
            <li v-for="(m, idx) in card.metrics" :key="idx">
              <span class="m-label">{{ m.label }}</span>
              <span class="m-value">{{ m.value }}</span>
            </li>
          </ul>

          <el-carousel
            v-if="card.charts?.length"
            :key="`${card.kind}-${iterationKey}`"
            class="dash-carousel"
            height="318px"
            :autoplay="false"
            trigger="click"
            indicator-position="outside"
            arrow="always"
            @change="handleCarouselSlideChange(card.kind, $event)"
          >
            <el-carousel-item v-for="(spec, idx) in card.charts" :key="spec.id">
              <button type="button" class="chart-slide" @click.stop="openZoom(spec)">
                <span class="chart-slide-title">{{ spec.title }}</span>
                <div class="chart-slide-body">
                  <DashboardEchart
                    :ref="(el) => storeCarouselChartRef(card.kind, idx, el)"
                    class="chart-inner"
                    fill
                    :option="spec.option"
                  />
                </div>
                <span class="chart-zoom-hint">点击放大</span>
              </button>
            </el-carousel-item>
          </el-carousel>
        </div>

      </el-card>
    </div>

    <el-empty v-if="!loading && !loadError && !cards.length" description="暂无 Dashboard 数据" />

    <el-dialog
      v-model="zoomVisible"
      :title="zoomTitle"
      width="min(960px, 94vw)"
      class="chart-zoom-dialog"
      destroy-on-close
      align-center
      @opened="onZoomOpened"
    >
      <DashboardEchart v-if="zoomOption" ref="zoomChartRef" :option="zoomOption" :height="420" />
    </el-dialog>

    <el-drawer v-model="aiDrawerVisible" title="生成本周项目进展摘要" size="420px" destroy-on-close>
      <p class="drawer-hint">基于当前筛选范围与卡片数据生成短文（Mock）；不写入业务数据（REQ-M08 §7）。</p>
      <el-button type="primary" :loading="aiLoading" class="drawer-gen" @click="generateSummary">
        生成
      </el-button>
      <el-input
        v-model="aiSummaryText"
        type="textarea"
        :rows="14"
        readonly
        placeholder="点击「生成」"
        class="drawer-ta"
      />
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, nextTick, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { apiClient } from '@/api/client'
import DashboardEchart from '@/features/workspace/components/DashboardEchart.vue'
import type {
  ApiEnvelope,
  DashboardCard,
  DashboardChartSpec,
  DashboardRiskItem,
  ProjectDashboardData,
} from '@/types/api-contract'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const loadError = ref('')
const iterationKey = ref('current')
const iterationOptions = ref<ProjectDashboardData['iteration_options']>([])
const scopeLabel = ref('')
const cards = ref<DashboardCard[]>([])
const riskItems = ref<DashboardRiskItem[]>([])

const zoomVisible = ref(false)
const zoomTitle = ref('')
const zoomOption = shallowRef<Record<string, unknown> | null>(null)
const zoomChartRef = shallowRef<InstanceType<typeof DashboardEchart> | null>(null)

type DashEchartInst = InstanceType<typeof DashboardEchart>

/**
 * 轮播内图表实例必须用 **非响应式** 容器保存：`ref` 回调里若写 `ref/shallowRef` 会触发重渲染，
 * `ElCarouselItem` 会陷入「Maximum recursive updates」。
 */
const carouselChartByKind = new Map<string, (DashEchartInst | null)[]>()

function storeCarouselChartRef(kind: string, idx: number, el: unknown) {
  if (el == null || typeof el !== 'object') {
    const row = carouselChartByKind.get(kind)
    if (row && idx < row.length) row[idx] = null
    return
  }
  const c = el as { resize?: () => void }
  if (typeof c.resize !== 'function') return
  const comp = el as DashEchartInst
  let row = carouselChartByKind.get(kind)
  if (!row) {
    row = []
    carouselChartByKind.set(kind, row)
  }
  while (row.length <= idx) row.push(null)
  row[idx] = comp
}

function clearCarouselChartMap() {
  carouselChartByKind.clear()
}

function handleCarouselSlideChange(kind: string, current: unknown) {
  const index = typeof current === 'number' ? current : Number(current)
  if (Number.isNaN(index)) return
  void nextTick(() => {
    carouselChartByKind.get(kind)?.[index]?.resize()
  })
}

function resizeVisibleCarouselCharts() {
  void nextTick(() => {
    for (const arr of carouselChartByKind.values()) {
      arr[0]?.resize()
    }
  })
}

const projectId = computed(() => {
  const id = route.params.projectId
  return typeof id === 'string' ? id : ''
})

function cardKindLabel(kind: string): string {
  const map: Record<string, string> = {
    iteration_progress: 'M03',
    task_execution: 'M04',
    blocked: 'M04',
    manpower: 'M05',
    change_request: 'M06',
    quality: 'M07',
    api_catalog: 'M02C',
    completion_forecast: '预测',
    milestones_plan_actual: '里程碑',
  }
  return map[kind] ?? kind
}

function riskKindLabel(kind: string): string {
  const map: Record<string, string> = {
    bug_high: '缺陷',
    task_blocked: '阻塞 Task',
    cr_pending: 'CR',
    test_rejected: '提测',
  }
  return map[kind] ?? kind
}

function riskTagType(kind: string): 'danger' | 'warning' | 'info' | 'success' {
  if (kind === 'bug_high') return 'danger'
  if (kind === 'task_blocked') return 'warning'
  if (kind === 'cr_pending') return 'info'
  return 'success'
}

function openZoom(spec: DashboardChartSpec) {
  zoomTitle.value = spec.title
  zoomOption.value = JSON.parse(JSON.stringify(spec.option)) as Record<string, unknown>
  zoomVisible.value = true
}

function onZoomOpened() {
  void nextTick(() => {
    zoomChartRef.value?.resize()
  })
}

async function loadDashboard() {
  const id = projectId.value
  if (!id) return
  loading.value = true
  loadError.value = ''
  try {
    const q = new URLSearchParams({ iteration_key: iterationKey.value })
    const { data } = await apiClient.get<ApiEnvelope<ProjectDashboardData>>(
      `/api/v1/projects/${id}/dashboard?${q.toString()}`,
    )
    const d = data.data
    iterationOptions.value = d.iteration_options
    scopeLabel.value = d.scope_label
    clearCarouselChartMap()
    cards.value = d.cards
    riskItems.value = d.risk_items
    await nextTick()
    await nextTick()
    resizeVisibleCarouselCharts()
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : '加载失败'
    cards.value = []
    riskItems.value = []
    scopeLabel.value = ''
  } finally {
    loading.value = false
  }
}

function drill(card: DashboardCard) {
  const id = projectId.value
  const name = card.drill?.route_name
  if (!id || !name) return
  void router.push({
    name,
    params: { projectId: id },
    query: card.drill?.query ?? {},
  })
}

function goDetail() {
  const id = projectId.value
  if (id) void router.push({ name: 'project-detail', params: { projectId: id } })
}

const aiDrawerVisible = ref(false)
const aiSummaryText = ref('')
const aiLoading = ref(false)

function openAiDrawer() {
  aiSummaryText.value = ''
  aiDrawerVisible.value = true
}

async function generateSummary() {
  aiLoading.value = true
  try {
    const { data } = await apiClient.post<ApiEnvelope<{ summary?: string }>>('/api/v1/ai/invoke', {
      capability: 'dashboard_weekly_summary',
      payload: {
        scope_label: scopeLabel.value,
        iteration_key: iterationKey.value,
      },
    })
    aiSummaryText.value = (data.data.summary as string) ?? JSON.stringify(data.data, null, 2)
    ElMessage.success('已生成（Mock）')
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '生成失败')
  } finally {
    aiLoading.value = false
  }
}

watch(
  () => route.params.projectId,
  () => {
    iterationKey.value = 'current'
    void loadDashboard()
  },
  { immediate: true },
)
</script>

<style scoped>
.proj-dash {
  width: 100%;
  max-width: none;
  min-width: 0;
  box-sizing: border-box;
}

.dash-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.scope {
  display: flex;
  align-items: center;
  gap: 10px;
}

.scope-label {
  font-size: 14px;
  color: var(--el-text-color-regular);
  white-space: nowrap;
}

.scope-select {
  min-width: 280px;
}

.toolbar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.scope-hint {
  margin: 0 0 16px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.dash-alert {
  margin-bottom: 16px;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
  width: 100%;
}

@media (max-width: 900px) {
  .card-grid {
    grid-template-columns: 1fr;
  }
}

.metric-card.el-card {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  min-width: 0;
  width: 100%;
}

.metric-card :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 12px 16px;
}

.card-inner {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  min-width: 0;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-weight: 600;
  font-size: 15px;
}

.card-head-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.card-head-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-head-drill {
  flex-shrink: 0;
  font-weight: 500;
}

.card-head-inline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-weight: 600;
  font-size: 15px;
}

.metric-list {
  list-style: none;
  margin: 0;
  padding: 0;
  flex: 1;
}

.metric-list li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 0;
  font-size: 13px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.metric-list li:last-child {
  border-bottom: none;
}

.m-label {
  color: var(--el-text-color-secondary);
}

.m-value {
  font-weight: 600;
  color: var(--el-text-color-primary);
  text-align: right;
}

.dash-carousel {
  width: 100%;
  min-width: 0;
  margin-top: 4px;
}

.dash-carousel :deep(.el-carousel__container) {
  border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-blank);
}

.dash-carousel :deep(.el-carousel__item) {
  display: flex;
  align-items: stretch;
}

.dash-carousel :deep(.el-carousel__indicators--outside) {
  margin-top: 10px;
}

/* 为左右箭头留出槽位，避免压在图表上；箭头缩进贴边 */
.dash-carousel :deep(.el-carousel__arrow) {
  width: 30px;
  height: 30px;
  font-size: 14px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--el-bg-color-page) 88%, var(--el-text-color-primary));
  color: var(--el-text-color-regular);
  box-shadow: 0 1px 4px color-mix(in srgb, #000 12%, transparent);
}

.dash-carousel :deep(.el-carousel__arrow:hover) {
  background: color-mix(in srgb, var(--el-color-primary) 22%, var(--el-bg-color-page));
  color: var(--el-color-primary);
}

.dash-carousel :deep(.el-carousel__arrow--left) {
  left: 6px;
}

.dash-carousel :deep(.el-carousel__arrow--right) {
  right: 6px;
}

.chart-slide {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  height: 100%;
  margin: 0;
  /* 左右加宽：30px 箭头 + 边距，避免压在图表上 */
  padding: 10px 52px 8px;
  box-sizing: border-box;
  border: none;
  background: transparent;
  cursor: zoom-in;
  text-align: left;
  font: inherit;
  color: inherit;
}

.chart-slide-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-regular);
  margin-bottom: 6px;
  line-height: 1.3;
  flex-shrink: 0;
}

.chart-slide-body {
  flex: 1;
  min-height: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.chart-inner {
  pointer-events: none;
}

.chart-zoom-hint {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
  margin-top: 4px;
  flex-shrink: 0;
}

.risk-card {
  margin: 0 0 16px;
  width: 100%;
}

.risk-lead {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.risk-table {
  width: 100%;
}

.drawer-hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.drawer-gen {
  margin-bottom: 12px;
}

.drawer-ta {
  font-family: inherit;
}

/* 暗色：轮播箭头与悬停对比更明显 */
html.dark .dash-carousel :deep(.el-carousel__arrow) {
  background: color-mix(in srgb, var(--el-fill-color) 92%, var(--el-text-color-primary));
  color: var(--el-text-color-primary);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--el-border-color) 80%, transparent);
}

html.dark .dash-carousel :deep(.el-carousel__arrow:hover) {
  background: color-mix(in srgb, var(--el-color-primary) 38%, var(--el-fill-color));
  color: var(--el-color-primary-light-3);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--el-color-primary) 50%, transparent);
}
</style>

<style>
/* 弹窗内图表高度不受 scoped 限制 */
.chart-zoom-dialog .el-dialog__body {
  padding-top: 8px;
}
</style>
