<template>
  <n-card :bordered="true" style="max-width: 900px; margin: 0 auto;">
    <template #header>
      <n-h2 style="margin: 0 0 12px 0;">Тест: {{ article?.title }}</n-h2>
      <n-grid :cols="'1 s:2'" :x-gap="16" responsive="screen">
        <n-grid-item>
          <n-statistic label="Прогресс" :value="Math.round(progress)">
            <template #suffix>%</template>
          </n-statistic>
        </n-grid-item>
        <n-grid-item>
          <n-statistic label="Вопрос" :value="currentIndex + 1">
            <template #suffix> / {{ exercises.length }}</template>
          </n-statistic>
        </n-grid-item>
      </n-grid>
      <n-progress
        type="line"
        :percentage="progress"
        :percentage-indicator="true"
        :height="8"
        style="margin-top: 12px;"
      />
    </template>

    <div v-if="!testCompleted">
      <component
        v-if="exercise"
        :is="getComponent(exercise.component)"
        v-bind="exercise.props"
        mode="test"
        :questionIndex="currentIndex"
        :totalQuestions="exercises.length"
        @answered="handleAnswer"
      />

      <n-space justify="space-between" wrap class="test-nav" style="margin-top: 24px;">
        <n-button @click="previousQuestion" :disabled="currentIndex === 0">
          ← Назад
        </n-button>
        <n-button
          v-if="currentIndex < exercises.length - 1"
          type="primary"
          @click="nextQuestion"
          :disabled="!isCurrentAnswered"
        >
          Следующий вопрос →
        </n-button>
        <n-button
          v-else
          type="success"
          @click="finishTest"
          :disabled="!isCurrentAnswered"
        >
          Завершить тест 🎯
        </n-button>
      </n-space>
    </div>

    <div v-else>
      <n-h3 align="center">📊 Результаты теста</n-h3>

      <n-card style="text-align: center; max-width: 400px; margin: 0 auto 24px;">
        <div style="font-size: 64px; font-weight: bold; color: var(--n-primary-color);">
          {{ Math.round(score) }}%
        </div>
        <n-p>Правильных ответов</n-p>
        <n-p style="color: var(--n-text-color-secondary);">
          {{ correctCount }} из {{ exercises.length }}
        </n-p>
      </n-card>

      <n-grid :cols="'1 s:3'" :x-gap="16" responsive="screen" style="margin-bottom: 24px;">
        <n-grid-item>
          <n-card size="small" style="text-align: center; background: var(--n-success-color-suppl); border-color: var(--n-success-color);">
            <n-p style="font-size: 12px; color: var(--n-text-color-secondary);">✅ Правильно</n-p>
            <n-text style="font-size: 24px; font-weight: 600; color: var(--n-success-color);">{{ correctCount }}</n-text>
          </n-card>
        </n-grid-item>
        <n-grid-item>
          <n-card size="small" style="text-align: center; background: var(--n-error-color-suppl); border-color: var(--n-error-color);">
            <n-p style="font-size: 12px; color: var(--n-text-color-secondary);">❌ Неправильно</n-p>
            <n-text style="font-size: 24px; font-weight: 600; color: var(--n-error-color);">{{ incorrectCount }}</n-text>
          </n-card>
        </n-grid-item>
        <n-grid-item>
          <n-card size="small" style="text-align: center; background: var(--n-color-embedded);">
            <n-p style="font-size: 12px; color: var(--n-text-color-secondary);">📝 Всего</n-p>
            <n-text style="font-size: 24px; font-weight: 600;">{{ exercises.length }}</n-text>
          </n-card>
        </n-grid-item>
      </n-grid>

      <n-alert
        :type="score >= 70 ? 'success' : 'warning'"
        :title="score >= 70 ? '🎉 Отлично!' : '💪 Нужно еще практиковаться'"
        style="margin-bottom: 24px;"
      >
        <p v-if="score >= 70">Вы хорошо усвоили материал!</p>
        <p v-else>Рекомендуем перечитать статью и попробовать еще раз.</p>
      </n-alert>

      <n-space justify="center" size="large" wrap class="test-result-actions">
        <n-button @click="resetTest">Пройти заново</n-button>
        <n-button type="primary" @click="goToArticle">Вернуться к статье</n-button>
      </n-space>
    </div>
  </n-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NCard, NH2, NH3, NP, NText, NSpace, NButton,
  NGrid, NGridItem, NStatistic, NProgress, NAlert
} from 'naive-ui'
import { useExerciseStore } from '../store/exerciseStore'
import { useLearnerStore } from '../store/learnerStore'
import { articleTopic, exerciseQuestionText, inlineExerciseProps, sectionForTestQuestion } from '../services/rag/sections'
import { articles } from '../data/articles'
import MultipleChoice from '../components/exercises/MultipleChoice.vue'
import TrueFalse from '../components/exercises/TrueFalse.vue'
import FillTheBlank from '../components/exercises/FillTheBlank.vue'
import MatchPairs from '../components/exercises/MatchPairs.vue'
import OrderSteps from '../components/exercises/OrderSteps.vue'
import PromptBuilder from '../components/exercises/PromptBuilder.vue'

const route = useRoute()
const router = useRouter()
const exerciseStore = useExerciseStore()
const learner = useLearnerStore()

const article = computed(() => {
  return articles.find(a => a.slug === route.params.slug as string)
})

const exercises = computed(() => article.value?.exercises || [])
const testCompleted = ref(false)

const currentIndex = computed({
  get: () => exerciseStore.currentQuestionIndex,
  set: (value: number) => {
    if (value >= 0 && value < exercises.value.length) {
      exerciseStore.currentQuestionIndex = value
    }
  }
})

const exercise = computed(() => {
  if (!exercises.value.length || currentIndex.value >= exercises.value.length) return null
  return exercises.value[currentIndex.value]
})

const progress = computed(() => exerciseStore.progress)
const score = computed(() => exerciseStore.score)
const correctCount = computed(() => exerciseStore.correctCount)
const incorrectCount = computed(() => exerciseStore.incorrectCount)
const isCurrentAnswered = computed(() => exerciseStore.isAnswered(currentIndex.value))

const getComponent = (name: string) => {
  const components: Record<string, any> = {
    MultipleChoice,
    TrueFalse,
    FillTheBlank,
    MatchPairs,
    OrderSteps,
    PromptBuilder,
  }
  return components[name]
}

const handleAnswer = (isCorrect: boolean) => {
  exerciseStore.submitAnswer(currentIndex.value, isCorrect)
  const a = article.value
  if (!a) return
  const section = sectionForTestQuestion(a, currentIndex.value)
  const props = { ...inlineExerciseProps(a, currentIndex.value), ...exercise.value?.props }
  learner.recordAnswer({
    source: 'test',
    topic: articleTopic(a, section),
    route: `/article/${a.slug}${section ? `#${section.id}` : ''}`,
    correct: isCorrect,
    question: exerciseQuestionText(props) || 'Вопрос теста',
  })
}

const nextQuestion = () => {
  if (isCurrentAnswered.value && currentIndex.value < exercises.value.length - 1) {
    exerciseStore.nextQuestion()
  }
}

const previousQuestion = () => {
  if (currentIndex.value > 0) {
    exerciseStore.previousQuestion()
  }
}

const finishTest = () => {
  if (isCurrentAnswered.value) {
    testCompleted.value = true
    exerciseStore.saveProgress()
  }
}

const resetTest = () => {
  exerciseStore.resetTest()
  testCompleted.value = false
  if (article.value?.exercises) {
    exerciseStore.startTest(article.value.exercises.length)
  }
}

const goToArticle = () => {
  router.push(`/article/${article.value?.slug}`)
}

onMounted(() => {
  if (article.value?.exercises) {
    if (!exerciseStore.testMode || exerciseStore.totalQuestions !== exercises.value.length) {
      exerciseStore.startTest(exercises.value.length)
    }
  }
})
</script>

<style scoped>
.test-nav {
  gap: 8px;
}

@media (max-width: 640px) {
  .test-nav {
    flex-direction: column;
    align-items: stretch;
  }

  .test-nav .n-button {
    width: 100%;
  }

  .test-result-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .test-result-actions .n-button {
    width: 100%;
  }
}
</style>
