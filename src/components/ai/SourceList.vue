<template>
  <div class="sources">
    <div class="sources-title">Источники</div>
    <div
      v-for="(hit, i) in hits"
      :key="hit.chunk.id"
      :id="`${idPrefix}-src-${i + 1}`"
      class="source"
      :class="{ cited: cited.includes(i + 1), flash: flashed === i + 1 }"
      @click="go(hit.chunk.route)"
    >
      <div class="source-head">
        <span class="source-num">{{ i + 1 }}</span>
        <span class="source-title">{{ hit.chunk.sourceTitle }} → {{ hit.chunk.section }}</span>
      </div>
      <div class="source-snippet">{{ hit.snippet }}</div>
      <n-space size="small" align="center">
        <OriginBadge :origin="hit.chunk.origin" />
        <n-text depth="3" class="source-kind">{{ KIND_LABEL[hit.chunk.kind] }}</n-text>
      </n-space>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { NSpace, NText } from 'naive-ui'
import type { ChunkKind, SearchHit } from '../../services/rag/types'
import OriginBadge from './OriginBadge.vue'
import { navigateTo } from '../../utils/anchor'

const props = withDefaults(defineProps<{ hits: SearchHit[]; cited?: number[]; idPrefix?: string }>(), {
  cited: () => [],
  idPrefix: 'ai',
})
const emit = defineEmits<{ (e: 'navigate'): void }>()
const router = useRouter()

const KIND_LABEL: Record<ChunkKind, string> = {
  'article-section': 'раздел статьи',
  'article-exercise': 'упражнение',
  'journey-checkpoint': 'чекпоинт Journey',
  'journey-activity': 'вопрос Journey',
  note: 'сохранённая заметка',
}

const flashed = ref(0)

function highlight(n: number) {
  document.getElementById(`${props.idPrefix}-src-${n}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  flashed.value = n
  setTimeout(() => { flashed.value = 0 }, 1200)
}

function go(route: string) {
  emit('navigate')
  navigateTo(router, route)
}

defineExpose({ highlight })
</script>

<style scoped>
.sources {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sources-title {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--n-text-color-secondary);
}

.source {
  padding: 10px 12px;
  border: 1px solid var(--n-border-color);
  border-radius: 10px;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}

.source:hover {
  border-color: var(--n-primary-color);
}

.source.cited {
  border-left: 3px solid var(--n-primary-color);
}

.source.flash {
  background: var(--n-primary-color-suppl);
}

.source-head {
  display: flex;
  gap: 8px;
  align-items: baseline;
  margin-bottom: 4px;
}

.source-num {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  color: var(--n-primary-color);
}

.source-title {
  font-weight: 600;
  font-size: 13px;
}

.source-snippet {
  font-size: 13px;
  line-height: 1.5;
  color: var(--n-text-color-secondary);
  margin-bottom: 6px;
}

.source-kind {
  font-size: 12px;
}
</style>
