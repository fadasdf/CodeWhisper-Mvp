<!--
  BaseCard：内容卡片容器
  插槽：default 主体、header、extra（标题右侧）、footer
-->
<script setup lang="ts">
import { computed } from 'vue'

export type CardVariant = 'default' | 'elevated' | 'glass' | 'outline'

const props = withDefaults(
  defineProps<{
    variant?: CardVariant
    padding?: 'none' | 'sm' | 'md' | 'lg'
    hoverable?: boolean
    title?: string
    subtitle?: string
  }>(),
  {
    variant: 'default',
    padding: 'md',
    hoverable: false,
  },
)

const classes = computed(() => [
  'base-card',
  `base-card--${props.variant}`,
  `base-card--padding-${props.padding}`,
  { 'base-card--hoverable': props.hoverable },
])
</script>

<template>
  <div :class="classes">
    <header v-if="title || subtitle || $slots.header" class="base-card__header">
      <slot name="header">
        <div v-if="title || subtitle" class="base-card__titles">
          <h3 v-if="title" class="base-card__title">{{ title }}</h3>
          <p v-if="subtitle" class="base-card__subtitle">{{ subtitle }}</p>
        </div>
      </slot>
      <div v-if="$slots.extra" class="base-card__extra">
        <slot name="extra" />
      </div>
    </header>

    <div class="base-card__body">
      <slot />
    </div>

    <footer v-if="$slots.footer" class="base-card__footer">
      <slot name="footer" />
    </footer>
  </div>
</template>

<style lang="scss" scoped>
@use './tokens' as *;

.base-card {
  border-radius: $radius-lg;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;

  &--padding-none .base-card__body { padding: 0; }
  &--padding-sm .base-card__body { padding: 12px; }
  &--padding-md .base-card__body { padding: 20px; }
  &--padding-lg .base-card__body { padding: 28px; }

  &--default {
    background: #fff;
    border: 1px solid $border-light;
    box-shadow: $shadow-sm;
  }

  &--elevated {
    background: #fff;
    border: none;
    box-shadow: $shadow-md;
  }

  &--glass {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    backdrop-filter: blur(20px);
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.35);
  }

  &--outline {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  &--hoverable:not(:disabled):hover {
    transform: translateY(-2px);
    box-shadow: $shadow-md;
  }
}

.base-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px 0;
}

.base-card__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: inherit;
}

.base-card__subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  color: $text-secondary;
}

.base-card--glass .base-card__title,
.base-card--outline .base-card__title {
  color: #fff;
}

.base-card--glass .base-card__subtitle,
.base-card--outline .base-card__subtitle {
  color: rgba(255, 255, 255, 0.55);
}

.base-card__footer {
  padding: 0 20px 16px;
  border-top: 1px solid $border-light;
  margin-top: 4px;
  padding-top: 12px;
}

.base-card--glass .base-card__footer {
  border-top-color: rgba(255, 255, 255, 0.08);
}
</style>
