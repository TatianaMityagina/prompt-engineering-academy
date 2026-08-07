<template>
  <n-space vertical size="large" class="journey-page">
    <n-card class="hero-card">
      <n-h1 class="hero-title">🧭 Knowledge Journey</n-h1>      <n-p class="hero-subtitle">
        Вставь любой текст или тему — получи активное путешествие по знаниям: с проверкой понимания,
        давлением времени, геймификацией и финальным отчётом.
      </n-p>
      <n-button size="large" type="primary" style="margin-top: 16px;" @click="$router.push('/journeys/new')">
        ✨ Создать путешествие
      </n-button>
    </n-card>

    <n-card>
      <template #header>
        <n-space justify="space-between" align="center">
          <n-h3 style="margin: 0;">Твой прогресс</n-h3>
          <n-button quaternary size="small" @click="settingsModal = true">⚙️ Настройки ИИ</n-button>
        </n-space>
      </template>
      <n-grid :cols="'1 s:3'" :x-gap="16" responsive="screen">
        <n-grid-item>
          <n-card size="small" class="stat-card">
            <div class="stat-icon">{{ level.icon }}</div>
            <n-text class="stat-title">{{ level.title }}</n-text>
            <n-p class="stat-sub">{{ profile.totalXp }} XP</n-p>
            <n-progress
              type="line"
              :percentage="levelProgress"
              :show-indicator="false"
              :height="6"
              class="stat-progress"
            />
          </n-card>
        </n-grid-item>
        <n-grid-item>
          <n-card size="small" class="stat-card">
            <div class="stat-icon">🔥</div>
            <n-text class="stat-title">{{ profile.bestStreak }}</n-text>
            <n-p class="stat-sub">Лучшая серия</n-p>
          </n-card>
        </n-grid-item>
        <n-grid-item>
          <n-card size="small" class="stat-card">
            <div class="stat-icon">🧭</div>
            <n-text class="stat-title">{{ profile.completedJourneys }}</n-text>
            <n-p class="stat-sub">Пройдено путешествий</n-p>
          </n-card>
        </n-grid-item>
      </n-grid>
    </n-card>

    <n-card v-if="activeRun" class="resume-card">
      <template #header>
        <n-h3 style="margin: 0;">▶ Продолжить прохождение</n-h3>
      </template>
      <div class="resume-row">
        <n-space vertical size="small" class="resume-info">
          <n-text strong>{{ activeRun.journey.title }}</n-text>
          <n-text class="resume-meta">
            Чекпоинт {{ activeRun.checkpointIndex + 1 }} из {{ activeRun.journey.checkpoints.length }} ·
            отвечено {{ answeredCount }} из {{ totalActivities }}
          </n-text>
        </n-space>
        <n-button type="primary" class="resume-button" @click="$router.push(`/journeys/${activeRun.journey.id}/run`)">
          Продолжить →
        </n-button>
      </div>
    </n-card>

    <n-card>
      <template #header>
        <n-h3 style="margin: 0;">Мои путешествия</n-h3>
      </template>
      <n-empty v-if="journeys.length === 0" description="Пока нет путешествий. Создай первое!">
        <template #icon>🧭</template>
        <template #extra>
          <n-button type="primary" @click="$router.push('/journeys/new')">Создать</n-button>
        </template>
      </n-empty>
      <n-space v-else vertical size="medium">
        <n-card
          v-for="journey in journeys"
          :key="journey.id"
          hoverable
          class="journey-card"
          @click="$router.push(`/journeys/${journey.id}`)"
        >
          <div class="journey-row">
            <n-space vertical size="small" class="journey-info">
              <n-space align="center" size="small">
                <n-tag :type="journey.generatedBy === 'ai' ? 'info' : 'default'" size="small">
                  {{ journey.generatedBy === 'ai' ? 'ИИ' : 'Локально' }}
                </n-tag>
                <n-text strong class="journey-title">{{ journey.title }}</n-text>
              </n-space>
              <n-text class="journey-meta">
                {{ journey.checkpoints.length }} чекпоинтов · {{ totalJourneyActivities(journey) }} активностей ·
                ⏱ {{ formatTime(journey.totalTimeSec) }}
              </n-text>
            </n-space>
            <n-space class="journey-actions">
              <n-button @click.stop="$router.push(`/journeys/${journey.id}`)">Смотреть</n-button>
              <n-button quaternary type="error" @click.stop="deleteJourney(journey.id)">Удалить</n-button>
            </n-space>
          </div>
        </n-card>
      </n-space>
    </n-card>

    <AiSettingsModal v-model:show="settingsModal" />
  </n-space>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import {
  NSpace, NCard, NH1, NH3, NP, NText, NButton, NTag, NGrid, NGridItem,
  NProgress, NEmpty,
} from 'naive-ui'
import type { Journey } from '../../types/journey'
import { useJourneyStore } from '../../store/journeyStore'
import AiSettingsModal from '../../components/journey/AiSettingsModal.vue'

const journeyStore = useJourneyStore()
const settingsModal = ref(false)

const { journeys, profile, activeRun, answeredCount, totalActivities, levelInfo } = storeToRefs(journeyStore)
const level = computed(() => levelInfo.value.level)
const levelProgress = computed(() => levelInfo.value.progress)

function totalJourneyActivities(journey: Journey): number {
  return journey.checkpoints.reduce((a, c) => a + c.activities.length, 0)
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m} мин ${s} сек`
}

function deleteJourney(id: string) {
  journeyStore.deleteJourney(id)
}
</script>

<style scoped>
.hero-card {
  text-align: center;
  background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #3b82f6 100%);
  border: none;
}

.hero-title {
  font-size: clamp(26px, 5.5vw, 40px);
  margin-bottom: 8px;
  line-height: 1.15;
  color: #fff;
}

.hero-subtitle {
  font-size: 17px;
  color: rgba(255, 255, 255, 0.85);
  margin: 0 auto;
  max-width: 720px;
}

.stat-card {
  text-align: center;
}

.stat-icon {
  font-size: 28px;
}

.stat-title {
  font-size: 18px;
  font-weight: 700;
}

.stat-sub {
  font-size: 12px;
  color: var(--n-text-color-secondary);
  margin: 0;
}

.stat-progress {
  margin-top: 8px;
}

.resume-card {
  border-color: var(--n-primary-color);
}

.resume-meta,
.journey-meta {
  font-size: 13px;
  color: var(--n-text-color-secondary);
}

.journey-title {
  font-size: 16px;
}

.resume-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
}

.resume-info {
  flex: 1;
  min-width: 0;
}

.journey-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
}

.journey-info {
  flex: 1;
  min-width: 0;
}

.journey-actions {
  flex-shrink: 0;
}

@media (max-width: 640px) {
  .journey-row,
  .resume-row {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .journey-actions {
    justify-content: flex-start;
  }

  .journey-actions .n-button {
    flex: 1;
  }

  .resume-button {
    width: 100%;
  }
}
</style>
