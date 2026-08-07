<template>
  <div class="gaming-strip">
    <div class="stat" title="Текущий уровень">
      <span class="stat-icon">{{ level.icon }}</span>
      <div class="stat-body">
        <div class="stat-label">{{ level.title }}</div>
        <div class="stat-value">{{ xp }} XP</div>
      </div>
    </div>
    <n-progress
      type="line"
      :percentage="levelProgress"
      :show-indicator="false"
      :height="6"
      style="flex: 1; margin: 0 16px;"
    />
    <div class="stat" title="Серия правильных ответов">
      <span class="stat-icon">🔥</span>
      <div class="stat-body">
        <div class="stat-label">Стрик</div>
        <div class="stat-value" :class="{ 'streak-hot': streak >= 3 }">{{ streak }}</div>
      </div>
    </div>
    <div class="stat" title="Прогресс путешествия">
      <span class="stat-icon">🗺️</span>
      <div class="stat-body">
        <div class="stat-label">Прогресс</div>
        <div class="stat-value">{{ progress }}%</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NProgress } from 'naive-ui'

interface Props {
  xp: number
  level: { title: string; icon: string }
  levelProgress: number
  streak: number
  progress: number
}

defineProps<Props>()
</script>

<style scoped>
.gaming-strip {
  display: flex;
  align-items: center;
  background: var(--n-color-embedded);
  border: 1px solid var(--n-border-color);
  border-radius: 12px;
  padding: 10px 16px;
  flex-wrap: wrap;
  gap: 8px;
}
.stat {
  display: flex;
  align-items: center;
  gap: 8px;
}
.stat-icon {
  font-size: 22px;
}
.stat-body {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}
.stat-label {
  font-size: 11px;
  color: var(--n-text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.stat-value {
  font-size: 16px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.streak-hot {
  color: var(--n-warning-color);
}
</style>
