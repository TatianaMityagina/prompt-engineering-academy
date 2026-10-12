export type ChunkKind =
  | 'article-section'
  | 'article-exercise'
  | 'journey-checkpoint'
  | 'journey-activity'
  | 'note'

export type ContentOrigin = 'human' | 'ai' | 'local'

export interface Chunk {
  id: string
  kind: ChunkKind
  origin: ContentOrigin
  sourceTitle: string
  section: string
  /** Ключ темы в персональной статистике */
  topic: string
  text: string
  route: string
  /** Ключ кэша эмбеддингов */
  hash: string
}

export interface SearchHit {
  chunk: Chunk
  score: number
  snippet: string
}

export type SearchMode = 'bm25' | 'hybrid'

export interface SearchResult {
  hits: SearchHit[]
  mode: SearchMode
}
