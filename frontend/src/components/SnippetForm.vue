<!--
  SnippetForm：新建/编辑片段弹窗
  - 使用 el-form 校验；提交后由父组件写入 localStorage
  - Element Plus 2 对话框使用 model-value 控制显隐
-->
<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { BaseButton, BaseInput } from '@/components/base'
import type { Snippet } from '@/types/Snippet'


interface Props {
  visible: boolean
  editSnippet?: Snippet | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', snippet: Omit<Snippet, 'createdAt' | 'updatedAt'> & { id?: string }): void
}>()

const languages = [
  { label: 'JavaScript', value: 'javascript' },
  { label: 'HTML', value: 'html' },
  { label: 'CSS', value: 'css' },
]

const formData = reactive({
  title: '',
  language: 'javascript' as Snippet['language'],
  code: '',
  tags: [] as string[],
})

const tagInput = ref('')
const formRef = ref<FormInstance>()
const submitLoading = ref(false)
console.log('formRef', formRef.value)

// 中文输入法组字期间，回车不触发添加标签
let isComposing = false

const rules: FormRules = {
  title: [
    { required: true, message: '请输入代码片段标题', trigger: 'blur' },
    { min: 1, max: 50, message: '标题长度 1-50 个字符', trigger: 'blur' },
  ],
  language: [{ required: true, message: '请选择编程语言', trigger: 'change' }],
  code: [{ required: true, message: '请输入代码内容', trigger: 'blur' }],
}

const resetForm = () => {
  formData.title = ''
  formData.language = 'javascript'
  formData.code = ''
  formData.tags = []
  tagInput.value = ''
  formRef.value?.clearValidate()
}

const addTag = () => {
  const tag = tagInput.value.trim()
  if (tag && !formData.tags.includes(tag)) {
    formData.tags.push(tag)
    tagInput.value = ''
  }
}

const removeTag = (tag: string) => {
  formData.tags = formData.tags.filter((t) => t !== tag)
}

const handleTagKeydown = () => {
  if (!isComposing) addTag()
}

const handleSubmit = async () => {
  if (!formRef.value) return

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
        isFavorite: props.editSnippet?.isFavorite || false,
      })
      resetForm()
      emit('close')
    } finally {
      submitLoading.value = false
    }
  })
}

const handleClose = () => {
  resetForm()
  emit('close')
}

const onDialogVisibleChange = (value: boolean) => {
  if (!value) handleClose()
}

watch(
  [() => props.visible, () => props.editSnippet],
  ([visible, snippet]) => {
    if (visible) {
      if (snippet) {
        formData.title = snippet.title
        formData.language = snippet.language
        formData.code = snippet.code
        formData.tags = [...snippet.tags]
      } else {
        resetForm()
      }
    }
  },
  { immediate: true },
)

const handleGlobalKeydown = (e: KeyboardEvent) => {
  if (props.visible && (e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    handleSubmit()
  }
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      window.addEventListener('keydown', handleGlobalKeydown)
    } else {
      window.removeEventListener('keydown', handleGlobalKeydown)
    }
  },
  { immediate: true },
)
</script>

<template>
  <el-dialog
    :title="editSnippet ? '编辑代码片段' : '创建代码片段'"
    :model-value="visible"
    width="700px"
    :close-on-click-modal="false"
    destroy-on-close
    @update:model-value="onDialogVisibleChange"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="80px"
      class="snippet-form"
    >
      <el-form-item label="标题" prop="title">
        <BaseInput
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
          <BaseInput
            v-model="tagInput"
            placeholder="输入标签后按回车添加"
            clearable
            @compositionstart="isComposing = true"
            @compositionend="isComposing = false"
            @keydown.enter.prevent="handleTagKeydown"
          />
          <BaseButton variant="primary" size="sm" @click="addTag">
            添加
          </BaseButton>
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
        <BaseInput
          v-model="formData.code"
          type="textarea"
          :rows="12"
          placeholder="输入代码..."
          class="code-textarea"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <BaseButton variant="ghost" @click="handleClose">
        取消
      </BaseButton>
      <BaseButton variant="primary" :loading="submitLoading" @click="handleSubmit">
        {{ editSnippet ? '保存修改' : '创建片段' }}
      </BaseButton>
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
  width: 100%;

  .base-input {
    flex: 1;
  }
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

.code-textarea :deep(.el-textarea__inner) {
  font-family: 'Fira Code', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.5;
}
</style>
