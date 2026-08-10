import type {
  Activity,
  AiSettings,
  Checkpoint,
  FillTheBlankActivity,
  Journey,
  NarrativeType,
} from '../../types/journey'
import { chatCompletion, extractJson } from './provider'
import { GENERATOR_SYSTEM_PROMPT, buildGenerationUserPrompt } from './prompts'

const uid = () => Math.random().toString(36).slice(2, 10)

interface RawActivity {
  type: string
  title?: string
  prompt?: string
  context?: string | null
  difficulty?: number
  timeLimitSec?: number
  hints?: string[]
  feedback?: string
  options?: string[]
  correctIndex?: number
  correctAnswer?: boolean | number
  parts?: Array<{ text?: string; isBlank?: boolean }>
  correctAnswers?: string[]
  acceptableAnswers?: string[][]
  leftItems?: string[]
  rightItems?: string[]
  correctPairs?: Record<number, number>
  steps?: string[]
  correctOrder?: string[] | number[]
  blocks?: Array<{ type: string; text: string }>
  rubric?: string[]
  keyConcepts?: string[]
  modelAnswer?: string
  categories?: string[]
  items?: string[]
  itemCategory?: number[]
}

interface RawCheckpoint {
  title?: string
  summary?: string
  difficulty?: number
  timeLimitSec?: number
  activities?: RawActivity[]
}

interface RawJourney {
  title?: string
  checkpoints?: RawCheckpoint[]
}

function clampDiff(d: number | undefined): 1 | 2 | 3 {
  const v = Math.round(d ?? 1)
  return v < 1 ? 1 : v > 3 ? 3 : (v as 1 | 2 | 3)
}

function normHints(hints?: string[]): Array<{ text: string; xpCost: number }> | undefined {
  if (!hints?.length) return undefined
  return hints.slice(0, 2).map(h => ({ text: h, xpCost: 5 }))
}

function normActivity(raw: RawActivity, checkpointId: string): Activity | null {
  const difficulty = clampDiff(raw.difficulty)
  const base = {
    id: uid(),
    title: raw.title || undefined,
    prompt: (raw.prompt || '').trim(),
    context: raw.context || undefined,
    difficulty,
    timeLimitSec: Math.min(240, Math.max(45, raw.timeLimitSec ?? 120)),
    hints: normHints(raw.hints),
    conceptId: checkpointId,
    feedback: (raw.feedback || '').trim() || 'Правильный ответ приведён выше.',
    xpBase: 10 + difficulty * 10,
  }
  if (!base.prompt) return null

  switch (raw.type) {
    case 'MultipleChoice': {
      const options = (raw.options || []).slice(0, 5)
      if (options.length < 2) return null
      const correctIndex = typeof raw.correctIndex === 'number' ? raw.correctIndex : 0
      if (correctIndex < 0 || correctIndex >= options.length) return null
      return { ...base, type: 'MultipleChoice', options, correctIndex }
    }
    case 'TrueFalse': {
      if (typeof raw.correctAnswer !== 'boolean') return null
      return { ...base, type: 'TrueFalse', correctAnswer: raw.correctAnswer }
    }
    case 'FillTheBlank': {
      const parts = raw.parts || []
      const blanks = parts.filter(p => p.isBlank).length
      const correctAnswers = (raw.correctAnswers || []).slice(0, blanks)
      if (blanks === 0 || correctAnswers.length !== blanks) return null
      const acceptableAnswers = raw.acceptableAnswers?.slice(0, blanks)
      return {
        ...base,
        type: 'FillTheBlank',
        parts,
        correctAnswers,
        acceptableAnswers,
      } as FillTheBlankActivity
    }
    case 'MatchPairs': {
      const left = raw.leftItems || []
      const right = raw.rightItems || []
      if (left.length < 2 || right.length !== left.length) return null
      const pairs = raw.correctPairs || {}
      const keys = Object.keys(pairs).map(Number)
      if (keys.length !== left.length) return null
      if (keys.some(k => k < 0 || k >= left.length)) return null
      if (keys.some(k => pairs[k] < 0 || pairs[k] >= right.length)) return null
      return { ...base, type: 'MatchPairs', leftItems: left, rightItems: right, correctPairs: pairs }
    }
    case 'OrderSteps': {
      const steps = raw.steps || []
      const order = (raw.correctOrder || []) as string[]
      if (steps.length < 3 || order.length !== steps.length) return null
      const setA = new Set(steps)
      if (order.some(s => !setA.has(s))) return null
      return { ...base, type: 'OrderSteps', steps, correctOrder: order }
    }
    case 'FreeResponse':
    case 'ExplainLikeImFive':
    case 'TeachBack':
    case 'GiveYourExample':
    case 'FindTheConnection':
    case 'PredictTheOutcome':
      return {
        ...base,
        type: raw.type,
        rubric: raw.rubric || ['Передана основная идея', 'Есть фактические ошибки'],
        keyConcepts: raw.keyConcepts || [],
        modelAnswer: raw.modelAnswer || '',
      }
    case 'CategorySort': {
      const categories = (raw.categories || []).slice(0, 4)
      const items = raw.items || []
      const mapping = raw.itemCategory || []
      if (categories.length < 2 || items.length < 4 || mapping.length !== items.length) return null
      if (mapping.some(idx => idx < 0 || idx >= categories.length)) return null
      return { ...base, type: 'CategorySort', categories, items, itemCategory: mapping }
    }
    default:
      return null
  }
}

export function normalizeJourney(
  raw: RawJourney,
  input: { topic: string; text: string; narrativeType: NarrativeType; generatedBy: 'ai' | 'local' },
): Journey {
  const checkpoints: Checkpoint[] = []
  for (const [i, rc] of (raw.checkpoints || []).entries()) {
    const title = (rc.title || '').trim() || `Чекпоинт ${i + 1}`
    const checkpointId = uid()
    const activities = (rc.activities || [])
      .map(a => normActivity(a, checkpointId))
      .filter((a): a is Activity => a !== null)
    if (activities.length === 0) continue
    checkpoints.push({
      id: checkpointId,
      order: i,
      title,
      summary: (rc.summary || '').trim(),
      difficulty: clampDiff(rc.difficulty),
      timeLimitSec: Math.min(420, Math.max(90, rc.timeLimitSec ?? 240)),
      activities,
    })
  }

  const totalTimeSec = checkpoints.reduce((acc, c) => acc + c.timeLimitSec, 0)

  return {
    id: uid(),
    title: (raw.title || '').trim() || input.topic.trim() || 'Knowledge Journey',
    sourceTopic: input.topic.trim(),
    sourceText: input.text.trim(),
    narrativeType: input.narrativeType,
    checkpoints,
    totalTimeSec,
    createdAt: Date.now(),
    generatedBy: input.generatedBy,
  }
}

export async function generateJourneyWithAi(input: {
  topic: string
  text: string
  narrativeType: NarrativeType
  settings: AiSettings
}): Promise<Journey> {
  const content = await chatCompletion(input.settings, [
    { role: 'system', content: GENERATOR_SYSTEM_PROMPT },
    { role: 'user', content: buildGenerationUserPrompt(input) },
  ], { temperature: 0.6, maxTokens: 6000 })
  const raw = extractJson<RawJourney>(content)
  const journey = normalizeJourney(raw, {
    topic: input.topic,
    text: input.text,
    narrativeType: input.narrativeType,
    generatedBy: 'ai',
  })
  if (journey.checkpoints.length < 2) {
    throw new Error('Модель вернула слишком мало чекпоинтов. Попробуйте ещё раз или введите более содержательный текст.')
  }
  return journey
}
