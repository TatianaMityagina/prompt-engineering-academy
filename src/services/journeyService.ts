import type { AiSettings, FreeAnswerEvaluation, FreeResponseActivity, Journey, NarrativeType } from '../types/journey'
import { generateJourneyWithAi } from './ai/journeyGenerator'
import { evaluateFreeAnswerWithAi } from './ai/evaluator'
import { isAiConfigured } from './ai/provider'
import { generateJourneyLocally } from './engine/localGenerator'
import { evaluateFreeAnswerLocally } from './engine/localEvaluator'
import { applyNarrative } from './engine/narrative'
import { splitSentences } from './engine/textParser'

export interface GenerationOptions {
  topic: string
  text: string
  narrativeType: NarrativeType
  settings: AiSettings | null
}

function validateInput(input: GenerationOptions): void {
  const textLength = input.text.trim().length
  if (textLength < 200) {
    throw new Error('Вставь более содержательный текст (минимум ~200 символов) или добавь текст к теме.')
  }
}

export async function generateJourney(options: GenerationOptions): Promise<Journey> {
  validateInput(options)
  let journey: Journey
  if (isAiConfigured(options.settings)) {
    try {
      journey = await generateJourneyWithAi({
        topic: options.topic,
        text: options.text,
        narrativeType: options.narrativeType,
        settings: options.settings!,
      })
    } catch (e) {
      const fallback = generateJourneyLocally(options)
      return applyNarrative(fallback)
    }
  } else {
    journey = generateJourneyLocally(options)
  }
  return applyNarrative(journey)
}

export function hasConfiguredAi(settings: AiSettings | null): boolean {
  return isAiConfigured(settings)
}

export async function evaluateFreeAnswer(
  activity: FreeResponseActivity,
  userAnswer: string,
  settings: AiSettings | null,
): Promise<FreeAnswerEvaluation> {
  const input = {
    prompt: activity.prompt,
    context: activity.context,
    rubric: activity.rubric,
    keyConcepts: activity.keyConcepts,
    modelAnswer: activity.modelAnswer,
    userAnswer,
  }
  if (isAiConfigured(settings)) {
    try {
      return await evaluateFreeAnswerWithAi(input, settings!)
    } catch {
      return evaluateFreeAnswerLocally(input)
    }
  }
  return evaluateFreeAnswerLocally(input)
}

export { splitSentences }
