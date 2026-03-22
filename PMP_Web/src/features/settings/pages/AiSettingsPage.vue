<!--
  顶栏「功能 → AI 设置」：偏好与说明；实际对话与「应用/撤回」在各业务页按 REQ-M11 抽屉触发。
-->
<template>
  <div class="settings-page">
    <h1 class="page-title">AI 设置</h1>
    <p class="page-lead">
      本页用于<strong>配置与说明</strong>。全站 AI 的<strong>使用方式</strong>以
      <strong>REQ-M11</strong> 为准：主界面以业务为主，通过各页的「AI 辅助 / 打开 AI 抽屉」按需唤起；模型输出先入建议区，需用户显式「应用」后才写入业务数据，并支持一键撤回。
    </p>

    <el-card shadow="never">
      <template #header><span class="card-h">占位项（后续接后端）</span></template>
      <el-empty description="默认模型、温度、是否流式等将在此配置；与业务页抽屉解耦。" />
    </el-card>

    <el-card class="mt" shadow="never">
      <template #header><span class="card-h">与业务使用的关系</span></template>
      <ul class="bullets">
        <li>配置保存在本页；不在此页占用主工作区做长对话。</li>
        <li>各模块内的 AI 交互（文档、列表、表单）见需求分册及 REQ-M11 §2、§3。</li>
        <li>三种协作模式（站内 AI / 自行提供 / 外置回填）在任务界面并列可选，见 REQ-M11 §2.5。</li>
      </ul>
    </el-card>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.settings-page {
  max-width: 720px;
}

.page-title {
  margin: 0 0 8px;
  font-size: 22px;
}

.page-lead {
  margin: 0 0 20px;
  color: var(--el-text-color-regular);
  line-height: 1.65;
  font-size: 14px;
}

.card-h {
  font-weight: 600;
}

.mt {
  margin-top: 16px;
}

.bullets {
  margin: 0;
  padding-left: 1.25em;
  color: var(--el-text-color-regular);
  line-height: 1.7;
}
</style>
