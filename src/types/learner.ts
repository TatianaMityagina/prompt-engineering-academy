export interface AnswerEvent {
  ts: number
  source: 'article' | 'test' | 'journey'
  /** «Статья → Секция» или «Journey → Чекпоинт» */
  topic: string
  route: string
  correct: boolean
  question?: string
}

export interface ReadingEvent {
  slug: string
  title: string
  seconds: number
  ts: number
}

export interface TopicStat {
  topic: string
  route: string
  attempts: number
  correct: number
  /** 0..100, со сглаживанием */
  mastery: number
  lastTs: number
}

export interface AiNote {
  id: string
  kind: 'explanation' | 'analysis' | 'answer'
  title: string
  topic: string
  text: string
  sourceIds: string[]
  route: string
  model: string
  createdAt: number
}

export interface ProgressAnalysis {
  summary: string
  weakSpots: Array<{ topic: string; why: string; route?: string }>
  strengths: string[]
  nextSteps: Array<{ action: string; route?: string }>
  generatedBy: 'ai' | 'local'
  model?: string
  createdAt: number
}
