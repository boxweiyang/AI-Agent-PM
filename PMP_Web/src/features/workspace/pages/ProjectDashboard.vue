<!--
  进入项目后的默认页：独立 Dashboard（占位）；业务指标后续接 M08 等。
-->
<template>
  <div class="proj-dash">
    <el-card class="card" shadow="never">
      <template #header>
        <div class="card-head-inline">
          <span>概览</span>
          <el-tag size="small" type="info">占位</el-tag>
        </div>
      </template>
      <p class="lead">
        此处为进入项目后的首屏概览；后续可汇总迭代、任务、风险等（参见 REQ-M08）。
      </p>
      <el-button type="primary" @click="goDetail">打开项目详情</el-button>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

function goDetail() {
  const id = route.params.projectId
  if (typeof id === 'string') void router.push({ name: 'project-detail', params: { projectId: id } })
}
</script>

<style scoped>
.proj-dash {
  max-width: 960px;
}

.card-head-inline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-weight: 600;
  font-size: 15px;
}

.card {
  margin-top: 0;
}

.lead {
  margin: 0 0 16px;
  color: var(--el-text-color-regular);
  line-height: 1.6;
}
</style>
