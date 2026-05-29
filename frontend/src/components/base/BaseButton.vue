<!--
  BaseButton：品牌风格按钮
  variant: primary | secondary | ghost | danger | text
  loading 时内置 LoadingSpinner，禁用点击
-->
<script setup lang="ts">
import { computed } from 'vue'
import type { Component } from 'vue'
import LoadingSpinner from './LoadingSpinner.vue'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'text'
export type ButtonSize = 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    variant?: ButtonVariant
    size?: ButtonSize
    loading?: boolean
    disabled?: boolean
    block?: boolean
    type?: 'button' | 'submit' | 'reset'
    icon?: Component
  }>(),
  {
    variant: 'primary',
    size: 'md',
    loading: false,
    disabled: false,
    block: false,
    type: 'button',
  },
)

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const isDisabled = computed(() => props.disabled || props.loading)

// base-button--${props.variant}为动态类名，根据props.variant的值，添加对应的类名
// {
//   'base-button--block': props.block,
//   'base-button--loading': props.loading,
// },为静态类名，根据props.block和props.loading的值，添加对应的类名
const classes = computed(() => [
  'base-button',
  `base-button--${props.variant}`,
  `base-button--${props.size}`,
  {
    'base-button--block': props.block,
    'base-button--loading': props.loading,
  },
])

const spinnerSize = computed(() => {
  const map: Record<ButtonSize, 'sm' | 'md' | 'lg'> = { sm: 'sm', md: 'sm', lg: 'md' }
  return map[props.size]
})

function handleClick(event: MouseEvent) {
  if (isDisabled.value) return
  emit('click', event)
}
</script>

<template>
  <button
    :type="type"
    :class="classes"
    :disabled="isDisabled"
    @click="handleClick"
  >
    <LoadingSpinner
      v-if="loading"
      :size="spinnerSize"
      color="light"
      class="base-button__spinner"
    />
    <el-icon v-else-if="icon" class="base-button__icon">
      <component :is="icon" />
    </el-icon>
    <span class="base-button__content">
      <slot />
    </span>
  </button>
</template>

<style lang="scss" scoped>
@use './tokens' as *;

.base-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: none;
  border-radius: $radius-md;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s, background 0.2s;
  white-space: nowrap;
  font-family: inherit;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  &:not(:disabled):active {
    transform: scale(0.98);
  }

  &--block {
    width: 100%;
  }

  &--sm {
    padding: 6px 12px;
    font-size: 13px;
    border-radius: $radius-sm;
  }

  &--md {
    padding: 10px 18px;
    font-size: 14px;
  }

  &--lg {
    padding: 12px 22px;
    font-size: 15px;
    border-radius: $radius-lg;
  }

  &--primary {
    color: #fff;
    background: $brand-gradient;
    box-shadow: 0 4px 14px rgba(102, 126, 234, 0.35);

    &:not(:disabled):hover {
      opacity: 0.92;
      box-shadow: 0 6px 18px rgba(102, 126, 234, 0.45);
    }
  }

  &--secondary {
    color: $brand-primary;
    background: rgba(102, 126, 234, 0.1);
    border: 1px solid rgba(102, 126, 234, 0.25);

    &:not(:disabled):hover {
      background: rgba(102, 126, 234, 0.16);
    }
  }

  &--ghost {
    color: $text-primary;
    background: transparent;
    border: 1px solid $border-light;

    &:not(:disabled):hover {
      border-color: $brand-primary;
      color: $brand-primary;
    }
  }

  &--danger {
    color: #fff;
    background: $danger;

    &:not(:disabled):hover {
      background: $danger-hover;
    }
  }

  &--text {
    color: $brand-primary;
    background: transparent;
    padding-left: 8px;
    padding-right: 8px;
    font-weight: 500;

    &:not(:disabled):hover {
      background: rgba(102, 126, 234, 0.08);
    }
  }

  &--loading .base-button__content {
    opacity: 0.85;
  }
}

.base-button__spinner {
  flex-shrink: 0;
}

.base-button__icon {
  flex-shrink: 0;
  font-size: 1.1em;
}
</style>
