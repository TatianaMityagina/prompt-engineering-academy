import type {
  Activity,
  CategorySortActivity,
  Checkpoint,
  FillTheBlankActivity,
  FreeResponseActivity,
  Journey,
  MatchPairsActivity,
  MultipleChoiceActivity,
  NarrativeType,
  TrueFalseActivity,
} from '../../types/journey'
import {
  capitalize,
  extractConcepts,
  pickRandom,
  shuffle,
  splitSentences,
  tokenize,
} from './textParser'

const uid = () => Math.random().toString(36).slice(2, 10)

interface Concept {
  title: string
  sentence: string
  keywords: string[]
}

function truncate(s: string, max = 110): string {
  return s.length > max ? s.slice(0, max).replace(/\s+\S*$/, '') + '…' : s
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Cyrillic-aware word boundary: `\b` treats Cyrillic as a non-word char, so use explicit lookarounds. */
function wordBoundary(word: string): string {
  return `(?<![а-яёa-z0-9])${escapeRegex(word)}(?![а-яёa-z0-9])`
}

/** Remove the concept name from the start of its sentence, so the definition doesn't give the answer away. */
function stripConceptName(sentence: string, title: string): string {
  const t = title.trim()
  if (!t) return sentence
  let rest: string | null = null
  const start = sentence.toLowerCase().indexOf(t.toLowerCase())
  if (start === 0) {
    rest = sentence.slice(t.length)
  } else {
    const m = sentence.match(new RegExp(`^(.{0,3})\\s*${escapeRegex(t)}\\b`, 'i'))
    if (m && sentence.toLowerCase().startsWith(t.toLowerCase().split(/\s+/)[0])) {
      rest = sentence.slice(m[0].length)
    }
  }
  if (rest === null) return sentence
  rest = rest.replace(/^\s*[—–\-:]\s*/, '').replace(/^\s+/, '')
  if (rest.length < 10) return sentence
  return rest.charAt(0).toUpperCase() + rest.slice(1)
}

function conceptTitle(sentence: string): string {
  const dash = sentence.match(/^(.+?)\s*[—–]\s*/)
  if (dash) {
    const phrase = dash[1].replace(/\s+/g, ' ').trim()
    if (phrase.length <= 40) return capitalize(phrase)
  }
  const words = sentence.split(/\s+/).filter(w => w.length > 3)
  if (words.length === 0) return capitalize(sentence.split(/\s+/)[0] || 'Тема')
  return capitalize(words.slice(0, 2).join(' '))
}

function allDigits(text: string): number[] {
  return [...text.matchAll(/\d+/g)].map(m => Number(m[0]))
}

/** Replace a number in the sentence with a different number taken from the document. */
function perturbNumbers(sentence: string, docNumbers: number[]): string | null {
  const numbers = allDigits(sentence)
  if (numbers.length === 0) return null
  const candidates = docNumbers.filter(d => d >= 0 && !numbers.includes(d))
  if (candidates.length === 0) return null
  const target = pickRandom(numbers, 1)[0]
  const replacement = pickRandom(candidates, 1)[0]
  return sentence.replace(String(target), String(replacement))
}

/** Replace a content keyword with a keyword from another sentence. */
function perturbKeyword(sentence: string, keywords: string[], foreignKeywords: string[]): string | null {
  const mine = keywords.filter(k => sentence.includes(k))
  if (mine.length === 0) return null
  const target = pickRandom(mine, 1)[0]
  const foreign = foreignKeywords.filter(k => k !== target && !sentence.includes(k))
  if (foreign.length === 0) return null
  const replacement = pickRandom(foreign, 1)[0]
  const re = new RegExp(wordBoundary(target), 'i')
  if (!re.test(sentence)) return null
  return sentence.replace(re, replacement)
}

/** Swap the trailing phrase with the trailing phrase of another sentence. */
function perturbTail(sentence: string, other: string): string | null {
  const wordsA = sentence.split(/\s+/)
  const wordsB = other.split(/\s+/)
  if (wordsA.length < 6 || wordsB.length < 4) return null
  const cutA = Math.min(wordsA.length - 1, 4)
  const takeB = Math.min(wordsB.length, 4)
  const result = [...wordsA.slice(0, wordsA.length - cutA), ...wordsB.slice(wordsB.length - takeB)].join(' ')
  return result === sentence ? null : result
}

function buildPerturbations(sentence: string, allSentences: string[]): string[] {
  const docNumbers = allSentences.flatMap(allDigits)
  const foreign = shuffle(allSentences.filter(s => s !== sentence))
  const out: string[] = []
  const push = (candidate: string | null) => {
    if (candidate && candidate !== sentence && !out.includes(candidate)) out.push(candidate)
  }
  push(perturbNumbers(sentence, docNumbers))
  push(perturbTail(sentence, foreign[0]))
  push(perturbTail(sentence, foreign[1]))
  for (const f of foreign) {
    push(perturbKeyword(sentence, tokenize(sentence), tokenize(f)))
    if (out.length >= 3) break
  }
  return out.slice(0, 3)
}

const FREE_RESPONSE_TYPES = [
  'ExplainLikeImFive',
  'TeachBack',
  'GiveYourExample',
  'FreeResponse',
] as const

function makeFreeResponse(
  concept: Concept,
  type: (typeof FREE_RESPONSE_TYPES)[number],
  checkpointId: string,
  order: number,
): FreeResponseActivity {
  const prompts: Record<string, string> = {
    ExplainLikeImFive: `Объясни, что такое «${concept.title}», простыми словами — как будто объясняешь ребёнку 10 лет. Избегай сложных терминов.`,
    TeachBack: `Представь, что друг, который совсем не разбирается в теме, спросил тебя: «Что такое «${concept.title}»?». Объясни ему так, чтобы он понял.`,
    GiveYourExample: `Приведи собственный пример, который иллюстрирует понятие «${concept.title}». Объясни, почему твой пример подходит.`,
    FreeResponse: `Своими словами объясни, о чём говорится в следующем утверждении.`,
  }
  return {
    id: uid(),
    type,
    title: `Разберёмся в понятии: ${concept.title}`,
    prompt: prompts[type],
    context: type === 'FreeResponse' ? truncate(concept.sentence, 240) : undefined,
    difficulty: 1,
    xpBase: 20,
    hints: [{ text: `В тексте сказано: «${truncate(concept.sentence)}»`, xpCost: 5 }],
    conceptId: checkpointId,
    feedback: `Вот как это сформулировано в материале: ${concept.sentence}`,
    rubric: [
      'Передана основная идея понятия',
      'Присутствуют ключевые термины',
      'Нет фактических ошибок',
    ],
    keyConcepts: concept.keywords.slice(0, 5),
    modelAnswer: concept.sentence,
    order,
  } as unknown as FreeResponseActivity
}

function makeMultipleChoice(
  concept: Concept,
  allSentences: string[],
  checkpointId: string,
  order: number,
): MultipleChoiceActivity | null {
  const correct = concept.sentence
  const distractors = buildPerturbations(correct, allSentences)
  if (distractors.length < 3) return null
  const options = shuffle([correct, ...distractors])
  const correctIndex = options.indexOf(correct)
  return {
    id: uid(),
    type: 'MultipleChoice',
    title: `Что говорит текст про «${concept.title}»?`,
    prompt: `Выбери утверждение, которое соответствует смыслу текста про «${concept.title}».`,
    difficulty: 2,
    xpBase: 30,
    hints: [{ text: `Сверь варианты с фрагментом: «${truncate(correct)}»`, xpCost: 5 }],
    conceptId: checkpointId,
    feedback: `Верное утверждение: ${truncate(correct, 160)}`,
    options,
    correctIndex,
    order,
  } as unknown as MultipleChoiceActivity
}

/** Common predicates whose negation turns a factual sentence into a clearly false one. */
const NEGATE_MARKERS = [
  'включают', 'включает', 'используются', 'используется', 'поддерживают',
  'поддерживаются', 'поддерживается', 'записываются', 'вызывается',
  'выполняется', 'принадлежат', 'переопределять', 'содержит', 'называется',
  'реализуется', 'может', 'могут',
]

/** Negate the predicate so the statement clearly contradicts the material ("X — это Y" -> "X — это не Y"). */
function falsifySentence(sentence: string): string | null {
  if (/ не /.test(sentence)) return null
  if (/(—|–)\s*это(?=\s)/.test(sentence)) {
    return sentence.replace(/(—|–)\s*это(?=\s)/, m => m + ' не')
  }
  const first = NEGATE_MARKERS
    .map(verb => ({ verb, re: new RegExp(wordBoundary(verb), 'i') }))
    .map(m => ({ ...m, index: sentence.search(m.re) }))
    .filter(m => m.index >= 0)
    .sort((a, b) => a.index - b.index)[0]
  if (first) return sentence.replace(first.re, `не ${first.verb}`)
  return null
}

function makeTrueFalse(
  concept: Concept,
  checkpointId: string,
  order: number,
): TrueFalseActivity {
  const falseStatement = falsifySentence(concept.sentence)
  const usePerturbed = !!falseStatement && Math.random() > 0.35
  const statement = usePerturbed ? falseStatement : concept.sentence
  const correctAnswer = !usePerturbed
  return {
    id: uid(),
    type: 'TrueFalse',
    title: `Правда или ложь: «${concept.title}»`,
    prompt: `Верно ли следующее утверждение?`,
    context: statement,
    difficulty: 2,
    xpBase: 20,
    hints: [{ text: `Проверь утверждение по тексту: «${truncate(concept.sentence)}»`, xpCost: 5 }],
    conceptId: checkpointId,
    feedback: `В тексте утверждается: ${concept.sentence}`,
    correctAnswer,
    order,
  } as unknown as TrueFalseActivity
}

function makeFillTheBlank(
  concept: Concept,
  checkpointId: string,
  order: number,
): FillTheBlankActivity | null {
  const sentence = concept.sentence
  const lower = sentence.toLowerCase()
  const candidates = concept.keywords.filter(k => k.length >= 4 && lower.includes(k.toLowerCase()))

  let target: string | null = null
  for (const cand of candidates) {
    const idx = lower.indexOf(cand.toLowerCase())
    const before = sentence.slice(0, idx).trim()
    const after = sentence.slice(idx + cand.length).trim()
    if (before.length >= 8 && after.length >= 8) {
      target = cand
      break
    }
  }
  if (!target) return null

  const idx = lower.indexOf(target.toLowerCase())
  const before = sentence.slice(0, idx).replace(/\s+$/, '')
  const after = sentence.slice(idx + target.length).replace(/^\s+/, '')

  return {
    id: uid(),
    type: 'FillTheBlank',
    title: `Ключевое слово: ${concept.title}`,
    prompt: `Вставь пропущенный термин.`,
    context: `Прочитай предложение и дополни пропуск.`,
    difficulty: 1,
    xpBase: 20,
    hints: [{ text: `Первая буква — «${target[0].toUpperCase()}», слово связано с «${concept.title}».`, xpCost: 5 }],
    conceptId: checkpointId,
    feedback: `Правильное слово: «${target}». Полностью: ${sentence}`,
    parts: [{ text: before + ' ' }, { isBlank: true, text: '' }, { text: ' ' + after }],
    correctAnswers: [target],
    acceptableAnswers: [[target, capitalize(target), target.toLowerCase()]],
    order,
  } as unknown as FillTheBlankActivity
}

function makeMatchPairs(
  concepts: Concept[],
  checkpointId: string,
  order: number,
): MatchPairsActivity | null {
  if (concepts.length < 3) return null
  const sample = concepts.slice(0, 4)
  const leftItems = sample.map(c => c.title)
  const rightItems = sample.map(c => truncate(stripConceptName(c.sentence, c.title), 90))
  const correctPairs: Record<number, number> = {}
  const rightOrder = shuffle(sample.map((_, i) => i))
  rightOrder.forEach((rightIdx, leftIdx) => {
    correctPairs[leftIdx] = rightIdx
  })
  return {
    id: uid(),
    type: 'MatchPairs',
    title: 'Соедини понятие с определением',
    prompt: 'Соедини каждое понятие с подходящим определением из материала.',
    difficulty: 2,
    xpBase: 30,
    hints: [{ text: 'Ищи ключевые слова, которые встречаются и в понятии, и в определении.', xpCost: 5 }],
    conceptId: checkpointId,
    feedback: 'Каждое понятие соответствует своему определению из текста.',
    leftItems,
    rightItems,
    correctPairs,
    order,
  } as unknown as MatchPairsActivity
}

function makeCategorySort(
  concepts: Concept[],
  checkpointId: string,
  order: number,
): CategorySortActivity | null {
  if (concepts.length < 2) return null
  const sample = concepts.slice(0, 4)
  const categories = sample.map(c => c.title)
  const items = sample.map(c => truncate(stripConceptName(c.sentence, c.title), 100))
  const itemCategory = sample.map((_, i) => i)
  return {
    id: uid(),
    type: 'CategorySort',
    title: 'Разложи утверждения по темам',
    prompt: 'Распредели каждое утверждение по соответствующей теме.',
    difficulty: 2,
    xpBase: 30,
    hints: [{ text: 'Каждое утверждение взято из текста про свою тему.', xpCost: 5 }],
    conceptId: checkpointId,
    feedback: 'Каждое утверждение относится к теме, о которой говорится в тексте.',
    categories,
    items,
    itemCategory,
    order,
  } as unknown as CategorySortActivity
}

export function generateJourneyLocally(input: {
  topic: string
  text: string
  narrativeType: NarrativeType
}): Journey {
  const allSentences = splitSentences(input.text)
  const concepts: Concept[] = extractConcepts(input.text, 6).map(c => ({
    title: conceptTitle(c.text),
    sentence: c.text,
    keywords: c.keywords,
  }))

  const checkpoints: Checkpoint[] = []
  concepts.forEach((concept, i) => {
    const checkpointId = uid()
    const activities: Activity[] = []
    const freeType = FREE_RESPONSE_TYPES[i % FREE_RESPONSE_TYPES.length]
    activities.push(makeFreeResponse(concept, freeType, checkpointId, 0) as Activity)

    const closedKind = i % 3
    if (closedKind === 0) {
      const mc = makeMultipleChoice(concept, allSentences, checkpointId, activities.length)
      if (mc) activities.push(mc as Activity)
      else {
        const tf = makeTrueFalse(concept, checkpointId, activities.length)
        activities.push(tf as Activity)
      }
    } else if (closedKind === 1) {
      const ftb = makeFillTheBlank(concept, checkpointId, activities.length)
      if (ftb) activities.push(ftb as Activity)
      else {
        const tf = makeTrueFalse(concept, checkpointId, activities.length)
        activities.push(tf as Activity)
      }
    } else {
      const tf = makeTrueFalse(concept, checkpointId, activities.length)
      activities.push(tf as Activity)
    }

    if (i % 2 === 1) {
      const match = makeMatchPairs(concepts, checkpointId, activities.length)
      if (match) activities.push(match as Activity)
    }
    if (i % 3 === 2) {
      const sort = makeCategorySort(concepts, checkpointId, activities.length)
      if (sort) activities.push(sort as Activity)
    }

    const firstActivities = activities.slice(0, 3)

    checkpoints.push({
      id: checkpointId,
      order: i,
      title: concept.title,
      summary: truncate(concept.sentence, 180),
      sourceQuote: concept.sentence,
      difficulty: i === 0 ? 1 : i === concepts.length - 1 ? 3 : 2,
      timeLimitSec: 150 + i * 30,
      activities: firstActivities,
    })
  })

  const totalTimeSec = checkpoints.reduce((acc, c) => acc + c.timeLimitSec, 0)

  return {
    id: uid(),
    title: capitalize(input.topic.trim()) || 'Knowledge Journey',
    sourceTopic: input.topic.trim(),
    sourceText: input.text.trim(),
    narrativeType: input.narrativeType,
    checkpoints,
    totalTimeSec,
    createdAt: Date.now(),
    generatedBy: 'local',
  }
}
