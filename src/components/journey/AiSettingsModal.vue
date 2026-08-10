<template>
  <n-modal
    :show="show"
    preset="card"
    :title="'⚙️ Генерация через ИИ'"
    style="width: 560px; max-width: 92vw;"
    @update:show="$emit('update:show', $event)"
  >
    <n-p style="margin-bottom: 12px;">
      Knowledge Journey умеет генерировать путешествия через любую OpenAI-совместимую модель
      (OpenAI, OpenRouter, Ollama и др.). Для Ollama и своего сервера ключ не нужен.
      Без настроенного ИИ работает встроенный локальный генератор — он не требует сети.
    </n-p>

    <n-form label-placement="left" label-width="120">
      <n-form-item label="Провайдер">
        <n-select
          :value="settings.provider"
          @update:value="onProviderChange"
          :options="providerOptions"
        />
      </n-form-item>
      <n-form-item label="Base URL">
        <n-input v-model:value="settings.baseUrl" placeholder="https://api.openai.com/v1" />
      </n-form-item>
      <n-form-item label="API Key">
        <n-input
          v-model:value="settings.apiKey"
          type="password"
          show-password-on="click"
          placeholder="sk-…"
        />
      </n-form-item>
      <n-form-item label="Модель">
        <n-input v-model:value="settings.model" placeholder="gpt-4o-mini" />
      </n-form-item>
    </n-form>

    <n-space style="margin-top: 8px;">
      <n-button :loading="testing" @click="runTest" type="primary" secondary>
        Проверить соединение
      </n-button>
      <n-button @click="save">Сохранить</n-button>
    </n-space>

    <n-alert v-if="testResult" :type="testOk ? 'success' : 'error'" style="margin-top: 16px;">
      {{ testResult }}
    </n-alert>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  NModal, NP, NForm, NFormItem, NSelect, NInput, NButton, NSpace, NAlert,
} from 'naive-ui'
import type { AiSettings } from '../../types/journey'
import { useSettingsStore } from '../../store/settingsStore'
import { testConnection } from '../../services/ai/provider'

defineProps<{ show: boolean }>()
const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
}>()

const settingsStore = useSettingsStore()
const settings = ref<AiSettings>({ ...settingsStore.settings })

watch(() => settingsStore.settings, s => {
  settings.value = { ...s }
}, { deep: true })

const providerOptions = [
  { label: 'OpenAI', value: 'openai' },
  { label: 'OpenRouter', value: 'openrouter' },
  { label: 'Ollama (локально)', value: 'ollama' },
  { label: 'Свой сервер', value: 'custom' },
]

const testing = ref(false)
const testResult = ref('')
const testOk = ref(false)

function onProviderChange(provider: AiSettings['provider']) {
  settingsStore.setProvider(provider)
}

async function runTest() {
  testing.value = true
  testResult.value = ''
  try {
    const answer = await testConnection(settings.value)
    testOk.value = true
    testResult.value = `Соединение работает. Ответ модели: ${answer.slice(0, 80)}`
  } catch (e) {
    testOk.value = false
    testResult.value = e instanceof Error ? e.message : String(e)
  } finally {
    testing.value = false
  }
}

function save() {
  settingsStore.update(settings.value)
  emit('update:show', false)
}
</script>
