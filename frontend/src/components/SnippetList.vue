<!--
  SnippetList：片段卡片网格
  向父组件抛出 edit / delete / run / toggleFavorite 事件
-->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Star,
  StarFilled,
  Delete,
  Edit,
  VideoPlay,
  CopyDocument,
  Check,
  ZoomIn,
  ChatSquare,
} from '@/utils/icon'
import { BaseButton, BaseCard } from '@/components/base'
import type { Snippet } from '@/types/Snippet'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

interface Props {
  snippets: Snippet[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'edit', snippet: Snippet): void
  (e: 'delete', id: string): void
  (e: 'run', snippet: Snippet): void
  (e: 'toggleFavorite', id: string): void
  (e: 'referInChat', snippet: Snippet): void
}>()

const copiedId = ref<string | null>(null)
const fullCodeDialogVisible = ref(false)
const fullCodeContent = ref('')

/** 展示顺序：收藏置顶，同组内按更新时间倒序 */
const sortedSnippets = computed(() => {
  return [...props.snippets].sort((a, b) => {
    if (a.isFavorite !== b.isFavorite) return b.isFavorite ? 1 : -1
    return b.updatedAt - a.updatedAt
  })
})

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const languageTagStyle = (lang: string) => {
  const colors: Record<string, string> = {
    javascript: '#f7df1e',
    html: '#e34f26',
    css: '#1572b6',
  }
  const color = colors[lang] || '#909399'
  return {
    backgroundColor: `${color}20`,
    color: color,
    borderColor: `${color}40`,
  }
}

const copyToClipboard = async (code: string, id: string) => {
  try {
    await navigator.clipboard.writeText(code)
    copiedId.value = id
    ElMessage.success('复制成功')
    setTimeout(() => {
      if (copiedId.value === id) copiedId.value = null
    }, 2000)
  } catch (err) {
    console.error(err)
    ElMessage.error('复制失败，请手动复制')
  }
}

const viewFullCode = (code: string) => {
  fullCodeContent.value = code
  fullCodeDialogVisible.value = true
}

const copyFullCode = async () => {
  try {
    await navigator.clipboard.writeText(fullCodeContent.value)
    ElMessage.success('复制成功')
  } catch {
    ElMessage.error('复制失败')
  }
}

const isAdmin = computed(() => authStore.role === 'admin')

const confirmDelete = (id: string) => {
  if (!isAdmin.value) {
    ElMessage.error('您没有权限删除代码片段')
  }
  else {
    emit('delete', id)
    ElMessage.success('删除成功')
  }
}
</script>

<template>
  <div class="snippet-list">
    <BaseCard
      v-if="sortedSnippets.length === 0"
      variant="default"
      padding="lg"
      class="empty-state"
    >
      <div class="empty-icon">📝</div>
      <p>暂无代码片段</p>
      <p class="empty-hint">点击「新建片段」按钮创建第一个片段</p>
    </BaseCard>

    <BaseCard
      v-for="snippet in sortedSnippets"
      :key="snippet.id"
      variant="elevated"
      hoverable
      padding="md"
      class="snippet-card"
      :class="{ 'is-favorite': snippet.isFavorite }"
    >
      <div class="snippet-header">
        <div class="snippet-title-row">
          <el-tooltip :content="snippet.isFavorite ? '取消收藏' : '收藏'">
            <BaseButton
              class="favorite-btn"
              :variant="snippet.isFavorite ? 'secondary' : 'ghost'"
              size="sm"
              :icon="snippet.isFavorite ? StarFilled : Star"
              @click="emit('toggleFavorite', snippet.id)"
            />
          </el-tooltip>
          <h3 class="snippet-title">{{ snippet.title }}</h3>
        </div>
        <div class="snippet-meta">
          <el-tag :style="languageTagStyle(snippet.language)">
            {{ snippet.language }}
          </el-tag>
          <span class="update-time">{{ formatDate(snippet.updatedAt) }}</span>
        </div>
      </div>

      <div v-if="snippet.tags.length > 0" class="snippet-tags">
        <el-tag v-for="tag in snippet.tags" :key="tag" size="small" effect="plain">
          {{ tag }}
        </el-tag>
      </div>

      <div class="snippet-preview">
        <pre class="code-preview" :title="snippet.code">{{ snippet.code }}</pre>
        <div class="preview-actions">
          <BaseButton variant="text" size="sm" :icon="ZoomIn" @click="viewFullCode(snippet.code)">
            查看完整代码
          </BaseButton>
        </div>
      </div>

      <template #footer>
        <div class="snippet-actions">
          <BaseButton
            variant="ghost"
            size="sm"
            :icon="copiedId === snippet.id ? Check : CopyDocument"
            @click="copyToClipboard(snippet.code, snippet.id)"
          >
            {{ copiedId === snippet.id ? '已复制' : '复制' }}
          </BaseButton>
          <BaseButton variant="secondary" size="sm" :icon="Edit" @click="emit('edit', snippet)">
            编辑
          </BaseButton>
          <BaseButton variant="primary" size="sm" :icon="VideoPlay" @click="emit('run', snippet)">
            运行
          </BaseButton>
          <BaseButton variant="secondary" size="sm" :icon="ChatSquare" @click="emit('referInChat', snippet)">
            引用
          </BaseButton>
          <el-popconfirm
            title="确认删除该代码片段吗？"
            confirm-button-text="删除"
            cancel-button-text="取消"
            @confirm="confirmDelete(snippet.id)"
          >
            <template #reference>
              <BaseButton variant="danger" size="sm" :icon="Delete">
                删除
              </BaseButton>
            </template>
          </el-popconfirm>
        </div>
      </template>
    </BaseCard>

    <el-dialog v-model="fullCodeDialogVisible" title="完整代码" width="80%">
      <pre class="full-code-view">{{ fullCodeContent }}</pre>
      <template #footer>
        <BaseButton variant="ghost" @click="fullCodeDialogVisible = false">
          关闭
        </BaseButton>
        <BaseButton variant="primary" @click="copyFullCode">
          复制代码
        </BaseButton>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.snippet-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
  padding: 20px;
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  color: #999;

  .empty-icon {
    font-size: 64px;
    margin-bottom: 16px;
  }

  p {
    margin: 8px 0;
    font-size: 16px;
  }

  .empty-hint {
    font-size: 14px;
    color: #ccc;
  }
}

.snippet-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  &.is-favorite {
    border-left: 4px solid #f59e0b;
  }
}

.snippet-header {
  margin-bottom: 12px;
}

.snippet-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.snippet-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.snippet-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
  color: #6b7280;
  font-size: 14px;
}

.update-time {
  font-size: 12px;
}

.snippet-tags {
  margin-bottom: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.snippet-preview {
  margin-bottom: 16px;
  position: relative;
}

.code-preview {
  margin: 0 0 8px 0;
  padding: 12px;
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: 'Fira Code', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.5;
  border-radius: 6px;
  max-height: 180px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  cursor: pointer;

  &:hover {
    background: #2d2d2d;
  }
}

.preview-actions {
  text-align: right;
}

.snippet-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  flex-wrap: nowrap;
}

.favorite-btn {
  min-width: auto;
  padding: 4px 8px;
}

.full-code-view {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 16px;
  border-radius: 8px;
  font-family: 'Fira Code', monospace;
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 70vh;
  overflow: auto;
}

:deep(.base-card__footer) {
  border-top: none;
  padding-top: 0;
  margin-top: 0;
}
</style>
