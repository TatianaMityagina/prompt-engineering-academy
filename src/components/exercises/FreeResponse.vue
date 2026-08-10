<template>
  <n-card class="free-response-card" :bordered="true">
    <template v-if="title" #header>
      <n-h3 style="margin: 0; font-size: 18px;">{{ title }}</n-h3>
    </template>

    <n-p style="font-weight: 500; margin-bottom: 12px;">{{ prompt }}</n-p>
    <n-p v-if="context" depth="3" style="font-size: 14px; margin-bottom: 12px;">{{ context }}</n-p>

    <n-input
      type="textarea"
      :value="text"
      @update:value="(v: string) => (text = v)"
      :placeholder="placeholder"
      :rows="6"
      :disabled="evaluating"
      :maxlength="1200"
      :autosize="{ minRows: 5, maxRows: 10 }"
      style="margin-bottom: 8px;"
    />
    <n-space justify="space-between" align="center">
      <n-text style="font-size: 12px;" :style="text.length >= 20 ? '' : 'color: var(--n-error-color);'">
        {{ text.length }} символов{{ text.length < 20 ? ' — напиши развёрнутый ответ' : '' }}
      </n-text>
      <n-button
        type="primary"
        :loading="evaluating"
        :disabled="text.trim().length < 20 || evaluating"
        @click="emitSubmit"
      >
        {{ evaluating ? 'Оцениваем…' : 'Проверить ответ' }}
      </n-button>
    </n-space>
  </n-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NCard, NH3, NP, NInput, NButton, NSpace, NText } from 'naive-ui'

interface Props {
  title?: string
  prompt: string
  context?: string
  responseType: string
  evaluating?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  evaluating: false,
})

const emit = defineEmits<{
  (e: 'submit', text: string): void
}>()

const PLACEHOLDERS: Record<string, string> = {
  ExplainLikeImFive: 'Представь, что объясняешь ребёнку…',
  TeachBack: 'Как бы ты объяснил это другу?',
  GiveYourExample: 'Приведи пример из жизни, работы или учёбы…',
  FindTheConnection: 'Опиши связь между понятиями…',
  PredictTheOutcome: 'Опиши, что произойдёт и почему…',
}

const text = ref('')
const placeholder = PLACEHOLDERS[props.responseType] || 'Напиши развёрнутый ответ своими словами…'

function emitSubmit() {
  if (text.value.trim().length < 20 || props.evaluating) return
  emit('submit', text.value.trim())
}
</script>

<style scoped>
.free-response-card {
  border-left: 4px solid var(--n-primary-color);
  box-shadow: var(--n-box-shadow);
}
</style>
