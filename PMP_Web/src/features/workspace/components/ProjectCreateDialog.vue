<!--
  新建项目（M01 最小集）：弹窗采集基础信息 → POST /api/v1/projects → 由父级跳转详情并刷新列表。
-->
<template>
  <el-dialog
    v-model="visible"
    title="新建项目"
    width="480px"
    destroy-on-close
    :close-on-click-modal="false"
    @closed="onClosed"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent>
      <el-form-item label="项目名称" prop="name">
        <el-input v-model="form.name" maxlength="200" show-word-limit placeholder="请输入项目名称" clearable />
      </el-form-item>
      <el-form-item label="项目描述" prop="description">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="3"
          maxlength="2000"
          show-word-limit
          placeholder="可选，简要说明范围或目标"
        />
      </el-form-item>
      <el-form-item label="初始状态" prop="status">
        <el-select v-model="form.status" placeholder="选择状态" style="width: 100%">
          <el-option v-for="s in CREATE_PROJECT_STATUS_OPTIONS" :key="s" :label="s" :value="s" />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">创建</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'

import { apiClient } from '@/api/client'
import { CREATE_PROJECT_STATUS_OPTIONS } from '@/features/workspace/projectPresentation'
import type { ApiEnvelope, ProjectCreateRequestBody, ProjectOneData, ProjectSummary } from '@/types/api-contract'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  created: [project: ProjectSummary]
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})

const formRef = ref<FormInstance>()
const submitting = ref(false)

const form = reactive({
  name: '',
  description: '',
  status: '立项流程中',
})

const rules: FormRules = {
  name: [
    { required: true, message: '请输入项目名称', trigger: 'blur' },
    { min: 1, max: 200, message: '长度 1～200 字', trigger: 'blur' },
  ],
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      form.name = ''
      form.description = ''
      form.status = '立项流程中'
    }
  },
)

function onClosed() {
  formRef.value?.resetFields()
}

async function submit() {
  const ok = await formRef.value?.validate().catch(() => false)
  if (!ok) return
  submitting.value = true
  try {
    const body: ProjectCreateRequestBody = {
      name: form.name.trim(),
      status: form.status,
    }
    const desc = form.description.trim()
    if (desc) body.description = desc
    const { data } = await apiClient.post<ApiEnvelope<ProjectOneData>>('/api/v1/projects', body)
    const project = data.data
    if (!project?.id) {
      throw new Error('创建成功但未返回项目 id')
    }
    ElMessage.success('项目已创建')
    visible.value = false
    emit('created', project)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    ElMessage.error(msg)
  } finally {
    submitting.value = false
  }
}
</script>
