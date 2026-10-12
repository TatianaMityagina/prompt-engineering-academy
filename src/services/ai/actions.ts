import type { AiSettings } from '../../types/journey'
import type { ProgressAnalysis, TopicStat } from '../../types/learner'
import type { SearchHit } from '../rag/types'
import { chatCompletion, extractJson, isAiConfigured, normalizeSettings } from './provider'
import {
  ANALYZE_SYSTEM_PROMPT,
  ASSISTANT_SYSTEM_PROMPT,
  EXPLAIN_SYSTEM_PROMPT,
  buildAnalyzeUserPrompt,
  buildAssistantUserPrompt,
  buildExplainUserPrompt,
  type PromptSource,
} from './prompts'

export interface AiResult {
  text: string
  sources: SearchHit[]
  /** Номера процитированных источников, с 1 */
  cited: number[]
  generatedBy: 'ai' | 'local'
  model?: string
  /** Причина перехода на локальный режим */
  warning?: string
}

const ORIGIN_LABEL = { human: 'человек', ai: 'ИИ', local: 'локальный генератор' } as const

function toPromptSources(hits: SearchHit[]): PromptSource[] {
  return hits.map((h, i) => ({
    n: i + 1,
    title: `${h.chunk.sourceTitle} → ${h.chunk.section}`,
    origin: ORIGIN_LABEL[h.chunk.origin],
    text: h.chunk.text,
  }))
}

/** Удаляет ссылки на несуществующие источники. */
function sanitizeCitations(text: string, count: number): { text: string; cited: number[] } {
  const cited = new Set<number>()
  const clean = text.replace(/\[(\d{1,2})\]/g, (m, n) => {
    const i = Number(n)
    if (i >= 1 && i <= count) {
      cited.add(i)
      return m
    }
    return ''
  })
  return { text: clean.trim(), cited: [...cited].sort((a, b) => a - b) }
}

function localExtractive(hits: SearchHit[], intro: string): AiResult {
  const lines = hits.slice(0, 4).map((h, i) => `- ${h.snippet} [${i + 1}]`)
  return {
    text: `${intro}\n${lines.join('\n')}`,
    sources: hits,
    cited: hits.slice(0, 4).map((_, i) => i + 1),
    generatedBy: 'local',
  }
}

const NOT_FOUND: Omit<AiResult, 'sources'> = {
  text: 'В материалах платформы ничего не нашлось по этому запросу. Попробуй переформулировать (например, «что такое токен») или создай Journey по этой теме из своего текста.',
  cited: [],
  generatedBy: 'local',
}

async function runChat(
  settings: AiSettings,
  system: string,
  user: string,
  hits: SearchHit[],
  maxTokens = 900,
): Promise<AiResult> {
  const raw = await chatCompletion(settings, [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ], { temperature: 0.3, maxTokens })
  const { text, cited } = sanitizeCitations(raw, hits.length)
  return { text, cited, sources: hits, generatedBy: 'ai', model: normalizeSettings(settings).model }
}

export async function answerWithSources(
  question: string,
  hits: SearchHit[],
  learner: string,
  settings: AiSettings | null,
  personalShown = false,
): Promise<AiResult> {
  if (!hits.length) return { ...NOT_FOUND, sources: [] }
  if (!isAiConfigured(settings)) {
    return localExtractive(hits, 'ИИ не подключён, поэтому показываю самые близкие фрагменты из материалов:')
  }
  try {
    return await runChat(settings!, ASSISTANT_SYSTEM_PROMPT, buildAssistantUserPrompt(question, toPromptSources(hits), learner, personalShown), hits)
  } catch (e) {
    return {
      ...localExtractive(hits, 'Не удалось получить ответ ИИ — вот что нашлось в материалах:'),
      warning: e instanceof Error ? e.message : String(e),
    }
  }
}

export async function explainFragment(
  fragment: string,
  topic: string,
  hits: SearchHit[],
  learner: string,
  settings: AiSettings | null,
): Promise<AiResult> {
  if (!isAiConfigured(settings)) return explainLocally(fragment, hits)
  try {
    return await runChat(settings!, EXPLAIN_SYSTEM_PROMPT, buildExplainUserPrompt(fragment, topic, toPromptSources(hits), learner), hits, 700)
  } catch (e) {
    return { ...explainLocally(fragment, hits), warning: e instanceof Error ? e.message : String(e) }
  }
}

function explainLocally(fragment: string, hits: SearchHit[]): AiResult {
  const sentences = fragment.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 20)
  const bullets = fragment.split('\n').filter(l => /^\s*[•✅\-\d]/.test(l)).slice(0, 4)
  const exercise = hits.findIndex(h => h.chunk.kind === 'article-exercise' || h.chunk.kind === 'journey-activity')
  const parts = [`**Коротко:** ${sentences.slice(0, 2).join(' ') || fragment.slice(0, 200)}`]
  if (bullets.length) parts.push(`**Главное:**\n${bullets.map(b => `- ${b.replace(/^\s*[•✅\-]\s*/, '')}`).join('\n')}`)
  if (exercise >= 0) parts.push(`**Проверь себя:** ${hits[exercise].snippet} [${exercise + 1}]`)
  parts.push('_Это сокращение без ИИ. Подключи модель в «⚙️ ИИ», чтобы получить аналогию и примеры._')
  return {
    text: parts.join('\n\n'),
    sources: hits,
    cited: exercise >= 0 ? [exercise + 1] : [],
    generatedBy: 'local',
  }
}

export interface AnalyzeInput {
  stats: TopicStat[]
  mistakes: Array<{ topic: string; question?: string }>
  reading: Array<{ title: string; seconds: number }>
  materials: Array<{ route: string; title: string }>
}

export async function analyzeProgress(input: AnalyzeInput, settings: AiSettings | null): Promise<ProgressAnalysis & { warning?: string }> {
  if (!isAiConfigured(settings)) return analyzeLocally(input)
  const stats = input.stats
    .slice()
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 15)
    .map(s => `- ${s.topic}: ${s.correct}/${s.attempts} верно, освоение ${s.mastery}% (route ${s.route})`)
    .join('\n')
  const mistakes = input.mistakes.slice(0, 8).map(m => `- [${m.topic}] ${m.question}`).join('\n')
  const readingByTitle = new Map<string, number>()
  for (const r of input.reading) readingByTitle.set(r.title, (readingByTitle.get(r.title) ?? 0) + r.seconds)
  const reading = [...readingByTitle].map(([t, s]) => `- ${t}: ${Math.round(s / 60)} мин`).join('\n')
  const materials = input.materials.map(m => `- ${m.route} — ${m.title}`).join('\n')
  try {
    const raw = await chatCompletion(settings!, [
      { role: 'system', content: ANALYZE_SYSTEM_PROMPT },
      { role: 'user', content: buildAnalyzeUserPrompt({ stats, mistakes, reading, materials }) },
    ], { temperature: 0.3, maxTokens: 900 })
    const parsed = extractJson<Omit<ProgressAnalysis, 'generatedBy' | 'createdAt'>>(raw)
    const allowed = new Set(input.materials.map(m => m.route).concat(input.stats.map(s => s.route)))
    const safeRoute = (r?: string | null) => (r && allowed.has(r) ? r : undefined)
    return {
      summary: parsed.summary || '',
      weakSpots: (parsed.weakSpots || []).slice(0, 5).map(w => ({ ...w, route: safeRoute(w.route) })),
      strengths: (parsed.strengths || []).slice(0, 5),
      nextSteps: (parsed.nextSteps || []).slice(0, 4).map(s => ({ ...s, route: safeRoute(s.route) })),
      generatedBy: 'ai',
      model: normalizeSettings(settings!).model,
      createdAt: Date.now(),
    }
  } catch (e) {
    return { ...analyzeLocally(input), warning: e instanceof Error ? e.message : String(e) }
  }
}

export function analyzeLocally(input: AnalyzeInput): ProgressAnalysis {
  const answered = input.stats.reduce((s, t) => s + t.attempts, 0)
  const weak = input.stats.filter(s => s.mastery < 60).sort((a, b) => a.mastery - b.mastery)
  const strong = input.stats.filter(s => s.mastery >= 75)
  const readTitles = new Set(input.reading.map(r => r.title))
  const unread = input.materials.filter(m => m.route.startsWith('/article/') && !readTitles.has(m.title))
  const nextSteps: ProgressAnalysis['nextSteps'] = []
  for (const w of weak.slice(0, 2)) nextSteps.push({ action: `Перечитай «${w.topic}» и ответь на упражнение ещё раз`, route: w.route })
  for (const u of unread.slice(0, 2)) nextSteps.push({ action: `Прочитай статью «${u.title}»`, route: u.route })
  if (!nextSteps.length) nextSteps.push({ action: 'Создай Journey по новой теме, чтобы проверить себя под таймером', route: '/journeys/new' })
  return {
    summary: answered < 5
      ? `Пока данных мало (${answered} ответов) — выводы предварительные. Прочитай статью и пройди тест, чтобы анализ стал точнее.`
      : `Ты ответил(а) на ${answered} вопросов. Слабых тем: ${weak.length}, уверенных: ${strong.length}.`,
    weakSpots: weak.slice(0, 5).map(w => ({ topic: w.topic, why: `верно ${w.correct} из ${w.attempts}`, route: w.route })),
    strengths: strong.slice(0, 5).map(s => s.topic),
    nextSteps,
    generatedBy: 'local',
    createdAt: Date.now(),
  }
}
