import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { articles } from '../data/articles'
import type { AiNote, AnswerEvent, ProgressAnalysis, ReadingEvent, TopicStat } from '../types/learner'
import type { Journey, JourneyResult } from '../types/journey'

const KEY = 'kj_learner'
const MAX_ANSWERS = 500
const MAX_READING = 200
/** Освоение считается по последним попыткам. */
const RECENT_PER_TOPIC = 10
/** Заглушка из ранних версий записи ответов теста. */
const PLACEHOLDER_QUESTION = 'Вопрос теста'
const hasQuestion = (a: AnswerEvent) => !!a.question && a.question !== PLACEHOLDER_QUESTION

/** Ошибки, на которые позже не было верного ответа; последние — первыми. */
function unresolvedMistakes(answers: AnswerEvent[]): AnswerEvent[] {
  const last = new Map<string, AnswerEvent>()
  for (const a of answers) if (hasQuestion(a)) last.set(a.question!, a)
  return [...last.values()].filter(a => !a.correct).sort((a, b) => b.ts - a.ts)
}

interface LearnerData {
  answers: AnswerEvent[]
  reading: ReadingEvent[]
  notes: AiNote[]
  analysis: ProgressAnalysis | null
  /** Согласие на передачу прогресса в ИИ */
  personalization: boolean
}

const EMPTY: LearnerData = { answers: [], reading: [], notes: [], analysis: null, personalization: true }

function load(): LearnerData {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...EMPTY, ...JSON.parse(raw) }
  } catch {
    // ignore
  }
  return { ...EMPTY }
}

export interface PersonalSummary {
  mastered: Array<{ topic: string; route: string; related: boolean }>
  /** Общий список для блока «👤 Твой прогресс» и отбора источников */
  weak: Array<{ topic: string; route: string; mastery: number; related: boolean }>
  mistakes: Array<{ question: string; topic: string; route: string; related: boolean }>
}

export interface Recommendation {
  title: string
  reason: string
  route: string
  kind: 'repeat' | 'read' | 'test' | 'journey'
}

export const useLearnerStore = defineStore('learner', () => {
  const data = ref<LearnerData>(load())

  watch(data, v => {
    try {
      localStorage.setItem(KEY, JSON.stringify(v))
    } catch {
      // ignore
    }
  }, { deep: true })

  function recordAnswer(e: Omit<AnswerEvent, 'ts'>) {
    data.value.answers.push({ ...e, ts: Date.now() })
    if (data.value.answers.length > MAX_ANSWERS) data.value.answers.splice(0, data.value.answers.length - MAX_ANSWERS)
  }

  function recordReading(slug: string, title: string, seconds: number) {
    if (seconds < 5) return
    data.value.reading.push({ slug, title, seconds: Math.round(seconds), ts: Date.now() })
    if (data.value.reading.length > MAX_READING) data.value.reading.splice(0, data.value.reading.length - MAX_READING)
  }

  function recordJourney(journey: Journey, result: JourneyResult) {
    const byId = new Map(result.activities.map(a => [a.activityId, a]))
    for (const cp of journey.checkpoints) {
      for (const act of cp.activities) {
        const r = byId.get(act.id)
        if (!r) continue
        recordAnswer({
          source: 'journey',
          topic: `${journey.title} → ${cp.title}`,
          route: `/journeys/${journey.id}`,
          correct: r.correct || (r.partial ?? 0) >= 0.7,
          question: act.prompt.slice(0, 160),
        })
      }
    }
  }

  const topicStats = computed<TopicStat[]>(() => {
    const groups = new Map<string, AnswerEvent[]>()
    for (const a of data.value.answers) {
      const list = groups.get(a.topic) ?? []
      list.push(a)
      groups.set(a.topic, list)
    }
    return [...groups.entries()].map(([topic, list]) => {
      const recent = list.slice(-RECENT_PER_TOPIC)
      const correct = recent.filter(a => a.correct).length
      // Сглаживание Лапласа
      const mastery = Math.round(((correct + 1) / (recent.length + 2)) * 100)
      return {
        topic,
        route: list[list.length - 1].route,
        attempts: list.length,
        correct: list.filter(a => a.correct).length,
        mastery,
        lastTs: list[list.length - 1].ts,
      }
    })
  })

  const weakTopics = computed(() =>
    topicStats.value.filter(t => t.mastery < 60).sort((a, b) => a.mastery - b.mastery),
  )
  const strongTopics = computed(() =>
    topicStats.value.filter(t => t.mastery >= 75).sort((a, b) => b.mastery - a.mastery),
  )

  const totals = computed(() => {
    const answers = data.value.answers
    const correct = answers.filter(a => a.correct).length
    const readingSec = data.value.reading.reduce((s, r) => s + r.seconds, 0)
    return {
      answers: answers.length,
      correct,
      accuracy: answers.length ? Math.round((correct / answers.length) * 100) : 0,
      readingMin: Math.round(readingSec / 60),
      readArticles: new Set(data.value.reading.map(r => r.slug)).size,
    }
  })

  const recentMistakes = computed(() =>
    unresolvedMistakes(data.value.answers).slice(0, 5),
  )

  const recommendations = computed<Recommendation[]>(() => {
    const recs: Recommendation[] = []
    for (const t of weakTopics.value.slice(0, 2)) {
      recs.push({
        title: `Повторить: ${t.topic}`,
        reason: `верно ${t.correct} из ${t.attempts}`,
        route: t.route,
        kind: 'repeat',
      })
    }
    const read = new Set(data.value.reading.map(r => r.slug))
    const tested = new Set(
      data.value.answers.filter(a => a.source === 'test').map(a => a.route.split('#')[0].replace('/article/', '')),
    )
    for (const a of articles) {
      if (!read.has(a.slug)) {
        recs.push({ title: a.title, reason: 'ещё не прочитана', route: `/article/${a.slug}`, kind: 'read' })
      } else if (!tested.has(a.slug)) {
        recs.push({ title: `Тест: ${a.title}`, reason: 'статья прочитана, тест не пройден', route: `/test/${a.slug}`, kind: 'test' })
      }
    }
    return recs.slice(0, 4)
  })

  /** Сводка для промпта в пределах бюджета; блоки по убыванию приоритета. */
  function buildContext(maxChars = 900): string {
    if (!data.value.personalization) return ''
    const t = totals.value
    if (!t.answers && !t.readArticles) return ''
    const read = `Прочитано статей: ${t.readArticles} из ${articles.length}, чтение ~${t.readingMin} мин.`
    // Пустая статистика не передаётся: модель пересказывает её как факт.
    const blocks: string[] = [t.answers ? `Ответов: ${t.answers}, верно ${t.accuracy}%. ${read}` : `Ещё не отвечал на вопросы. ${read}`]
    if (weakTopics.value.length) {
      blocks.push(`Слабые темы: ${weakTopics.value.slice(0, 5).map(w => `${w.topic} (${w.correct}/${w.attempts})`).join('; ')}.`)
    }
    if (recentMistakes.value.length) {
      blocks.push(`Недавние ошибки: ${recentMistakes.value.slice(0, 3).map(m => `«${m.question?.slice(0, 90)}»`).join('; ')}.`)
    }
    if (strongTopics.value.length) {
      blocks.push(`Сильные темы: ${strongTopics.value.slice(0, 4).map(s => s.topic).join('; ')}.`)
    }
    let out = ''
    for (const b of blocks) {
      if ((out + b).length > maxChars) break
      out += (out ? '\n' : '') + b
    }
    return out
  }

  /** Персональная часть ответа строится из данных, без LLM. */
  function personalSummary(relatedTopics: string[]): PersonalSummary | null {
    if (!data.value.answers.length) return null
    const related = new Set(relatedTopics)
    const byRelevance = (a: { topic: string }, b: { topic: string }) =>
      Number(related.has(b.topic)) - Number(related.has(a.topic))
    const mastered = topicStats.value
      .filter(t => t.mastery >= 60 && t.correct > 0)
      .sort(byRelevance)
      .slice(0, 3)
      .map(t => ({ topic: t.topic, route: t.route, related: related.has(t.topic) }))
    const mistakes = unresolvedMistakes(data.value.answers)
      .sort(byRelevance)
      .slice(0, 3)
      .map(a => ({ question: a.question!, topic: a.topic, route: a.route, related: related.has(a.topic) }))
    const masteredTopics = new Set(mastered.map(m => m.topic))
    const weakFromMistakes = new Set(mistakes.map(m => m.topic))
    const weak = topicStats.value
      .filter(t => !masteredTopics.has(t.topic) && (t.mastery < 60 || weakFromMistakes.has(t.topic)))
      .sort((a, b) => byRelevance(a, b) || a.mastery - b.mastery)
      .slice(0, 3)
      .map(t => ({ topic: t.topic, route: t.route, mastery: t.mastery, related: related.has(t.topic) }))
    if (!mastered.length && !mistakes.length && !weak.length) return null
    return { mastered, mistakes, weak }
  }

  function addNote(note: Omit<AiNote, 'id' | 'createdAt'>): AiNote {
    const full: AiNote = { ...note, id: Math.random().toString(36).slice(2, 10), createdAt: Date.now() }
    data.value.notes.unshift(full)
    return full
  }

  function deleteNote(id: string) {
    data.value.notes = data.value.notes.filter(n => n.id !== id)
  }

  function setAnalysis(a: ProgressAnalysis | null) {
    data.value.analysis = a
  }

  function setPersonalization(on: boolean) {
    data.value.personalization = on
  }

  function exportJson(): string {
    return JSON.stringify(data.value, null, 2)
  }

  function clearProgress() {
    data.value = { ...EMPTY, notes: data.value.notes, personalization: data.value.personalization }
  }

  function clearAll() {
    data.value = { ...EMPTY }
  }

  return {
    data,
    topicStats,
    weakTopics,
    strongTopics,
    totals,
    recentMistakes,
    recommendations,
    recordAnswer,
    recordReading,
    recordJourney,
    buildContext,
    personalSummary,
    addNote,
    deleteNote,
    setAnalysis,
    setPersonalization,
    exportJson,
    clearProgress,
    clearAll,
  }
})
