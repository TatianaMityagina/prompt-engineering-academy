import type { AiSettings } from '../../types/journey'
import { normalizeSettings } from '../ai/provider'
import type { Chunk } from './types'

const CACHE_KEY = 'kj_embeddings_cache'
const BATCH = 64
/** Укороченный вектор text-embedding-3-*: меньше объём кэша. */
const SHORT_DIMENSIONS = 256

type Cache = Record<string, number[]>

let memoryCache: Cache | null = null

function loadCache(): Cache {
  if (memoryCache) return memoryCache
  try {
    memoryCache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') as Cache
  } catch {
    memoryCache = {}
  }
  return memoryCache
}

function saveCache(cache: Cache, liveKeys: Set<string>) {
  for (const key of Object.keys(cache)) if (!liveKeys.has(key)) delete cache[key]
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // localStorage переполнен — кэш остаётся в памяти
  }
}

export function clearEmbeddingCache() {
  memoryCache = {}
  localStorage.removeItem(CACHE_KEY)
}

const cacheKey = (model: string, chunk: Chunk) => `${model}:${chunk.hash}`

export function embeddingsEnabled(settings: AiSettings | null): boolean {
  return !!settings?.embeddingModel?.trim()
}

async function requestEmbeddings(settings: AiSettings, inputs: string[]): Promise<number[][]> {
  const { baseUrl, apiKey } = normalizeSettings(settings)
  const model = settings.embeddingModel!.trim()
  const body: Record<string, unknown> = { model, input: inputs }
  if (model.includes('text-embedding-3')) body.dimensions = SHORT_DIMENSIONS
  const res = await fetch(`${baseUrl}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey.trim() ? { Authorization: `Bearer ${apiKey.trim()}` } : {}),
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Эмбеддинги недоступны (${res.status}): ${text.slice(0, 200)}`)
  }
  const data = await res.json()
  const vectors = (data?.data || []).map((d: { embedding: number[] }) => d.embedding)
  if (vectors.length !== inputs.length) throw new Error('Сервис эмбеддингов вернул неполный ответ.')
  return vectors
}

function round(v: number[]): number[] {
  return v.map(x => Math.round(x * 1e4) / 1e4)
}

/** Векторы вычисляются только для новых и изменённых чанков. */
export async function ensureChunkEmbeddings(settings: AiSettings, chunks: Chunk[]): Promise<Map<string, number[]>> {
  const model = settings.embeddingModel!.trim()
  const cache = loadCache()
  const missing = chunks.filter(c => !cache[cacheKey(model, c)])
  for (let i = 0; i < missing.length; i += BATCH) {
    const batch = missing.slice(i, i + BATCH)
    const vectors = await requestEmbeddings(settings, batch.map(c => `${c.sourceTitle}. ${c.section}\n${c.text}`))
    batch.forEach((c, j) => { cache[cacheKey(model, c)] = round(vectors[j]) })
  }
  const liveKeys = new Set(chunks.map(c => cacheKey(model, c)))
  if (missing.length) saveCache(cache, liveKeys)
  const result = new Map<string, number[]>()
  for (const c of chunks) result.set(c.id, cache[cacheKey(model, c)])
  return result
}

export async function embedQuery(settings: AiSettings, query: string): Promise<number[]> {
  const [v] = await requestEmbeddings(settings, [query])
  return v
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0
  let na = 0
  let nb = 0
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0
}
