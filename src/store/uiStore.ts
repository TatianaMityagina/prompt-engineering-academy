import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const askOpen = ref(false)
  const askPrefill = ref('')
  const settingsOpen = ref(false)

  function openAsk(question = '') {
    askPrefill.value = question
    askOpen.value = true
  }

  return { askOpen, askPrefill, settingsOpen, openAsk }
})
