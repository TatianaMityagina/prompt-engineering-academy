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
      <n-p v-if="context" depth="3" style="margin-bottom: 16px;">{{ context }}</n-p>
      <div class="blank-container">
        <template v-for="(part, index) in parts" :key="index">
          <n-input
            v-if="part.isBlank"
            v-model:value="blankAnswers[getBlankIndex(index)]"
            :placeholder="`Введите слово ${getBlankIndex(index) + 1}`"
            size="medium"
            :disabled="exerciseRef?.isAnswered"
            @update:value="onInputChange"
            style="width: 160px; display: inline-block; margin: 0 4px;"
          />
          <span v-else class="text-part">{{ part.text }}</span>
        </template>
      </div>
    </template>

    <template #feedback>
      <n-p style="margin: 0;">{{ feedback }}</n-p>
      <n-card v-if="!exerciseRef?.isCorrect && exerciseRef?.isAnswered" size="small" :bordered="true" style="margin-top: 12px; background: var(--n-color-embedded);">
        <n-text strong>Правильные ответы:</n-text>
        <n-ul>
          <n-li v-for="(answer, idx) in correctAnswer" :key="idx">
            Пропуск {{ idx + 1 }}: <n-text strong>{{ answer }}</n-text>
          </n-li>
        </n-ul>
      </n-card>
    </template>
  </BaseExercise>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { NInput, NP, NText, NCard, NUl, NLi } from 'naive-ui'
import BaseExercise from '../base/BaseExercise.vue'

interface Part {
  text?: string
  isBlank?: boolean
}

interface Props {
  title?: string
  context?: string
  parts: Part[]
  correctAnswer: string[]
  mode?: 'inline' | 'test'
  questionIndex?: number
  totalQuestions?: number
  feedback?: string
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'inline',
  questionIndex: 0,
  totalQuestions: 1
})

defineEmits<{
  (e: 'answered', isCorrect: boolean): void
}>()

const exerciseRef = ref<InstanceType<typeof BaseExercise>>()
const blankAnswers = ref<string[]>([])

const getBlankIndex = (partIndex: number): number => {
  let blankCount = 0
  for (let i = 0; i < partIndex; i++) {
    if (props.parts[i]?.isBlank) {
      blankCount++
    }
  }
  return blankCount
}

const initBlanks = () => {
  const blankCount = props.parts.filter(p => p.isBlank).length
  blankAnswers.value = new Array(blankCount).fill('')
}

const onInputChange = () => {
  if (exerciseRef.value?.isAnswered) return
  const allFilled = blankAnswers.value.every(answer => answer && answer.trim() !== '')
  if (allFilled) {
    exerciseRef.value?.setAnswer([...blankAnswers.value])
  }
}

watch(() => props.correctAnswer, () => initBlanks(), { immediate: true })
onMounted(() => initBlanks())
</script>

<style scoped>
.blank-container {
  line-height: 2.8;
  font-size: 16px;
}
.text-part {
  display: inline;
}
</style>
