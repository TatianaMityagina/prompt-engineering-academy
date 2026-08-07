import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AiSettings } from '../types/journey'
import { defaultSettings, isAiConfigured } from '../services/ai/provider'

const STORAGE_KEY = 'kj_ai_settings'

export const useSettingsStore = defineStore('kj-settings', () => {
  const settings = ref<AiSettings>(load())

  const hasAi = computed(() => isAiConfigured(settings.value))

  function load(): AiSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) return JSON.parse(raw)
    } catch {
      // ignore
    }
    return defaultSettings('openai')
  }

  function setProvider(provider: AiSettings['provider']) {
    settings.value = defaultSettings(provider)
  }

  function update(patch: Partial<AiSettings>) {
    settings.value = { ...settings.value, ...patch }
    persist()
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value))
    } catch {
      // ignore
    }
  }

  function clear() {
    settings.value = defaultSettings('openai')
    persist()
  }

  return { settings, hasAi, setProvider, update, clear, persist }
})
