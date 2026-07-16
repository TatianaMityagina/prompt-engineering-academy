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
      <n-p style="margin-bottom: 16px;">Соберите эффективный промпт из блоков в правильном порядке:</n-p>

      <n-grid :cols="2" :x-gap="24">
        <n-grid-item>
          <n-card size="small" style="background: var(--n-color-embedded);">
            <template #header>
              <n-text strong>Доступные блоки:</n-text>
            </template>
            <n-space vertical size="small">
              <n-card
                v-for="(block, index) in availableBlocks"
                :key="index"
                size="small"
                :bordered="true"
                class="block-item"
                :class="{ 'block-used': block.used }"
                @click="addBlock(index)"
              >
                <n-space vertical size="small">
                  <n-tag size="small" type="info">{{ block.type }}</n-tag>
                  <span>{{ block.text }}</span>
                </n-space>
              </n-card>
            </n-space>
          </n-card>
        </n-grid-item>

        <n-grid-item>
          <n-card size="small" style="background: var(--n-color-embedded);">
            <template #header>
              <n-space justify="space-between" align="center">
                <n-text strong>Ваш промпт</n-text>
                <n-tag size="small">{{ builtPrompt.length }} из {{ availableBlocks.length }}</n-tag>
              </n-space>
            </template>
            <div class="drop-zone">
              <n-card
                v-for="(block, index) in builtPrompt"
                :key="index"
                size="small"
                :bordered="true"
                class="built-block"
                @click="removeBlock(index)"
              >
                <n-space justify="space-between" align="center">
                  <span>
                    <n-tag size="small" style="min-width: 24px; text-align: center;">{{ index + 1 }}</n-tag>
                    {{ block.text }}
                  </span>
                  <n-text style="color: var(--n-error-color);">✕</n-text>
                </n-space>
              </n-card>
              <n-p v-if="builtPrompt.length === 0" style="text-align: center; color: var(--n-text-color-disabled); padding: 24px 0;">
                Нажмите на блоки, чтобы добавить их сюда...
              </n-p>
            </div>
          </n-card>
        </n-grid-item>
      </n-grid>

      <n-space v-if="!exerciseRef?.isAnswered" style="margin-top: 12px;">
        <n-button @click="clearPrompt" size="small" quaternary>Очистить</n-button>
      </n-space>
    </template>

    <template #feedback>
      <n-p style="margin: 0;">{{ feedback }}</n-p>
      <n-card v-if="!exerciseRef?.isCorrect && exerciseRef?.isAnswered" size="small" :bordered="true" style="margin-top: 12px; background: var(--n-color-embedded);">
        <n-text strong>Правильный порядок:</n-text>
        <n-ol>
          <n-li v-for="idx in correctAnswer" :key="idx">
            {{ blocks[idx as number]?.text || '' }}
          </n-li>
        </n-ol>
      </n-card>
    </template>
  </BaseExercise>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { NGrid, NGridItem, NSpace, NCard, NTag, NButton, NP, NText, NOl, NLi } from 'naive-ui'
import BaseExercise from '../base/BaseExercise.vue'

interface Block {
  type: string
  text: string
}

interface Props {
  title?: string
  blocks: Block[]
  correctAnswer: number[]
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
const availableBlocks = reactive(
  props.blocks.map((block, index) => ({
    ...block,
    id: index,
    used: false
  }))
)

const builtPrompt = ref<Array<Block & { id: number }>>([])

const addBlock = (index: number) => {
  if (exerciseRef.value?.isAnswered) return
  if (availableBlocks[index].used) return
  availableBlocks[index].used = true
  builtPrompt.value.push({ ...availableBlocks[index] })
}

const removeBlock = (index: number) => {
  if (exerciseRef.value?.isAnswered) return
  const block = builtPrompt.value[index]
  const originalIndex = props.blocks.findIndex(b => b.text === block.text && b.type === block.type)
  if (originalIndex !== -1) {
    availableBlocks[originalIndex].used = false
  }
  builtPrompt.value.splice(index, 1)
}

const clearPrompt = () => {
  builtPrompt.value = []
  availableBlocks.forEach(block => (block.used = false))
}

watch(builtPrompt, () => {
  if (!exerciseRef.value?.isAnswered && builtPrompt.value.length === availableBlocks.length) {
    const userOrder = builtPrompt.value.map(block => {
      return props.blocks.findIndex(b => b.text === block.text && b.type === block.type)
    })
    exerciseRef.value?.setAnswer(userOrder)
  }
}, { deep: true })
</script>

<style scoped>
.block-item {
  cursor: pointer;
  transition: all 0.2s ease;
}

.block-item:hover:not(.block-used) {
  border-color: var(--n-primary-color);
}

.block-item.block-used {
  opacity: 0.4;
  cursor: not-allowed;
}

.drop-zone {
  min-height: 200px;
}

.built-block {
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 4px;
}

.built-block:hover {
  border-color: var(--n-error-color);
  background: var(--n-error-color-suppl);
}

.built-block:last-child {
  margin-bottom: 0;
}
</style>
