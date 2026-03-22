<!--
  侧栏「项目详情」入口：有最近访问 id 则重定向到 /projects/:id，否则引导去列表。
-->
<template>
  <div class="last-hub">
    <el-empty
      v-if="showHint"
      description="暂无最近访问的项目。请从工作台或项目列表进入某一项目，或使用「新建项目」创建后再打开详情。"
    >
      <el-button type="primary" @click="goList">去项目列表</el-button>
    </el-empty>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { getLastProjectId } from '@/api/last-project'

const router = useRouter()
const showHint = ref(false)

function goList() {
  void router.push({ path: '/projects' })
}

onMounted(() => {
  const id = getLastProjectId()
  if (id) {
    void router.replace({ path: `/projects/${id}` })
  } else {
    showHint.value = true
  }
})
</script>

<style scoped>
.last-hub {
  max-width: 520px;
  margin: 48px auto;
  padding: 0 16px;
}

</style>
