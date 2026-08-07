import type { FreeAnswerEvaluation } from '../../types/journey'
import { tokenize } from './textParser'

function normalize(s: string): string {
  return s.toLowerCase().replace(/ё/g, 'е')
}

/**
 * Локальная эвристическая оценка свободного ответа: проверяет попадание
 * ключевых понятий, длину и грубые маркеры несогласия.
 */
export function evaluateFreeAnswerLocally(input: {
  prompt: string
  context?: string
  rubric?: string[]
  keyConcepts?: string[]
  modelAnswer?: string
  userAnswer: string
}): FreeAnswerEvaluation {
  const answer = (input.userAnswer || '').trim()
  const words = tokenize(answer)

  if (!answer || answer.length < 4 || words.length === 0) {
    return {
      score: 0,
      verdict: 'incorrect',
      feedback: 'Ответ слишком короткий. Попробуй сформулировать мысль несколькими предложениями.',
      strengths: [],
      missing: input.keyConcepts || [],
    }
  }

  const keyConcepts = (input.keyConcepts || []).filter(Boolean).slice(0, 8)
  if (keyConcepts.length === 0) {
    return {
      score: 60,
      verdict: 'partial',
      feedback: 'Не удалось автоматически проверить ключевые термины. Убедись, что в ответе раскрыта основная мысль.',
      strengths: [],
      missing: [],
    }
  }

  const normAnswer = normalize(answer)
  const matched: string[] = []
  const missing: string[] = []
  for (const concept of keyConcepts) {
    const norm = normalize(concept)
    const found = norm.split(/\s+/).some(word => word.length >= 4 && normAnswer.includes(word))
    if (found) matched.push(concept)
    else missing.push(concept)
  }

  const ratio = matched.length / keyConcepts.length
  let score: number
  let verdict: FreeAnswerEvaluation['verdict']

  if (ratio >= 0.6) {
    score = Math.round(50 + ratio * 50)
    verdict = 'correct'
  } else if (ratio >= 0.3) {
    score = Math.round(30 + ratio * 50)
    verdict = 'partial'
  } else {
    score = Math.round(ratio * 40)
    verdict = 'incorrect'
  }

  const strengths = matched.length > 0
    ? [`Упомянуто: ${matched.join(', ')}`]
    : []
  const feedback =
    matched.length > 0
      ? `Хорошо, что ты упомянул(а): ${matched.join(', ')}.`
      : 'Пока не хватает ключевых понятий темы.'
  const missingNote = missing.length > 0
    ? ` Не хватает: ${missing.join(', ')}.`
    : ''
  const tip = 'Перечитай материал и сформулируй ответ своими словами, используя ключевые термины.'

  return {
    score,
    verdict,
    feedback: `${feedback}${missingNote} ${tip}`.trim(),
    strengths,
    missing,
  }
}
