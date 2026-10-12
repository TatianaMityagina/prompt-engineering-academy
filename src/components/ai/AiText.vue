<template>
  <!-- HTML собирается из экранированного текста -->
  <div class="ai-text" v-html="html" @click="onClick" />
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ text: string }>()
const emit = defineEmits<{ (e: 'cite', n: number): void }>()

function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function inline(s: string): string {
  return escape(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|\s)_(.+?)_(?=\s|$)/g, '$1<em>$2</em>')
    .replace(/\[(\d{1,2})\]/g, '<button type="button" class="cite" data-cite="$1">$1</button>')
}

/** Подмножество markdown: абзацы, списки, **жирный**, _курсив_, цитаты [n]. */
const html = computed(() => {
  const out: string[] = []
  let list: string[] = []
  const flush = () => {
    if (list.length) out.push(`<ul>${list.map(li => `<li>${li}</li>`).join('')}</ul>`)
    list = []
  }
  for (const line of props.text.split('\n')) {
    const m = line.match(/^\s*(?:[-•*]|\d+[.)])\s+(.*)$/)
    if (m) {
      list.push(inline(m[1]))
    } else if (line.trim()) {
      flush()
      out.push(`<p>${inline(line.trim().replace(/^#+\s*/, ''))}</p>`)
    } else {
      flush()
    }
  }
  flush()
  return out.join('')
})

function onClick(e: MouseEvent) {
  const el = (e.target as HTMLElement).closest('[data-cite]') as HTMLElement | null
  if (el) emit('cite', Number(el.dataset.cite))
}
</script>

<style scoped>
.ai-text :deep(p) {
  margin: 0 0 8px;
  line-height: 1.65;
}

.ai-text :deep(ul) {
  margin: 0 0 8px 20px;
  line-height: 1.6;
}

.ai-text :deep(.cite) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  margin: 0 1px;
  border: none;
  border-radius: 9px;
  background: var(--n-primary-color-suppl);
  color: var(--n-primary-color);
  font-size: 11px;
  font-weight: 700;
  vertical-align: super;
  cursor: pointer;
}

.ai-text :deep(.cite:hover) {
  background: var(--n-primary-color);
  color: #fff;
}
</style>
