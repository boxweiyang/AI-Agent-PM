<!--
  项目详情：只读展示 + 编辑（PATCH）；关联模块入口（文档/迭代/Task…）跳转子路由，未生成则占位页内「一键生成」。
-->
<template>
  <div class="project-detail">
    <el-skeleton v-if="loading" :rows="12" animated />
    <el-empty
      v-else-if="notFound"
      description="项目不存在或无权访问。可点击顶栏项目名称旁的切换图标返回项目列表。"
    />
    <template v-else-if="project">
      <div class="detail-toolbar">
        <template v-if="!editing">
          <el-button type="primary" @click="startEdit">编辑</el-button>
        </template>
        <template v-else>
          <el-button @click="cancelEdit">取消</el-button>
          <el-button type="primary" :loading="saving" @click="saveEdit">保存</el-button>
        </template>
      </div>

      <el-form
        v-if="editing"
        ref="formRef"
        class="detail-edit-form"
        :model="editForm"
        :rules="formRules"
        label-position="top"
        @submit.prevent
      >
        <el-card class="detail-card" shadow="never">
          <template #header><span class="card-title">基本信息</span></template>
          <el-form-item label="项目名称" prop="name">
            <el-input v-model="editForm.name" maxlength="200" show-word-limit />
          </el-form-item>
          <el-form-item label="当前状态" prop="status">
            <el-select v-model="editForm.status" filterable allow-create default-first-option style="width: 100%; max-width: 360px">
              <el-option v-for="s in PROJECT_EDIT_STATUS_OPTIONS" :key="s" :label="s" :value="s" />
            </el-select>
          </el-form-item>
          <el-form-item label="列表副文案（卡片摘要）" prop="description">
            <el-input v-model="editForm.description" type="textarea" :rows="2" maxlength="2000" show-word-limit />
          </el-form-item>
        </el-card>

        <el-card class="detail-card" shadow="never">
          <template #header><span class="card-title">立项必填（REQ-M01 §3.1）</span></template>
          <el-form-item label="项目背景" prop="background">
            <el-input v-model="editForm.background" type="textarea" :rows="4" maxlength="4000" show-word-limit />
          </el-form-item>
          <el-form-item label="项目简介" prop="introduction">
            <el-input v-model="editForm.introduction" type="textarea" :rows="3" maxlength="4000" show-word-limit />
          </el-form-item>
          <el-row :gutter="16">
            <el-col :xs="24" :sm="12">
              <el-form-item label="计划开始" prop="plannedStartDay">
                <el-date-picker
                  v-model="editForm.plannedStartDay"
                  type="date"
                  value-format="YYYY-MM-DD"
                  placeholder="选择日期"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="计划结束" prop="plannedEndDay">
                <el-date-picker
                  v-model="editForm.plannedEndDay"
                  type="date"
                  value-format="YYYY-MM-DD"
                  placeholder="选择日期"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
          </el-row>
        </el-card>

        <el-card class="detail-card" shadow="never">
          <template #header><span class="card-title">立项可选（REQ-M01 §3.2）</span></template>
          <el-form-item label="技术负责人">
            <el-input v-model="editForm.technical_lead_name" maxlength="120" clearable />
          </el-form-item>
          <el-form-item label="人力与技术栈后续补全">
            <el-switch v-model="editForm.manpower_stack_deferred" />
          </el-form-item>
          <el-row :gutter="16">
            <el-col :xs="24" :sm="8">
              <el-form-item label="预计前端人力">
                <el-input v-model="editForm.headcount_frontend" placeholder="非负整数" clearable />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="8">
              <el-form-item label="预计后端人力">
                <el-input v-model="editForm.headcount_backend" placeholder="非负整数" clearable />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="8">
              <el-form-item label="预计测试人力">
                <el-input v-model="editForm.headcount_qa" placeholder="非负整数" clearable />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="技术栈 · 前端">
            <TechStackMultiSelect
              v-model="editForm.stack_frontend"
              :options="TECH_STACK_PRESETS.frontend"
              placeholder="多选预设或输入后回车添加"
            />
          </el-form-item>
          <el-form-item label="技术栈 · 后端">
            <TechStackMultiSelect
              v-model="editForm.stack_backend"
              :options="TECH_STACK_PRESETS.backend"
              placeholder="多选预设或输入后回车添加"
            />
          </el-form-item>
          <el-form-item label="技术栈 · 数据库">
            <TechStackMultiSelect
              v-model="editForm.stack_database"
              :options="TECH_STACK_PRESETS.database"
              placeholder="多选预设或输入后回车添加"
            />
          </el-form-item>
          <el-form-item label="技术栈 · 中间件">
            <TechStackMultiSelect
              v-model="editForm.stack_middleware"
              :options="TECH_STACK_PRESETS.middleware"
              placeholder="多选预设或输入后回车添加"
            />
          </el-form-item>
          <el-form-item label="项目目标（每行一条，1～3 条为宜）">
            <el-input v-model="editForm.goalsText" type="textarea" :rows="4" placeholder="每行一条目标" />
          </el-form-item>
          <el-form-item label="范围 · 做什么">
            <el-input v-model="editForm.scope_in" type="textarea" :rows="3" />
          </el-form-item>
          <el-form-item label="范围 · 不做什么">
            <el-input v-model="editForm.scope_out" type="textarea" :rows="3" />
          </el-form-item>
          <el-form-item label="风险备注">
            <el-input v-model="editForm.risk_notes" type="textarea" :rows="3" />
          </el-form-item>
        </el-card>
      </el-form>

      <el-card v-if="editing && project" class="detail-card" shadow="never">
        <template #header>
          <span class="card-title">执行与度量（只读，由系统汇总）</span>
        </template>
        <div class="metric-progress">
          <span class="metric-label">完成度</span>
          <el-progress
            :percentage="clampProgress(project)"
            :stroke-width="10"
            class="metric-progress-bar"
          />
          <span class="metric-pct">{{ clampProgress(project) }}%</span>
        </div>
        <el-descriptions :column="2" border class="metric-desc">
          <el-descriptions-item label="迭代">{{ detailIterationLine(project) }}</el-descriptions-item>
          <el-descriptions-item label="Story 数">{{ fmtMetric(project.story_count) }}</el-descriptions-item>
          <el-descriptions-item label="Task 待办">{{ taskOpenTotalSummary(project) }}</el-descriptions-item>
          <el-descriptions-item label="未关闭 Bug">{{ fmtMetric(project.bug_open_count) }}</el-descriptions-item>
          <el-descriptions-item label="预计完成（计划）" :span="2">
            {{ planLine(project) }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <template v-if="!editing">
        <el-alert
          v-if="showTechLeadBanner"
          class="detail-banner"
          type="warning"
          show-icon
          :closable="false"
          title="尚未选定技术负责人"
          description="可在项目中指定角色或前往「架构与技术设计」模块补全；不影响浏览其它信息（REQ-M01 §3.3）。"
        />

        <el-card class="detail-card" shadow="never">
          <template #header>
            <span class="card-title">基本信息</span>
          </template>
          <el-descriptions :column="2" border size="default">
            <el-descriptions-item label="项目 ID">
              <span class="mono">{{ project.id }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="项目名称">{{ project.name }}</el-descriptions-item>
            <el-descriptions-item label="当前状态">
              <el-tag size="small" :type="statusTagType(project.status)">{{ project.status }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="最近更新">{{ formatUpdated(project.updated_at) }}</el-descriptions-item>
            <el-descriptions-item
              v-if="project.description?.trim()"
              label="列表副文案"
              :span="2"
            >
              {{ project.description.trim() }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <el-card class="detail-card" shadow="never">
          <template #header>
            <span class="card-title">立项必填信息（REQ-M01 §3.1）</span>
          </template>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="项目背景">
              <div class="multiline">{{ detailText(project.background) }}</div>
            </el-descriptions-item>
            <el-descriptions-item label="项目简介">
              <div class="multiline">{{ detailIntroduction(project) }}</div>
            </el-descriptions-item>
            <el-descriptions-item label="计划开始时间">
              {{ detailIsoDate(project.planned_start_at) }}
            </el-descriptions-item>
            <el-descriptions-item label="计划结束时间">
              {{ detailIsoDate(project.planned_end_at) }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <el-card class="detail-card" shadow="never">
          <template #header>
            <span class="card-title">立项可选信息（REQ-M01 §3.2）</span>
          </template>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="技术负责人">
              {{ detailText(project.technical_lead_name) }}
            </el-descriptions-item>
            <el-descriptions-item label="人力与技术栈后续补全">
              {{ detailYesNo(project.manpower_stack_deferred) }}
            </el-descriptions-item>
            <el-descriptions-item label="预计前端人力">{{ detailNum(project.headcount_frontend) }}</el-descriptions-item>
            <el-descriptions-item label="预计后端人力">{{ detailNum(project.headcount_backend) }}</el-descriptions-item>
            <el-descriptions-item label="预计测试人力">{{ detailNum(project.headcount_qa) }}</el-descriptions-item>
            <el-descriptions-item label="技术栈 · 前端" :span="2">
              <div v-if="stackTags(project.stack_frontend).length" class="stack-tags">
                <el-tag v-for="(t, i) in stackTags(project.stack_frontend)" :key="'sf' + i" size="small" class="stack-tag">
                  {{ t }}
                </el-tag>
              </div>
              <span v-else>{{ detailText(project.stack_frontend) }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="技术栈 · 后端" :span="2">
              <div v-if="stackTags(project.stack_backend).length" class="stack-tags">
                <el-tag v-for="(t, i) in stackTags(project.stack_backend)" :key="'sb' + i" size="small" class="stack-tag">
                  {{ t }}
                </el-tag>
              </div>
              <span v-else>{{ detailText(project.stack_backend) }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="技术栈 · 数据库" :span="2">
              <div v-if="stackTags(project.stack_database).length" class="stack-tags">
                <el-tag v-for="(t, i) in stackTags(project.stack_database)" :key="'sd' + i" size="small" class="stack-tag">
                  {{ t }}
                </el-tag>
              </div>
              <span v-else>{{ detailText(project.stack_database) }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="技术栈 · 中间件" :span="2">
              <div v-if="stackTags(project.stack_middleware).length" class="stack-tags">
                <el-tag v-for="(t, i) in stackTags(project.stack_middleware)" :key="'sm' + i" size="small" class="stack-tag">
                  {{ t }}
                </el-tag>
              </div>
              <span v-else>{{ detailText(project.stack_middleware) }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="项目目标" :span="2">
              <ol v-if="project.goals?.length" class="goals-list">
                <li v-for="(g, i) in project.goals" :key="i">{{ g }}</li>
              </ol>
              <span v-else>{{ DETAIL_EMPTY }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="范围 · 做什么" :span="2">
              <div class="multiline">{{ detailText(project.scope_in) }}</div>
            </el-descriptions-item>
            <el-descriptions-item label="范围 · 不做什么" :span="2">
              <div class="multiline">{{ detailText(project.scope_out) }}</div>
            </el-descriptions-item>
            <el-descriptions-item label="风险备注" :span="2">
              <div class="multiline">{{ detailText(project.risk_notes) }}</div>
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <el-card class="detail-card" shadow="never">
          <template #header>
            <span class="card-title">执行与度量（只读，由系统汇总）</span>
          </template>
          <div class="metric-progress">
            <span class="metric-label">完成度</span>
            <el-progress
              :percentage="clampProgress(project)"
              :stroke-width="10"
              class="metric-progress-bar"
            />
            <span class="metric-pct">{{ clampProgress(project) }}%</span>
          </div>
          <el-descriptions :column="2" border class="metric-desc">
            <el-descriptions-item label="迭代">{{ detailIterationLine(project) }}</el-descriptions-item>
            <el-descriptions-item label="Story 数">{{ fmtMetric(project.story_count) }}</el-descriptions-item>
            <el-descriptions-item label="Task 待办">{{ taskOpenTotalSummary(project) }}</el-descriptions-item>
            <el-descriptions-item label="未关闭 Bug">{{ fmtMetric(project.bug_open_count) }}</el-descriptions-item>
            <el-descriptions-item label="预计完成（计划）" :span="2">
              {{ planLine(project) }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <el-card class="detail-card" shadow="never">
          <template #header>
            <span class="card-title">项目空间与文档（点击进入各模块）</span>
          </template>
          <p class="module-intro">
            下列入口对齐 REQ-MASTER 模块；状态来自 <code>artifacts</code>。未生成时进入页面可「一键生成（演示）」解锁。
          </p>
          <div class="module-grid">
            <div v-for="m in PROJECT_RELATED_MODULES" :key="m.name" class="module-cell">
              <div class="module-cell-head">
                <span class="module-label">{{ m.label }}</span>
                <el-tag size="small" :type="artifactReady(m.artifactKey) ? 'success' : 'info'">
                  {{ artifactReady(m.artifactKey) ? '已生成' : '未生成' }}
                </el-tag>
              </div>
              <div class="module-req">{{ m.reqRef }}</div>
              <router-link
                v-slot="{ navigate }"
                :to="{ name: m.name, params: { projectId: project.id } }"
                custom
              >
                <el-button
                  class="module-btn"
                  :type="artifactReady(m.artifactKey) ? 'primary' : 'default'"
                  @click="() => navigate()"
                >
                  {{ artifactReady(m.artifactKey) ? '打开' : '去生成 / 打开' }}
                </el-button>
              </router-link>
            </div>
          </div>
        </el-card>

        <p class="detail-footnote">迭代看板、风险与更多分析视图将在 M08 Dashboard 深度接入。</p>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

import TechStackMultiSelect from '@/components/TechStackMultiSelect'
import { apiClient } from '@/api/client'
import { setLastProjectId } from '@/api/last-project'
import { PROJECT_RELATED_MODULES } from '@/config/projectRelatedModules'
import { parseStackItems, TECH_STACK_PRESETS } from '@/config/techStackOptions'
import {
  editFormFromProject,
  emptyProjectEditForm,
  patchBodyFromEditForm,
} from '@/features/workspace/projectDetailEdit'
import {
  DETAIL_EMPTY,
  detailIntroduction,
  detailIsoDate,
  detailIterationLine,
  detailNum,
  detailText,
  detailYesNo,
} from '@/features/workspace/projectDetailDisplay'
import {
  clampProgress,
  plannedEndParts,
  PROJECT_EDIT_STATUS_OPTIONS,
  statusTagType,
  taskOpenTotalSummary,
} from '@/features/workspace/projectPresentation'
import type { ApiEnvelope, ProjectOneData, ProjectPatchRequestBody } from '@/types/api-contract'

const route = useRoute()

const loading = ref(true)
const notFound = ref(false)
const project = ref<ProjectOneData | null>(null)
const editing = ref(false)
const saving = ref(false)
const formRef = ref<FormInstance>()
const editForm = reactive(emptyProjectEditForm())

const formRules: FormRules = {
  name: [{ required: true, message: '请输入项目名称', trigger: 'blur' }],
  status: [{ required: true, message: '请选择或填写状态', trigger: 'change' }],
}

const showTechLeadBanner = computed(() => {
  const p = project.value
  if (!p) return false
  return !p.technical_lead_name?.trim()
})

function artifactReady(key: string): boolean {
  return project.value?.artifacts?.[key] === true
}

function formatUpdated(iso: string | undefined): string {
  if (!iso?.trim()) return DETAIL_EMPTY
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('zh-CN', { hour12: false })
}

function fmtMetric(n: number | undefined): string | number {
  return n == null ? DETAIL_EMPTY : n
}

function planLine(p: ProjectOneData): string {
  const parts = plannedEndParts(p.planned_end_at)
  if (!parts) return detailIsoDate(p.planned_end_at)
  return `${parts.dateLabel}（${parts.daysLine}）`
}

function stackTags(raw?: string) {
  return parseStackItems(raw)
}

function startEdit() {
  if (!project.value) return
  Object.assign(editForm, editFormFromProject(project.value))
  editing.value = true
}

function cancelEdit() {
  editing.value = false
  Object.assign(editForm, emptyProjectEditForm())
}

async function saveEdit() {
  const id = route.params.projectId
  if (typeof id !== 'string' || !project.value) return
  const ok = await formRef.value?.validate().catch(() => false)
  if (!ok) return
  saving.value = true
  try {
    const body: ProjectPatchRequestBody = patchBodyFromEditForm(editForm)
    const { data } = await apiClient.patch<ApiEnvelope<ProjectOneData>>(`/api/v1/projects/${id}`, body)
    project.value = data.data ?? null
    ElMessage.success('已保存')
    editing.value = false
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    ElMessage.error(msg)
  } finally {
    saving.value = false
  }
}

async function load(id: string) {
  loading.value = true
  notFound.value = false
  project.value = null
  editing.value = false
  try {
    const { data } = await apiClient.get<ApiEnvelope<ProjectOneData>>(`/api/v1/projects/${id}`)
    const p = data.data
    if (!p?.id) {
      notFound.value = true
      return
    }
    project.value = p
    setLastProjectId(p.id)
  } catch {
    notFound.value = true
    ElMessage.error('加载项目失败')
  } finally {
    loading.value = false
  }
}

watch(
  () => route.params.projectId,
  (rid) => {
    if (typeof rid === 'string' && rid) void load(rid)
  },
  { immediate: true },
)
</script>

<style scoped>
.project-detail {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 8px 24px;
}

.detail-toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.detail-edit-form {
  display: block;
}

.detail-banner {
  margin-bottom: 16px;
}

.detail-card {
  margin-bottom: 16px;
  border-radius: 10px;
}

.card-title {
  font-weight: 600;
  font-size: 15px;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 13px;
  word-break: break-all;
}

.multiline {
  white-space: pre-wrap;
  line-height: 1.55;
  color: var(--el-text-color-regular);
}

.goals-list {
  margin: 0;
  padding-left: 1.25em;
  color: var(--el-text-color-regular);
  line-height: 1.6;
}

.metric-progress {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.metric-label {
  flex-shrink: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  width: 3em;
}

.metric-progress-bar {
  flex: 1;
  min-width: 0;
}

.metric-pct {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 600;
  width: 2.75rem;
  text-align: right;
}

.metric-desc {
  margin-top: 0;
}

.module-intro {
  margin: 0 0 16px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.module-intro code {
  font-size: 12px;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--el-fill-color-light);
}

.module-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
}

.module-cell {
  padding: 12px 14px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  background: var(--el-fill-color-blank);
}

.module-cell-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.module-label {
  font-weight: 600;
  font-size: 14px;
  line-height: 1.3;
}

.module-req {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 10px;
}

.module-btn {
  width: 100%;
}

.stack-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.stack-tag {
  margin: 0;
}

.detail-footnote {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
</style>
