<template>
  <div class="task-detail-page">
    <el-card shadow="never" class="head-card">
      <div class="head-row">
        <div class="head-left">
          <el-button size="small" @click="goBack">返回 Task 列表</el-button>
          <div>
            <div class="head-title">Task 详情</div>
            <div class="head-sub">聚合任务上下文、评论、附件与提测记录（V1）</div>
          </div>
        </div>
        <div class="head-actions">
          <el-button size="small" @click="generateDevPrompt">生成开发 AI 提示词</el-button>
          <el-button size="small" @click="generateTestPrompt">生成测试 AI 提示词</el-button>
          <el-button type="primary" size="small" :loading="loading" @click="loadAll">刷新</el-button>
        </div>
      </div>
    </el-card>

    <div class="content-grid">

      <el-card shadow="never" class="main-card">
        <template #header>
          <div class="section-title row-between">
            <div class="title-tags">
              <span>基础信息与流转</span>
              <div class="header-tags">
                <el-tag v-if="task" size="small" type="info">当前状态：{{ statusLabel(task.status) }}</el-tag>
                <el-tag v-if="task" size="small" effect="plain">当前负责人：{{ task.current_owner_id || '-' }}</el-tag>
              </div>
            </div>
            <div class="header-buttons">
              <el-button v-if="!basicEditMode" size="small" @click="enterBasicEdit">编辑</el-button>
              <template v-else>
                <el-button size="small" @click="cancelBasicEdit">取消</el-button>
                <el-button size="small" type="primary" :loading="basicSaving" @click="saveBasicInfo">保存</el-button>
              </template>
            </div>
          </div>
        </template>
        <el-skeleton v-if="loading && !task" :rows="6" animated />
        <el-empty v-else-if="!task" description="任务不存在或已删除" />
        <div v-else-if="!basicEditMode">
          <div class="task-meta compact">
            <div class="meta-item"><span class="k">标题</span><span class="v">{{ task.title }}</span></div>
            <div class="meta-item"><span class="k">状态</span><span class="v">{{ statusLabel(task.status) }}</span></div>
            <div class="meta-item"><span class="k">类型</span><span class="v">{{ typeLabel(task.type_suggestion) }}</span></div>
            <div class="meta-item"><span class="k">优先级</span><span class="v">{{ task.priority || '-' }}</span></div>
            <div class="meta-item"><span class="k">任务天数</span><span class="v">{{ task.estimated_days ?? '-' }}</span></div>
            <div class="meta-item"><span class="k">当前负责人</span><span class="v">{{ task.current_owner_id || '-' }}</span></div>
            <div class="meta-item"><span class="k">迭代</span><span class="v">{{ iterationName }}</span></div>
            <div class="meta-item"><span class="k">Story</span><span class="v">{{ storyTitle }}</span></div>
            <div class="meta-item"><span class="k">描述</span><span class="v">{{ task.description || '-' }}</span></div>
            <div class="meta-item"><span class="k">验收标准</span><span class="v">{{ acceptanceText }}</span></div>
            <div class="meta-item"><span class="k">关联接口</span><span class="v">{{ linkedApisText }}</span></div>
            <div class="meta-item"><span class="k">CR 编号</span><span class="v">{{ crNo }}</span></div>
            <div class="meta-item"><span class="k">CR 链接</span><span class="v"><a v-if="crLink" :href="crLink" target="_blank" rel="noopener noreferrer">{{ crLink }}</a><span v-else>-</span></span></div>
          </div>
        </div>
        <el-form v-else class="basic-form" label-width="90px">
          <el-form-item label="标题"><el-input v-model="basicForm.title" /></el-form-item>
          <el-form-item label="描述"><el-input v-model="basicForm.description" type="textarea" :rows="3" /></el-form-item>
          <div class="basic-grid">
            <el-form-item label="状态">
              <el-select v-model="basicForm.status">
                <el-option label="待办" value="todo" />
                <el-option label="进行中" value="in_progress" />
                <el-option label="待测试" value="testing" />
                <el-option label="已完成" value="done" />
              </el-select>
            </el-form-item>
            <el-form-item label="类型">
              <el-select v-model="basicForm.type_suggestion">
                <el-option label="前端" value="frontend" />
                <el-option label="后端" value="backend" />
                <el-option label="测试" value="qa" />
                <el-option label="运维" value="devops" />
                <el-option label="其他" value="other" />
              </el-select>
            </el-form-item>
            <el-form-item label="优先级"><el-input-number v-model="basicForm.priority" :min="0" :max="9" /></el-form-item>
            <el-form-item label="任务天数"><el-input-number v-model="basicForm.estimated_days" :min="0" :precision="1" /></el-form-item>
            <el-form-item label="开发负责人"><el-input v-model="basicForm.dev_owner_id" placeholder="如 dev.zhang" /></el-form-item>
            <el-form-item label="测试负责人"><el-input v-model="basicForm.qa_owner_id" placeholder="如 qa.li" /></el-form-item>
          </div>
        </el-form>
        <div class="flow-area">
          <div class="flow-title">流转时间线</div>
          <div class="flow-timeline">
            <div class="flow-node" :class="{ done: !!task?.dev_started_at }">
              <div class="dot" />
              <div class="label">开发开始</div>
                <div class="time">{{ formatDateTime(task?.dev_started_at) }}</div>
              <div class="owner">负责人：{{ task?.dev_owner_id || task?.current_owner_id || '-' }}</div>
            </div>
            <div class="flow-link" />
            <div class="flow-node" :class="{ done: !!task?.dev_completed_at }">
              <div class="dot" />
              <div class="label">开发完成</div>
                <div class="time">{{ formatDateTime(task?.dev_completed_at) }}</div>
              <div class="owner">负责人：{{ task?.dev_owner_id || '-' }}</div>
            </div>
            <div class="flow-link" />
            <div class="flow-node" :class="{ done: !!task?.testing_started_at }">
              <div class="dot" />
              <div class="label">开始测试</div>
                <div class="time">{{ formatDateTime(task?.testing_started_at) }}</div>
              <div class="owner">负责人：{{ task?.qa_owner_id || task?.current_owner_id || '-' }}</div>
            </div>
            <div class="flow-link" />
            <div class="flow-node" :class="{ done: !!task?.testing_completed_at }">
              <div class="dot" />
              <div class="label">测试完成</div>
                <div class="time">{{ formatDateTime(task?.testing_completed_at) }}</div>
              <div class="owner">负责人：{{ task?.qa_owner_id || task?.current_owner_id || '-' }}</div>
            </div>
          </div>
        </div>
      </el-card>

      <el-card shadow="never" class="side-card">
        <template #header>
          <div class="section-title">操作</div>
        </template>
        <div class="ops-box">
          <el-button size="small" :disabled="!task" @click="devAssignDialogVisible = true">分配开发人员</el-button>
          <el-button size="small" type="primary" :disabled="!canStartDev" @click="startDev">开始开发</el-button>
          <el-button size="small" type="success" :disabled="!canDevDone" @click="qaAssignDialogVisible = true">开发完成</el-button>
          <el-button size="small" :disabled="!canStartTesting" @click="startTesting">测试中</el-button>
          <el-button size="small" type="success" :disabled="!canTestingDone" @click="finishTesting">测试完成</el-button>
          <el-button size="small" type="danger" :disabled="!canRaiseBug" @click="openBugDialog">提bug</el-button>
        </div>
      </el-card>

      <el-card shadow="never" class="side-card">
        <template #header>
          <div class="section-title">附件（{{ attachments.length }}）</div>
        </template>
        <div class="attach-form">
          <el-input v-model="attachmentDraft.name" placeholder="附件名称（如：测试报告）" />
          <el-input v-model="attachmentDraft.url" placeholder="附件链接 URL（V1）" />
          <el-button type="primary" :loading="attachmentSubmitting" @click="submitAttachment">新增附件</el-button>
        </div>
        <el-empty v-if="!attachments.length" description="暂无附件" />
        <div v-else class="list-box">
          <div v-for="a in attachments" :key="a.id" class="list-item">
            <div class="line1">{{ a.created_by }} · {{ a.created_at }}</div>
            <div class="line2"><strong>{{ a.name }}</strong>：<a :href="a.url" target="_blank" rel="noopener noreferrer">{{ a.url }}</a></div>
          </div>
        </div>
      </el-card>

      <el-card shadow="never" class="main-card">
        <template #header>
          <div class="section-title">评论（{{ comments.length }}）</div>
        </template>
        <div class="editor-row">
          <el-input v-model="commentDraft" type="textarea" :rows="3" placeholder="输入评论内容" />
          <el-button type="primary" :loading="commentSubmitting" @click="submitComment">发表评论</el-button>
        </div>
        <el-empty v-if="!comments.length" description="暂无评论" />
        <div v-else class="list-box">
          <div v-for="c in comments" :key="c.id" class="list-item">
            <div class="line1">{{ c.created_by }} · {{ c.created_at }}</div>
            <div class="line2">{{ c.content }}</div>
          </div>
        </div>
      </el-card>

      <el-card shadow="never" class="main-card">
        <template #header>
          <div class="section-title">发起提测（V1）</div>
        </template>
        <div class="prompt-box">
          <el-button type="primary" @click="submissionDialogVisible = true">发起提测</el-button>
        </div>
        <el-empty v-if="!submissions.length" description="暂无提测记录" />
        <div v-else class="list-box">
          <div v-for="s in submissions" :key="s.id" class="list-item">
            <div class="line1 row-between">
              <span>{{ s.submission_no }} · {{ s.created_by }} · {{ s.created_at }}</span>
              <el-button link type="primary" size="small" @click="openSubmissionDetail(s)">查看详情</el-button>
            </div>
            <div class="line2">状态：{{ submissionStatusLabel(s.status) }}</div>
            <div class="line2">环境信息：{{ s.environment_notes }}</div>
            <div class="line2">测试说明：{{ s.test_notes }}</div>
          </div>
        </div>
      </el-card>
    </div>

    <el-dialog v-model="promptDialogVisible" :title="`AI 提示词（${promptModeLabel}）`" width="860px" class="pmp-viewport-dialog">
      <el-input v-model="generatedPrompt" type="textarea" :rows="20" class="prompt-text" readonly />
      <template #footer>
        <el-button @click="promptDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="copyText(generatedPrompt)">复制</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="submissionDialogVisible" title="发起提测" width="720px" class="pmp-viewport-dialog">
      <el-form label-width="100px">
        <el-form-item label="环境信息">
          <el-input v-model="submissionDraft.environment_notes" type="textarea" :rows="4" placeholder="如：分支、部署地址、构建号" />
        </el-form-item>
        <el-form-item label="测试说明">
          <el-input v-model="submissionDraft.test_notes" type="textarea" :rows="5" placeholder="请描述测试范围、重点与注意事项" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="submissionDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submissionSubmitting" @click="submitTestSubmission">提交</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="assignDevDialogVisible" title="分配开发人员" width="420px" class="pmp-viewport-dialog">
      <el-form label-width="90px">
        <el-form-item label="开发人员">
          <el-select v-model="selectedDevUser" placeholder="请选择开发人员">
            <el-option v-for="u in devUserOptions" :key="u" :label="u" :value="u" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="assignDevDialogVisible = false">取消</el-button>
        <el-button type="primary" :disabled="!selectedDevUser" @click="confirmAssignDev">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="assignQaDialogVisible" title="开发完成（选择测试人员）" width="420px" class="pmp-viewport-dialog">
      <el-form label-width="90px">
        <el-form-item label="测试人员">
          <el-select v-model="selectedQaUser" placeholder="请选择测试人员">
            <el-option v-for="u in qaUserOptions" :key="u" :label="u" :value="u" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="assignQaDialogVisible = false">取消</el-button>
        <el-button type="primary" :disabled="!selectedQaUser" @click="confirmDevDoneAssignQa">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="submissionDetailDialogVisible" title="提测记录详情" width="760px" class="pmp-viewport-dialog">
      <el-descriptions v-if="selectedSubmission" :column="1" border>
        <el-descriptions-item label="提测编号">{{ selectedSubmission.submission_no }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ submissionStatusLabel(selectedSubmission.status) }}</el-descriptions-item>
        <el-descriptions-item label="提交人">{{ selectedSubmission.created_by }}</el-descriptions-item>
        <el-descriptions-item label="提交时间">{{ selectedSubmission.created_at }}</el-descriptions-item>
        <el-descriptions-item label="环境信息">{{ selectedSubmission.environment_notes }}</el-descriptions-item>
        <el-descriptions-item label="测试说明">{{ selectedSubmission.test_notes }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="submissionDetailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="devAssignDialogVisible" title="分配开发人员" width="460px" class="pmp-viewport-dialog">
      <el-select v-model="selectedDevOwner" placeholder="请选择开发人员" style="width: 100%">
        <el-option v-for="u in devCandidates" :key="u" :label="u" :value="u" />
      </el-select>
      <template #footer>
        <el-button @click="devAssignDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="assignDevOwner">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="qaAssignDialogVisible" title="开发完成并分配测试人员" width="520px" class="pmp-viewport-dialog">
      <el-form label-width="100px">
        <el-form-item label="测试人员">
          <el-select v-model="selectedQaOwner" placeholder="请选择测试人员" style="width: 100%">
            <el-option v-for="u in qaCandidates" :key="u" :label="u" :value="u" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="qaAssignDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="completeDevAndAssignQa">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="bugDialogVisible" title="提 Bug（占位）" width="520px" class="pmp-viewport-dialog">
      <el-alert type="warning" :closable="false" show-icon title="提 Bug 流程后续接入缺陷模块，这里先占位。" />
      <template #footer>
        <el-button @click="bugDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmRaiseBug">确认提 Bug</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { apiClient } from '@/api/client'
import type {
  ApiEnvelope,
  PlanningIteration,
  PlanningStory,
  PlanningTask,
  PlanningTaskAttachment,
  PlanningTaskAttachmentListData,
  PlanningTaskComment,
  PlanningTaskCommentListData,
  PlanningTaskStatus,
  PlanningTaskPatchBody,
  PlanningTaskTestSubmission,
  PlanningTaskTestSubmissionListData,
  PlanningTaskTestSubmissionStatus,
  PlanningTaskTypeSuggestion,
} from '@/types/api-contract'

const route = useRoute()
const router = useRouter()
const projectId = computed(() => (typeof route.params.projectId === 'string' ? route.params.projectId : ''))
const taskId = computed(() => (typeof route.params.taskId === 'string' ? route.params.taskId : ''))

const loading = ref(false)
const task = ref<PlanningTask | null>(null)
const iterations = ref<PlanningIteration[]>([])
const stories = ref<PlanningStory[]>([])
const comments = ref<PlanningTaskComment[]>([])
const attachments = ref<PlanningTaskAttachment[]>([])
const submissions = ref<PlanningTaskTestSubmission[]>([])

const commentDraft = ref('')
const commentSubmitting = ref(false)
const attachmentDraft = ref({ name: '', url: '' })
const attachmentSubmitting = ref(false)
const submissionDialogVisible = ref(false)
const submissionDraft = ref({ environment_notes: '', test_notes: '' })
const submissionSubmitting = ref(false)
const submissionDetailDialogVisible = ref(false)
const selectedSubmission = ref<PlanningTaskTestSubmission | null>(null)
const assignDevDialogVisible = ref(false)
const assignQaDialogVisible = ref(false)
const selectedDevUser = ref('')
const selectedQaUser = ref('')
const devUserOptions = ['dev.zhang', 'dev.wang', 'dev.chen', 'dev.liu']
const qaUserOptions = ['qa.li', 'qa.sun', 'qa.zhao', 'qa.guo']

const promptMode = ref<'dev' | 'test'>('dev')
const promptDialogVisible = ref(false)
const generatedPrompt = ref('')
const basicEditMode = ref(false)
const basicSaving = ref(false)
const devAssignDialogVisible = ref(false)
const qaAssignDialogVisible = ref(false)
const bugDialogVisible = ref(false)
const selectedDevOwner = ref('')
const selectedQaOwner = ref('')
const devCandidates = ['dev.zhang', 'dev.wang', 'dev.chen', 'dev.li']
const qaCandidates = ['qa.li', 'qa.sun', 'qa.zhao', 'qa.wu']
const basicForm = ref<{
  title: string
  description: string
  status: PlanningTaskStatus
  type_suggestion: PlanningTaskTypeSuggestion
  priority: number
  estimated_days: number | null
  dev_owner_id: string
  qa_owner_id: string
}>({
  title: '',
  description: '',
  status: 'todo',
  type_suggestion: 'other',
  priority: 2,
  estimated_days: null,
  dev_owner_id: '',
  qa_owner_id: '',
})

const currentStory = computed(() => stories.value.find((s) => s.id === task.value?.story_id) ?? null)
const currentIteration = computed(() => iterations.value.find((i) => i.id === task.value?.iteration_id) ?? null)
const storyTitle = computed(() => currentStory.value?.title ?? task.value?.story_id ?? '-')
const iterationName = computed(() => currentIteration.value?.name ?? task.value?.iteration_id ?? '-')
const acceptanceText = computed(() => (currentStory.value?.acceptance_criteria || []).join('；') || '-')
const linkedApisText = computed(() => (task.value?.linked_endpoint_ids || []).join(', ') || '-')
const crNo = computed(() => String((task.value as Record<string, unknown> | null)?.cr_no || '-'))
const crLink = computed(() => String((task.value as Record<string, unknown> | null)?.cr_link || ''))
const promptModeLabel = computed(() => (promptMode.value === 'dev' ? '开发向' : '测试向'))
const canStartDev = computed(() => !!task.value && task.value.status === 'todo' && !!task.value.dev_owner_id)
const canDevDone = computed(() => !!task.value && task.value.status === 'in_progress')
const canStartTesting = computed(
  () => !!task.value && task.value.status === 'testing' && !task.value.testing_started_at,
)
const canTestingDone = computed(
  () => !!task.value && task.value.status === 'testing' && !!task.value.testing_started_at,
)
const canRaiseBug = computed(
  () => !!task.value && (task.value.status === 'testing' || task.value.status === 'done'),
)
const showAssignDevBtn = computed(() => task.value?.status === 'todo')
const showStartDevBtn = computed(() => task.value?.status === 'todo')
const showDevDoneBtn = computed(() => task.value?.status === 'in_progress')
const showTestingBtn = computed(() => task.value?.status === 'in_progress')
const showTestDoneBtn = computed(() => task.value?.status === 'testing')
const showReportBugBtn = computed(() => task.value?.status === 'testing' || task.value?.status === 'done')

function statusLabel(v: PlanningTaskStatus) {
  return { todo: '待办', in_progress: '进行中', testing: '待测试', done: '已完成', defect: '有缺陷' }[v] || v
}
function typeLabel(v: PlanningTaskTypeSuggestion) {
  return { frontend: '前端', backend: '后端', qa: '测试', devops: '运维', other: '其他' }[v] || v
}
function submissionStatusLabel(v: PlanningTaskTestSubmissionStatus) {
  return { pending: '待处理', testing: '测试中', passed: '通过', rejected: '驳回' }[v] || v
}

async function patchTask(patch: PlanningTaskPatchBody) {
  if (!projectId.value || !taskId.value) return
  await apiClient.patch<ApiEnvelope<PlanningTask>>(`/api/v1/projects/${projectId.value}/tasks/${taskId.value}`, patch)
  await loadAll()
}

async function loadAll() {
  if (!projectId.value || !taskId.value) return
  loading.value = true
  try {
    const [taskRes, iterRes, commentsRes, attachRes, submitRes] = await Promise.all([
      apiClient.get<ApiEnvelope<PlanningTask>>(`/api/v1/projects/${projectId.value}/tasks/${taskId.value}`),
      apiClient.get<ApiEnvelope<{ items: PlanningIteration[] }>>(`/api/v1/projects/${projectId.value}/iterations`),
      apiClient.get<ApiEnvelope<PlanningTaskCommentListData>>(`/api/v1/projects/${projectId.value}/tasks/${taskId.value}/comments`),
      apiClient.get<ApiEnvelope<PlanningTaskAttachmentListData>>(
        `/api/v1/projects/${projectId.value}/tasks/${taskId.value}/attachments`,
      ),
      apiClient.get<ApiEnvelope<PlanningTaskTestSubmissionListData>>(
        `/api/v1/projects/${projectId.value}/tasks/${taskId.value}/test-submissions`,
      ),
    ])
    task.value = taskRes.data.data ?? null
    iterations.value = iterRes.data.data?.items ?? []
    comments.value = commentsRes.data.data?.items ?? []
    attachments.value = attachRes.data.data?.items ?? []
    submissions.value = submitRes.data.data?.items ?? []

    if (task.value?.iteration_id) {
      const { data } = await apiClient.get<ApiEnvelope<{ items: PlanningStory[] }>>(
        `/api/v1/projects/${projectId.value}/iterations/${task.value.iteration_id}/stories`,
      )
      stories.value = data.data?.items ?? []
    } else {
      stories.value = []
    }
    if (task.value) {
      basicForm.value = {
        title: task.value.title || '',
        description: task.value.description || '',
        status: task.value.status,
        type_suggestion: task.value.type_suggestion,
        priority: task.value.priority ?? 2,
        estimated_days: task.value.estimated_days ?? null,
        dev_owner_id: task.value.dev_owner_id || '',
        qa_owner_id: task.value.qa_owner_id || '',
      }
    }
  } catch {
    ElMessage.error('加载 Task 详情失败')
  } finally {
    loading.value = false
  }
}

function enterBasicEdit() {
  if (!task.value) return
  basicEditMode.value = true
}

function cancelBasicEdit() {
  basicEditMode.value = false
  if (!task.value) return
  basicForm.value = {
    title: task.value.title || '',
    description: task.value.description || '',
    status: task.value.status,
    type_suggestion: task.value.type_suggestion,
    priority: task.value.priority ?? 2,
    estimated_days: task.value.estimated_days ?? null,
    dev_owner_id: task.value.dev_owner_id || '',
    qa_owner_id: task.value.qa_owner_id || '',
  }
}

async function saveBasicInfo() {
  if (!projectId.value || !taskId.value) return
  basicSaving.value = true
  try {
    const patch: PlanningTaskPatchBody = {
      title: basicForm.value.title.trim(),
      description: basicForm.value.description.trim(),
      status: basicForm.value.status,
      type_suggestion: basicForm.value.type_suggestion,
      priority: basicForm.value.priority,
      estimated_days: basicForm.value.estimated_days,
      dev_owner_id: basicForm.value.dev_owner_id.trim() || null,
      qa_owner_id: basicForm.value.qa_owner_id.trim() || null,
    }
    await apiClient.patch<ApiEnvelope<PlanningTask>>(`/api/v1/projects/${projectId.value}/tasks/${taskId.value}`, patch)
    basicEditMode.value = false
    await loadAll()
    ElMessage.success('基础信息已保存')
  } finally {
    basicSaving.value = false
  }
}

function buildPrompt(mode: 'dev' | 'test') {
  const t = task.value
  if (!t) return ''
  const objective =
    mode === 'dev'
      ? '请输出可直接用于编码实现的步骤、关键代码组织、接口调用流程、边界处理与自测清单。'
      : '请输出可直接执行的测试方案（功能/边界/异常/回归），并给出测试数据设计与验收清单。'
  return [
    `你是资深${mode === 'dev' ? '开发工程师' : '测试工程师'}。`,
    '',
    '【任务上下文】',
    `- Project ID: ${projectId.value}`,
    `- Task ID: ${t.id}`,
    `- Task 标题: ${t.title}`,
    `- Task 描述: ${t.description || '-'}`,
    `- 状态: ${statusLabel(t.status)}`,
    `- 类型: ${typeLabel(t.type_suggestion)}`,
    `- 迭代: ${iterationName.value}`,
    `- Story: ${storyTitle.value}`,
    `- Story 验收标准: ${acceptanceText.value}`,
    `- 关联接口 IDs: ${linkedApisText.value}`,
    `- CR 编号: ${crNo.value}`,
    `- CR 链接: ${crLink.value || '-'}`,
    '',
    '【协作信息】',
    `- 评论条数: ${comments.value.length}`,
    `- 附件条数: ${attachments.value.length}`,
    `- 提测记录条数: ${submissions.value.length}`,
    '',
    '【输出要求】',
    `- ${objective}`,
    '- 输出请分为：1) 理解与拆解 2) 实施/测试步骤 3) 风险与阻塞 4) 验收检查点。',
    '- 如果上下文信息不足，请先列出你需要我补充的最小信息清单。',
  ].join('\n')
}

function formatDateTime(v: string | null | undefined) {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '-'
  const pad = (n: number) => String(n).padStart(2, '0')
  const yyyy = d.getFullYear()
  const mm = pad(d.getMonth() + 1)
  const dd = pad(d.getDate())
  const hh = pad(d.getHours())
  const mi = pad(d.getMinutes())
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

function generatePromptForMode(mode: 'dev' | 'test') {
  promptMode.value = mode
  generatedPrompt.value = buildPrompt(mode)
  promptDialogVisible.value = true
}

function generateDevPrompt() {
  generatePromptForMode('dev')
}

function generateTestPrompt() {
  generatePromptForMode('test')
}

async function assignDevOwner() {
  if (!selectedDevOwner.value.trim()) return ElMessage.warning('请选择开发人员')
  await patchTask({ dev_owner_id: selectedDevOwner.value.trim() })
  devAssignDialogVisible.value = false
  ElMessage.success('已分配开发人员')
}

async function startDev() {
  await patchTask({ status: 'in_progress' })
  ElMessage.success('已开始开发')
}

async function completeDevAndAssignQa() {
  if (!selectedQaOwner.value.trim()) return ElMessage.warning('请选择测试人员')
  await patchTask({
    qa_owner_id: selectedQaOwner.value.trim(),
    status: 'testing',
    dev_completed_at: new Date().toISOString(),
  })
  qaAssignDialogVisible.value = false
  ElMessage.success('开发完成，已流转待测试')
}

async function startTesting() {
  await patchTask({ testing_started_at: new Date().toISOString() })
  ElMessage.success('已进入测试中')
}

async function finishTesting() {
  await patchTask({ status: 'done', testing_completed_at: new Date().toISOString() })
  ElMessage.success('测试完成')
}

function openBugDialog() {
  bugDialogVisible.value = true
}

async function confirmRaiseBug() {
  await patchTask({ status: 'defect', testing_completed_at: null })
  bugDialogVisible.value = false
  ElMessage.success('已标记为有缺陷')
}

async function quickPatchTask(patch: PlanningTaskPatchBody, successMsg: string) {
  if (!projectId.value || !taskId.value) return
  await apiClient.patch<ApiEnvelope<PlanningTask>>(`/api/v1/projects/${projectId.value}/tasks/${taskId.value}`, patch)
  await loadAll()
  ElMessage.success(successMsg)
}

async function confirmAssignDev() {
  if (!selectedDevUser.value) return
  await quickPatchTask(
    { dev_owner_id: selectedDevUser.value, assigned_user_id: selectedDevUser.value },
    '已分配开发人员',
  )
  assignDevDialogVisible.value = false
}

async function confirmDevDoneAssignQa() {
  if (!selectedQaUser.value) return
  await quickPatchTask(
    { qa_owner_id: selectedQaUser.value, status: 'testing' },
    '开发完成，已流转到测试中',
  )
  assignQaDialogVisible.value = false
}

async function reportBug() {
  if (!projectId.value || !taskId.value) return
  try {
    const { value } = await ElMessageBox.prompt('请输入 bug 描述（将写入评论）', '提bug', {
      inputType: 'textarea',
      inputPlaceholder: '例如：登录后跳转异常，复现步骤...',
      confirmButtonText: '提交',
      cancelButtonText: '取消',
    })
    await apiClient.post<ApiEnvelope<PlanningTaskComment>>(
      `/api/v1/projects/${projectId.value}/tasks/${taskId.value}/comments`,
      { content: `[BUG] ${String(value || '').trim()}` },
    )
    await quickPatchTask({ status: 'in_progress' }, '已提 bug，任务回到开发中')
  } catch {
    // 用户取消
  }
}

function openSubmissionDetail(row: PlanningTaskTestSubmission) {
  selectedSubmission.value = row
  submissionDetailDialogVisible.value = true
}

async function submitComment() {
  if (!projectId.value || !taskId.value) return
  if (!commentDraft.value.trim()) return ElMessage.warning('请输入评论内容')
  commentSubmitting.value = true
  try {
    await apiClient.post<ApiEnvelope<PlanningTaskComment>>(`/api/v1/projects/${projectId.value}/tasks/${taskId.value}/comments`, {
      content: commentDraft.value.trim(),
    })
    commentDraft.value = ''
    await loadAll()
    ElMessage.success('评论已发布')
  } finally {
    commentSubmitting.value = false
  }
}

async function submitAttachment() {
  if (!projectId.value || !taskId.value) return
  if (!attachmentDraft.value.name.trim() || !attachmentDraft.value.url.trim()) {
    return ElMessage.warning('请填写附件名称和 URL')
  }
  attachmentSubmitting.value = true
  try {
    await apiClient.post<ApiEnvelope<PlanningTaskAttachment>>(
      `/api/v1/projects/${projectId.value}/tasks/${taskId.value}/attachments`,
      {
        name: attachmentDraft.value.name.trim(),
        url: attachmentDraft.value.url.trim(),
      },
    )
    attachmentDraft.value = { name: '', url: '' }
    await loadAll()
    ElMessage.success('附件已添加')
  } finally {
    attachmentSubmitting.value = false
  }
}

async function submitTestSubmission() {
  if (!projectId.value || !taskId.value) return
  if (!submissionDraft.value.environment_notes.trim() || !submissionDraft.value.test_notes.trim()) {
    return ElMessage.warning('请填写环境信息和测试说明')
  }
  submissionSubmitting.value = true
  try {
    await apiClient.post<ApiEnvelope<PlanningTaskTestSubmission>>(
      `/api/v1/projects/${projectId.value}/tasks/${taskId.value}/test-submissions`,
      {
        environment_notes: submissionDraft.value.environment_notes.trim(),
        test_notes: submissionDraft.value.test_notes.trim(),
      },
    )
    submissionDraft.value = { environment_notes: '', test_notes: '' }
    submissionDialogVisible.value = false
    await loadAll()
    ElMessage.success('提测已发起')
  } finally {
    submissionSubmitting.value = false
  }
}

async function copyText(text: string) {
  if (!text) return
  await navigator.clipboard.writeText(text)
  ElMessage.success('已复制')
}

function goBack() {
  if (!projectId.value) return
  void router.push({ name: 'project-m04-tasks', params: { projectId: projectId.value } })
}

onMounted(() => {
  void loadAll()
})
</script>

<style scoped>
.task-detail-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.head-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.head-title {
  font-size: 14px;
  font-weight: 600;
}
.head-sub {
  margin-top: 4px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.head-actions {
  display: flex;
  gap: 8px;
}
.op-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.content-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}
.main-card,
.side-card {
  border-radius: 10px;
}
.section-title {
  font-weight: 600;
  font-size: 13px;
}
.title-tags {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.header-tags {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.header-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}
.task-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 12px;
}
.task-meta.compact {
  font-size: 13px;
}
.meta-item {
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: 8px;
  align-items: start;
  min-height: 26px;
}
.k {
  color: var(--el-text-color-secondary);
}
.editor-row,
.prompt-box,
.attach-form,
.ops-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.list-box {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.list-item {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  padding: 8px 10px;
}
.line1 {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.row-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.line2 {
  margin-top: 4px;
  word-break: break-word;
}
.prompt-text :deep(textarea) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
.flow-area {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  padding: 12px;
  background: var(--el-fill-color-blank);
  margin-top: 12px;
}
.flow-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 10px;
}
.flow-timeline {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}
.flow-node {
  width: 150px;
  flex: 0 0 150px;
  text-align: center;
}
.flow-node .dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin: 0 auto 8px;
  background: var(--el-border-color);
}
.flow-node.done .dot {
  background: var(--el-color-primary);
}
.flow-node .label {
  font-weight: 600;
  font-size: 12px;
}
.flow-node .time,
.flow-node .owner {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  word-break: break-word;
}
.flow-node .time {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.flow-link {
  width: 28px;
  flex: 0 0 28px;
  border-top: 2px solid var(--el-border-color);
  margin-top: 4px;
}
.basic-form :deep(.el-form-item) {
  margin-bottom: 10px;
}
.basic-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px 12px;
}
.basic-form :deep(.el-input),
.basic-form :deep(.el-select),
.basic-form :deep(.el-input-number) {
  width: 100%;
}
@media (min-width: 1200px) {
  .content-grid {
    grid-template-columns: minmax(0, 1fr) 340px;
    align-items: start;
  }
  .main-card {
    grid-column: 1;
  }
  .side-card {
    grid-column: 2;
  }
  .side-card {
    grid-row: span 1;
    position: sticky;
    top: 8px;
  }
}
@media (max-width: 1199px) {
  .task-meta {
    grid-template-columns: 1fr;
  }
  .basic-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 900px) {
  .basic-grid {
    grid-template-columns: 1fr;
  }
}
</style>
