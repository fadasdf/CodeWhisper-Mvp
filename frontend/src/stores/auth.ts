/**
 * 认证状态（Pinia）
 * MVP 阶段使用 localStorage 模拟登录，不请求后端。
 * 演示账号见 DEMO_ACCOUNTS，角色用于后续权限控制扩展。
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserRole } from '@/types/UserRole'

export interface AuthUser {
  username: string
  role: UserRole
}

const STORAGE_KEY = 'codewhisper_auth'

export interface DemoAccount {
  username: string
  password: string
  role: UserRole
  label: string
  description: string
}

/** 演示账号（localStorage 模拟登录，无需后端） */
export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    username: 'guest',
    password: 'guest',
    role: 'guest',
    label: '游客',
    description: '只读体验，功能受限',
  },
  {
    username: 'user',
    password: '123456',
    role: 'user',
    label: '普通用户',
    description: '完整片段管理与 AI 对话',
  },
  {
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    label: '管理员',
    description: '全部功能，含管理权限',
  },
]

const ROLE_LABELS: Record<UserRole, string> = {
  guest: '游客',
  user: '普通用户',
  admin: '管理员',
}

/** 刷新页面时从 localStorage 恢复登录态 */
function loadFromStorage(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as AuthUser
    if (data?.username && data?.role) return data
  } catch {
    /* ignore */
  }
  return null
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(loadFromStorage())

  const isLoggedIn = computed(() => user.value !== null)
  const username = computed(() => user.value?.username ?? '')
  const role = computed(() => user.value?.role ?? null)
  const roleLabel = computed(() =>
    user.value ? ROLE_LABELS[user.value.role] : '',
  )

  /** 同步写入/清除 localStorage */
  function persist() {
    if (user.value) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user.value))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  function login(usernameInput: string, password: string): boolean {
    const account = DEMO_ACCOUNTS.find(
      (a) => a.username === usernameInput.trim() && a.password === password,
    )
    if (!account) return false
    user.value = { username: account.username, role: account.role }
    persist()
    return true
  }

  function loginAsDemo(account: DemoAccount) {
    user.value = { username: account.username, role: account.role }
    persist()
  }

  function logout() {
    user.value = null
    persist()
  }

  return {
    user,
    isLoggedIn,
    username,
    role,
    roleLabel,
    login,
    loginAsDemo,
    logout,
  }
})
