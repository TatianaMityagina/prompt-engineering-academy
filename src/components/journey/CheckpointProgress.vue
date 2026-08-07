<template>
  <div class="checkpoint-progress">
    <div
      v-for="(cp, index) in checkpoints"
      :key="cp.id"
      class="cp-node"
      :class="{
        'cp-current': index === currentIndex,
        'cp-done': index < currentIndex,
        'cp-failed': index < currentIndex && failedSet.has(index),
      }"
      :title="cp.title"
    >
      <div class="cp-dot">
        <span v-if="index < currentIndex && failedSet.has(index)">!</span>
        <span v-else-if="index < currentIndex">✓</span>
        <span v-else>{{ index + 1 }}</span>
      </div>
      <div class="cp-title">{{ cp.title }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Checkpoint } from '../../types/journey'

interface Props {
  checkpoints: Checkpoint[]
  currentIndex: number
  failedIndexes?: number[]
}

const props = withDefaults(defineProps<Props>(), {
  failedIndexes: () => [],
})

const failedSet = new Set(props.failedIndexes)
</script>

<style scoped>
.checkpoint-progress {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px 0;
}
.cp-node {
  flex: 1 1 0;
  min-width: 90px;
  text-align: center;
}
.cp-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  margin: 0 auto 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  background: var(--n-color-hover);
  color: var(--n-text-color-secondary);
  border: 2px solid var(--n-border-color);
  transition: all 0.3s ease;
}
.cp-node.cp-current .cp-dot {
  background: var(--n-primary-color);
  border-color: var(--n-primary-color);
  color: #fff;
  box-shadow: 0 0 0 4px var(--n-primary-color-suppl);
}
.cp-node.cp-done .cp-dot {
  background: var(--n-success-color);
  border-color: var(--n-success-color);
  color: #fff;
}
.cp-node.cp-failed .cp-dot {
  background: var(--n-warning-color);
  border-color: var(--n-warning-color);
  color: #fff;
}
.cp-title {
  font-size: 11px;
  line-height: 1.2;
  color: var(--n-text-color-secondary);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
</style>
