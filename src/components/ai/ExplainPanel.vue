<template>
  <div class="explain">
    <n-space size="small" class="explain-actions">
      <n-button size="small" secondary type="primary" :loading="loading" @click="run">
        💡 {{ result ? 'Объяснить иначе' : 'Объясни проще' }}
      </n-button>
      <n-button size="small" quaternary @click="ui.openAsk(`Как «${shortTopic}» связано с другими темами?`)">
        🔗 Связи с другими темами
      </n-button>
    </n-space>

    <transition name="fade">
      <div v-if="result" class="explain-card">
        <div class="explain-meta">
          <OriginBadge :origin="result.generatedBy === 'ai' ? 'ai' : 'local'" />
          <n-text v-if="result.model" depth="3" class="meta">{{ result.model }}</n-text>
          <span class="spacer" />
          <n-button v-if="result.generatedBy === 'ai'" size="tiny" quaternary :disabled="saved" @click="save">
            {{ saved ? '✓ Сохранено' : '💾 В заметки' }}
          </n-button>
          <n-button size="tiny" quaternary @click="result = null">Скрыть</n-button>
        </div>
        <n-alert v-if="result.warning" type="warning" :bordered="false" class="warn">{{ result.warning }}</n-alert>
        <AiText :text="result.text" @cite="n => sourcesRef?.highlight(n)" />
        <n-collapse v-if="result.sources.length" class="explain-sources">
          <n-collapse-item :title="`Источники (${result.sources.length})`" name="src">
            <SourceList ref="sourcesRef" :id-prefix="`ex-${uid}`" :hits="result.sources" :cited="result.cited" />
          </n-collapse-item>
        </n-collapse>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { NAlert, NButton, NCollapse, NCollapseItem, NSpace, NText } from 'naive-ui'
import { useAiActions } from '../../composables/useAiActions'
import type { AiResult } from '../../services/ai/actions'
import { useLearnerStore } from '../../store/learnerStore'
import { useUiStore } from '../../store/uiStore'
import AiText from './AiText.vue'
import OriginBadge from './OriginBadge.vue'
import SourceList from './SourceList.vue'

const props = defineProps<{ fragment: string; topic: string; route: string }>()

const { explain } = useAiActions()
const learner = useLearnerStore()
const ui = useUiStore()

const uid = Math.random().toString(36).slice(2, 7)
const loading = ref(false)
const saved = ref(false)
const result = ref<AiResult | null>(null)
const sourcesRef = ref<InstanceType<typeof SourceList> | null>(null)

const shortTopic = computed(() => props.topic.split('→').pop()!.trim())

async function run() {
  loading.value = true
  saved.value = false
  try {
    result.value = await explain(props.fragment, props.topic, props.route)
  } finally {
    loading.value = false
  }
}

function save() {
  if (!result.value) return
  learner.addNote({
    kind: 'explanation',
    title: `Просто о: ${shortTopic.value}`,
    topic: props.topic,
    text: result.value.text.replace(/\[\d{1,2}\]/g, ''),
    sourceIds: result.value.sources.map(s => s.chunk.id),
    route: props.route,
    model: result.value.model || '',
  })
  saved.value = true
}
</script>

<style scoped>
.explain {
  margin: 4px 0 16px;
}

.explain-card {
  margin-top: 10px;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--n-color-embedded);
  border: 1px dashed var(--n-primary-color);
}

.explain-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.spacer {
  flex: 1;
}

.meta {
  font-size: 12px;
}

.warn {
  margin-bottom: 8px;
  font-size: 12px;
}

.explain-sources {
  margin-top: 8px;
}
</style>
