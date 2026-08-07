<template>
  <n-card :bordered="true" class="journey-page">
    <template #header>
      <n-h2 style="margin: 0;">✨ Создание путешествия по знаниям</n-h2>
      <n-p class="page-subtitle">
        Вставь учебный текст — система разложит его на концепции и соберёт путешествие с проверкой понимания.
      </n-p>
    </template>

    <n-form label-placement="top">
      <n-form-item label="Тема (необязательно)">
        <n-input v-model:value="topic" placeholder="Например: Нейронные сети" size="large" />
      </n-form-item>

      <n-form-item label="Учебный материал">
        <n-input
          v-model:value="text"
          type="textarea"
          :rows="10"
          :autosize="{ minRows: 8, maxRows: 16 }"
          placeholder="Вставь сюда текст статьи, лекции или конспекта (минимум ~200 символов)…"
        />
        <n-text class="char-counter">
          {{ text.length }} символов · текст разбивается на чекпоинты, для каждого генерируются проверочные активности
        </n-text>
      </n-form-item>

      <n-form-item label="Нарратив">
        <n-radio-group v-model:value="narrativeType">
          <n-space vertical size="small">
            <n-radio v-for="opt in narrativeOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </n-radio>
          </n-space>
        </n-radio-group>
      </n-form-item>
    </n-form>

    <div class="form-actions">
      <n-space align="center" size="small" wrap>
        <n-tag v-if="settingsStore.hasAi" type="success" size="small">🤖 ИИ подключён</n-tag>
        <n-tag v-else type="warning" size="small">Локальный генератор</n-tag>
        <n-button quaternary size="small" @click="settingsModal = true">⚙️ Настройки ИИ</n-button>
      </n-space>
      <n-button
        type="primary"
        size="large"
        class="generate-button"
        :loading="generating"
        :disabled="text.trim().length < 200"
        @click="generate"
      >
        🧭 Сгенерировать путешествие
      </n-button>
    </div>

    <n-alert v-if="error" type="error" class="section-gap">{{ error }}</n-alert>

    <n-card v-if="generating" size="small" class="section-gap">
      <n-space align="center">
        <n-spin size="small" />
        <n-text>{{ generatingStep }}</n-text>
      </n-space>
    </n-card>

    <AiSettingsModal v-model:show="settingsModal" />
  </n-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  NCard, NH2, NP, NForm, NFormItem, NInput, NRadioGroup, NRadio, NSpace,
  NButton, NTag, NAlert, NText, NSpin,
} from 'naive-ui'
import type { NarrativeType } from '../../types/journey'
import { useSettingsStore } from '../../store/settingsStore'
import { useJourneyStore } from '../../store/journeyStore'
import { generateJourney } from '../../services/journeyService'
import { NARRATIVE_LABELS } from '../../services/ai/prompts'
import AiSettingsModal from '../../components/journey/AiSettingsModal.vue'

const router = useRouter()
const settingsStore = useSettingsStore()
const journeyStore = useJourneyStore()

const topic = ref('')
const text = ref('')
const narrativeType = ref<NarrativeType>('startup')
const generating = ref(false)
const generatingStep = ref('')
const error = ref('')
const settingsModal = ref(false)

const narrativeOptions = (Object.keys(NARRATIVE_LABELS) as NarrativeType[]).map(value => ({
  value,
  label: NARRATIVE_LABELS[value],
}))

async function generate() {
  error.value = ''
  generating.value = true
  generatingStep.value = 'Анализируем материал и раскладываем его на концепции…'
  try {
    const journey = await generateJourney({
      topic: topic.value,
      text: text.value,
      narrativeType: narrativeType.value,
      settings: settingsStore.settings,
    })
    journeyStore.addJourney(journey)
    router.push(`/journeys/${journey.id}`)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    generating.value = false
  }
}
</script>

<style scoped>
.page-subtitle {
  margin: 8px 0 0;
  color: var(--n-text-color-secondary);
}

.char-counter {
  font-size: 12px;
  color: var(--n-text-color-secondary);
  margin-top: 4px;
  margin-left: 12px;
}

:deep(.n-input) {
  width: 100%;
}

.form-actions {
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.generate-button {
  flex-shrink: 0;
}

@media (max-width: 640px) {
  .form-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .generate-button {
    width: 100%;
  }

  :deep(.n-form-item-blank) {
    flex-direction: column;
  }
}

.section-gap {
  margin-top: 16px;
}
</style>
