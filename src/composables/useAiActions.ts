import { articles } from '../data/articles'
import { analyzeProgress, answerWithSources, explainFragment, type AiResult } from '../services/ai/actions'
import { generateJourney } from '../services/journeyService'
import type { Chunk, SearchHit } from '../services/rag/types'
import { useJourneyStore } from '../store/journeyStore'
import { useLearnerStore, type PersonalSummary } from '../store/learnerStore'
import { useRagStore } from '../store/ragStore'
import { useSettingsStore } from '../store/settingsStore'
import type { Journey } from '../types/journey'
import type { ProgressAnalysis } from '../types/learner'

/** ≈250 токенов. */
const LEARNER_BUDGET = 900

/** Без \b: в JS-регэкспах он не учитывает кириллицу. */
const PERSONAL_RE = /(^|[\s,.!?])((что|где|в\s+ч[её]м)\s+я|мо[йияеё][а-я]*\s+(прогресс|ошиб|слаб|знан|пробел)[а-я]*|мне\s+(повтор|подтян|изуч)[а-я]*)(?=$|[\s,.!?])/iu

export type AskScope = 'all' | 'articles' | 'journeys' | 'notes'

const SCOPE_FILTER: Record<AskScope, ((c: Chunk) => boolean) | undefined> = {
  all: undefined,
  articles: c => c.kind.startsWith('article'),
  journeys: c => c.kind.startsWith('journey'),
  notes: c => c.kind === 'note',
}

export function useAiActions() {
  const rag = useRagStore()
  const learner = useLearnerStore()
  const settings = useSettingsStore()
  const journeys = useJourneyStore()

  const ai = () => (settings.hasAi ? settings.settings : null)

  async function ask(
    question: string,
    scope: AskScope = 'all',
  ): Promise<AiResult & { usedProfile: boolean; personal: PersonalSummary | null }> {
    let { hits } = await rag.search(question, { limit: 5, filter: SCOPE_FILTER[scope] })
    const isPersonal = learner.data.personalization && PERSONAL_RE.test(question)
    // «Что мне повторить?» не содержит темы: источники берутся по слабым темам из истории ответов.
    if (isPersonal && !hits.length) hits = await weakTopicHits(scope)
    // Персональная часть строится из данных; LLM получает только материалы.
    const personal = isPersonal ? learner.personalSummary(hits.map(h => h.chunk.topic)) : null
    const profile = personal ? '' : learner.buildContext(LEARNER_BUDGET)
    const res = await answerWithSources(question, hits, profile, ai(), !!personal)
    return { ...res, personal, usedProfile: !!profile && res.generatedBy === 'ai' }
  }

  /** По 1–2 фрагмента на каждую слабую тему, чтобы ответ покрыл все, а не самую «находимую». */
  async function weakTopicHits(scope: AskScope): Promise<SearchHit[]> {
    const topics = learner.personalSummary([])?.weak.map(w => w.topic) ?? []
    const allowed = SCOPE_FILTER[scope] ?? (() => true)
    const hits: SearchHit[] = []
    for (const topic of topics) {
      const own = rag.chunks
        .filter(c => c.topic === topic && c.kind !== 'note' && allowed(c))
        .sort((a, b) => Number(b.kind.endsWith('section')) - Number(a.kind.endsWith('section')))
        .slice(0, 2)
      const chunks = own.length
        ? own
        : (await rag.search(topic.split('→').pop()!, { limit: 2, filter: SCOPE_FILTER[scope] })).hits.map(h => h.chunk)
      hits.push(...chunks.map(chunk => ({ chunk, score: 1, snippet: chunk.text.slice(0, 200) })))
    }
    return hits.slice(0, 6)
  }

  async function explain(fragment: string, topic: string, route: string): Promise<AiResult> {
    // Тема + начало фрагмента находят и секцию, и её упражнения.
    const { hits } = await rag.search(`${topic} ${fragment.slice(0, 300)}`, { limit: 4 })
    const own = rag.chunksForRoute(route).filter(c => c.topic === topic && !hits.some(h => h.chunk.id === c.id))
    const merged = [
      ...own.slice(0, 2).map(chunk => ({ chunk, score: 1, snippet: chunk.text.slice(0, 200) })),
      ...hits,
    ].slice(0, 5)
    const profile = learner.data.personalization ? weakContextFor(topic) : ''
    return explainFragment(fragment, topic, merged, profile, ai())
  }

  function weakContextFor(topic: string): string {
    const stat = learner.topicStats.find(t => t.topic === topic)
    const mistakes = learner.data.answers.filter(a => a.topic === topic && !a.correct && a.question).slice(-2)
    const parts: string[] = []
    if (stat) parts.push(`По этой теме: верно ${stat.correct} из ${stat.attempts}.`)
    if (mistakes.length) parts.push(`Ошибался в: ${mistakes.map(m => `«${m.question}»`).join('; ')}.`)
    return parts.join(' ')
  }

  async function analyze(): Promise<ProgressAnalysis & { warning?: string }> {
    const materials = [
      ...articles.map(a => ({ route: `/article/${a.slug}`, title: a.title })),
      ...articles.map(a => ({ route: `/test/${a.slug}`, title: `Тест: ${a.title}` })),
      ...journeys.journeys.slice(0, 10).map(j => ({ route: `/journeys/${j.id}`, title: `Journey: ${j.title}` })),
      { route: '/journeys/new', title: 'Создать новое путешествие' },
    ]
    const result = await analyzeProgress({
      stats: learner.topicStats,
      mistakes: learner.recentMistakes,
      reading: learner.data.reading,
      materials,
    }, ai())
    learner.setAnalysis({ ...result })
    return result
  }

  async function generatePractice(topics: string[]): Promise<Journey> {
    const picked = topics.slice(0, 3)
    const parts: string[] = []
    for (const topic of picked) {
      const own = rag.chunks.filter(c => c.topic === topic && c.kind !== 'note')
      const chunks = own.length ? own : (await rag.search(topic, { limit: 4 })).hits.map(h => h.chunk)
      parts.push(`## ${topic}\n${chunks.map(c => c.text).join('\n\n')}`)
    }
    const text = parts.join('\n\n')
    const shortNames = picked.map(t => t.split('→').pop()!.trim())
    const journey = await generateJourney({
      topic: `Тренировка: ${shortNames.join(', ')}`,
      text,
      narrativeType: 'none',
      settings: ai(),
    })
    journey.title = `🎯 Тренировка: ${shortNames.join(', ')}`.slice(0, 90)
    journey.sourceTopic = `Слабые темы: ${picked.join('; ')}`
    journeys.addJourney(journey)
    return journey
  }

  return { ask, explain, analyze, generatePractice }
}
