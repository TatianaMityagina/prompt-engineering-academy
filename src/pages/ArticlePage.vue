<template>
  <n-card :bordered="true" style="max-width: 900px; margin: 0 auto;">
    <template #header>
      <n-h1>{{ article?.title }}</n-h1>
      <n-p style="font-size: 18px; color: var(--n-text-color-secondary);">
        {{ article?.description }}
      </n-p>
      <n-space size="small" style="margin-top: 12px;">
        <n-tag size="medium">⏱️ 5 мин чтения</n-tag>
        <n-tag size="medium" type="info">📝 {{ plural(article?.exercises?.length || 0, ['упражнение', 'упражнения', 'упражнений']) }}</n-tag>
        <OriginBadge origin="human" />
        <n-button size="small" secondary @click="ui.openAsk()">🔎 Спросить по материалам</n-button>
      </n-space>
    </template>

    <n-divider />

    <template v-for="(block, index) in article?.content" :key="index">
      <template v-if="block.type === 'text'">
        <section v-if="sectionByBlock[index]" :id="sectionByBlock[index].id" class="article-section">
          <n-h3 v-if="hasHeading(sectionByBlock[index])" class="section-title">{{ sectionByBlock[index].title }}</n-h3>
          <n-p class="section-body">{{ sectionByBlock[index].body }}</n-p>
          <ExplainPanel
            :fragment="sectionByBlock[index].body"
            :topic="topicOf(sectionByBlock[index])"
            :route="`/article/${article!.slug}#${sectionByBlock[index].id}`"
          />
        </section>
      </template>

      <div v-else-if="block.type === 'exercise'" class="exercise-wrapper">
        <n-divider dashed />
        <component
          :is="getComponent(block.component || '')"
          v-bind="block.props"
          mode="inline"
          @answered="(ok: boolean) => handleExerciseAnswered(index, ok)"
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
          Начать тест ({{ plural(article?.exercises?.length || 0, ['вопрос', 'вопроса', 'вопросов']) }})
        </n-button>
      </n-card>
    </template>
  </n-card>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useExerciseStore } from '../store/exerciseStore'
import { useLearnerStore } from '../store/learnerStore'
import { useUiStore } from '../store/uiStore'
import { articles } from '../data/articles'
import { scrollToAnchor } from '../utils/anchor'
import { plural } from '../utils/plural'
import { articleSections, articleTopic, exerciseQuestionText, sectionForBlock, type ArticleSection } from '../services/rag/sections'
import { NCard, NH1, NP, NSpace, NTag, NDivider, NH3, NButton } from 'naive-ui'
import MultipleChoice from '../components/exercises/MultipleChoice.vue'
import TrueFalse from '../components/exercises/TrueFalse.vue'
import FillTheBlank from '../components/exercises/FillTheBlank.vue'
import MatchPairs from '../components/exercises/MatchPairs.vue'
import OrderSteps from '../components/exercises/OrderSteps.vue'
import PromptBuilder from '../components/exercises/PromptBuilder.vue'
import ExplainPanel from '../components/ai/ExplainPanel.vue'
import OriginBadge from '../components/ai/OriginBadge.vue'

const route = useRoute()
const router = useRouter()
const exerciseStore = useExerciseStore()
const learner = useLearnerStore()
const ui = useUiStore()

const article = computed(() => {
  return articles.find(a => a.slug === route.params.slug as string)
})

const sections = computed(() => (article.value ? articleSections(article.value) : []))

const sectionByBlock = computed(() => {
  const map: Record<number, ArticleSection> = {}
  for (const s of sections.value) map[s.blockIndexes[0]] = s
  return map
})

const hasHeading = (s: ArticleSection) => s.title !== 'Введение'
const topicOf = (s: ArticleSection) => articleTopic(article.value!, s)

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

const handleExerciseAnswered = (blockIndex: number, isCorrect: boolean) => {
  const a = article.value
  if (!a) return
  const key = `article_${a.id}_progress`
  const saved = localStorage.getItem(key)
  const progress = saved ? JSON.parse(saved) : []
  progress.push(isCorrect)
  localStorage.setItem(key, JSON.stringify(progress))

  const section = sectionForBlock(a, blockIndex)
  const props = a.content[blockIndex]?.props || {}
  learner.recordAnswer({
    source: 'article',
    topic: articleTopic(a, section),
    route: `/article/${a.slug}${section ? `#${section.id}` : ''}`,
    correct: isCorrect,
    question: exerciseQuestionText(props),
  })
}

const startTest = () => {
  if (article.value?.exercises) {
    exerciseStore.startTest(article.value.exercises.length)
    router.push(`/test/${article.value.slug}`)
  }
}

// Время чтения учитывается только при видимой вкладке.
let visibleSince = Date.now()
let accumulated = 0
let trackedSlug = ''

function onVisibility() {
  if (document.hidden) {
    accumulated += (Date.now() - visibleSince) / 1000
  } else {
    visibleSince = Date.now()
  }
}

function flushReading() {
  const a = articles.find(x => x.slug === trackedSlug)
  if (!a) return
  if (!document.hidden) accumulated += (Date.now() - visibleSince) / 1000
  learner.recordReading(a.slug, a.title, Math.min(accumulated, 60 * 60))
  accumulated = 0
  visibleSince = Date.now()
}

function scrollToHash() {
  if (route.hash) scrollToAnchor(route.hash.slice(1))
}

onMounted(() => {
  trackedSlug = article.value?.slug || ''
  document.addEventListener('visibilitychange', onVisibility)
  scrollToHash()
})

watch(() => route.fullPath, (_, oldPath) => {
  if (oldPath && oldPath.split('#')[0] !== route.path) {
    flushReading()
    trackedSlug = article.value?.slug || ''
  }
  scrollToHash()
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisibility)
  flushReading()
})
</script>

<style scoped>
.exercise-wrapper {
  margin: 8px 0;
}

.article-section {
  scroll-margin-top: 80px;
  border-radius: 12px;
  transition: background 0.6s ease;
}

.section-title {
  margin: 8px 0 8px;
}

.section-body {
  font-size: 16px;
  line-height: 1.8;
  white-space: pre-line;
}

.section-flash {
  background: var(--n-primary-color-suppl);
}
</style>
