<!--
  应用主页面（代码片段工作台）
  - 布局：侧边栏 + 顶栏 + 片段列表
  - 数据：片段 CRUD 存 localStorage，UI 偏好单独持久化
  - 弹层：片段表单、AI 对话抽屉、代码沙箱
-->
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import {
  Plus,
  Search,
  Delete,
  Cpu,
  FolderOpened,
  ChatSquare,
  ArrowLeft,
  ArrowRight,
  SwitchButton,
} from '@/utils/icon'
import { useAuthStore } from '@/stores/auth'
import SnippetList from '@/components/SnippetList.vue'
import SnippetForm from '@/components/SnippetForm.vue'
import AiChat from '@/components/AiChat.vue'
import CodeSandbox from '@/components/CodeSandbox.vue'
import { BaseButton, BaseInput } from '@/components/base'
import type { Snippet } from '@/types/Snippet'

const router = useRouter()
const authStore = useAuthStore()

// ---------- 本地存储键名 ----------
const STORAGE_KEY = 'codewhisper_snippets' // 片段列表 JSON
const UI_STATE_KEY = 'codewhisper_ui'       // 侧栏/筛选/搜索等界面状态

// ---------- 响应式数据 ----------
const snippets = ref<Snippet[]>([])
const showForm = ref(false)
const showSandbox = ref(false)
/** 当前选中的片段：供沙箱运行、AI 对话附加上下文共用 */
const currentSnippet = ref<Snippet | null>(null)
const editSnippet = ref<Snippet | null>(null)
const sidebarCollapsed = ref(false)
const showChat = ref(false)
const selectedLanguage = ref('all')
const searchQuery = ref('')
const activeMenu = ref('1')   // 侧边栏高亮

// 语言选项
const languages = [
  { label: '全部', value: 'all' },
  { label: 'JavaScript', value: 'javascript' },
  { label: 'HTML', value: 'html' },
  { label: 'CSS', value: 'css' }
]

// ---------- 派生状态：语言筛选 + 关键词搜索 ----------
const filteredSnippets = computed(() => {
  let result = snippets.value
  if (selectedLanguage.value !== 'all') {
    result = result.filter(s => s.language === selectedLanguage.value)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      s.tags.some(t => t.toLowerCase().includes(q))
    )
  }
  return result
})

const favoriteCount = computed(() => snippets.value.filter(s => s.isFavorite).length)

const isAdmin = computed(() => authStore.role === 'admin')

// ---------- 辅助函数 ----------
const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 8)}`

// 保存片段到 localStorage
const saveSnippets = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snippets.value))
}

// 加载片段
const loadSnippets = () => {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    try {
      snippets.value = JSON.parse(stored)
    } catch {
      snippets.value = []
    }
  } else {
    // 初始化演示数据（id 动态）
    snippets.value = [
      {
        id: generateId(),
        title: '数组去重函数',
        language: 'javascript',
        code: `function unique(arr) {\n  return [...new Set(arr)];\n}\n\n// 使用示例\nconst result = unique([1, 2, 2, 3, 3, 3]);\nconsole.log(result); // [1, 2, 3]`,
        tags: ['数组', '工具函数'],
        isFavorite: true,
        createdAt: Date.now() - 86400000,
        updatedAt: Date.now() - 3600000
      },
      {
        id: generateId(),
        title: '响应式布局容器',
        language: 'css',
        code: `.container {\n  max-width: 1200px;\n  margin: 0 auto;\n  padding: 0 20px;\n}\n\n@media (max-width: 768px) {\n  .container {\n    padding: 0 16px;\n  }\n}`,
        tags: ['CSS', '响应式'],
        isFavorite: false,
        createdAt: Date.now() - 172800000,
        updatedAt: Date.now() - 86400000
      },
      {
        id: generateId(),
        title: '卡片布局示例',
        language: 'html',
        code: `<div class="card">\n  <div class="card-header">\n    <h3>卡片标题</h3>\n  </div>\n  <div class="card-body">\n    <p>这是卡片内容区域，可以放置任意HTML内容。</p>\n    <button class="btn">点击按钮</button>\n  </div>\n</div>`,
        tags: ['HTML', '布局'],
        isFavorite: true,
        createdAt: Date.now() - 259200000,
        updatedAt: Date.now() - 172800000
      }
    ]
    saveSnippets()
  }
}

// UI 状态持久化
const saveUIState = () => {
  localStorage.setItem(UI_STATE_KEY, JSON.stringify({
    sidebarCollapsed: sidebarCollapsed.value,
    selectedLanguage: selectedLanguage.value,
    searchQuery: searchQuery.value
  }))
}

const loadUIState = () => {
  const saved = localStorage.getItem(UI_STATE_KEY)
  if (saved) {
    try {
      const { sidebarCollapsed: collapsed, selectedLanguage: lang, searchQuery: query } = JSON.parse(saved)
      if (typeof collapsed === 'boolean') sidebarCollapsed.value = collapsed
      if (lang) selectedLanguage.value = lang
      if (query !== undefined) searchQuery.value = query
    } catch { /* ignore */ }
  }
}

// 监听 UI 状态变化并保存
watch([sidebarCollapsed, selectedLanguage, searchQuery], () => {
  saveUIState()
}, { deep: true })

// ---------- 事件处理 ----------
const handleCreate = () => {
  editSnippet.value = null
  showForm.value = true
}

const handleEdit = (snippet: Snippet) => {
  editSnippet.value = snippet
  showForm.value = true
}

const handleDelete = (id: string) => {
  snippets.value = snippets.value.filter(s => s.id !== id)
  saveSnippets()
}

const handleRun = (snippet: Snippet) => {
  currentSnippet.value = snippet
  showSandbox.value = true
}

const handleToggleFavorite = (id: string) => {
  const snippet = snippets.value.find(s => s.id === id)
  if (snippet) {
    snippet.isFavorite = !snippet.isFavorite
    snippet.updatedAt = Date.now()
    saveSnippets()
  }
}

// 引用片段并打开聊天
const handleReferInChat = (snippet: Snippet) => {
  currentSnippet.value = snippet
  showChat.value = true
  activeMenu.value = '2'  // 高亮AI对话菜单
}

// 关闭聊天抽屉时清空引用片段
const handleChatClose = () => {
  // currentSnippet.value = null
}

const handleSubmit = (data: Omit<Snippet, 'createdAt' | 'updatedAt'> & { id?: string }) => {
  const now = Date.now()
  if (data.id && snippets.value.some(s => s.id === data.id)) {
    // 编辑
    const index = snippets.value.findIndex(s => s.id === data.id)
    if (index !== -1) {
      snippets.value[index] = {
        ...snippets.value[index],
        ...data,
        updatedAt: now
      }
    }
  } else {
    // 新增
    snippets.value.push({
      ...data,
      id: generateId(),
      createdAt: now,
      updatedAt: now
    } as Snippet)
  }
  saveSnippets()
}

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '退出',
      cancelButtonText: '取消',
      type: 'info',
    })
    authStore.logout()
    ElMessage.success('已退出登录')
    await router.push('/login')
  } catch {
    /* 取消 */
  }
}

// 清空所有数据（设置菜单功能）
const handleClearAllData = async () => {
  try {
    await ElMessageBox.confirm('此操作将永久删除所有代码片段，是否继续？', '警告', {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    snippets.value = []
    saveSnippets()
    ElMessage.success('已清空所有数据')
  } catch {
    // 取消操作
  }
}

// storage 事件同步（多标签页）
const onStorageChange = (e: StorageEvent) => {
  if (e.key === STORAGE_KEY && e.newValue) {
    try {
      const newSnippets = JSON.parse(e.newValue)
      // 简单同步，忽略冲突处理（也可以加上时间戳比较）
      snippets.value = newSnippets
    } catch { /* ignore */ }
  }
}

// ---------- 生命周期 ----------
onMounted(() => {
  loadSnippets()
  loadUIState()
  window.addEventListener('storage', onStorageChange)
})

onUnmounted(() => {
  window.removeEventListener('storage', onStorageChange)
})
</script>

<template>
  <el-container class="app-layout">
    <!-- 侧边栏 -->
    <el-aside
      :width="sidebarCollapsed ? '64px' : '240px'"
      class="app-sidebar"
    >
      <div class="logo-section">
        <div class="logo-icon">
          <el-icon><Cpu /></el-icon>
        </div>
        <span v-if="!sidebarCollapsed" class="logo-text">CodeWhisper</span>
      </div>

      <el-menu
        :default-active="activeMenu"
        mode="vertical"
        class="sidebar-menu"
        @select="(index) => activeMenu = index"
      >
        <el-menu-item index="1">
          <el-icon><FolderOpened /></el-icon>
          <span v-if="!sidebarCollapsed">代码片段</span>
        </el-menu-item>
        <el-menu-item index="2" @click="showChat = true">
          <el-icon><ChatSquare /></el-icon>
          <span v-if="!sidebarCollapsed">AI 对话</span>
        </el-menu-item>
        <el-menu-item index="3" v-if="isAdmin" @click="handleClearAllData">
          <el-icon><Delete /></el-icon>
          <span v-if="!sidebarCollapsed">清空数据</span>
        </el-menu-item>
        <el-menu-item index="4" @click="handleLogout">
          <el-icon><SwitchButton /></el-icon>
          <span v-if="!sidebarCollapsed">退出登录</span>
        </el-menu-item>
      </el-menu>

      <div class="sidebar-footer">
        <BaseButton
          variant="ghost"
          size="sm"
          :icon="sidebarCollapsed ? ArrowRight : ArrowLeft"
          @click="sidebarCollapsed = !sidebarCollapsed"
        />
      </div>
    </el-aside>

    <!-- 主内容区 -->
    <el-container class="main-layout" direction="vertical">
      <el-header class="app-header">
        <div class="header-left">
          <h2>代码片段管理</h2>
          <span class="count-badge">{{ filteredSnippets.length }} 个片段</span>
        </div>

        <div class="header-center">
          <BaseInput
            v-model="searchQuery"
            placeholder="搜索标题、代码或标签..."
            :prefix-icon="Search"
            clearable
            class="search-input"
          />
          <el-select v-model="selectedLanguage" placeholder="筛选语言" style="width: 140px;">
            <el-option
              v-for="lang in languages"
              :key="lang.value"
              :label="lang.label"
              :value="lang.value"
            />
          </el-select>
        </div>

        <div class="header-right">
          <el-tag v-if="authStore.role" size="small" type="info" effect="plain">
            {{ authStore.username }} · {{ authStore.roleLabel }}
          </el-tag>
          <BaseButton v-if="!sidebarCollapsed" variant="text" size="sm">
            收藏: {{ favoriteCount }}
          </BaseButton>
          <BaseButton variant="primary" :icon="Plus" @click="handleCreate">
            {{ sidebarCollapsed ? '' : '新建片段' }}
          </BaseButton>
        </div>
      </el-header>

      <el-main class="app-main">
        <snippet-list
          :snippets="filteredSnippets"
          @edit="handleEdit"
          @delete="handleDelete"
          @run="handleRun"
          @toggle-favorite="handleToggleFavorite"
          @refer-in-chat="handleReferInChat"
        />
      </el-main>
    </el-container>

    <!-- AI 对话抽屉 -->
    <el-drawer
      v-model="showChat"
      title="AI 代码助手"
      direction="rtl"
      :size="420"
      class="chat-drawer"
      @close="handleChatClose"
    >
      <div class="chat-container">
        <ai-chat :context-snippet="currentSnippet" />
      </div>
    </el-drawer>

    <!-- 表单弹窗 -->
    <snippet-form
      :visible="showForm"
      :edit-snippet="editSnippet"
      @close="showForm = false"
      @submit="handleSubmit"
    />

    <!-- 代码沙箱 -->
    <code-sandbox
      :visible="showSandbox"
      :snippet="currentSnippet"
      @close="showSandbox = false"
    />
  </el-container>
</template>

<style lang="scss" scoped>
.app-layout {
  height: 100vh;
}

.app-sidebar {
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  color: #fff;
  border-right: none;
  position: relative;
  overflow: hidden;
  transition: width 0.2s;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.logo-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.logo-text {
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 1px;
}

.sidebar-menu {
  border-right: none;
  padding: 16px 0;
  background: transparent;

  :deep(.el-menu-item) {
    color: rgba(255, 255, 255, 0.8);
    margin: 0 8px;
    border-radius: 8px;
    background: transparent;

    &:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }

    &.is-active {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
    }
  }
}

.sidebar-footer {
  position: absolute;
  bottom: 20px;
  left: 0;
  right: 0;
  text-align: center;

  :deep(.base-button--ghost) {
    color: rgba(255, 255, 255, 0.6);
    background: rgba(255, 255, 255, 0.1);
    border: none;

    &:hover:not(:disabled) {
      color: #fff;
      background: rgba(255, 255, 255, 0.16);
      border: none;
    }
  }
}

.main-layout {
  flex: 1;
  overflow: hidden;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: #fff;
  border-bottom: 1px solid #eee;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;

  h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #1f2937;
  }
}

.count-badge {
  padding: 2px 8px;
  background: #e5e7eb;
  border-radius: 10px;
  font-size: 12px;
  color: #6b7280;
}

.header-center {
  display: flex;
  align-items: center;
  gap: 16px;
}

.search-input {
  width: 300px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.app-main {
  flex: 1;
  overflow-y: auto;
  background: #f9fafb;
  padding: 20px;
}

.chat-drawer {
  :deep(.el-drawer__body) {
    padding: 0;
    height: 100%;
  }
}

.chat-container {
  height: 100%;
}
</style>