import type { AiSettings, FreeAnswerEvaluation } from '../../types/journey'
import { chatCompletion, extractJson } from './provider'
import { EVALUATOR_SYSTEM_PROMPT, buildEvaluationUserPrompt } from './prompts'

export interface EvaluationInput {
  prompt: string
  context?: string
  rubric?: string[]
  keyConcepts?: string[]
  modelAnswer?: string
  userAnswer: string
}

export async function evaluateFreeAnswerWithAi(
  input: EvaluationInput,
  settings: AiSettings,
): Promise<FreeAnswerEvaluation> {
  const content = await chatCompletion(settings, [
    { role: 'system', content: EVALUATOR_SYSTEM_PROMPT },
    { role: 'user', content: buildEvaluationUserPrompt(input) },
  ], { temperature: 0.2, maxTokens: 800 })

  const raw = extractJson<Partial<FreeAnswerEvaluation>>(content)
  const score = Math.max(0, Math.min(100, Number(raw.score ?? 0)))
  const verdict =
    raw.verdict === 'correct' || raw.verdict === 'partial' || raw.verdict === 'incorrect'
      ? raw.verdict
      : score >= 70 ? 'correct' : score >= 40 ? 'partial' : 'incorrect'
  return {
    score,
    verdict,
    feedback: (raw.feedback || '').trim() || 'Ответ получен.',
    strengths: Array.isArray(raw.strengths) ? raw.strengths : [],
    missing: Array.isArray(raw.missing) ? raw.missing : [],
  }
}
