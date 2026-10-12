<template>
  <n-space vertical size="large" class="progress-page">
    <n-card class="hero">
      <n-h1 class="hero-title">📈 Мой прогресс</n-h1>
      <n-p class="hero-sub">
        Платформа помнит, что ты прочитал(а) и где ошибался(ась), и подстраивает ассистента,
        объяснения и тренировки под тебя. Все данные хранятся только в этом браузере.
      </n-p>
      <n-grid :cols="'2 s:4'" :x-gap="12" :y-gap="12" responsive="screen" class="totals">
        <n-grid-item><div class="stat"><b>{{ learner.totals.answers }}</b><span>ответов</span></div></n-grid-item>
        <n-grid-item><div class="stat"><b>{{ learner.totals.accuracy }}%</b><span>верно</span></div></n-grid-item>
        <n-grid-item><div class="stat"><b>{{ learner.totals.readArticles }}/{{ articlesCount }}</b><span>статей прочитано</span></div></n-grid-item>
        <n-grid-item><div class="stat"><b>{{ learner.totals.readingMin }}</b><span>мин чтения</span></div></n-grid-item>
      </n-grid>
    </n-card>

    <n-card>
      <template #header>
        <div class="card-head">
          <n-h3 class="card-title">🧠 Где мои слабые места и что дальше?</n-h3>
          <n-button type="primary" :loading="analyzing" @click="runAnalysis">
            {{ analysis ? 'Обновить анализ' : 'Проанализировать' }}
          </n-button>
        </div>
      </template>
      <n-empty v-if="!analysis && !analyzing" description="Нажми «Проанализировать» — ИИ разберёт твои ответы и предложит план." />
      <div v-if="analysis" class="analysis">
        <div class="analysis-meta">
          <OriginBadge :origin="analysis.generatedBy === 'ai' ? 'ai' : 'local'" />
          <n-text v-if="analysis.model" depth="3" class="meta">{{ analysis.model }} ·</n-text>
          <n-text depth="3" class="meta">{{ formatDate(analysis.createdAt) }}</n-text>
        </div>
        <n-alert v-if="analysisWarning" type="warning" :bordered="false" class="warn">{{ analysisWarning }}</n-alert>
        <n-p>{{ analysis.summary }}</n-p>

        <n-grid :cols="'1 m:2'" :x-gap="16" :y-gap="16" responsive="screen">
          <n-grid-item>
            <div class="block-title">Слабые места</div>
            <n-text v-if="!analysis.weakSpots.length" depth="3" class="weak-why">
              Пока не видно: нужно хотя бы несколько ответов в упражнениях или тестах.
            </n-text>
            <div v-for="w in analysis.weakSpots" :key="w.topic" class="weak">
              <div class="weak-topic">
                <router-link v-if="w.route" :to="w.route">{{ w.topic }}</router-link>
                <span v-else>{{ w.topic }}</span>
              </div>
              <n-text depth="3" class="weak-why">{{ w.why }}</n-text>
            </div>
          </n-grid-item>
          <n-grid-item>
            <div class="block-title">План</div>
            <ol class="steps">
              <li v-for="(s, i) in analysis.nextSteps" :key="i">
                <router-link v-if="s.route" :to="s.route">{{ s.action }}</router-link>
                <span v-else>{{ s.action }}</span>
              </li>
            </ol>
            <div v-if="analysis.strengths.length" class="strengths">
              <div class="block-title">Получается хорошо</div>
              <n-space size="small">
                <n-tag v-for="s in analysis.strengths" :key="s" type="success" size="small" :bordered="false">{{ s }}</n-tag>
              </n-space>
            </div>
          </n-grid-item>
        </n-grid>
      </div>
    </n-card>

    <n-card>
      <template #header>
        <div class="card-head">
          <n-h3 class="card-title">🎯 Тренировка по слабым темам</n-h3>
        </div>
      </template>
      <n-p class="muted">
        Соберём текст из статей и Journey по выбранным темам и сгенерируем новое путешествие с таймером.
        Сгенерированное сохранится в «Моих путешествиях» с пометкой авторства.
      </n-p>
      <n-checkbox-group v-model:value="practiceTopics">
        <n-space vertical size="small">
          <n-checkbox v-for="t in practiceCandidates" :key="t.topic" :value="t.topic">
            {{ t.topic }} <n-text depth="3">— освоение {{ t.mastery }}%</n-text>
          </n-checkbox>
        </n-space>
      </n-checkbox-group>
      <n-empty v-if="!practiceCandidates.length" description="Пока нет тем с ответами. Реши пару упражнений в статьях." />
      <n-space style="margin-top: 12px;">
        <n-button type="primary" :disabled="!practiceTopics.length" :loading="generating" @click="runPractice">
          ✨ Сгенерировать тренировку ({{ practiceTopics.length }})
        </n-button>
      </n-space>
      <n-alert v-if="practiceError" type="error" :bordered="false" class="warn">{{ practiceError }}</n-alert>
    </n-card>

    <n-card>
      <template #header><n-h3 class="card-title">📊 Освоение по темам</n-h3></template>
      <n-empty v-if="!sortedStats.length" description="Ответь на упражнения в статьях, тестах или Journey — здесь появится карта знаний." />
      <div v-for="t in sortedStats" :key="t.topic" class="topic-row">
        <div class="topic-line">
          <router-link :to="t.route" class="topic-name">{{ t.topic }}</router-link>
          <n-text depth="3" class="meta">{{ t.correct }}/{{ t.attempts }}</n-text>
        </div>
        <n-progress
          type="line"
          :percentage="t.mastery"
          :status="t.mastery >= 75 ? 'success' : t.mastery >= 60 ? 'default' : 'warning'"
          :height="8"
        />
      </div>
    </n-card>

    <n-card id="notes">
      <template #header><n-h3 class="card-title">📝 Мои ИИ-заметки ({{ learner.data.notes.length }})</n-h3></template>
      <n-p class="muted">
        Сохранённые объяснения и ответы ассистента. Они попадают в поиск с пометкой «🤖 ИИ», а при противоречии
        со статьями ассистент доверяет статьям.
      </n-p>
      <n-empty v-if="!learner.data.notes.length" description="Нажми «💾 В заметки» под объяснением или ответом ассистента." />
      <n-collapse>
        <n-collapse-item v-for="n in learner.data.notes" :key="n.id" :name="n.id">
          <template #header>
            <n-space size="small" align="center">
              <OriginBadge origin="ai" />
              <span>{{ n.title }}</span>
            </n-space>
          </template>
          <template #header-extra>
            <n-text depth="3" class="meta">{{ formatDate(n.createdAt) }}</n-text>
          </template>
          <AiText :text="n.text" />
          <n-space size="small" class="note-actions">
            <n-button size="tiny" @click="$router.push(n.route)">К материалу</n-button>
            <n-button size="tiny" type="error" quaternary @click="learner.deleteNote(n.id)">Удалить</n-button>
            <n-text depth="3" class="meta">{{ n.model }} · источников: {{ n.sourceIds.length }}</n-text>
          </n-space>
        </n-collapse-item>
      </n-collapse>
    </n-card>

    <n-card>
      <template #header><n-h3 class="card-title">🔐 Мои данные</n-h3></template>
      <n-space vertical size="medium">
        <n-space align="center">
          <n-switch :value="learner.data.personalization" @update:value="learner.setPersonalization" />
          <span>Учитывать мой прогресс в ИИ-ответах</span>
        </n-space>
        <div>
          <div class="block-title">Что ИИ узнаёт обо мне (передаётся в промпт, не больше ~900 символов):</div>
          <pre class="context-preview">{{ contextPreview || (learner.data.personalization ? '(пока пусто)' : '(персонализация выключена — ничего)') }}</pre>
        </div>
        <n-p class="muted">
          Индекс знаний: {{ rag.stats.total }} фрагментов — {{ rag.stats.articleSections }} разделов статей,
          {{ rag.stats.articleExercises }} упражнений, {{ rag.stats.journeyItems }} элементов Journey,
          {{ rag.stats.notes }} заметок. Обновляется автоматически при создании Journey или заметки.
        </n-p>
        <n-space wrap>
          <n-button @click="exportData">⬇ Экспорт JSON</n-button>
          <n-popconfirm @positive-click="learner.clearProgress()">
            <template #trigger><n-button>Сбросить статистику</n-button></template>
            Удалить историю ответов, чтения и анализ? Заметки останутся.
          </n-popconfirm>
          <n-popconfirm @positive-click="clearEverything">
            <template #trigger><n-button type="error" secondary>Удалить всё</n-button></template>
            Удалить всю статистику, заметки и кэш эмбеддингов?
          </n-popconfirm>
        </n-space>
      </n-space>
    </n-card>
  </n-space>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  NAlert, NButton, NCard, NCheckbox, NCheckboxGroup, NCollapse, NCollapseItem, NEmpty, NGrid, NGridItem,
  NH1, NH3, NP, NPopconfirm, NProgress, NSpace, NSwitch, NTag, NText,
} from 'naive-ui'
import { articles } from '../data/articles'
import { useAiActions } from '../composables/useAiActions'
import { clearEmbeddingCache } from '../services/rag/embeddings'
import { useLearnerStore } from '../store/learnerStore'
import { useRagStore } from '../store/ragStore'
import AiText from '../components/ai/AiText.vue'
import OriginBadge from '../components/ai/OriginBadge.vue'

const learner = useLearnerStore()
const rag = useRagStore()
const router = useRouter()
const { analyze, generatePractice } = useAiActions()

const articlesCount = articles.length
const analysis = computed(() => learner.data.analysis)
const analyzing = ref(false)
const analysisWarning = ref('')

const sortedStats = computed(() => [...learner.topicStats].sort((a, b) => a.mastery - b.mastery))
const practiceCandidates = computed(() => sortedStats.value.filter(t => t.mastery < 75).slice(0, 6))
const practiceTopics = ref<string[]>(learner.weakTopics.slice(0, 2).map(t => t.topic))
const generating = ref(false)
const practiceError = ref('')

const contextPreview = computed(() => learner.buildContext())

async function runAnalysis() {
  analyzing.value = true
  analysisWarning.value = ''
  try {
    const res = await analyze()
    analysisWarning.value = res.warning ? `ИИ недоступен, показан локальный анализ. ${res.warning}` : ''
  } finally {
    analyzing.value = false
  }
}

async function runPractice() {
  generating.value = true
  practiceError.value = ''
  try {
    const journey = await generatePractice(practiceTopics.value)
    router.push(`/journeys/${journey.id}`)
  } catch (e) {
    practiceError.value = e instanceof Error ? e.message : String(e)
  } finally {
    generating.value = false
  }
}

function exportData() {
  const blob = new Blob([learner.exportJson()], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'prompt-academy-progress.json'
  a.click()
  URL.revokeObjectURL(a.href)
}

function clearEverything() {
  learner.clearAll()
  clearEmbeddingCache()
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.progress-page {
  max-width: 960px;
  margin: 0 auto;
}

.hero {
  background: var(--n-color-embedded);
}

.hero-title {
  margin: 0 0 6px;
}

.hero-sub,
.muted {
  color: var(--n-text-color-secondary);
}

.totals {
  margin-top: 16px;
}

.stat {
  display: flex;
  flex-direction: column;
  padding: 12px;
  border-radius: 12px;
  background: var(--n-color);
  border: 1px solid var(--n-border-color);
}

.stat b {
  font-size: 22px;
}

.stat span {
  font-size: 12px;
  color: var(--n-text-color-secondary);
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.card-title {
  margin: 0;
}

.analysis-meta {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.meta {
  font-size: 12px;
}

.warn {
  margin: 8px 0;
  font-size: 12px;
}

.block-title {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--n-text-color-secondary);
  margin: 8px 0 6px;
}

.weak {
  padding: 8px 0;
  border-bottom: 1px solid var(--n-border-color);
}

.weak-topic {
  font-weight: 600;
}

.weak-why {
  font-size: 13px;
}

.steps {
  margin-left: 20px;
  line-height: 1.8;
}

.strengths {
  margin-top: 8px;
}

.topic-row {
  margin-bottom: 12px;
}

.topic-line {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.topic-name {
  font-size: 14px;
}

.note-actions {
  margin-top: 8px;
  align-items: center;
}

.context-preview {
  white-space: pre-wrap;
  font-family: var(--font-mono);
  font-size: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--n-color-embedded);
  border: 1px solid var(--n-border-color);
}

a {
  color: var(--n-primary-color);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}
</style>
