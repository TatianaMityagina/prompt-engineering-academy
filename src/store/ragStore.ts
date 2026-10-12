import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { articles } from '../data/articles'
import { chunkArticles, chunkJourneys, chunkNotes } from '../services/rag/indexer'
import { buildRetriever, retrieve, type RetrieveOptions } from '../services/rag/retriever'
import type { Chunk, SearchResult } from '../services/rag/types'
import { useJourneyStore } from './journeyStore'
import { useLearnerStore } from './learnerStore'
import { useSettingsStore } from './settingsStore'

/** Индекс пересобирается при изменении Journey и заметок. */
export const useRagStore = defineStore('rag', () => {
  const journeyStore = useJourneyStore()
  const learnerStore = useLearnerStore()
  const settingsStore = useSettingsStore()

  const articleChunks = chunkArticles(articles)

  const chunks = computed<Chunk[]>(() => [
    ...articleChunks,
    ...chunkJourneys(journeyStore.journeys),
    ...chunkNotes(learnerStore.data.notes),
  ])

  const retriever = computed(() => buildRetriever(chunks.value))

  const stats = computed(() => {
    const by = (kind: Chunk['kind']) => chunks.value.filter(c => c.kind === kind).length
    return {
      total: chunks.value.length,
      articleSections: by('article-section'),
      articleExercises: by('article-exercise'),
      journeyItems: by('journey-checkpoint') + by('journey-activity'),
      notes: by('note'),
    }
  })

  const lastMode = ref<SearchResult['mode']>('bm25')

  async function search(query: string, opts: Omit<RetrieveOptions, 'settings'> = {}): Promise<SearchResult> {
    const res = await retrieve(retriever.value, query, {
      ...opts,
      settings: settingsStore.hasAi ? settingsStore.settings : null,
    })
    lastMode.value = res.mode
    return res
  }

  function chunksForRoute(route: string): Chunk[] {
    return chunks.value.filter(c => c.route === route)
  }

  return { chunks, stats, lastMode, search, chunksForRoute }
})
