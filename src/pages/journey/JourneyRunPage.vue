<template>
  <div v-if="journey && checkpoint && activity" class="journey-page">
    <n-card :bordered="true">
      <template #header>
        <div>
          <n-space justify="space-between" align="center" class="run-header-row">
            <n-text strong class="run-title">{{ journey.title }}</n-text>
            <n-button text type="error" size="small" @click="confirmAbort">✕ Выйти</n-button>
          </n-space>
          <n-space justify="space-between" align="center" class="run-meta">
            <n-text class="meta-text">
              Чекпоинт {{ checkpointIndex + 1 }} из {{ journey.checkpoints.length }} · {{ checkpoint.title }}
            </n-text>
            <n-text class="meta-strong">
              Активность {{ activityIndexInCheckpoint + 1 }} / {{ checkpoint.activities.length }}
            </n-text>
          </n-space>
        </div>
      </template>

      <CheckpointProgress
        :checkpoints="journey.checkpoints"
        :current-index="checkpointIndex"
        :failed-indexes="failedCheckpoints"
      />

      <n-divider />

      <template v-if="phase === 'activity'">
        <TimerBar
          :remaining="remainingSec"
          :total="checkpoint.timeLimitSec"
          :label="'Время чекпоинта'"
          style="margin-bottom: 16px;"
        />

        <n-alert
          v-if="narrativeEpisode"
          type="info"
          :show-icon="false"
          style="margin-bottom: 16px; background: var(--n-color-embedded); border-left: 4px solid var(--n-primary-color);"
        >
          <n-text style="font-size: 14px; line-height: 1.7;">🎬 {{ narrativeEpisode }}</n-text>
        </n-alert>

        <ActivityView
          v-if="!evaluating"
          :key="activity.id"
          :activity="activity"
          mode="test"
          @answered="handleClosedAnswer"
          @free-submit="handleFreeSubmit"
        />

        <n-card v-else size="small" class="section-gap">
          <n-space align="center">
            <n-spin size="small" />
            <n-text>Оцениваем твой ответ…</n-text>
          </n-space>
        </n-card>

        <n-space v-if="!isCurrentAnswered" style="margin-top: 12px;">
          <n-button size="small" secondary :disabled="hints.length === 0 || hintsShown >= hints.length" @click="revealHint">
            💡 Подсказка
          </n-button>
          <n-tag v-if="hintsShown > 0" size="small" type="warning">−15% XP за подсказку</n-tag>
        </n-space>

        <n-collapse v-if="revealedHints.length" style="margin-top: 8px;">
          <n-collapse-item title="Подсказки" name="hints">
            <n-space vertical size="small">
              <n-alert v-for="(hint, idx) in revealedHints" :key="idx" type="warning" :show-icon="false" size="small">
                {{ hint }}
              </n-alert>
            </n-space>
          </n-collapse-item>
        </n-collapse>

        <template v-if="currentResult">
          <n-divider v-if="showResultAlert" />
          <n-alert
            v-if="showResultAlert"
            :type="currentResult.correct ? 'success' : currentResult.verdict === 'timeout' ? 'error' : 'warning'"
            :title="resultTitle"
          >
            <n-p style="margin: 0;">{{ currentResult.feedback }}</n-p>
            <n-space v-if="currentResult.partial !== undefined && currentResult.verdict === 'partial'" size="small" style="margin-top: 8px;">
              <n-tag size="small">оценка {{ Math.round((currentResult.partial || 0) * 100) }}%</n-tag>
            </n-space>
          </n-alert>
          <n-space justify="end" style="margin-top: 16px;">
            <n-button type="primary" size="large" @click="nextActivity">
              <template v-if="isLastActivityInCheckpoint">Завершить чекпоинт →</template>
              <template v-else>Следующая активность →</template>
            </n-button>
          </n-space>
        </template>
      </template>

      <template v-else-if="phase === 'checkpoint-complete'">
        <div class="checkpoint-summary">
          <div class="summary-emoji">{{ checkpointSummary.score >= 70 ? '🎉' : '💪' }}</div>
          <n-h2 style="margin: 8px 0;">Чекпоинт пройден</n-h2>
          <n-text class="summary-text">
            {{ checkpoint.title }} · правильных {{ checkpointSummary.correct }} из {{ checkpointSummary.total }}
          </n-text>

          <div class="summary-stats">
            <div>
              <div class="summary-value accent-primary">{{ checkpointSummary.score }}%</div>
              <n-text class="summary-label">Точность</n-text>
            </div>
            <div>
              <div class="summary-value accent-warning">+{{ checkpointSummary.xp }}</div>
              <n-text class="summary-label">XP за чекпоинт</n-text>
            </div>
          </div>

          <n-alert v-if="nextNarrativeEpisode" type="info" :show-icon="false" class="next-narrative">
            <n-text style="font-size: 14px;">🎬 {{ nextNarrativeEpisode }}</n-text>
          </n-alert>

          <n-space justify="center">
            <n-button v-if="!isLastCheckpoint" size="large" type="primary" @click="continueAfterCheckpoint">
              Следующий чекпоинт →
            </n-button>
            <n-button v-else size="large" type="success" @click="finishJourney">
              Завершить путешествие 🧭
            </n-button>
          </n-space>
        </div>
      </template>
    </n-card>

    <GamingStrip
      :xp="profile.totalXp"
      :level="levelInfo.level"
      :level-progress="levelInfo.progress"
      :streak="streak"
      :progress="currentRunProgress"
      class="gaming-strip-gap"
    />

    <n-modal v-model:show="showAbortConfirm" preset="dialog" type="warning" title="Прервать путешествие?"
      content="Прогресс сохранится, и ты сможешь продолжить позже."
      positive-text="Прервать"
      negative-text="Остаться"
      @positive-click="abortAndLeave"
      @negative-click="showAbortConfirm = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NCard, NSpace, NText, NButton, NTag, NDivider, NAlert, NSpin,
  NCollapse, NCollapseItem, NH2, NModal,
} from 'naive-ui'
import { useJourneyStore } from '../../store/journeyStore'
import { useSettingsStore } from '../../store/settingsStore'
import { evaluateFreeAnswer } from '../../services/journeyService'
import type { ActivityResult } from '../../types/journey'
import ActivityView from '../../components/journey/ActivityView.vue'
import TimerBar from '../../components/journey/TimerBar.vue'
import CheckpointProgress from '../../components/journey/CheckpointProgress.vue'
import GamingStrip from '../../components/journey/GamingStrip.vue'

const route = useRoute()
const router = useRouter()
const journeyStore = useJourneyStore()
const settingsStore = useSettingsStore()

type Phase = 'activity' | 'checkpoint-complete'

const phase = ref<Phase>('activity')
const evaluating = ref(false)
const hintsShown = ref(0)
const revealedHints = ref<string[]>([])
const showAbortConfirm = ref(false)

const journey = computed(() => {
  if (journeyStore.activeRun) return journeyStore.activeRun.journey
  return journeyStore.journeys.find(j => j.id === route.params.id)
})
const checkpointIndex = computed(() => journeyStore.activeRun?.checkpointIndex ?? 0)
const checkpoint = computed(() => journeyStore.currentCheckpoint)
const activity = computed(() => journeyStore.currentActivity)
const activityIndexInCheckpoint = computed(() => journeyStore.activeRun?.activityIndex ?? 0)
const remainingSec = computed(() => journeyStore.activeRun?.remainingSec ?? 0)
const profile = computed(() => journeyStore.profile)
const levelInfo = computed(() => journeyStore.levelInfo)
const streak = computed(() => journeyStore.activeRun?.streak ?? 0)
const currentRunProgress = computed(() => journeyStore.currentRunProgress)

const currentResult = computed<ActivityResult | null>(() => {
  if (!activity.value) return null
  return journeyStore.getActivityResult(activity.value.id) || null
})
const isLastActivityInCheckpoint = computed(() => {
  if (!checkpoint.value || !activity.value) return false
  return checkpoint.value.activities[checkpoint.value.activities.length - 1]?.id === activity.value.id
})

const isCurrentAnswered = computed(() => (activity.value ? journeyStore.isActivityAnswered(activity.value.id) : false))

const narrativeEpisode = computed(() => {
  const cp = checkpoint.value
  if (!cp) return ''
  return journey.value?.narrativeEpisodes?.find(e => e.checkpointId === cp.id)?.text || ''
})

const nextNarrativeEpisode = computed(() => {
  if (!journey.value || !checkpoint.value) return ''
  const nextCp = journey.value.checkpoints[checkpointIndex.value + 1]
  if (!nextCp) return ''
  return journey.value.narrativeEpisodes?.find(e => e.checkpointId === nextCp.id)?.text || ''
})

const isLastCheckpoint = computed(() => {
  return journey.value ? checkpointIndex.value >= journey.value.checkpoints.length - 1 : true
})

const failedCheckpoints = computed<number[]>(() => {
  if (!journeyStore.activeRun) return []
  const out: number[] = []
  journeyStore.activeRun.journey.checkpoints.forEach((cp, i) => {
    const res = journeyStore.activeRun?.checkpointResults[cp.id]
    if (res && !res.timedOut && res.score < 60) out.push(i)
  })
  return out
})

const checkpointSummary = computed(() => {
  if (!checkpoint.value) return { score: 0, xp: 0, correct: 0, total: 0 }
  return journeyStore.checkpointResult(checkpoint.value)
})

const resultTitle = computed(() => {
  if (!currentResult.value) return ''
  if (currentResult.value.verdict === 'timeout') return '⏰ Время вышло'
  if (currentResult.value.correct) return `✅ Правильно! +${currentResult.value.xpEarned} XP`
  if (currentResult.value.verdict === 'partial') return `🟡 Частично верно +${currentResult.value.xpEarned} XP`
  return '❌ Неправильно'
})

const showResultAlert = computed(() => {
  if (!currentResult.value) return false
  if (currentResult.value.verdict === 'timeout') return true
  return ['FreeResponse', 'ExplainLikeImFive', 'TeachBack', 'GiveYourExample', 'FindTheConnection', 'PredictTheOutcome']
    .includes(currentResult.value.activityType)
})

const hints = computed(() => activity.value?.hints || [])

let timerId: number | null = null

onMounted(() => {
  if (!journeyStore.activeRun) {
    if (journey.value) {
      journeyStore.startRun(journey.value)
    } else {
      router.replace('/journeys')
      return
    }
  }
  startTimer()
  window.addEventListener('beforeunload', syncRun)
  document.addEventListener('visibilitychange', syncRun)
})

onUnmounted(() => {
  stopTimer()
  window.removeEventListener('beforeunload', syncRun)
  document.removeEventListener('visibilitychange', syncRun)
})

function syncRun() {
  journeyStore.persistActiveRun()
}

function startTimer() {
  stopTimer()
  timerId = window.setInterval(() => {
    if (phase.value !== 'activity') return
    if (isCurrentAnswered.value) return
    const status = journeyStore.tick()
    if (status === 'timeout') {
      stopTimer()
      handleCheckpointTimeout()
    }
  }, 1000)
}

function stopTimer() {
  if (timerId !== null) {
    window.clearInterval(timerId)
    timerId = null
  }
}

function revealHint() {
  const act = activity.value
  if (!act || !act.hints || hintsShown.value >= act.hints.length) return
  const hint = act.hints[hintsShown.value]
  revealedHints.value.push(hint.text)
  hintsShown.value += 1
}

function handleClosedAnswer(isCorrect: boolean) {
  if (!activity.value) return
  const act = activity.value
  journeyStore.submitAnswer({
    activity: act,
    correct: isCorrect,
    verdict: isCorrect ? 'correct' : 'incorrect',
    answer: act.prompt,
    feedback: act.feedback,
    timeSpentSec: journeyStore.currentTimeSpentSec(),
    hintsUsed: hintsShown.value,
  })
  stopTimer()
}

async function handleFreeSubmit(text: string) {
  if (!activity.value) return
  const act = activity.value
  if (act.type === 'FreeResponse' || act.type === 'ExplainLikeImFive' || act.type === 'TeachBack'
    || act.type === 'GiveYourExample' || act.type === 'FindTheConnection' || act.type === 'PredictTheOutcome') {
    evaluating.value = true
    try {
      const evalResult = await evaluateFreeAnswer(act, text, settingsStore.settings)
      const correct = evalResult.verdict === 'correct'
      journeyStore.submitAnswer({
        activity: act,
        correct,
        verdict: evalResult.verdict,
        answer: text,
        userText: text,
        partial: evalResult.score / 100,
        feedback: evalResult.feedback,
        timeSpentSec: journeyStore.currentTimeSpentSec(),
        hintsUsed: hintsShown.value,
      })
    } catch (e) {
      journeyStore.submitAnswer({
        activity: act,
        correct: false,
        verdict: 'incorrect',
        answer: text,
        userText: text,
        partial: 0,
        feedback: e instanceof Error ? `Не удалось оценить ответ: ${e.message}` : 'Не удалось оценить ответ.',
        timeSpentSec: journeyStore.currentTimeSpentSec(),
        hintsUsed: hintsShown.value,
      })
    } finally {
      evaluating.value = false
      stopTimer()
    }
  }
}

function nextActivity() {
  if (!checkpoint.value || !activity.value) return
  if (isLastActivityInCheckpoint.value) {
    journeyStore.finalizeCheckpoint()
    phase.value = 'checkpoint-complete'
    return
  }
  journeyStore.next()
  hintsShown.value = 0
  revealedHints.value = []
  startTimer()
}

function handleCheckpointTimeout() {
  journeyStore.markRemainingAsTimeout()
  journeyStore.finalizeCheckpoint()
  phase.value = 'checkpoint-complete'
}

function continueAfterCheckpoint() {
  phase.value = 'activity'
  hintsShown.value = 0
  revealedHints.value = []
  const hasNext = journeyStore.next()
  if (!hasNext) {
    finishJourney()
    return
  }
  startTimer()
}

function finishJourney() {
  journeyStore.finishRun()
  router.push(`/journeys/${journey.value?.id}/result`)
}

function confirmAbort() {
  showAbortConfirm.value = true
}

function abortAndLeave() {
  showAbortConfirm.value = false
  syncRun()
  router.push('/journeys')
}

watch(() => activity.value?.id, () => {
  hintsShown.value = 0
  revealedHints.value = []
  startTimer()
})
</script>

<style scoped>
.run-title {
  font-size: 18px;
}

.run-meta {
  margin-top: 8px;
}

.meta-text {
  font-size: 13px;
  color: var(--n-text-color-secondary);
}

.meta-strong {
  font-size: 13px;
  font-weight: 600;
}

.section-gap {
  margin-top: 16px;
}

.checkpoint-summary {
  text-align: center;
  padding: 24px 0;
}

.summary-emoji {
  font-size: 56px;
}

.summary-text {
  font-size: 15px;
  color: var(--n-text-color-secondary);
}

.summary-stats {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin: 24px 0;
}

.summary-value {
  font-size: 36px;
  font-weight: 800;
}

.accent-primary {
  color: var(--n-primary-color);
}

.accent-warning {
  color: var(--n-warning-color);
}

.summary-label {
  font-size: 13px;
  color: var(--n-text-color-secondary);
}

.next-narrative {
  max-width: 560px;
  margin: 0 auto 24px;
}

.gaming-strip-gap {
  margin-top: 16px;
}

.run-header-row {
  flex-wrap: wrap;
  gap: 8px;
}

@media (max-width: 640px) {
  .run-meta {
    flex-wrap: wrap;
    gap: 4px;
  }

  .summary-stats {
    gap: 16px;
    flex-wrap: wrap;
  }

  .summary-emoji {
    font-size: 44px;
  }

  .summary-value {
    font-size: 30px;
  }
}
</style>
