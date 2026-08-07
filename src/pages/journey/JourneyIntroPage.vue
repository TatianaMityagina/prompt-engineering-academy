<template>
  <div v-if="journey" class="journey-page">
    <n-space vertical size="large">
      <n-card>
        <n-space align="center" size="small">
          <n-tag :type="journey.generatedBy === 'ai' ? 'info' : 'default'" size="small">
            {{ journey.generatedBy === 'ai' ? 'Сгенерировано ИИ' : 'Сгенерировано локально' }}
          </n-tag>
          <n-tag size="small">{{ journey.checkpoints.length }} чекпоинтов</n-tag>
          <n-tag size="small">⏱ {{ formatTime(journey.totalTimeSec) }}</n-tag>
        </n-space>
        <n-h1 class="intro-title">{{ journey.title }}</n-h1>
        <n-p v-if="journey.narrativeContext" class="narrative-context">
          {{ journey.narrativeContext }}
        </n-p>
      </n-card>

      <n-card>
        <template #header>
          <n-h3 style="margin: 0;">🗺️ Маршрут путешествия</n-h3>
        </template>
        <n-timeline>
          <n-timeline-item
            v-for="(cp, index) in journey.checkpoints"
            :key="cp.id"
            :type="cp.difficulty === 3 ? 'error' : cp.difficulty === 2 ? 'warning' : 'info'"
            :title="`${index + 1}. ${cp.title}`"
          >
            <n-p class="cp-summary">{{ cp.summary }}</n-p>
            <n-space size="small" class="cp-meta">
              <n-tag size="small" :type="cp.difficulty === 1 ? 'success' : cp.difficulty === 2 ? 'warning' : 'error'">
                сложность {{ cp.difficulty }}
              </n-tag>
              <n-tag size="small">⏱ {{ formatTime(cp.timeLimitSec) }}</n-tag>
              <n-tag size="small">{{ cp.activities.length }} активностей</n-tag>
            </n-space>
          </n-timeline-item>
        </n-timeline>
      </n-card>

      <n-card class="how-it-works">
        <n-h3 style="margin-bottom: 8px;">Как это работает</n-h3>
        <n-p class="how-text">
          На каждый чекпоинт даётся ограниченное время — таймер нарастает давление.
          Правильные ответы приносят XP, серии правильных ответов дают множитель стрика.
          В конце ты получишь отчёт: что понял, где ошибся и что повторить.
        </n-p>
        <n-space justify="center" wrap class="intro-actions">
          <n-button size="large" type="primary" @click="start">
            🚀 Начать путешествие
          </n-button>
          <n-button size="large" @click="$router.push('/journeys')">Назад</n-button>
        </n-space>
      </n-card>
    </n-space>
  </div>
  <n-empty v-else description="Путешествие не найдено" class="not-found">
    <template #extra>
      <n-button @click="$router.push('/journeys')">К списку</n-button>
    </template>
  </n-empty>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NCard, NH1, NH3, NP, NSpace, NTag, NButton, NTimeline, NTimelineItem, NEmpty,
} from 'naive-ui'
import { useJourneyStore } from '../../store/journeyStore'

const route = useRoute()
const router = useRouter()
const journeyStore = useJourneyStore()

const journey = computed(() => journeyStore.journeys.find(j => j.id === route.params.id))

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return s > 0 ? `${m} мин ${s} сек` : `${m} мин`
}

function start() {
  if (!journey.value) return
  journeyStore.startRun(journey.value)
  router.push(`/journeys/${journey.value.id}/run`)
}
</script>

<style scoped>
.intro-title {
  margin: 12px 0 4px;
}

.narrative-context {
  font-size: 16px;
  line-height: 1.7;
  background: var(--n-color-embedded);
  padding: 16px;
  border-radius: 12px;
  border-left: 4px solid var(--n-primary-color);
}

.cp-summary {
  margin: 4px 0;
  color: var(--n-text-color-secondary);
  font-size: 14px;
}

.cp-meta {
  margin-top: 4px;
}

.how-it-works {
  text-align: center;
}

.how-text {
  color: var(--n-text-color-secondary);
  max-width: 620px;
  margin: 0 auto 16px;
}

.not-found {
  margin-top: 80px;
}

.intro-title {
  font-size: clamp(24px, 5vw, 36px);
  line-height: 1.2;
}

@media (max-width: 640px) {
  .intro-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .intro-actions .n-button {
    width: 100%;
  }
}
</style>
