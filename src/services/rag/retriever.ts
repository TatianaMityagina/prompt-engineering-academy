import type { AiSettings } from '../../types/journey'
import { Bm25Index } from './bm25'
import { cosine, embedQuery, embeddingsEnabled, ensureChunkEmbeddings } from './embeddings'
import { tokenize } from './tokenize'
import type { Chunk, SearchHit, SearchResult } from './types'

/** Минимальная косинусная близость. */
const MIN_COSINE = 0.3
const RRF_K = 60
/** Минимальная доля от лучшего BM25-скора. */
const MIN_RELATIVE_BM25 = 0.3

export interface RetrieveOptions {
  limit?: number
  settings?: AiSettings | null
  filter?: (chunk: Chunk) => boolean
}

export interface RetrieverState {
  chunks: Chunk[]
  bm25: Bm25Index
}

export function buildRetriever(chunks: Chunk[]): RetrieverState {
  return { chunks, bm25: new Bm25Index(chunks) }
}

export function makeSnippet(text: string, query: string, max = 220): string {
  const terms = new Set(tokenize(query))
  const sentences = text.split(/(?<=[.!?…;])\s+|\n+/).map(s => s.trim()).filter(Boolean)
  let best = sentences[0] || text
  let bestScore = -1
  for (const s of sentences) {
    const score = tokenize(s).filter(t => terms.has(t)).length
    if (score > bestScore) {
      best = s
      bestScore = score
    }
  }
  return best.length > max ? `${best.slice(0, max - 1)}…` : best
}

/** BM25 всегда; при настроенных эмбеддингах — семантический поиск и слияние через RRF. */
export async function retrieve(state: RetrieverState, query: string, opts: RetrieveOptions = {}): Promise<SearchResult> {
  const limit = opts.limit ?? 5
  const allowed = opts.filter ?? (() => true)
  const lexicalRaw = state.bm25.search(query, 30).filter(h => allowed(h.chunk))
  const topLexical = lexicalRaw[0]?.score ?? 0
  const lexical = lexicalRaw.filter(h => h.score >= topLexical * MIN_RELATIVE_BM25)

  let semantic: Array<{ chunk: Chunk; score: number }> = []
  let mode: SearchResult['mode'] = 'bm25'
  if (opts.settings && embeddingsEnabled(opts.settings)) {
    try {
      const candidates = state.chunks.filter(allowed)
      const [vectors, q] = await Promise.all([
        ensureChunkEmbeddings(opts.settings, state.chunks),
        embedQuery(opts.settings, query),
      ])
      semantic = candidates
        .map(chunk => ({ chunk, score: cosine(q, vectors.get(chunk.id) || []) }))
        .filter(s => s.score >= MIN_COSINE)
        .sort((a, b) => b.score - a.score)
        .slice(0, 30)
      mode = 'hybrid'
    } catch (e) {
      console.warn('[rag] эмбеддинги не сработали, остаёмся на BM25', e)
    }
  }

  const fused = new Map<string, { chunk: Chunk; score: number }>()
  const add = (list: Array<{ chunk: Chunk }>) =>
    list.forEach((h, rank) => {
      const prev = fused.get(h.chunk.id)
      const s = 1 / (RRF_K + rank + 1)
      fused.set(h.chunk.id, { chunk: h.chunk, score: (prev?.score ?? 0) + s })
    })
  add(lexical)
  add(semantic)

  const hits: SearchHit[] = [...fused.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(h => ({ ...h, snippet: makeSnippet(h.chunk.text, query) }))

  return { hits, mode }
}
