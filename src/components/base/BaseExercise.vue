<template>
  <n-card
    class="base-exercise"
    :bordered="true"
    size="medium"
    :class="{
      'mode-inline': mode === 'inline',
      'mode-test': mode === 'test',
      'is-answered': isAnswered
    }"
  >
    <template v-if="title" #header>
      <n-space justify="space-between" align="center">
        <n-h3 style="margin: 0; font-size: 18px;">{{ title }}</n-h3>
        <n-tag v-if="mode === 'test'" type="info" size="small">
          Вопрос {{ (questionIndex || 0) + 1 }} из {{ totalQuestions || 1 }}
        </n-tag>
      </n-space>
    </template>

    <div class="exercise-content">
      <slot name="content"></slot>
    </div>

    <template #footer v-if="!isAnswered">
      <n-space>
        <slot name="actions">
          <n-button type="primary" @click="handleSubmit" :disabled="!canSubmit">
            Проверить
          </n-button>
        </slot>
      </n-space>
    </template>

    <template v-if="isAnswered">
      <n-divider />
      <n-alert
        :type="isCorrect ? 'success' : 'error'"
        :title="isCorrect ? '✅ Правильно!' : '❌ Неправильно'"
      >
        <slot name="feedback">
          <n-p style="margin: 0;">{{ feedback }}</n-p>
        </slot>
      </n-alert>
      <slot name="after-feedback"></slot>
    </template>
  </n-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { NCard, NH3, NTag, NButton, NSpace, NAlert, NDivider, NP } from 'naive-ui'

interface Props {
  title?: string
  mode?: 'inline' | 'test'
  questionIndex?: number
  totalQuestions?: number
  correctAnswer: any
  feedback?: string
  autoCheck?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'inline',
  questionIndex: 0,
  totalQuestions: 1,
  autoCheck: false
})

const emit = defineEmits<{
  (e: 'submit', payload: { answer: any; isCorrect: boolean }): void
  (e: 'answered', isCorrect: boolean): void
}>()

const isAnswered = ref(false)
const userAnswer = ref<any>(null)

const isCorrect = computed(() => {
  if (userAnswer.value === null || userAnswer.value === undefined) return false
  return JSON.stringify(userAnswer.value) === JSON.stringify(props.correctAnswer)
})

const canSubmit = computed(() => {
  return userAnswer.value !== null && userAnswer.value !== undefined
})

const handleSubmit = () => {
  if (!canSubmit.value || isAnswered.value) return
  isAnswered.value = true
  emit('submit', { answer: userAnswer.value, isCorrect: isCorrect.value })
  emit('answered', isCorrect.value)
}

const setAnswer = (answer: any) => {
  if (isAnswered.value) return
  userAnswer.value = answer
  if (props.autoCheck) {
    setTimeout(() => handleSubmit(), 100)
  }
}

const resetExercise = () => {
  isAnswered.value = false
  userAnswer.value = null
}

defineExpose({
  setAnswer,
  handleSubmit,
  resetExercise,
  isAnswered,
  isCorrect,
})
</script>

<style scoped>
.base-exercise {
  margin: 16px 0;
  transition: all 0.3s ease;
}

.base-exercise.mode-inline {
  border-left: 4px solid var(--n-border-color);
}

.base-exercise.mode-test {
  border-left: 4px solid var(--n-primary-color);
  box-shadow: var(--n-box-shadow);
}

.base-exercise.is-answered {
  border-left-color: var(--n-success-color);
}

.base-exercise :deep(.n-card-header) {
  padding-bottom: 12px;
}

.exercise-content {
  padding: 4px 0;
}
</style>
