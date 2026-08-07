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
      <n-p style="margin-bottom: 16px;">Соедините термины с их определениями:</n-p>

      <n-grid :cols="'1 s:2'" :x-gap="24" :y-gap="12" responsive="screen">
        <n-grid-item>
          <n-space vertical size="small">
            <n-card
              v-for="(item, index) in leftItems"
              :key="index"
              size="small"
              :bordered="true"
              class="match-card"
              :class="{
                'match-selected': selectedLeft === index,
                'match-matched': matchedLeft[index] !== undefined,
                'match-correct': exerciseRef?.isAnswered && matchedLeft[index] !== undefined && matchedLeft[index] === correctAnswer[index],
                'match-incorrect': exerciseRef?.isAnswered && matchedLeft[index] !== undefined && matchedLeft[index] !== correctAnswer[index]
              }"
              @click="selectLeft(index)"
            >
              <n-space justify="space-between" align="center">
                <span class="match-label">{{ index + 1 }}. {{ item }}</span>
                <n-tag v-if="matchedLeft[index] !== undefined" size="small" type="success">
                  → {{ rightItems[matchedLeft[index]] }}
                </n-tag>
              </n-space>
            </n-card>
          </n-space>
        </n-grid-item>

        <n-grid-item>
          <n-space vertical size="small">
            <n-card
              v-for="(item, index) in rightItems"
              :key="index"
              size="small"
              :bordered="true"
              class="match-card"
              :class="{
                'match-selected': selectedRight === index,
                'match-matched': Object.values(matchedLeft).includes(index)
              }"
              @click="selectRight(index)"
            >
              {{ String.fromCharCode(65 + index) }}. {{ item }}
            </n-card>
          </n-space>
        </n-grid-item>
      </n-grid>

      <n-space v-if="!exerciseRef?.isAnswered" style="margin-top: 12px;">
        <n-button @click="clearSelection" size="small" quaternary>Очистить выбор</n-button>
        <n-button @click="resetPairs" size="small" quaternary>Сбросить все</n-button>
      </n-space>
    </template>

    <template #feedback>
      <n-p style="margin: 0;">{{ feedback }}</n-p>
      <n-card v-if="!exerciseRef?.isCorrect && exerciseRef?.isAnswered" size="small" :bordered="true" style="margin-top: 12px; background: var(--n-color-embedded);">
        <n-text strong>Правильные пары:</n-text>
        <n-ul>
          <n-li v-for="(rightIdx, leftIdx) in correctAnswer" :key="leftIdx">
            {{ leftItems[leftIdx] }} ↔ {{ rightItems[rightIdx as number] }}
          </n-li>
        </n-ul>
      </n-card>
    </template>
  </BaseExercise>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { NGrid, NGridItem, NSpace, NCard, NTag, NButton, NP, NText, NUl, NLi } from 'naive-ui'
import BaseExercise from '../base/BaseExercise.vue'

interface Props {
  title?: string
  leftItems: string[]
  rightItems: string[]
  correctAnswer: Record<number, number>
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
const selectedLeft = ref<number | null>(null)
const selectedRight = ref<number | null>(null)
const matchedLeft = reactive<Record<number, number>>({})

const selectLeft = (index: number) => {
  if (exerciseRef.value?.isAnswered) return
  if (matchedLeft[index] !== undefined) {
    delete matchedLeft[index]
    selectedLeft.value = null
    return
  }
  selectedLeft.value = index
  if (selectedRight.value !== null) {
    matchedLeft[index] = selectedRight.value
    selectedLeft.value = null
    selectedRight.value = null
    checkAutoSubmit()
  }
}

const selectRight = (index: number) => {
  if (exerciseRef.value?.isAnswered) return
  for (const leftIdx of Object.keys(matchedLeft)) {
    const leftIdxNum = Number(leftIdx)
    if (matchedLeft[leftIdxNum] === index) {
      delete matchedLeft[leftIdxNum]
      break
    }
  }
  selectedRight.value = index
  if (selectedLeft.value !== null) {
    matchedLeft[selectedLeft.value] = index
    selectedLeft.value = null
    selectedRight.value = null
    checkAutoSubmit()
  }
}

const clearSelection = () => {
  selectedLeft.value = null
  selectedRight.value = null
}

const resetPairs = () => {
  Object.keys(matchedLeft).forEach(key => {
    const keyNum = Number(key)
    delete matchedLeft[keyNum]
  })
  selectedLeft.value = null
  selectedRight.value = null
}

const checkAutoSubmit = () => {
  if (Object.keys(matchedLeft).length === props.leftItems.length) {
    exerciseRef.value?.setAnswer({ ...matchedLeft })
  }
}

watch(matchedLeft, () => {
  if (Object.keys(matchedLeft).length === props.leftItems.length) {
    exerciseRef.value?.setAnswer({ ...matchedLeft })
  }
}, { deep: true })
</script>

<style scoped>
.match-card {
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
}

.match-card .match-label {
  flex: 1;
  min-width: 0;
}

.match-card :deep(.n-tag) {
  max-width: 100%;
  height: auto;
  padding: 2px 8px;
  white-space: normal;
  min-width: 0;
  flex-shrink: 1;
}

.match-card:hover {
  border-color: var(--n-primary-color);
}

.match-selected {
  border-color: var(--n-primary-color);
  background: var(--n-primary-color-suppl);
}

.match-matched {
  opacity: 0.7;
}

.match-correct {
  border-color: var(--n-success-color);
  background: var(--n-success-color-suppl);
}

.match-incorrect {
  border-color: var(--n-error-color);
  background: var(--n-error-color-suppl);
}
</style>
