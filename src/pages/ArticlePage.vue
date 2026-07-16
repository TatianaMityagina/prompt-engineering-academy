<template>
  <n-card :bordered="true" style="max-width: 900px; margin: 0 auto;">
    <template #header>
      <n-h1>{{ article?.title }}</n-h1>
      <n-p style="font-size: 18px; color: var(--n-text-color-secondary);">
        {{ article?.description }}
      </n-p>
      <n-space size="small" style="margin-top: 12px;">
        <n-tag size="medium">⏱️ 5 мин чтения</n-tag>
        <n-tag size="medium" type="info">📝 {{ article?.exercises?.length || 0 }} упражнений</n-tag>
      </n-space>
    </template>

    <n-divider />

    <template v-for="(block, index) in article?.content" :key="index">
      <n-p v-if="block.type === 'text'" style="font-size: 16px; line-height: 1.8;">
        {{ block.content }}
      </n-p>

      <div v-else-if="block.type === 'exercise'" class="exercise-wrapper">
        <n-divider dashed />
        <component
          :is="getComponent(block.component || '')"
          v-bind="block.props"
          mode="inline"
          @answered="handleExerciseAnswered"
        />
      </div>
    </template>

    <template #footer>
      <n-divider />
      <n-card style="text-align: center; background: var(--n-color-embedded);">
        <n-h3>🎯 Проверьте свои знания</n-h3>
        <n-p style="color: var(--n-text-color-secondary);">
          Пройдите тест по этой статье, чтобы закрепить материал
        </n-p>
        <n-button
          type="primary"
          size="large"
          @click="startTest"
          style="margin-top: 12px;"
        >
          Начать тест ({{ article?.exercises?.length || 0 }} вопросов)
        </n-button>
      </n-card>
    </template>
  </n-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useExerciseStore } from '../store/exerciseStore'
import { articles } from '../data/articles'
import { NCard, NH1, NP, NSpace, NTag, NDivider, NH3, NButton } from 'naive-ui'
import MultipleChoice from '../components/exercises/MultipleChoice.vue'
import TrueFalse from '../components/exercises/TrueFalse.vue'
import FillTheBlank from '../components/exercises/FillTheBlank.vue'
import MatchPairs from '../components/exercises/MatchPairs.vue'
import OrderSteps from '../components/exercises/OrderSteps.vue'
import PromptBuilder from '../components/exercises/PromptBuilder.vue'

const route = useRoute()
const router = useRouter()
const exerciseStore = useExerciseStore()

const article = computed(() => {
  return articles.find(a => a.slug === route.params.slug as string)
})

const getComponent = (name: string) => {
  const components: Record<string, any> = {
    MultipleChoice,
    TrueFalse,
    FillTheBlank,
    MatchPairs,
    OrderSteps,
    PromptBuilder,
  }
  return components[name] || null
}

const handleExerciseAnswered = (isCorrect: boolean) => {
  const key = `article_${article.value?.id}_progress`
  const saved = localStorage.getItem(key)
  const progress = saved ? JSON.parse(saved) : []
  progress.push(isCorrect)
  localStorage.setItem(key, JSON.stringify(progress))
}

const startTest = () => {
  if (article.value?.exercises) {
    exerciseStore.startTest(article.value.exercises.length)
    router.push(`/test/${article.value.slug}`)
  }
}
</script>

<style scoped>
.exercise-wrapper {
  margin: 8px 0;
}
</style>
