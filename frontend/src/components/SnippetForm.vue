<!-- SnippetForm.vue -->
<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import type { Snippet } from '@/types/Snippet'   // 注意修正路径

interface Props {
  visible: boolean
  editSnippet?: Snippet | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', snippet: Omit<Snippet, 'createdAt' | 'updatedAt'> & { id?: string }): void
}>()

// 语言选项（与 Snippet 接口保持一致）
const languages = [
  { label: 'JavaScript', value: 'javascript' },
  { label: 'HTML', value: 'html' },
  { label: 'CSS', value: 'css' }
]

// 表单数据（使用 reactive 便于校验）
const formData = reactive({
  title: '',
  language: 'javascript' as Snippet['language'],
  code: '',
  tags: [] as string[]
})

const tagInput = ref('')
const formRef = ref<FormInstance>()
const submitLoading = ref(false)

// 中文输入法组合状态
let isComposing = false

// 表单校验规则
const rules: FormRules = {
  title: [
    { required: true, message: '请输入代码片段标题', trigger: 'blur' },
    { min: 1, max: 50, message: '标题长度 1-50 个字符', trigger: 'blur' }
  ],
  language: [
    { required: true, message: '请选择编程语言', trigger: 'change' }
  ],
  code: [
    { required: true, message: '请输入代码内容', trigger: 'blur' }
  ]
}

// 重置表单
const resetForm = () => {
  formData.title = ''
  formData.language = 'javascript'
  formData.code = ''
  formData.tags = []
  tagInput.value = ''
  formRef.value?.clearValidate()   // 清除校验提示
}

// 添加标签
const addTag = () => {
  const tag = tagInput.value.trim()
  if (tag && !formData.tags.includes(tag)) {
    formData.tags.push(tag)
    tagInput.value = ''
  }
}

// 移除标签
const removeTag = (tag: string) => {
  formData.tags = formData.tags.filter(t => t !== tag)
}

// 标签输入框键盘事件（处理中文输入法）
const handleTagKeydown = (e: KeyboardEvent) => {
  if (!isComposing) {
    addTag()
  }
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return

  // 触发表单校验
  await formRef.value.validate(async (valid) => {
    if (!valid) return

    submitLoading.value = true
    try {
      emit('submit', {
        id: props.editSnippet?.id || '',
        title: formData.title,
        language: formData.language,
        code: formData.code,
        tags: [...formData.tags],
        isFavorite: props.editSnippet?.isFavorite || false
      })
      resetForm()
      emit('close')
    } finally {
      submitLoading.value = false
    }
  })
}

// 关闭弹窗
const handleClose = () => {
  resetForm()
  emit('close')
}

// 监听弹窗打开/关闭及编辑对象变化
watch(
  [() => props.visible, () => props.editSnippet],
  ([visible, snippet]) => {
    if (visible) {
      if (snippet) {
        // 编辑模式：填充数据
        formData.title = snippet.title
        formData.language = snippet.language
        formData.code = snippet.code
        formData.tags = [...snippet.tags]
      } else {
        // 新增模式：重置表单
        resetForm()
      }
    }
  },
  { immediate: true }
)

// 可选：支持 Ctrl+S 快捷键保存
const handleGlobalKeydown = (e: KeyboardEvent) => {
  if (props.visible && (e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    handleSubmit()
  }
}

// 监听全局快捷键
watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      window.addEventListener('keydown', handleGlobalKeydown)
    } else {
      window.removeEventListener('keydown', handleGlobalKeydown)
    }
  },
  { immediate: true }
)
</script>

<template>
  <el-dialog
    :title="editSnippet ? '编辑代码片段' : '创建代码片段'"
    :visible="visible"
    width="700px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="80px"
      class="snippet-form"
    >
      <el-form-item label="标题" prop="title">
        <el-input
          v-model="formData.title"
          placeholder="例如：日期格式化函数"
          clearable
        />
      </el-form-item>

      <el-form-item label="语言" prop="language">
        <el-select v-model="formData.language" placeholder="请选择语言">
          <el-option
            v-for="lang in languages"
            :key="lang.value"
            :label="lang.label"
            :value="lang.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="标签">
        <div class="tag-input-wrapper">
          <el-input
            v-model="tagInput"
            placeholder="输入标签后按回车添加"
            @compositionstart="isComposing = true"
            @compositionend="isComposing = false"
            @keydown.enter.prevent="handleTagKeydown"
            clearable
          />
          <el-button type="primary" size="small" @click="addTag">添加</el-button>
        </div>
        <div v-if="formData.tags.length > 0" class="tags-container">
          <el-tag
            v-for="tag in formData.tags"
            :key="tag"
            closable
            :disable-transitions="false"
            @close="removeTag(tag)"
          >
            {{ tag }}
          </el-tag>
        </div>
        <div v-else class="tag-placeholder">暂无标签，请输入后添加</div>
      </el-form-item>

      <el-form-item label="代码" prop="code">
        <el-input
          v-model="formData.code"
          type="textarea"
          :rows="12"
          placeholder="输入代码..."
          class="code-textarea"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
        {{ editSnippet ? '保存修改' : '创建片段' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
.snippet-form {
  padding: 20px 0;
}

.tag-input-wrapper {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.tags-container {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-placeholder {
  margin-top: 8px;
  font-size: 12px;
  color: #aaa;
}

.code-textarea {
  font-family: 'Fira Code', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.5;
}
</style>