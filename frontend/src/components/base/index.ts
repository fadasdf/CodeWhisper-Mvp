/**
 * 通用基础组件统一导出
 * 业务页请优先使用本目录组件，以保持视觉与交互一致
 */
export { default as BaseButton } from './BaseButton.vue'
export { default as BaseInput } from './BaseInput.vue'
export { default as BaseCard } from './BaseCard.vue'
export { default as LoadingSpinner } from './LoadingSpinner.vue'

export type { ButtonVariant, ButtonSize } from './BaseButton.vue'
export type { InputVariant, InputSize } from './BaseInput.vue'
export type { CardVariant } from './BaseCard.vue'
export type { SpinnerSize } from './LoadingSpinner.vue'
