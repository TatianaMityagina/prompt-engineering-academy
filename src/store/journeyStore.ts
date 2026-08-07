import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type {
  Achievement,
  Activity,
  ActivityResult,
  Checkpoint,
  CheckpointResult,
  Journey,
  JourneyResult,
} from '../types/journey'

const KEY_JOURNEYS = 'kj_journeys'
const KEY_PROFILE = 'kj_profile'
const KEY_ACTIVE = 'kj_active_run'

export interface Profile {
  totalXp: number
  achievements: Achievement[]
  completedJourneys: number
  bestStreak: number
  activitiesDone: number
}

export interface ActiveRun {
  journey: Journey
  checkpointIndex: number
  activityIndex: number
  startedAt: number
  checkpointStartedAt: number
  remainingSec: number
  results: Record<string, ActivityResult>
  checkpointResults: Record<string, CheckpointResult>
  streak: number
  timedOutCheckpoint: boolean
}

interface AchievementDef {
  id: string
  title: string
  description: string
  icon: string
}

const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { id: 'first_activity', title: 'Первые шаги', description: 'Ответь на первую активность', icon: '👣' },
  { id: 'streak_3', title: 'На волне', description: '3 правильных ответа подряд', icon: '🔥' },
  { id: 'streak_5', title: 'Неудержимый', description: '5 правильных ответов подряд', icon: '⚡' },
  { id: 'speed_demon', title: 'Скорость мысли', description: 'Ответь, потратив менее 25% времени чекпоинта', icon: '🚀' },
  { id: 'perfect_checkpoint', title: 'Идеальный чекпоинт', description: 'Пройди чекпоинт без единой ошибки', icon: '💎' },
  { id: 'journey_done', title: 'Путешественник', description: 'Заверши первое путешествие', icon: '🧭' },
  { id: 'explorer', title: 'Исследователь', description: 'Заверши 3 путешествия', icon: '🗺️' },
  { id: 'scholar', title: 'Учёный', description: 'Набери 500 XP', icon: '🎓' },
]

const LEVELS: Array<{ min: number; title: string; icon: string }> = [
  { min: 0, title: 'Новичок', icon: '🌱' },
  { min: 200, title: 'Исследователь', icon: '🔍' },
  { min: 500, title: 'Знаток', icon: '📚' },
  { min: 1000, title: 'Мастер', icon: '🎓' },
  { min: 2000, title: 'Легенда', icon: '👑' },
]

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw) as T
  } catch {
    // ignore
  }
  return fallback
}

export const useJourneyStore = defineStore('kj-journey', () => {
  const journeys = ref<Journey[]>(loadJSON<Journey[]>(KEY_JOURNEYS, []))
  const resultsHistory = ref<JourneyResult[]>(loadJSON<JourneyResult[]>('kj_results', []))
  const profile = ref<Profile>(loadJSON<Profile>(KEY_PROFILE, {
    totalXp: 0,
    achievements: [],
    completedJourneys: 0,
    bestStreak: 0,
    activitiesDone: 0,
  }))
  const activeRun = ref<ActiveRun | null>(loadActiveRun())
  const lastResult = ref<JourneyResult | null>(null)

  const currentCheckpoint = computed<Checkpoint | null>(() => {
    if (!activeRun.value) return null
    const cp = activeRun.value.journey.checkpoints[activeRun.value.checkpointIndex]
    return cp || null
  })

  const currentActivity = computed<Activity | null>(() => {
    const cp = currentCheckpoint.value
    if (!cp) return null
    const act = cp.activities[activeRun.value?.activityIndex || 0]
    return act || null
  })

  const totalActivities = computed(() => {
    if (!activeRun.value) return 0
    return activeRun.value.journey.checkpoints.reduce((a, c) => a + c.activities.length, 0)
  })

  const answeredCount = computed(() => {
    if (!activeRun.value) return 0
    return Object.keys(activeRun.value.results).length
  })

  const currentRunProgress = computed(() => {
    const total = totalActivities.value
    if (total === 0) return 0
    return Math.min(100, Math.round((answeredCount.value / total) * 100))
  })

  const levelInfo = computed(() => {
    const xp = profile.value.totalXp
    const level = [...LEVELS].reverse().find(l => xp >= l.min) || LEVELS[0]
    const next = LEVELS.find(l => l.min > xp)
    const progress = next
      ? Math.min(100, Math.round(((xp - level.min) / (next.min - level.min)) * 100))
      : 100
    return { level, next, progress }
  })

  function loadActiveRun(): ActiveRun | null {
    return loadJSON<ActiveRun | null>(KEY_ACTIVE, null)
  }

  function persistJourneys() {
    try {
      localStorage.setItem(KEY_JOURNEYS, JSON.stringify(journeys.value))
    } catch {
      // ignore
    }
  }

  function persistProfile() {
    try {
      localStorage.setItem(KEY_PROFILE, JSON.stringify(profile.value))
    } catch {
      // ignore
    }
  }

  function persistActiveRun() {
    if (activeRun.value) {
      try {
        localStorage.setItem(KEY_ACTIVE, JSON.stringify(activeRun.value))
      } catch {
        // ignore
      }
    }
  }

  function addJourney(journey: Journey) {
    const existing = journeys.value.find(j => j.id === journey.id)
    if (!existing) {
      journeys.value.unshift(journey)
      persistJourneys()
    }
  }

  function deleteJourney(id: string) {
    const idx = journeys.value.findIndex(j => j.id === id)
    if (idx === -1) return
    journeys.value.splice(idx, 1)
    persistJourneys()
    if (activeRun.value?.journey.id === id) {
      activeRun.value = null
      localStorage.removeItem(KEY_ACTIVE)
    }
  }

  function startRun(journey: Journey) {
    const first = journey.checkpoints[0]
    activeRun.value = {
      journey,
      checkpointIndex: 0,
      activityIndex: 0,
      startedAt: Date.now(),
      checkpointStartedAt: Date.now(),
      remainingSec: first ? first.timeLimitSec : 0,
      results: {},
      checkpointResults: {},
      streak: 0,
      timedOutCheckpoint: false,
    }
    persistActiveRun()
  }

  function tick(): 'timeout' | 'running' {
    if (!activeRun.value) return 'running'
    activeRun.value.remainingSec = Math.max(0, activeRun.value.remainingSec - 1)
    return activeRun.value.remainingSec <= 0 ? 'timeout' : 'running'
  }

  function currentTimeSpentSec(): number {
    if (!activeRun.value) return 0
    return Math.max(1, Math.round((Date.now() - activeRun.value.checkpointStartedAt) / 1000))
  }

  function unlockAchievement(def: AchievementDef, checkExisting = true): Achievement | null {
    if (checkExisting && profile.value.achievements.some(a => a.id === def.id)) return null
    const achievement: Achievement = { ...def, earnedAt: Date.now() }
    profile.value.achievements.push(achievement)
    persistProfile()
    return achievement
  }

  function computeXp(activity: Activity, isCorrect: boolean, timeSpentSec: number, hintsUsed: number): { xp: number; speedBonus: number; streakBonus: number } {
    if (!isCorrect) return { xp: 0, speedBonus: 0, streakBonus: 0 }
    const cpTime = currentCheckpoint.value?.timeLimitSec || 180
    const speedBonus = timeSpentSec <= cpTime * 0.5 ? Math.round(activity.xpBase * 0.25) : 0
    const multiplier = Math.min(2, 1 + (activeRun.value?.streak || 0) * 0.1)
    const streakBonus = Math.round((activity.xpBase + speedBonus) * (multiplier - 1))
    const xp = Math.max(10, Math.round((activity.xpBase + speedBonus + streakBonus) * (1 - hintsUsed * 0.15)))
    return { xp, speedBonus, streakBonus }
  }

  function submitAnswer(payload: {
    activity: Activity
    correct: boolean
    verdict: ActivityResult['verdict']
    answer: unknown
    userText?: string
    feedback: string
    partial?: number
    timeSpentSec: number
    hintsUsed: number
  }): { xp: number; streak: number; unlocked: Achievement[] } {
    if (!activeRun.value) return { xp: 0, streak: 0, unlocked: [] }
    const { activity, correct, verdict, answer, userText, feedback, partial, timeSpentSec, hintsUsed } = payload

    const cp = currentCheckpoint.value
    const run = activeRun.value
    const { xp } = computeXp(activity, correct, timeSpentSec, hintsUsed)

    if (correct) {
      run.streak += 1
    } else {
      run.streak = 0
    }
    profile.value.bestStreak = Math.max(profile.value.bestStreak, run.streak)

    const result: ActivityResult = {
      activityId: activity.id,
      activityType: activity.type,
      prompt: activity.prompt,
      correct,
      partial,
      verdict,
      answer,
      userText,
      feedback,
      xpEarned: xp,
      timeSpentSec,
      hintsUsed,
    }
    run.results[activity.id] = result

    profile.value.totalXp += xp
    profile.value.activitiesDone += 1

    const unlocked: Achievement[] = []
    const maybe = (def: AchievementDef) => {
      const a = unlockAchievement(def)
      if (a) unlocked.push(a)
    }

    if (profile.value.activitiesDone === 1) maybe(ACHIEVEMENT_DEFS.find(d => d.id === 'first_activity')!)
    if (run.streak >= 3) maybe(ACHIEVEMENT_DEFS.find(d => d.id === 'streak_3')!)
    if (run.streak >= 5) maybe(ACHIEVEMENT_DEFS.find(d => d.id === 'streak_5')!)
    if (timeSpentSec <= (cp?.timeLimitSec || 180) * 0.25) maybe(ACHIEVEMENT_DEFS.find(d => d.id === 'speed_demon')!)
    if (profile.value.totalXp >= 500) maybe(ACHIEVEMENT_DEFS.find(d => d.id === 'scholar')!)

    const cpActivities = cp?.activities || []
    const allAnswered = cpActivities.every(a => run.results[a.id])
    if (allAnswered && cpActivities.length > 0 && cpActivities.every(a => run.results[a.id]?.correct)) {
      maybe(ACHIEVEMENT_DEFS.find(d => d.id === 'perfect_checkpoint')!)
    }

    persistProfile()
    persistActiveRun()
    return { xp, streak: run.streak, unlocked }
  }

  function hasUnansweredInCheckpoint(cp: Checkpoint): boolean {
    if (!activeRun.value) return false
    return cp.activities.some(a => !activeRun.value!.results[a.id])
  }

  function markRemainingAsTimeout(): ActivityResult[] {
    const run = activeRun.value
    const cp = currentCheckpoint.value
    if (!run || !cp) return []
    const results: ActivityResult[] = []
    for (const activity of cp.activities) {
      if (run.results[activity.id]) continue
      const result: ActivityResult = {
        activityId: activity.id,
        activityType: activity.type,
        prompt: activity.prompt,
        correct: false,
        verdict: 'timeout',
        answer: null,
        feedback: 'Время вышло. Ответ не засчитан — вернись к этому чекпоинту позже или перечитай материал.',
        xpEarned: 0,
        timeSpentSec: 0,
        hintsUsed: 0,
      }
      run.results[activity.id] = result
      run.streak = 0
      results.push(result)
    }
    run.timedOutCheckpoint = true
    persistActiveRun()
    return results
  }

  function checkpointResult(cp: Checkpoint): { score: number; xp: number; correct: number; total: number } {
    const run = activeRun.value
    if (!run) return { score: 0, xp: 0, correct: 0, total: cp.activities.length }
    const results = cp.activities.map(a => run.results[a.id]).filter(Boolean)
    const correct = results.filter(r => r.correct).length
    const total = cp.activities.length
    const xp = results.reduce((a, r) => a + r.xpEarned, 0)
    return { score: total ? Math.round((correct / total) * 100) : 0, xp, correct, total }
  }

  function finalizeCheckpoint() {
    const run = activeRun.value
    const cp = currentCheckpoint.value
    if (!run || !cp) return
    if (run.checkpointResults[cp.id]) return
    const { score, xp, correct, total } = checkpointResult(cp)
    run.checkpointResults[cp.id] = {
      checkpointId: cp.id,
      title: cp.title,
      score,
      xpEarned: xp,
      completed: true,
      timedOut: run.timedOutCheckpoint,
    }
    const perfect = total > 0 && correct === total && !run.timedOutCheckpoint
    if (perfect) {
      const bonus = 50
      run.checkpointResults[cp.id].xpEarned += bonus
      profile.value.totalXp += bonus
      persistProfile()
    }
    run.timedOutCheckpoint = false
  }

  function next(): boolean {
    const run = activeRun.value
    const cp = currentCheckpoint.value
    if (!run || !cp) return false
    if (run.activityIndex < cp.activities.length - 1) {
      run.activityIndex += 1
    } else if (run.checkpointIndex < run.journey.checkpoints.length - 1) {
      finalizeCheckpoint()
      run.checkpointIndex += 1
      run.activityIndex = 0
      const nextCp = run.journey.checkpoints[run.checkpointIndex]
      run.checkpointStartedAt = Date.now()
      run.remainingSec = nextCp ? nextCp.timeLimitSec : 0
    } else {
      finalizeCheckpoint()
      return false
    }
    persistActiveRun()
    return true
  }

  function buildConceptReviews(): JourneyResult['conceptReviews'] {
    const run = activeRun.value
    if (!run) return []
    return run.journey.checkpoints.map(cp => {
      const { score } = checkpointResult(cp)
      const results = cp.activities.map(a => run.results[a.id]).filter(Boolean)
      const strengths = results
        .filter(r => r.correct)
        .map(r => `Верно разобрал(а): «${r.activityType === 'TrueFalse' || r.activityType === 'MultipleChoice' || r.activityType === 'FillTheBlank' || r.activityType === 'MatchPairs' ? r.prompt : r.userText || r.prompt}»`.slice(0, 140))
      const improvements = results
        .filter(r => !r.correct)
        .map(r => `Повтори материал по теме «${cp.title}» (задание: ${r.prompt.slice(0, 90)})`.slice(0, 160))
      return {
        checkpointId: cp.id,
        title: cp.title,
        score,
        strengths: strengths.slice(0, 4),
        improvements: improvements.slice(0, 4),
      }
    })
  }

  function buildSummary(overallScore: number): string {
    if (overallScore >= 85) {
      return 'Отличный результат! Ты уверенно владеешь материалом и правильно отвечаешь на вопросы. Обрати внимание на раздел «Области для улучшения», чтобы закрыть оставшиеся пробелы.'
    }
    if (overallScore >= 60) {
      return 'Хороший результат! База усвоена, но некоторые концепции стоит закрепить. Перечитай материал по чекпоинтам с низким процентом и повтори путешествие.'
    }
    return 'Материал ещё не закреплён. Рекомендуем вернуться к исходному тексту, а затем пройти путешествие ещё раз — повторение с интервалом лучше всего закрепляет знания.'
  }

  function finishRun(): JourneyResult {
    const run = activeRun.value
    if (!run) throw new Error('Нет активного прохождения')

    const activities = run.journey.checkpoints.flatMap(cp =>
      cp.activities.map(a => run.results[a.id]).filter((r): r is ActivityResult => !!r),
    )
    const xpBreakdown = {
      correctBase: 0,
      speedBonus: 0,
      streakBonus: 0,
      checkpointBonus: 0,
      completionBonus: 0,
    }

    const totalXp = activities.reduce((a, r) => a + r.xpEarned, 0)
    const checkpoints = run.journey.checkpoints.map(cp => run.checkpointResults[cp.id]).filter(Boolean)
    const overallScore = Math.round(
      (activities.reduce((a, r) => a + (r.correct ? 1 : r.partial ? r.partial : 0), 0) / Math.max(1, activities.length)) * 100,
    )

    const unlocked: Achievement[] = []
    const maybe = (def: AchievementDef) => {
      const a = unlockAchievement(def)
      if (a) unlocked.push(a)
    }
    const journeyDone = ACHIEVEMENT_DEFS.find(d => d.id === 'journey_done')!
    profile.value.completedJourneys += 1
    maybe(journeyDone)
    if (profile.value.completedJourneys >= 3) maybe(ACHIEVEMENT_DEFS.find(d => d.id === 'explorer')!)

    const completionBonus = 100
    profile.value.totalXp += completionBonus

    const result: JourneyResult = {
      journeyId: run.journey.id,
      journeyTitle: run.journey.title,
      startedAt: run.startedAt,
      finishedAt: Date.now(),
      totalTimeSec: Math.round((Date.now() - run.startedAt) / 1000),
      totalXp: totalXp + completionBonus,
      xpBreakdown: { ...xpBreakdown, completionBonus },
      activities,
      checkpoints,
      achievements: unlocked,
      conceptReviews: buildConceptReviews(),
      summaryText: buildSummary(overallScore),
    }

    resultsHistory.value.unshift(result)
    try {
      localStorage.setItem('kj_results', JSON.stringify(resultsHistory.value.slice(0, 20)))
    } catch {
      // ignore
    }
    persistProfile()
    activeRun.value = null
    localStorage.removeItem(KEY_ACTIVE)
    lastResult.value = result
    return result
  }

  function abortRun() {
    activeRun.value = null
    localStorage.removeItem(KEY_ACTIVE)
  }

  function isActivityAnswered(activityId: string): boolean {
    return !!activeRun.value?.results[activityId]
  }

  function getActivityResult(activityId: string): ActivityResult | undefined {
    return activeRun.value?.results[activityId]
  }

  return {
    journeys,
    resultsHistory,
    profile,
    activeRun,
    lastResult,
    currentCheckpoint,
    currentActivity,
    totalActivities,
    answeredCount,
    currentRunProgress,
    levelInfo,
    addJourney,
    deleteJourney,
    startRun,
    tick,
    currentTimeSpentSec,
    submitAnswer,
    hasUnansweredInCheckpoint,
    markRemainingAsTimeout,
    checkpointResult,
    finalizeCheckpoint,
    next,
    finishRun,
    abortRun,
    isActivityAnswered,
    getActivityResult,
    persistActiveRun,
  }
})
