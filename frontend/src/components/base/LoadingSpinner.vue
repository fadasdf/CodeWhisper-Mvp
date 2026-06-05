<!--
  LoadingSpinner：旋转加载指示
  overlay=true 时全屏遮罩，用于提交/登录等阻塞操作
-->
<script setup lang="ts">
import { computed } from 'vue'

export type SpinnerSize = 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    size?: SpinnerSize
    text?: string
    overlay?: boolean
    color?: 'brand' | 'light' | 'dark'
  }>(),
  {
    size: 'md',
    overlay: false,
    color: 'brand',
  },
)

const classes = computed(() => [
  'loading-spinner',
  `loading-spinner--${props.size}`,
  `loading-spinner--${props.color}`,
  { 'loading-spinner--overlay': props.overlay },
])
</script>

<template>
  <div :class="classes" role="status" aria-live="polite" :aria-label="text || '加载中'">
    <div class="loading-spinner__ring" />
    <p v-if="text" class="loading-spinner__text">{{ text }}</p>
  </div>
</template>

<style lang="scss" scoped>
@use './tokens' as *;

.loading-spinner {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;

  &--overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    justify-content: center;
    background: rgba(15, 15, 26, 0.45);
    backdrop-filter: blur(4px);
  }

  &--sm .loading-spinner__ring {
    width: 18px;
    height: 18px;
    border-width: 2px;
  }

  &--md .loading-spinner__ring {
    width: 32px;
    height: 32px;
    border-width: 3px;
  }

  &--lg .loading-spinner__ring {
    width: 48px;
    height: 48px;
    border-width: 4px;
  }

  &--brand .loading-spinner__ring {
    border-color: rgba(102, 126, 234, 0.2);
    border-top-color: $brand-primary;
  }

  &--light .loading-spinner__ring {
    border-color: rgba(255, 255, 255, 0.25);
    border-top-color: #fff;
  }

  &--dark .loading-spinner__ring {
    border-color: rgba(0, 0, 0, 0.1);
    border-top-color: $text-primary;
  }
}

.loading-spinner__ring {
  border-radius: 50%;
  border-style: solid;
  animation: spin 0.75s linear infinite;
}

.loading-spinner__text {
  margin: 0;
  font-size: 13px;
  color: $text-secondary;
}

.loading-spinner--overlay .loading-spinner__text {
  color: rgba(255, 255, 255, 0.85);
}

.loading-spinner--light .loading-spinner__text {
  color: rgba(255, 255, 255, 0.8);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
