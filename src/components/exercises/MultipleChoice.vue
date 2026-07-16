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
      <n-p style="font-weight: 500; margin-bottom: 16px;">{{ question }}</n-p>
      <n-radio-group
        v-model:value="selectedOption"
        @update:value="handleOptionSelect"
        :disabled="exerciseRef?.isAnswered"
      >
        <n-space vertical size="small">
          <n-radio
            v-for="(option, index) in options"
            :key="index"
            :value="index"
            :disabled="exerciseRef?.isAnswered"
            size="large"
          >
            {{ option }}
          </n-radio>
        </n-space>
      </n-radio-group>
    </template>

    <template #feedback>
      <n-p style="margin: 0;">{{ feedback }}</n-p>
      <n-p v-if="!exerciseRef?.isCorrect && exerciseRef?.isAnswered" style="margin-top: 8px;">
        <n-text strong>Правильный ответ:</n-text> {{ options[correctAnswer as number] }}
      </n-p>
    </template>
  </BaseExercise>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NRadioGroup, NRadio, NSpace, NP, NText } from 'naive-ui'
import BaseExercise from '../base/BaseExercise.vue'

interface Props {
  title?: string
  question: string
  options: string[]
  correctAnswer: number
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
const selectedOption = ref<number | null>(null)

const handleOptionSelect = (value: number) => {
  if (!exerciseRef.value?.isAnswered) {
    exerciseRef.value?.setAnswer(value)
  }
}
</script>
