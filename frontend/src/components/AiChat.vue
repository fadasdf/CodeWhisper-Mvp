<script setup lang="ts">
import { ref, nextTick, watch, onMounted } from 'vue'
import { ElInput, ElButton, ElAvatar, ElScrollbar } from 'element-plus'
import { Promotion, Service, User } from '@/utils/icon'
import type { Snippet } from '@/types/Snippet'

// 扩展 Message 类型，包含可选的上下文片段
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  contextSnippets?: Snippet[]   // 修复4：添加缺失的字段
}

interface Props {
  contextSnippet?: Snippet | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'clear'): void
}>()

// 响应式数据
const messages = ref<Message[]>([])
const inputValue = ref('')
const isLoading = ref(false)
const scrollbarRef = ref<InstanceType<typeof ElScrollbar>>()

// 修复5：中文输入法组合状态
let isComposing = false

// 生成唯一 ID（兼容性更好）
const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 8)}`

// 滚动到底部（使用 ElScrollbar 的正确方式）
const scrollToBottom = async () => {
  await nextTick()
  const wrap = scrollbarRef.value?.wrapRef
  if (wrap) {
    wrap.scrollTop = wrap.scrollHeight
  }
}

// 发送消息（模拟 AI 回复，实际应接入后端 API）
const sendMessage = async () => {
  if (!inputValue.value.trim() || isLoading.value) return

  const userMsg: Message = {
    id: generateId(),
    role: 'user',
    content: inputValue.value.trim(),
    timestamp: Date.now(),
    contextSnippets: props.contextSnippet ? [props.contextSnippet] : undefined
  }

  messages.value.push(userMsg)
  inputValue.value = ''
  await scrollToBottom()

  isLoading.value = true

  // 模拟网络延迟和 AI 回复（实际应替换为真实 API 调用）
  setTimeout(() => {
    const aiMsg: Message = {
      id: generateId(),
      role: 'assistant',
      content: generateAIResponse(userMsg.content, props.contextSnippet),
      timestamp: Date.now()
    }
    messages.value.push(aiMsg)
    isLoading.value = false
    scrollToBottom()
  }, 1200)
}

// 模拟 AI 回复生成（可根据实际需要对接真实 AI 接口）
const generateAIResponse = (userInput: string, snippet?: Snippet | null): string => {
  const templates = [
    '这是一个很好的问题！让我来分析一下...\n\n核心思路是...',
    '我来帮您优化这段代码！\n\n建议使用以下模式...',
    '代码分析完成！潜在问题：\n1. 空值风险\n2. 复杂度较高\n3. 缺少注释'
  ]
  let response = templates[Math.floor(Math.random() * templates.length)]
  if (snippet) {
    response = `关于片段「${snippet.title}」的问题：${userInput}\n\n${response}`
  } else {
    response = `您问：“${userInput}”\n\n${response}`
  }
  return response
}

// 清空对话（修复6：内部实现清空逻辑）
const clearMessages = () => {
  messages.value = [
    {
      id: generateId(),
      role: 'assistant',
      content: '对话已清空。有什么可以帮您？',
      timestamp: Date.now()
    }
  ]
  emit('clear')   // 可选：通知父组件
  scrollToBottom()
}

// 中文输入法事件处理（修复7）
const handleCompositionStart = () => { isComposing = true }
const handleCompositionEnd = () => { isComposing = false }

// 键盘事件：Enter 发送，Shift+Enter 换行
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
    e.preventDefault()
    sendMessage()
  }
}

// 监听消息变化自动滚动（深度监听可移除，改为每次 push 后手动滚动，性能更好）
watch(
  () => messages.value.length,
  () => scrollToBottom()
)

// 初始化欢迎消息
onMounted(() => {
  if (messages.value.length === 0) {
    messages.value.push({
      id: generateId(),
      role: 'assistant',
      content: '您好！我是您的AI代码助手。可以为您解释、优化或调试代码，也可以基于选中的代码片段提问。',
      timestamp: Date.now()
    })
  }
})
</script>

<template>
  <div class="ai-chat">
    <div class="chat-header">
      <div class="header-left">
        <el-avatar :icon="Service" size="small" />
        <h3>AI 代码助手</h3>
      </div>
      <el-button size="small" text @click="clearMessages">清空对话</el-button>
    </div>

    <!-- 修复1：使用 ElScrollbar 的正确滚动方法 -->
    <el-scrollbar ref="scrollbarRef" class="chat-messages">
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="message-item"
        :class="msg.role"
      >
        <el-avatar :icon="msg.role === 'user' ? User : Service" size="small" />
        <div class="message-content">
          <div class="message-role">
            {{ msg.role === 'user' ? '我' : 'AI助手' }}
          </div>
          <div class="message-text">{{ msg.content }}</div>
          <!-- 修复2：显示附带的代码片段上下文 -->
          <div v-if="msg.contextSnippets?.length" class="context-badge">
            📄 附片段：{{ msg.contextSnippets[0].title }}
          </div>
          <div class="message-time">
            {{ new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }}
          </div>
        </div>
      </div>

      <!-- 修复3：使用普通 div 代替 ElLoading 组件 -->
      <div v-if="isLoading" class="loading-indicator">
        <span>AI正在思考...</span>
      </div>
    </el-scrollbar>

    <div class="chat-input">
      <el-input
        v-model="inputValue"
        type="textarea"
        :rows="2"
        placeholder="输入您的问题，Shift+Enter 换行"
        @compositionstart="handleCompositionStart"
        @compositionend="handleCompositionEnd"
        @keydown="handleKeydown"
      />
      <el-button
        type="primary"
        :disabled="!inputValue.trim() || isLoading"
        @click="sendMessage"
      >
        <el-icon><Promotion /></el-icon>
      </el-button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.ai-chat {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

  .header-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  h3 {
    margin: 0;
    color: #fff;
    font-size: 16px;
    font-weight: 600;
  }

  :deep(.el-button--text) {
    color: rgba(255, 255, 255, 0.85);

    &:hover {
      color: #fff;
    }
  }
}

.chat-messages {
  flex: 1;
  padding: 16px;
}

.message-item {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;

  &.user {
    flex-direction: row-reverse;

    .message-content {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      border-radius: 12px 12px 4px 12px;
    }

    .message-role {
      color: rgba(255, 255, 255, 0.8);
    }

    .message-time {
      color: rgba(255, 255, 255, 0.6);
    }
  }

  &.assistant {
    .message-content {
      background: #f5f7fa;
      color: #333;
      border-radius: 12px 12px 12px 4px;
    }
  }
}

.message-content {
  max-width: 75%;
  padding: 12px 16px;
}

.message-role {
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}

.message-text {
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.context-badge {
  font-size: 12px;
  color: #888;
  margin-top: 6px;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
  display: inline-block;
}

.message-time {
  font-size: 11px;
  color: #999;
  margin-top: 6px;
  text-align: right;
}

.loading-indicator {
  text-align: center;
  padding: 16px;
  color: #999;
}

.chat-input {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid #eee;
  background: #fafafa;

  :deep(.el-textarea__inner) {
    resize: none;
    border-radius: 8px;
  }

  :deep(.el-button) {
    align-self: flex-end;
    padding: 12px 20px;
    border-radius: 8px;
  }
}
</style>