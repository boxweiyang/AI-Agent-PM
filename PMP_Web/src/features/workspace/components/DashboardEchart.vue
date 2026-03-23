<script setup lang="ts">
import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart, ScatterChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsCoreOption } from 'echarts/core'
import { nextTick, onMounted, onUnmounted, shallowRef, watch } from 'vue'

echarts.use([
  LineChart,
  BarChart,
  PieChart,
  ScatterChart,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  CanvasRenderer,
])

const props = withDefaults(
  defineProps<{
    option: EChartsCoreOption | Record<string, unknown>
    /** 固定像素高度；与 `fill` 互斥，`fill` 为 true 时忽略 */
    height?: number
    /** 撑满父容器（父级需有确定高度，如 flex:1 + min-height:0） */
    fill?: boolean
  }>(),
  {
    height: 160,
    fill: false,
  },
)

const elRef = shallowRef<HTMLDivElement | null>(null)
const chartRef = shallowRef<echarts.ECharts | null>(null)
let resizeObserver: ResizeObserver | null = null

function resize() {
  chartRef.value?.resize()
}

function apply() {
  if (!elRef.value) return
  if (!chartRef.value) {
    chartRef.value = echarts.init(elRef.value)
  }
  chartRef.value.setOption(props.option as EChartsCoreOption, true)
  void nextTick(() => {
    resize()
    if (props.fill) {
      requestAnimationFrame(() => resize())
    }
  })
}

function setupFillObserver() {
  teardownFillObserver()
  if (!props.fill || !elRef.value) return
  resizeObserver = new ResizeObserver(() => {
    resize()
  })
  resizeObserver.observe(elRef.value)
}

function teardownFillObserver() {
  resizeObserver?.disconnect()
  resizeObserver = null
}

onMounted(() => {
  apply()
  void nextTick(() => {
    setupFillObserver()
    requestAnimationFrame(() => resize())
  })
  window.addEventListener('resize', resize)
})

onUnmounted(() => {
  teardownFillObserver()
  window.removeEventListener('resize', resize)
  chartRef.value?.dispose()
  chartRef.value = null
})

watch(
  () => props.option,
  () => {
    apply()
  },
  { deep: true },
)

watch(
  () => props.height,
  () => {
    if (!props.fill) resize()
  },
)

watch(
  () => props.fill,
  async (v) => {
    await nextTick()
    if (v) setupFillObserver()
    else teardownFillObserver()
    resize()
    requestAnimationFrame(() => resize())
  },
)

defineExpose({ resize, apply })
</script>

<template>
  <div
    ref="elRef"
    class="dash-echart"
    :class="{ 'dash-echart--fill': fill }"
    :style="
      fill
        ? { height: '100%', width: '100%', minHeight: '0' }
        : { height: `${height}px`, width: '100%' }
    "
  />
</template>

<style scoped>
.dash-echart {
  min-height: 80px;
}

.dash-echart--fill {
  flex: 1;
  min-height: 0;
}
</style>
