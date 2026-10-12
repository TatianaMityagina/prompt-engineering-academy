<template>
  <div v-if="result" class="journey-page">
    <n-space vertical size="large">
      <n-card class="result-hero" :class="{ 'result-hero-good': overallScore >= 70 }">
        <n-space vertical align="center">
          <div class="hero-emoji">{{ heroIcon }}</div>
          <n-h1 class="hero-heading">{{ heroTitle }}</n-h1>
          <n-text class="hero-summary">
            {{ result.summaryText }}
          </n-text>
          <div class="score-circle" :style="{ '--score': overallScore }">
            <span>{{ overallScore }}%</span>
          </div>
          <n-space size="large" wrap class="hero-stats">
            <div class="hero-stat">
              <div class="hero-stat-value accent-warning">+{{ result.totalXp }}</div>
              <n-text class="hero-stat-label">XP заработано</n-text>
            </div>
            <div class="hero-stat">
              <div class="hero-stat-value">{{ result.totalTimeSec }} c</div>
              <n-text class="hero-stat-label">Время</n-text>
            </div>
            <div class="hero-stat">
              <div class="hero-stat-value">{{ correctCount }} / {{ result.activities.length }}</div>
              <n-text class="hero-stat-label">Правильных ответов</n-text>
            </div>
          </n-space>
        </n-space>
      </n-card>

      <n-card v-if="result.achievements.length || profileAchievements.length">
        <template #header>
          <n-h3 style="margin: 0;">🏆 Достижения</n-h3>
        </template>
        <n-space v-if="result.achievements.length" vertical size="small">
          <n-alert v-for="a in result.achievements" :key="a.id" type="success" :show-icon="false" class="achievement-row">
            <span class="achievement-icon">{{ a.icon }}</span>
            <div>
              <n-text strong>{{ a.title }}</n-text>
              <n-p class="achievement-desc">{{ a.description }}</n-p>
            </div>
          </n-alert>
        </n-space>
        <n-space v-else align="center" style="margin-top: 4px;">
          <n-text style="color: var(--n-text-color-secondary);">Новых достижений в этом путешествии не получено.</n-text>
        </n-space>
        <n-divider />
        <n-space wrap size="small">
          <n-tooltip v-for="a in profileAchievements" :key="a.id">
            <template #trigger>
              <n-tag size="medium" class="profile-achievement">{{ a.icon }} {{ a.title }}</n-tag>
            </template>
            {{ a.description }}
          </n-tooltip>
        </n-space>
      </n-card>

      <n-card>
        <template #header>
          <n-h3 style="margin: 0;">🧠 Разбор по концепциям</n-h3>
        </template>
        <n-space vertical size="medium">
          <div v-for="review in result.conceptReviews" :key="review.checkpointId">
            <n-space justify="space-between" align="center" class="review-row">
              <n-text strong>{{ review.title }}</n-text>
              <n-tag :type="review.score >= 70 ? 'success' : review.score >= 40 ? 'warning' : 'error'">
                {{ review.score }}%
              </n-tag>
            </n-space>
            <n-progress
              type="line"
              :percentage="review.score"
              :show-indicator="false"
              :height="8"
              class="review-progress"
            />
            <n-space v-if="review.strengths.length || review.improvements.length" vertical size="small">
              <div v-for="s in review.strengths" :key="s" class="review-strength">✅ {{ s }}</div>
              <div v-for="i in review.improvements" :key="i" class="review-improvement">📖 {{ i }}</div>
            </n-space>
            <ExplainPanel
              v-if="review.score < 70 && checkpointOf(review.checkpointId)"
              :fragment="checkpointOf(review.checkpointId)!.summary"
              :topic="`${journey!.title} → ${review.title}`"
              :route="`/journeys/${journey!.id}`"
            />
          </div>
        </n-space>
      </n-card>

      <n-card>
        <template #header>
          <n-h3 style="margin: 0;">📋 Журнал активностей</n-h3>
        </template>
        <n-collapse>
          <n-collapse-item
            v-for="(a, idx) in result.activities"
            :key="a.activityId"
            :name="String(idx)"
            :title="`${idx + 1}. ${activityLabel(a.activityType)} — ${a.correct ? '✅' : a.verdict === 'partial' ? '🟡' : '❌'}`"
          >
            <n-p style="font-weight: 600;">{{ a.prompt }}</n-p>
            <n-p v-if="a.userText" class="user-answer">
              <n-text strong>Твой ответ:</n-text> {{ a.userText }}
            </n-p>
            <n-p class="activity-feedback">{{ a.feedback }}</n-p>
            <n-space size="small">
              <n-tag size="small" :type="a.correct ? 'success' : 'error'">+{{ a.xpEarned }} XP</n-tag>
              <n-tag size="small">⏱ {{ a.timeSpentSec }} c</n-tag>
              <n-tag size="small" v-if="a.hintsUsed">💡 {{ a.hintsUsed }}</n-tag>
            </n-space>
          </n-collapse-item>
        </n-collapse>
      </n-card>

      <n-card>
        <template #header>
          <n-h3 style="margin: 0;">💾 Сохранить отчёт</n-h3>
        </template>
        <n-p class="save-hint">
          Скачай отчёт в Markdown или распечатай страницу (в браузере можно сохранить в PDF).
        </n-p>
        <n-space wrap class="save-actions">
          <n-button type="primary" @click="downloadMarkdown">⬇ Скачать .md</n-button>
          <n-button @click="printPage">🖨 Печать / PDF</n-button>
          <n-button @click="retry">🔄 Пройти заново</n-button>
          <n-button v-if="hasWeak" type="warning" secondary @click="$router.push('/progress')">🎯 Тренировка по ошибкам</n-button>
        </n-space>
      </n-card>
    </n-space>
  </div>
  <n-empty v-else description="Результаты не найдены" class="not-found">
    <template #extra>
      <n-button @click="$router.push('/journeys')">К списку путешествий</n-button>
    </template>
  </n-empty>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import confetti from 'canvas-confetti'
import {
  NCard, NH1, NH3, NP, NText, NSpace, NTag, NProgress, NDivider,
  NAlert, NButton, NCollapse, NCollapseItem, NEmpty, NTooltip,
} from 'naive-ui'
import { useJourneyStore } from '../../store/journeyStore'
import ExplainPanel from '../../components/ai/ExplainPanel.vue'
import type { ActivityType, JourneyResult } from '../../types/journey'

const route = useRoute()
const router = useRouter()
const journeyStore = useJourneyStore()

const result = computed<JourneyResult | null>(() => {
  if (journeyStore.lastResult) return journeyStore.lastResult
  return journeyStore.resultsHistory.find(r => r.journeyId === route.params.id) || null
})

const overallScore = computed(() => {
  if (!result.value || result.value.activities.length === 0) return 0
  const correct = result.value.activities.filter(a => a.correct).length
  const partial = result.value.activities.reduce((acc, a) => acc + (a.correct ? 0 : a.partial || 0), 0)
  return Math.min(100, Math.round(((correct + partial) / result.value.activities.length) * 100))
})

const correctCount = computed(() => result.value?.activities.filter(a => a.correct).length || 0)

const journey = computed(() => journeyStore.journeys.find(j => j.id === result.value?.journeyId) || null)
const checkpointOf = (id: string) => journey.value?.checkpoints.find(c => c.id === id) || null
const hasWeak = computed(() => !!result.value?.conceptReviews.some(r => r.score < 70))

const profileAchievements = computed(() => journeyStore.profile.achievements)

const heroIcon = computed(() => (overallScore.value >= 85 ? '🏆' : overallScore.value >= 60 ? '🎉' : '💪'))
const heroTitle = computed(() => {
  if (overallScore.value >= 85) return 'Мастерство!'
  if (overallScore.value >= 60) return 'Хороший результат!'
  return 'Продолжай практиковаться'
})

function activityLabel(type: ActivityType): string {
  const labels: Record<string, string> = {
    MultipleChoice: 'Выбор ответа',
    TrueFalse: 'Верно / Неверно',
    FillTheBlank: 'Пропуск',
    MatchPairs: 'Пары',
    OrderSteps: 'Порядок шагов',
    PromptBuilder: 'Сборка промпта',
    FreeResponse: 'Свободный ответ',
    ExplainLikeImFive: 'Объясни просто',
    TeachBack: 'Обучи друга',
    GiveYourExample: 'Свой пример',
    FindTheConnection: 'Связь понятий',
    PredictTheOutcome: 'Предскажи исход',
    CategorySort: 'Сортировка по темам',
  }
  return labels[type] || type
}

function downloadMarkdown() {
  if (!result.value) return
  const r = result.value
  const lines: string[] = []
  lines.push(`# 🧭 ${r.journeyTitle} — отчёт о прохождении`)
  lines.push('')
  lines.push(`- Дата: ${new Date(r.finishedAt).toLocaleString('ru-RU')}`)
  lines.push(`- Общий результат: **${overallScore.value}%**`)
  lines.push(`- Правильных ответов: ${correctCount.value} из ${r.activities.length}`)
  lines.push(`- XP заработано: **${r.totalXp}**`)
  lines.push(`- Время: ${r.totalTimeSec} сек`)
  lines.push('')
  lines.push('## Разбор по концепциям')
  lines.push('')
  for (const review of r.conceptReviews) {
    lines.push(`### ${review.title} — ${review.score}%`)
    for (const s of review.strengths) lines.push(`- ✅ ${s}`)
    for (const i of review.improvements) lines.push(`- 📖 ${i}`)
    lines.push('')
  }
  lines.push('## Журнал активностей')
  lines.push('')
  r.activities.forEach((a, idx) => {
    const mark = a.correct ? '✅' : a.verdict === 'partial' ? '🟡' : a.verdict === 'timeout' ? '⏰' : '❌'
    lines.push(`${idx + 1}. ${mark} **${activityLabel(a.activityType)}** (+${a.xpEarned} XP)`)
    lines.push(`   Вопрос: ${a.prompt}`)
    if (a.userText) lines.push(`   Твой ответ: ${a.userText}`)
    lines.push(`   Фидбек: ${a.feedback}`)
    lines.push('')
  })
  lines.push('---')
  lines.push('_Создано в Knowledge Journey_')

  const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `knowledge-journey-${r.journeyId}.md`
  a.click()
  URL.revokeObjectURL(url)
}

function retry() {
  const id = route.params.id as string
  router.push(`/journeys/${id}`)
}

function printPage() {
  window.print()
}

onMounted(() => {
  if (overallScore.value >= 60) {
    confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } })
    setTimeout(() => confetti({ particleCount: 80, spread: 100, origin: { y: 0.5 } }), 250)
  }
})
</script>

<style scoped>
.result-hero {
  text-align: center;
  border-color: var(--n-warning-color);
}
.result-hero-good {
  border-color: var(--n-success-color);
}

.hero-emoji {
  font-size: 56px;
}

.hero-heading {
  margin: 8px 0 4px;
}

.hero-summary {
  font-size: 15px;
  color: var(--n-text-color-secondary);
  text-align: center;
  max-width: 640px;
}

.hero-stats {
  margin-top: 8px;
}

.hero-stat {
  text-align: center;
}

.hero-stat-value {
  font-size: 24px;
  font-weight: 800;
}

.accent-warning {
  color: var(--n-warning-color);
}

.hero-stat-label {
  font-size: 12px;
  color: var(--n-text-color-secondary);
}

.achievement-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.achievement-icon {
  font-size: 24px;
}

.achievement-desc {
  margin: 0;
  font-size: 13px;
  color: var(--n-text-color-secondary);
}

.profile-achievement {
  font-size: 16px;
  padding: 6px 10px;
}

.review-progress {
  margin: 6px 0;
}

.review-strength {
  font-size: 13px;
  color: var(--n-success-color);
}

.review-improvement {
  font-size: 13px;
  color: var(--n-warning-color);
}

.user-answer {
  font-size: 14px;
}

.activity-feedback {
  font-size: 14px;
  color: var(--n-text-color-secondary);
}

.save-hint {
  color: var(--n-text-color-secondary);
}

.not-found {
  margin-top: 80px;
}

.score-circle {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  margin: 16px auto;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  font-weight: 800;
  background: conic-gradient(var(--n-primary-color) calc(var(--score) * 1%), var(--n-color-hover) 0);
}
.score-circle span {
  width: 116px;
  height: 116px;
  border-radius: 50%;
  background: var(--n-color);
  display: flex;
  align-items: center;
  justify-content: center;
}

.review-row {
  flex-wrap: wrap;
  gap: 8px;
}

@media (max-width: 640px) {
  .hero-emoji {
    font-size: 44px;
  }

  .score-circle {
    width: 116px;
    height: 116px;
    font-size: 30px;
  }

  .score-circle span {
    width: 96px;
    height: 96px;
  }

  .save-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .save-actions .n-button {
    width: 100%;
  }
}
</style>
