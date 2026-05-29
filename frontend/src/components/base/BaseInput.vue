<!--
  BaseInput：封装 el-input，统一 default / dark 主题
  支持 v-model；其余原生属性通过 $attrs 透传（如 @keyup.enter、rows）
-->
<script setup lang="ts">
import { computed } from 'vue'
import type { Component } from 'vue'

// 避免 attrs 落在包装 div 上，确保事件绑定到 el-input
defineOptions({ inheritAttrs: false })

export type InputVariant = 'default' | 'dark'
export type InputSize = 'sm' | 'md' | 'lg'

const model = defineModel<string>({ default: '' })

const props = withDefaults(
  defineProps<{
    variant?: InputVariant
    size?: InputSize
    type?: string
    placeholder?: string
    prefixIcon?: Component
    clearable?: boolean
    disabled?: boolean
    showPassword?: boolean
    error?: string
    maxlength?: number
  }>(),
  {
    variant: 'default',
    size: 'md',
    type: 'text',
    clearable: false,
    disabled: false,
    showPassword: false,
  },
)

const elSize = computed(() => {
  const map = { sm: 'small', md: 'default', lg: 'large' } as const
  return map[props.size]
})

const wrapperClass = computed(() => [
  'base-input',
  `base-input--${props.variant}`,
  `base-input--${props.size}`,
  { 'base-input--error': !!props.error },
])
</script>

<template>
  <div :class="wrapperClass">
    <el-input
      v-bind="$attrs"
      v-model="model"
      :type="type"
      :placeholder="placeholder"
      :size="elSize"
      :prefix-icon="prefixIcon"
      :clearable="clearable"
      :disabled="disabled"
      :show-password="showPassword"
      :maxlength="maxlength"
      class="base-input__inner"
    />
    <p v-if="error" class="base-input__error" role="alert">{{ error }}</p>
  </div>
</template>

<style lang="scss" scoped>
@use './tokens' as *;

.base-input {
  width: 100%;

  &--default :deep(.el-input__wrapper) {
    background: #fff;
    box-shadow: 0 0 0 1px $border-light inset;
    transition: box-shadow 0.2s;

    &:hover,
    &.is-focus {
      box-shadow: 0 0 0 1px rgba(102, 126, 234, 0.5) inset;
    }
  }

  &--dark :deep(.el-input__wrapper) {
    background: rgba(255, 255, 255, 0.08);
    box-shadow: none;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  &--dark :deep(.el-input__inner) {
    color: #fff;

    &::placeholder {
      color: rgba(255, 255, 255, 0.35);
    }
  }

  &--dark :deep(.el-input__prefix .el-icon) {
    color: rgba(255, 255, 255, 0.45);
  }

  &--error :deep(.el-input__wrapper) {
    box-shadow: 0 0 0 1px $danger inset;
  }

  &__error {
    margin: 6px 0 0;
    font-size: 12px;
    color: $danger;
    line-height: 1.4;
  }
}
</style>
