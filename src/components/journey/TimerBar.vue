<template>
  <div class="timer-wrap" :class="levelClass">
    <div class="timer-row">
      <span class="timer-label">{{ label }}</span>
      <span class="timer-value" :class="{ 'timer-danger': isDanger }">{{ formatted }}</span>
    </div>
    <div class="timer-track">
      <div
        class="timer-fill"
        :class="{ 'timer-fill-danger': isDanger, 'timer-fill-warn': isWarn }"
        :style="{ width: `${percent}%` }"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  remaining: number
  total: number
  label?: string
}

const props = withDefaults(defineProps<Props>(), {
  label: 'Время',
})

const percent = computed(() => {
  if (props.total <= 0) return 0
  return Math.max(0, Math.min(100, (props.remaining / props.total) * 100))
})

const isWarn = computed(() => percent.value > 25 && percent.value <= 50)
const isDanger = computed(() => percent.value <= 25)

const levelClass = computed(() => (isDanger.value ? 'timer-level-danger' : isWarn.value ? 'timer-level-warn' : ''))

const formatted = computed(() => {
  const s = Math.max(0, props.remaining)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
})
</script>

<style scoped>
.timer-wrap {
  transition: all 0.3s ease;
}
.timer-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 4px;
}
.timer-label {
  font-size: 13px;
  color: var(--n-text-color-secondary);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.timer-value {
  font-size: 22px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.timer-danger .timer-value {
  color: var(--n-error-color);
  animation: pulse 1s ease-in-out infinite;
}
.timer-track {
  height: 8px;
  border-radius: 4px;
  background: var(--n-color-hover);
  overflow: hidden;
}
.timer-fill {
  height: 100%;
  border-radius: 4px;
  background: var(--n-success-color);
  transition: width 0.9s linear, background 0.4s ease;
}
.timer-fill-warn {
  background: var(--n-warning-color);
}
.timer-fill-danger {
  background: var(--n-error-color);
}
.timer-level-warn {
  border-radius: 8px;
  padding: 10px 12px;
  background: rgba(245, 158, 11, 0.1);
}
.timer-level-danger {
  border-radius: 8px;
  padding: 10px 12px;
  background: rgba(220, 38, 38, 0.1);
  animation: danger-glow 1.2s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
@keyframes danger-glow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.25); }
  50% { box-shadow: 0 0 0 6px rgba(220, 38, 38, 0); }
}
</style>
