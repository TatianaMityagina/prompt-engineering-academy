<template>
  <BaseExercise
    :title="title"
    :mode="mode"
    :questionIndex="questionIndex"
    :totalQuestions="totalQuestions"
    :correctAnswer="itemCategory"
    :feedback="feedback"
    ref="exerciseRef"
    @answered="$emit('answered', $event)"
  >
    <template #content>
      <n-p style="margin-bottom: 16px;">{{ prompt }}</n-p>

      <n-space v-if="!exerciseRef?.isAnswered" justify="space-between" align="center" style="margin-bottom: 12px;">
        <n-text strong style="font-size: 14px;">Разложи утверждения по категориям:</n-text>
        <n-tag :type="allPlaced ? 'success' : 'default'" size="small">
          {{ placedCount }} / {{ items.length }}
        </n-tag>
      </n-space>

      <div class="pool" v-if="!exerciseRef?.isAnswered">
        <n-card
          v-for="(item, index) in items"
          :key="index"
          size="small"
          :bordered="true"
          class="cat-item"
          :class="{ 'cat-in-pool': assignment[index] === undefined }"
          @click="removeFromCategory(index)"
        >
          <n-space align="center" size="small">
            <n-tag v-if="assignment[index] !== undefined" size="small" :type="'default'">
              {{ categories[assignment[index]] }}
            </n-tag>
            <span>{{ item }}</span>
          </n-space>
        </n-card>
      </div>

      <n-grid :cols="categoryCols" :x-gap="12" :y-gap="12" responsive="screen" v-if="!exerciseRef?.isAnswered">
        <n-grid-item v-for="(category, catIndex) in categories" :key="catIndex">
          <n-card
            size="small"
            :bordered="true"
            class="cat-column"
            :class="{ 'cat-armed': armedCategory === catIndex }"
            @click="armCategory(catIndex)"
          >
            <template #header>
              <n-space justify="space-between" align="center">
                <n-text strong>{{ category }}</n-text>
                <n-tag size="small">{{ itemsInCategory(catIndex) }}</n-tag>
              </n-space>
            </template>
            <n-space vertical size="small">
              <n-tag
                v-for="(item, index) in itemsInCategoryList(catIndex)"
                :key="index"
                size="small"
                closable
                @close="removeFromCategory(originalIndex(catIndex, index))"
                style="justify-content: space-between;"
              >
                {{ item }}
              </n-tag>
              <n-p v-if="itemsInCategory(catIndex) === 0" style="text-align: center; color: var(--n-text-color-disabled); margin: 8px 0; font-size: 13px;">
                Кликни категорию и выбери элементы
              </n-p>
            </n-space>
          </n-card>
        </n-grid-item>
      </n-grid>

      <n-alert v-if="exerciseRef?.isAnswered && !exerciseRef?.isCorrect" type="error" :show-icon="false" style="margin-top: 12px;">
        <n-p style="margin: 0; font-size: 13px;">Правильное распределение:</n-p>
        <n-p v-for="(catIndex, idx) in itemCategory" :key="idx" style="margin: 2px 0; font-size: 13px;">
          «{{ items[idx] }}» → {{ categories[catIndex] }}
        </n-p>
      </n-alert>
    </template>
  </BaseExercise>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { NCard, NSpace, NTag, NP, NText, NGrid, NGridItem, NAlert } from 'naive-ui'
import BaseExercise from '../base/BaseExercise.vue'

interface Props {
  title?: string
  prompt: string
  categories: string[]
  items: string[]
  itemCategory: number[]
  mode?: 'inline' | 'test'
  questionIndex?: number
  totalQuestions?: number
  feedback?: string
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'inline',
  questionIndex: 0,
  totalQuestions: 1,
})

const categoryCols = computed(() =>
  props.categories.length > 2 ? '1 s:2 l:3' : '1 s:2',
)

defineEmits<{
  (e: 'answered', isCorrect: boolean): void
}>()

const exerciseRef = ref<InstanceType<typeof BaseExercise>>()
const armedCategory = ref<number | null>(null)
const assignment = reactive<Record<number, number>>({})

const placedCount = computed(() => Object.keys(assignment).length)
const allPlaced = computed(() => placedCount.value === props.items.length)

function armCategory(index: number) {
  armedCategory.value = armedCategory.value === index ? null : index
}

function removeFromCategory(itemIndex: number) {
  if (exerciseRef.value?.isAnswered) return
  if (assignment[itemIndex] !== undefined) {
    delete assignment[itemIndex]
  } else if (armedCategory.value !== null) {
    assignment[itemIndex] = armedCategory.value
  }
}

function itemsInCategory(catIndex: number): number {
  return props.items.filter((_, i) => assignment[i] === catIndex).length
}

function itemsInCategoryList(catIndex: number): string[] {
  return props.items.filter((_, i) => assignment[i] === catIndex)
}

function originalIndex(catIndex: number, pos: number): number {
  const indices = props.items.map((_, i) => i).filter(i => assignment[i] === catIndex)
  return indices[pos] ?? 0
}

watch(assignment, () => {
  if (!exerciseRef.value?.isAnswered && allPlaced.value) {
    const result = props.items.map((_, i) => assignment[i] ?? -1)
    exerciseRef.value?.setAnswer(result)
  }
}, { deep: true })
</script>

<style scoped>
.cat-item {
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 6px;
}
.cat-item span {
  flex: 1;
  min-width: 0;
}
.cat-item:hover {
  border-color: var(--n-primary-color);
}
.cat-column {
  cursor: pointer;
  min-height: 120px;
  transition: all 0.2s ease;
}
.cat-column.cat-armed {
  border-color: var(--n-primary-color);
  background: var(--n-primary-color-suppl);
}
.cat-column :deep(.n-tag) {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  height: auto;
  min-height: 28px;
  white-space: normal;
  line-height: 1.35;
  padding-top: 2px;
  padding-bottom: 2px;
}
.cat-column :deep(.n-tag__content) {
  white-space: normal;
  line-height: 1.35;
}
.pool {
  margin-bottom: 16px;
}
</style>
