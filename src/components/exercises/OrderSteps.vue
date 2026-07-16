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
      <n-p style="margin-bottom: 16px;">Расставьте шаги в правильном порядке:</n-p>

      <n-space vertical size="small">
        <n-card
          v-for="(step, index) in shuffledSteps"
          :key="step.id"
          size="small"
          :bordered="true"
          class="step-card"
          :class="{
            'is-dragging': dragIndex === index,
            'is-over': dropIndex === index
          }"
          draggable="true"
          @dragstart="handleDragStart(index, $event)"
          @dragend="handleDragEnd"
          @dragover="handleDragOver($event)"
          @dragenter="handleDragEnter(index)"
          @drop="handleDrop(index)"
        >
          <n-space justify="space-between" align="center">
            <span>
              <n-tag size="small" style="min-width: 24px; text-align: center;">{{ index + 1 }}</n-tag>
              {{ step.text }}
            </span>
            <span style="color: var(--n-text-color-disabled);">⠿</span>
          </n-space>
        </n-card>
      </n-space>
    </template>

    <template #feedback>
      <n-p style="margin: 0;">{{ feedback }}</n-p>
      <n-card v-if="!exerciseRef?.isCorrect && exerciseRef?.isAnswered" size="small" :bordered="true" style="margin-top: 12px; background: var(--n-color-embedded);">
        <n-text strong>Правильный порядок:</n-text>
        <n-ol>
          <n-li v-for="(item, idx) in correctOrder" :key="idx">{{ item }}</n-li>
        </n-ol>
      </n-card>
    </template>
  </BaseExercise>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { NSpace, NCard, NTag, NP, NText, NOl, NLi } from 'naive-ui'
import BaseExercise from '../base/BaseExercise.vue'

interface Props {
  title?: string
  steps: string[]
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
const shuffledSteps = ref<Array<{ id: number; text: string }>>([])
const dragIndex = ref<number | null>(null)
const dropIndex = ref<number | null>(null)
const correctOrder = ref<string[]>([])

const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

onMounted(() => {
  correctOrder.value = [...props.steps]
  const stepsWithId = props.steps.map((text, index) => ({ id: index, text }))
  shuffledSteps.value = shuffleArray(stepsWithId)
})

const handleDragStart = (index: number, event: DragEvent) => {
  if (exerciseRef.value?.isAnswered) return
  dragIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
}

const handleDragEnd = () => {
  dragIndex.value = null
  dropIndex.value = null
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

const handleDragEnter = (index: number) => {
  dropIndex.value = index
}

const handleDrop = (targetIndex: number) => {
  if (exerciseRef.value?.isAnswered) return
  const sourceIndex = dragIndex.value
  if (sourceIndex === null || sourceIndex === targetIndex) return
  const [removed] = shuffledSteps.value.splice(sourceIndex, 1)
  shuffledSteps.value.splice(targetIndex, 0, removed)
  dragIndex.value = null
  dropIndex.value = null
}

watch(shuffledSteps, () => {
  if (!exerciseRef.value?.isAnswered) {
    const userOrder = shuffledSteps.value.map(item => item.text)
    if (userOrder.length === props.steps.length) {
      exerciseRef.value?.setAnswer(userOrder)
    }
  }
}, { deep: true })
</script>

<style scoped>
.step-card {
  cursor: move;
  transition: all 0.2s ease;
}

.step-card:hover {
  border-color: var(--n-primary-color);
}

.step-card.is-dragging {
  opacity: 0.5;
}

.step-card.is-over {
  border-color: var(--n-primary-color);
  background: var(--n-primary-color-suppl);
}
</style>
