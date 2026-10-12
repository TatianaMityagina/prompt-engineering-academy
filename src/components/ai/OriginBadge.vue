<template>
  <n-tooltip>
    <template #trigger>
      <n-tag :type="meta.type" size="small" :bordered="false" round>{{ meta.label }}</n-tag>
    </template>
    {{ meta.hint }}
  </n-tooltip>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NTag, NTooltip } from 'naive-ui'
import type { ContentOrigin } from '../../services/rag/types'

const props = defineProps<{ origin: ContentOrigin }>()

const meta = computed(() => ({
  human: { label: '👤 Автор курса', type: 'success' as const, hint: 'Написано человеком и проверено' },
  ai: { label: '🤖 ИИ', type: 'info' as const, hint: 'Сгенерировано моделью — проверяйте по источникам' },
  local: { label: '⚙️ Авто', type: 'default' as const, hint: 'Собрано локальным генератором без ИИ' },
}[props.origin]))
</script>
