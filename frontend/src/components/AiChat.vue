<!--
  AiChat：AI 对话面板（抽屉内嵌）
  - 通过 POST /api/chat/stream SSE 与后端 DeepSeek 模型对话
  - contextSnippet：父组件传入的代码片段，作为提问上下文
-->
<script setup lang="ts">
import { ref, nextTick, watch, onMounted } from 'vue'
import { ElAvatar, ElScrollbar } from 'element-plus'
import { Promotion, Service, User } from '@/utils/icon'
import { BaseButton, BaseInput, LoadingSpinner } from '@/components/base'
import { streamChat, clearChatSession, getChatHistory } from '@/api/chat'
import type { Snippet } from '@/types/Snippet'

const SESSION_KEY = 'codewhisper_chat_session_id'

// 扩展 Message 类型，包含可选的上下文片段
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  contextSnippets?: Snippet[]
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
const isStreaming = ref(false)
const scrollbarRef = ref<InstanceType<typeof ElScrollbar>>()
const sessionId = ref('')
const abortController = ref<AbortController | null>(null)

// 中文输入法组合状态
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

const WELCOME_MESSAGE = '您好！我是您的AI代码助手。可以为您解释、优化或调试代码，也可以基于选中的代码片段提问。'

const appendWelcomeMessage = () => {
  messages.value.push({
    id: generateId(),
    role: 'assistant',
    content: WELCOME_MESSAGE,
    timestamp: Date.now()
  })
}

/** 发送用户消息，通过 SSE 流式接收 AI 回复 */

const sendMessage = async () => {
  if (!inputValue.value.trim() || isLoading.value || isStreaming.value) return
  const userMsg: Message = {
    id: generateId(),
    role: 'user',
    content: inputValue.value.trim(),
    timestamp: Date.now(),
    contextSnippets: props.contextSnippet ? [props.contextSnippet] : undefined
  }

  messages.value.push(userMsg)
  inputValue.value = ''
  isLoading.value = true
  isStreaming.value = true
  await scrollToBottom()

  const aiMsg: Message = {
    id: generateId(),
    role: 'assistant',
    content: '',
    timestamp: Date.now()
  }
  messages.value.push(aiMsg)
  const aiMsgIndex = messages.value.length - 1

  const appendAiContent = (token: string) => {
    const target = messages.value[aiMsgIndex]
    if (target) target.content += token
  }

  const setAiContent = (content: string) => {
    const target = messages.value[aiMsgIndex]
    if (target) target.content = content
  }

  const controller = new AbortController()
  abortController.value = controller

  try {
    isLoading.value = false

    await streamChat(
      {
        sessionId: sessionId.value,
        message: userMsg.content,
        contextSnippet: props.contextSnippet
      },
      (event) => {
        if (event.type === 'token') {
          appendAiContent(event.content)
          scrollToBottom()
        } else if (event.type === 'done') {
          setAiContent(event.content)
        } else if (event.type === 'error') {
          if (event.code === 'ABORTED') return
          const prefix = event.statusCode === 402 ? '402 余额不足：' : '请求失败：'
          setAiContent(`${prefix}${event.message}`)
        }
      },
      controller.signal
    )
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return
    setAiContent(`请求失败：${err instanceof Error ? err.message : '未知错误'}`)
  } finally {
    isStreaming.value = false
    isLoading.value = false
    if (abortController.value === controller) {
      abortController.value = null
    }
    await scrollToBottom()
  }
}

// 清空对话并同步清除后端会话历史
const clearMessages = async () => {
  abortController.value?.abort()
  abortController.value = null
  isStreaming.value = false
  isLoading.value = false
  await clearChatSession(sessionId.value).catch(() => {})

  messages.value = [
    {
      id: generateId(),
      role: 'assistant',
      content: '对话已清空。有什么可以帮您？',
      timestamp: Date.now()
    }
  ]
  emit('clear')
  scrollToBottom()
}

// 中文输入法事件处理（修复7）
const handleCompositionStart = () => { isComposing = true }
const handleCompositionEnd = () => { isComposing = false }

// 键盘事件：Enter 发送，Shift+Enter 换行
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.repeat && !isComposing) {
    e.preventDefault()
    sendMessage()
  }
}

// 监听消息变化自动滚动（深度监听可移除，改为每次 push 后手动滚动，性能更好）
watch(
  () => messages.value.length,
  () => scrollToBottom()
)

// 初始化 sessionId、欢迎消息与历史对话
onMounted(async () => {
  const stored = localStorage.getItem(SESSION_KEY)
  sessionId.value = stored || generateId()
  localStorage.setItem(SESSION_KEY, sessionId.value)

  appendWelcomeMessage()

  try {
    const history = await getChatHistory(sessionId.value)
    for (const msg of history) {
      if (msg.role !== 'user' && msg.role !== 'assistant') continue
      messages.value.push({
        id: generateId(),
        role: msg.role,
        content: msg.content,
        timestamp: Date.now()
      })
    }
    if (history.length > 0) {
      await scrollToBottom()
    }
  } catch {
    // 历史加载失败时保留欢迎消息即可
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
      <BaseButton variant="text" size="sm" @click="clearMessages">
        清空对话
      </BaseButton>
    </div>

    <!-- 使用 ElScrollbar 的正确滚动方法 -->
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
          <!-- 显示附带的代码片段上下文 -->
          <div v-if="msg.contextSnippets?.length" class="context-badge">
            📄 附片段：{{ msg.contextSnippets?.[0]?.title }}
          </div>
          <div class="message-time">
            {{ new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }}
          </div>
        </div>
      </div>

      <div v-if="isLoading || isStreaming" class="loading-indicator">
        <LoadingSpinner size="sm" :text="isStreaming ? 'AI 正在回复...' : 'AI 正在思考...'" />
      </div>
    </el-scrollbar>

    <div class="chat-input">
      <div v-if="contextSnippet" class="context-attached">
        <span class="context-attached-label">📄 已附加代码片段：</span>
        <span class="context-attached-title">{{ contextSnippet.title }}</span>
        <el-tag size="small" effect="plain">{{ contextSnippet.language }}</el-tag>
      </div>
      <div class="chat-input-row">
        <BaseInput
          v-model="inputValue"
          type="textarea"
          :rows="2"
          placeholder="输入您的问题，Enter 发送，Shift+Enter 换行"
          class="chat-textarea"
          :disabled="isLoading || isStreaming"
          @compositionstart="handleCompositionStart"
          @compositionend="handleCompositionEnd"
          @keydown="handleKeydown"
        />
        <BaseButton
          variant="primary"
          :icon="Promotion"
          :loading="isLoading || isStreaming"
          :disabled="!inputValue.trim() || isLoading || isStreaming"
          @click="sendMessage"
        />
      </div>
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

  :deep(.base-button--text) {
    color: rgba(255, 255, 255, 0.85);

    &:hover:not(:disabled) {
      color: #fff;
      background: rgba(255, 255, 255, 0.12);
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
  display: flex;
  justify-content: center;
  padding: 16px;
}

.chat-input {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  border-top: 1px solid #eee;
  background: #fafafa;
}

.context-attached {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #eef2ff;
  border: 1px solid #c7d2fe;
  border-radius: 8px;
  font-size: 13px;
  color: #4338ca;
}

.context-attached-label {
  flex-shrink: 0;
}

.context-attached-title {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-input-row {
  display: flex;
  gap: 12px;

  .chat-textarea {
    flex: 1;

    :deep(.el-textarea__inner) {
      resize: none;
      border-radius: 8px;
    }
  }

  .base-button {
    align-self: flex-end;
    flex-shrink: 0;
  }
}
</style>