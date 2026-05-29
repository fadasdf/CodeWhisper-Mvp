<!-- SnippetList.vue -->
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
} from '@/utils/icon'
import type { Snippet } from '@/types/Snippet'

interface Props {
  snippets: Snippet[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'edit', snippet: Snippet): void
  (e: 'delete', id: string): void
  (e: 'run', snippet: Snippet): void
  (e: 'toggleFavorite', id: string): void
}>()

const copiedId = ref<string | null>(null)
const fullCodeDialogVisible = ref(false)
const fullCodeContent = ref('')

// 排序：收藏优先，再按更新时间倒序
const sortedSnippets = computed(() => {
  return [...props.snippets].sort((a, b) => {
    if (a.isFavorite !== b.isFavorite) return b.isFavorite ? 1 : -1
    return b.updatedAt - a.updatedAt
  })
})

// 格式化日期（含年份）
const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 语言标签动态样式
const languageTagStyle = (lang: string) => {
  const colors: Record<string, string> = {
    javascript: '#f7df1e',
    html: '#e34f26',
    css: '#1572b6'
  }
  const color = colors[lang] || '#909399'
  return {
    backgroundColor: `${color}20`,
    color: color,
    borderColor: `${color}40`
  }
}

// 复制代码
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

// 查看完整代码
const viewFullCode = (code: string) => {
  fullCodeContent.value = code
  fullCodeDialogVisible.value = true
}

// 在弹窗中复制代码
const copyFullCode = async () => {
  try {
    await navigator.clipboard.writeText(fullCodeContent.value)
    ElMessage.success('复制成功')
  } catch {
    ElMessage.error('复制失败')
  }
}
</script>

<template>
  <div class="snippet-list">
    <div v-if="sortedSnippets.length === 0" class="empty-state">
      <div class="empty-icon">📝</div>
      <p>暂无代码片段</p>
      <p class="empty-hint">点击「新建片段」按钮创建第一个片段</p>
    </div>

    <el-card
      v-for="snippet in sortedSnippets"
      :key="snippet.id"
      class="snippet-card"
      :class="{ 'is-favorite': snippet.isFavorite }"
      shadow="hover"
    >
      <div class="snippet-header">
        <div class="snippet-title-row">
          <el-tooltip :content="snippet.isFavorite ? '取消收藏' : '收藏'">
            <el-button
              class="favorite-btn"
              :icon="snippet.isFavorite ? StarFilled : Star"
              :type="snippet.isFavorite ? 'warning' : 'default'"
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
          <el-button size="small" text @click="viewFullCode(snippet.code)">
            <el-icon><ZoomIn /></el-icon> 查看完整代码
          </el-button>
        </div>
      </div>

      <div class="snippet-actions">
        <el-button size="small" icon @click="copyToClipboard(snippet.code, snippet.id)">
          <el-icon><Check v-if="copiedId === snippet.id" /><CopyDocument v-else /></el-icon>
          {{ copiedId === snippet.id ? '已复制' : '复制' }}
        </el-button>
        <el-button size="small" icon type="primary" @click="emit('edit', snippet)">
          <el-icon><Edit /></el-icon> 编辑
        </el-button>
        <el-button size="small" icon type="success" @click="emit('run', snippet)">
          <el-icon><VideoPlay /></el-icon> 运行
        </el-button>
        <el-popconfirm
          title="确认删除该代码片段吗？"
          confirm-button-text="删除"
          cancel-button-text="取消"
          @confirm="emit('delete', snippet.id)"
        >
          <template #reference>
            <el-button size="small" icon type="danger">
              <el-icon><Delete /></el-icon> 删除
            </el-button>
          </template>
        </el-popconfirm>
      </div>
    </el-card>

    <!-- 完整代码预览弹窗 -->
    <el-dialog v-model="fullCodeDialogVisible" title="完整代码" width="80%">
      <pre class="full-code-view">{{ fullCodeContent }}</pre>
      <template #footer>
        <el-button @click="fullCodeDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="copyFullCode">复制代码</el-button>
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
  padding: 60px 20px;
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
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  }

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
  margin-top: 8px;
  flex-wrap: wrap;
}

.favorite-btn {
  padding: 4px;
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
</style>