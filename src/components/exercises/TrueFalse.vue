<template>
  <BaseExercise
    :title="title"
    :mode="mode"
    :questionIndex="questionIndex"
    :totalQuestions="totalQuestions"
    :correctAnswer="correctAnswer"
    :feedback="feedback"
    ref="exerciseRef"
    @answered="$emit('answered', $event)"
  >
    <template #content>
      <n-card size="small" style="background: var(--n-color-embedded); border-left: 4px solid var(--n-primary-color); margin-bottom: 16px;">
        <n-p style="margin: 0; font-size: 16px;">{{ statement }}</n-p>
      </n-card>
      <n-space size="large">
        <n-button
          :type="selectedOption === true ? 'primary' : 'default'"
          @click="handleSelect(true)"
          :disabled="exerciseRef?.isAnswered"
          size="large"
          style="min-width: 120px;"
        >
          ✅ Верно
        </n-button>
        <n-button
          :type="selectedOption === false ? 'error' : 'default'"
          @click="handleSelect(false)"
          :disabled="exerciseRef?.isAnswered"
          size="large"
          style="min-width: 120px;"
        >
          ❌ Неверно
        </n-button>
      </n-space>
    </template>

    <template #feedback>
      <n-p style="margin: 0;">{{ feedback }}</n-p>
      <n-p v-if="!exerciseRef?.isCorrect && exerciseRef?.isAnswered" style="margin-top: 8px;">
        <n-text strong>Правильный ответ:</n-text> {{ correctAnswer ? 'Верно' : 'Неверно' }}
      </n-p>
    </template>
  </BaseExercise>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NCard, NP, NText, NButton, NSpace } from 'naive-ui'
import BaseExercise from '../base/BaseExercise.vue'

interface Props {
  title?: string
  statement: string
  correctAnswer: boolean
  mode?: 'inline' | 'test'
  questionIndex?: number
  totalQuestions?: number
  feedback?: string
}

withDefaults(defineProps<Props>(), {
  mode: 'inline',
  questionIndex: 0,
  totalQuestions: 1
})

defineEmits<{
  (e: 'answered', isCorrect: boolean): void
}>()

const exerciseRef = ref<InstanceType<typeof BaseExercise>>()
const selectedOption = ref<boolean | null>(null)

const handleSelect = (value: boolean) => {
  if (!exerciseRef.value?.isAnswered) {
    selectedOption.value = value
    exerciseRef.value?.setAnswer(value)
  }
}
</script>
