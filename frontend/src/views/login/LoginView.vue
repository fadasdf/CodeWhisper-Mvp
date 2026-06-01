<!--
  登录页
  - 表单登录：校验 DEMO_ACCOUNTS 中的用户名/密码
  - 演示卡片：一键以对应角色登录
  - 登录成功后跳转 query.redirect 或首页
-->
<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { User, Lock, Cpu } from '@element-plus/icons-vue'
import { useAuthStore, DEMO_ACCOUNTS, type DemoAccount } from '@/stores/auth'
import { BaseButton, BaseInput, BaseCard, LoadingSpinner } from '@/components/base'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const formRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive({
  username: '',
  password: '',
})

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

const roleTagType = (role: DemoAccount['role']) => {
  const map = { guest: 'info', user: 'success', admin: 'warning' } as const
  return map[role]
}

const handleLogin = async () => {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    const ok = authStore.login(form.username, form.password)
    if (!ok) {
      ElMessage.error('用户名或密码错误')
      return
    }
    ElMessage.success(`欢迎回来，${authStore.roleLabel}`)
    await router.replace((route.query.redirect as string) || '/')
  } finally {
    loading.value = false
  }
}

const fillDemo = (account: DemoAccount) => {
  form.username = account.username
  form.password = account.password
}

const quickLogin = async (account: DemoAccount) => {
  loading.value = true
  try {
    authStore.loginAsDemo(account)
    ElMessage.success(`已以${account.label}身份登录`)
    await router.replace((route.query.redirect as string) || '/')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <LoadingSpinner v-if="loading" overlay text="登录中..." />

    <div class="login-bg" aria-hidden="true">
      <span class="orb orb-1" />
      <span class="orb orb-2" />
      <span class="orb orb-3" />
    </div>

    <BaseCard variant="glass" padding="lg" class="login-card">
      <div class="login-brand">
        <div class="brand-icon">
          <el-icon :size="28"><Cpu /></el-icon>
        </div>
        <h1>CodeWhisper</h1>
        <p>代码片段管理 · AI 对话 · 在线沙箱</p>
      </div>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        class="login-form"
        @submit.prevent="handleLogin"
      >
        <el-form-item prop="username">
          <BaseInput
            v-model="form.username"
            variant="dark"
            size="lg"
            placeholder="用户名"
            :prefix-icon="User"
            clearable
          />
        </el-form-item>
        <el-form-item prop="password">
          <BaseInput
            v-model="form.password"
            variant="dark"
            size="lg"
            type="password"
            placeholder="密码"
            show-password
            :prefix-icon="Lock"
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        <BaseButton
          variant="primary"
          size="lg"
          block
          :loading="loading"
          @click="handleLogin"
        >
          登录
        </BaseButton>
      </el-form>

      <div class="demo-section">
        <p class="demo-title">演示账号（点击卡片一键登录）</p>
        <div class="demo-cards">
          <BaseCard
            v-for="account in DEMO_ACCOUNTS"
            :key="account.role"
            variant="outline"
            padding="sm"
            hoverable
            class="demo-card"
            :class="{ 'demo-card--disabled': loading }"
            @click="!loading && quickLogin(account)"
          >
            <div class="demo-card-head">
              <el-tag :type="roleTagType(account.role)" size="small" effect="dark">
                {{ account.label }}
              </el-tag>
              <span class="demo-user">{{ account.username }}</span>
            </div>
            <p class="demo-desc">{{ account.description }}</p>
            <p class="demo-pwd">密码：{{ account.password }}</p>
            <BaseButton
              variant="text"
              size="sm"
              @click.stop="fillDemo(account)"
            >
              填入表单
            </BaseButton>
          </BaseCard>
        </div>
      </div>
    </BaseCard>
  </div>
</template>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  position: relative;
  overflow: hidden;
  background: #0f0f1a;
}

.login-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.5;
}

.orb-1 {
  width: 400px;
  height: 400px;
  background: #667eea;
  top: -10%;
  left: -5%;
}

.orb-2 {
  width: 350px;
  height: 350px;
  background: #764ba2;
  bottom: -10%;
  right: -5%;
}

.orb-3 {
  width: 200px;
  height: 200px;
  background: #4facfe;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  opacity: 0.25;
}

.login-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 440px;
  color: #fff;
}

.login-brand {
  text-align: center;
  margin-bottom: 32px;

  h1 {
    margin: 12px 0 6px;
    font-size: 26px;
    font-weight: 700;
    color: #fff;
    letter-spacing: 0.5px;
  }

  p {
    margin: 0;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.55);
  }
}

.brand-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.login-form {
  :deep(.el-form-item) {
    margin-bottom: 18px;
  }
}

.demo-section {
  margin-top: 28px;
  padding-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.demo-title {
  margin: 0 0 14px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
  text-align: center;
}

.demo-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.demo-card {
  cursor: pointer;
  text-align: left;

  &--disabled {
    pointer-events: none;
    opacity: 0.6;
  }
}

.demo-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.demo-user {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  font-family: ui-monospace, monospace;
}

.demo-desc {
  margin: 0 0 4px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.demo-pwd {
  margin: 0 0 4px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.35);
  font-family: ui-monospace, monospace;
}
</style>
