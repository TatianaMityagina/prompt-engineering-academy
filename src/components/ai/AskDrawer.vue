<template>
  <n-drawer v-model:show="ui.askOpen" :width="drawerWidth" placement="right">
    <n-drawer-content closable :native-scrollbar="false">
      <template #header>
        <div class="ask-header">
          <span>🔎 Спросить по материалам</span>
          <n-tag size="small" :bordered="false">{{ indexLabel }}</n-tag>
        </div>
      </template>

      <form class="ask-form" @submit.prevent="submit()">
        <n-input
          ref="inputRef"
          v-model:value="query"
          type="textarea"
          :autosize="{ minRows: 2, maxRows: 5 }"
          placeholder="Например: что такое галлюцинации и как их распознать?"
          @keydown.enter.exact.prevent="submit()"
        />
        <div class="ask-controls">
          <n-radio-group v-model:value="scope" size="small">
            <n-radio-button value="all">Всё</n-radio-button>
            <n-radio-button value="articles">Статьи</n-radio-button>
            <n-radio-button value="journeys">Journey</n-radio-button>
            <n-radio-button value="notes">Заметки</n-radio-button>
          </n-radio-group>
          <n-button type="primary" attr-type="submit" :loading="loading" :disabled="!query.trim()">
            Спросить
          </n-button>
        </div>
      </form>

      <div v-if="!result && !loading" class="ask-suggestions">
        <n-text depth="3" class="hint">Попробуй:</n-text>
        <n-space size="small">
          <n-button v-for="s in suggestions" :key="s" size="small" secondary round @click="submit(s)">
            {{ s }}
          </n-button>
        </n-space>
        <n-alert v-if="!settings.hasAi" type="info" :bordered="false" class="ask-noai">
          ИИ не подключён: поиск работает локально и покажет самые близкие фрагменты.
          <n-button text type="primary" @click="ui.settingsOpen = true">Подключить модель</n-button>,
          чтобы получать связный ответ с объяснением.
        </n-alert>
      </div>

      <div v-if="loading" class="ask-loading">
        <n-spin size="small" />
        <span>{{ settings.hasAi ? 'Ищу в материалах и формулирую ответ…' : 'Ищу в материалах…' }}</span>
      </div>

      <div v-if="result && !loading" class="ask-result">

        <div v-if="result.personal" class="personal">
          <div class="personal-title">👤 Твой прогресс <n-text depth="3" class="meta-text">— из истории ответов, не ИИ</n-text></div>
          <div v-if="result.personal.mastered.length">
            <b>Уже освоено:</b>
            <ul>
              <li v-for="m in result.personal.mastered" :key="m.topic">
                <a :href="m.route" @click.prevent="openRoute(m.route)">{{ shortTopic(m.topic) }}</a>
              </li>
            </ul>
          </div>
          <div v-if="result.personal.weak.length">
            <b>Стоит повторить:</b>
            <ul>
              <li v-for="w in result.personal.weak" :key="w.topic">
                <a :href="w.route" @click.prevent="openRoute(w.route)">{{ shortTopic(w.topic) }}</a>
                <n-text depth="3" class="meta-text"> — освоение {{ w.mastery }}%</n-text>
              </li>
            </ul>
          </div>
          <div v-if="result.personal.mistakes.length">
            <b>Где ошибался(ась):</b>
            <ul>
              <li v-for="m in result.personal.mistakes" :key="m.question">
                «{{ m.question }}» —
                <a :href="m.route" @click.prevent="openRoute(m.route)">{{ shortTopic(m.topic) }}</a>
              </li>
            </ul>
          </div>
          <div class="personal-title from-materials">📚 Из материалов</div>
        </div>

        <div class="answer-meta">
          <OriginBadge :origin="result.generatedBy === 'ai' ? 'ai' : 'local'" />
          <n-text v-if="result.model" depth="3" class="meta-text">{{ result.model }}</n-text>
          <n-text depth="3" class="meta-text">· поиск: {{ rag.lastMode === 'hybrid' ? 'BM25 + эмбеддинги' : 'BM25' }}</n-text>
          <n-tooltip v-if="result.usedProfile">
            <template #trigger><n-tag size="small" type="warning" :bordered="false">учтён твой прогресс</n-tag></template>
            В запрос к ИИ добавлена краткая сводка о твоих слабых темах. Отключить — на странице «Прогресс».
          </n-tooltip>
        </div>

        <n-alert v-if="result.warning" type="warning" :bordered="false" class="ask-warning">
          {{ result.warning }}
        </n-alert>

        <AiText :text="result.text" @cite="n => sourcesRef?.highlight(n)" />

        <n-space size="small" class="answer-actions">
          <n-button v-if="result.generatedBy === 'ai' && result.sources.length" size="small" :disabled="saved" @click="save">
            {{ saved ? '✓ В заметках' : '💾 Сохранить в заметки' }}
          </n-button>
          <n-button size="small" quaternary @click="reset">Новый вопрос</n-button>
        </n-space>

        <SourceList
          v-if="result.sources.length"
          ref="sourcesRef"
          id-prefix="ask"
          :hits="result.sources"
          :cited="result.cited"
          @navigate="ui.askOpen = false"
        />
      </div>
    </n-drawer-content>
  </n-drawer>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  NAlert, NButton, NDrawer, NDrawerContent, NInput, NRadioButton, NRadioGroup, NSpace, NSpin, NTag, NText, NTooltip,
} from 'naive-ui'
import { useAiActions, type AskScope } from '../../composables/useAiActions'
import { useLearnerStore } from '../../store/learnerStore'
import { useRagStore } from '../../store/ragStore'
import { useSettingsStore } from '../../store/settingsStore'
import { useUiStore } from '../../store/uiStore'
import AiText from './AiText.vue'
import OriginBadge from './OriginBadge.vue'
import SourceList from './SourceList.vue'
import { navigateTo } from '../../utils/anchor'

const ui = useUiStore()
const rag = useRagStore()
const settings = useSettingsStore()
const learner = useLearnerStore()
const { ask } = useAiActions()

const query = ref('')
const scope = ref<AskScope>('all')
const loading = ref(false)
const result = ref<Awaited<ReturnType<typeof ask>> | null>(null)
const shortTopic = (t: string) => t.split('→').pop()!.trim()
const router = useRouter()

function openRoute(route: string) {
  ui.askOpen = false
  navigateTo(router, route)
}
const lastQuestion = ref('')
const saved = ref(false)
const inputRef = ref<InstanceType<typeof NInput> | null>(null)
const sourcesRef = ref<InstanceType<typeof SourceList> | null>(null)

const drawerWidth = computed(() => Math.min(560, window.innerWidth))
const indexLabel = computed(() => `${rag.stats.total} фрагментов в индексе`)

const suggestions = computed(() => {
  const weak = learner.weakTopics.slice(0, 2).map(t => `Объясни: ${t.topic.split('→').pop()!.trim()}`)
  return [...weak, 'Что такое галлюцинации?', 'Как устроен хороший промпт?', 'Почему важен лимит контекста?'].slice(0, 4)
})

watch(() => ui.askOpen, async open => {
  if (!open) return
  if (ui.askPrefill) {
    query.value = ui.askPrefill
    ui.askPrefill = ''
    await submit()
  } else {
    await nextTick()
    inputRef.value?.focus()
    inputRef.value?.select()
  }
})

async function submit(text?: string) {
  if (text) query.value = text
  const q = query.value.trim()
  if (!q || loading.value) return
  loading.value = true
  saved.value = false
  lastQuestion.value = q
  try {
    result.value = await ask(q, scope.value)
  } finally {
    loading.value = false
  }
}

function save() {
  if (!result.value) return
  const top = result.value.sources[0]?.chunk
  learner.addNote({
    kind: 'answer',
    title: lastQuestion.value.slice(0, 80),
    topic: top?.topic || 'Вопрос ассистенту',
    text: result.value.text.replace(/\[\d{1,2}\]/g, ''),
    sourceIds: result.value.sources.map(s => s.chunk.id),
    route: top?.route || '/progress',
    model: result.value.model || '',
  })
  saved.value = true
}

function reset() {
  result.value = null
  query.value = ''
  nextTick(() => inputRef.value?.focus())
}
</script>

<style scoped>
.ask-header {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.ask-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ask-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.ask-suggestions {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.hint,
.meta-text {
  font-size: 12px;
}

.ask-noai {
  margin-top: 8px;
  font-size: 13px;
}

.ask-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 24px;
  color: var(--n-text-color-secondary);
}

.ask-result {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.answer-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.personal {
  padding: 12px 14px;
  border-radius: 10px;
  background: var(--n-success-color-suppl);
  font-size: 14px;
  line-height: 1.6;
}

.personal ul {
  margin: 2px 0 6px 20px;
}

.personal a {
  color: var(--n-primary-color);
}

.personal-title {
  font-weight: 700;
  margin-bottom: 4px;
}

.from-materials {
  margin: 8px -14px -12px;
  padding: 8px 14px;
  background: var(--n-color);
  border-radius: 0 0 10px 10px;
}

.ask-warning {
  font-size: 12px;
}

.answer-actions {
  margin-bottom: 4px;
}
</style>
