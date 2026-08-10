export interface ParsedSentence {
  index: number
  text: string
  score: number
  keywords: string[]
}

const STOPWORDS = new Set([
  'это', 'что', 'как', 'для', 'при', 'или', 'то', 'который', 'которые', 'когда', 'если', 'бы', 'не', 'ни',
  'и', 'а', 'но', 'на', 'по', 'из', 'от', 'в', 'во', 'с', 'со', 'о', 'об', 'до', 'за', 'про', 'у', 'к',
  'можно', 'очень', 'также', 'только', 'уже', 'ещё', 'же', 'чтобы', 'будет', 'быть', 'есть', 'вот', 'там',
  'здесь', 'эти', 'этого', 'этом', 'этой', 'все', 'всё', 'вся', 'весь', 'более', 'более-менее', 'является',
  'например', 'потому', 'так', 'тогда', 'свой', 'свои', 'своя', 'его', 'её', 'их', 'нам', 'вам', 'мне',
  'меня', 'тебя', 'тебе', 'нас', 'вас', 'мы', 'вы', 'он', 'она', 'они', 'оно', 'данный', 'данные', 'такие',
  'такой', 'такая', 'такое', 'должен', 'должна', 'должны', 'может', 'могут', 'нужно', 'надо', 'через',
  'между', 'после', 'перед', 'вообще', 'именно', 'иметь', 'имеет', 'имеют', 'делать', 'делает', 'сделать',
])

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^а-яёa-z0-9-]+/i)
    .filter(t => t.length >= 3 && !STOPWORDS.has(t))
}

export function keywordFrequency(sentences: string[]): Map<string, number> {
  const freq = new Map<string, number>()
  for (const s of sentences) {
    for (const t of new Set(tokenize(s))) {
      freq.set(t, (freq.get(t) || 0) + 1)
    }
  }
  return freq
}

export function splitSentences(text: string): string[] {
  const paragraphs = text
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n|\n(?=\s*[•\-\dA-ZА-Я])/g)
  const sentences: string[] = []
  for (const para of paragraphs) {
    const chunks = para
      .split(/(?<=[.!?])\s+/g)
      .flatMap(c => c.split('\n'))
    for (const chunk of chunks) {
      const clean = chunk.replace(/^[\s•\-–*\d.]+/, '').trim()
      if (clean.length >= 24 && clean.length <= 500) sentences.push(clean)
    }
  }
  return sentences
}

const DEFINITION_MARKERS = ['—', ' это ', ' называется', ' означает', ' — это', ': ']

export function extractConcepts(text: string, maxConcepts = 6): ParsedSentence[] {
  const sentences = splitSentences(text)
  if (sentences.length === 0) return []

  const freq = keywordFrequency(sentences)
  const totalDocs = sentences.length

  const scored: ParsedSentence[] = sentences.map((s, index) => {
    const tokens = tokenize(s)
    const uniqueTokens = new Set(tokens)
    let score = 0

    if (uniqueTokens.size >= 5) score += 1
    if (uniqueTokens.size >= 10) score += 1
    if (s.length >= 60 && s.length <= 260) score += 1

    if (DEFINITION_MARKERS.some(m => s.includes(m))) score += 3
    if (/\d/.test(s)) score += 2

    const idf = (t: string) => {
      const df = freq.get(t) || 0
      return df > 0 ? Math.log(totalDocs / df) + 1 : 0
    }
    const avgIdf = [...uniqueTokens].reduce((acc, t) => acc + idf(t), 0) / Math.max(1, uniqueTokens.size)
    score += Math.min(2, avgIdf * 0.3)

    return { index, text: s, score, keywords: [...uniqueTokens] }
  })

  scored.sort((a, b) => b.score - a.score)

  const minConcepts = 3
  const strong = scored.filter(s => s.score >= 3.5)
  const pool = strong.length >= minConcepts ? strong : scored.slice(0, minConcepts)

  const selected: ParsedSentence[] = []
  for (const s of pool) {
    if (selected.length >= maxConcepts) break
    const overlap = selected.some(sel => {
      const a = new Set(sel.keywords)
      const b = s.keywords
      const inter = b.filter(k => a.has(k)).length
      return inter / Math.max(1, Math.min(a.size, b.length)) > 0.5
    })
    if (!overlap) selected.push(s)
  }

  if (selected.length < 2) {
    for (const s of scored) {
      if (selected.length >= 2) break
      if (!selected.includes(s)) selected.push(s)
    }
  }

  selected.sort((a, b) => a.index - b.index)

  return selected
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, n)
}

export function shuffle<T>(arr: T[]): T[] {
  return pickRandom(arr, arr.length)
}
