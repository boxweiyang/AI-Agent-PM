<!--
  登录页（REQ-M09 / TECH-004）
  - 独立路由 `/login`，不套 MainLayout。
  - Mock：MSW 仅演示「管理员」账号（用户名 `admin`，密码任意非空）；正式后端接入后替换为真实校验与错误码。
  - 功能说明文档：docs/FEATURES.md「/login 登录页」。
-->
<template>
  <div class="login-page">
    <!-- 未登录也需切换主题，与主壳内控件一致 -->
    <div class="login-theme-bar">
      <ThemeSegmented />
    </div>
    <div class="login-card-wrap">
      <el-card class="login-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span class="title">PMP 智能项目管理</span>
            <span class="subtitle">账号登录（Mock：admin / 任意密码）</span>
          </div>
        </template>

        <!--
          功能：收集账号密码并触发登录。
          校验：Element Plus 表单规则；错误信息展示在字段下方与顶部 ElMessage。
        -->
        <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent>
          <el-form-item label="用户名" prop="username">
            <el-input
              v-model="form.username"
              placeholder="演示请输入 admin"
              autocomplete="username"
              clearable
              @keyup.enter="onSubmit"
            />
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="任意非空即可（Mock）"
              autocomplete="current-password"
              show-password
              clearable
              @keyup.enter="onSubmit"
            />
          </el-form-item>
          <!--
            TECH-004：与 Refresh 7 天滑动续期语义对齐；勾选后令牌写入 localStorage，关浏览器重开仍登录（Mock 仅模拟存储位置）。
          -->
          <el-form-item>
            <el-checkbox v-model="form.remember7d">7 天内保持登录</el-checkbox>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" class="submit-btn" :loading="loading" @click="onSubmit"> 登录 </el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'

import { LOGIN_REMEMBER_7D_KEY } from '@/api/auth-storage'
import ThemeSegmented from '@/components/ThemeSegmented.vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const formRef = ref<FormInstance>()
const loading = ref(false)

/** 表单模型：与契约 `LoginRequest` 字段一致 */
const form = reactive({
  username: 'admin',
  password: 'admin',
  /** 默认 true；若用户曾取消勾选，从 localStorage 恢复 */
  remember7d: true,
})

onMounted(() => {
  try {
    const raw = localStorage.getItem(LOGIN_REMEMBER_7D_KEY)
    if (raw === 'false') form.remember7d = false
    else if (raw === 'true') form.remember7d = true
  } catch {
    /* ignore */
  }
})

/** 轻量校验即可；复杂策略（锁定、验证码）由后端与后续需求驱动 */
const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function onSubmit() {
  const el = formRef.value
  if (!el) return
  await el.validate(async (valid) => {
    if (!valid) return
    loading.value = true
    try {
      await auth.login(form.username.trim(), form.password, form.remember7d)
      ElMessage.success('登录成功')
      await router.replace({ path: '/' })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '登录失败'
      ElMessage.error(msg)
    } finally {
      loading.value = false
    }
  })
}
</script>

<style scoped>
.login-page {
  position: relative;
  height: 100%;
  overflow-y: auto;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  /* 轻微径向渐变，突出中心卡片（TECH-002：动效克制，仅背景层次） */
  background:
    radial-gradient(1200px 600px at 20% 0%, var(--el-color-primary-light-5), transparent 55%),
    radial-gradient(900px 500px at 100% 30%, var(--el-color-success-light-7), transparent 50%),
    var(--el-bg-color);
}

.login-theme-bar {
  position: absolute;
  top: 16px;
  right: 20px;
  z-index: 1;
}

.login-card-wrap {
  width: 100%;
  max-width: 420px;
}

.login-card {
  border-radius: 12px;
}

/* 项目名称与副文案在卡片标题区水平居中 */
.card-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
}

.title {
  font-size: 22px;
  font-weight: 600;
  line-height: 1.35;
  letter-spacing: 0.02em;
}

.subtitle {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  font-weight: normal;
  line-height: 1.4;
  max-width: 100%;
}

.submit-btn {
  width: 100%;
}
</style>
