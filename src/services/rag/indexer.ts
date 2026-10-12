import type { Article } from '../../data/articles'
import type { Activity, Journey } from '../../types/journey'
import type { AiNote } from '../../types/learner'
import type { Chunk, ContentOrigin } from './types'
import { articleSections, articleTopic, stripEmoji } from './sections'

const MAX_CHUNK_CHARS = 700

export function hashString(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

function makeChunk(c: Omit<Chunk, 'hash'>): Chunk {
  return { ...c, hash: hashString(`${c.section}|${c.text}`) }
}

function splitParagraphs(body: string): string[] {
  const paragraphs = body.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
  const parts: string[] = []
  let current = ''
  for (const p of paragraphs) {
    if (current && current.length + p.length > MAX_CHUNK_CHARS) {
      parts.push(current)
      current = p
    } else {
      current = current ? `${current}\n\n${p}` : p
    }
  }
  if (current) parts.push(current)
  return parts
}

export function describeArticleExercise(component: string, props: any): string | null {
  const fb = props.feedback ? `\nПояснение: ${props.feedback}` : ''
  switch (component) {
    case 'TrueFalse':
      return `Утверждение: «${props.statement}». Это ${props.correctAnswer ? 'верно' : 'неверно'}.${fb}`
    case 'MultipleChoice':
      return `Вопрос: ${props.question}\nПравильный ответ: ${props.options?.[props.correctAnswer]}.${fb}`
    case 'OrderSteps':
      return `Расположите по порядку. Правильный порядок: ${(props.correctAnswer || []).join(' → ')}.${fb}`
    case 'PromptBuilder':
      return `Соберите промпт из блоков. Правильный порядок: ${(props.correctAnswer || [])
        .map((i: number) => `${props.blocks?.[i]?.type}: «${props.blocks?.[i]?.text}»`)
        .join(' → ')}.${fb}`
    case 'MatchPairs': {
      const pairs = Object.entries(props.correctAnswer || {}).map(
        ([l, r]) => `${props.leftItems?.[Number(l)]} — ${props.rightItems?.[Number(r)]}`,
      )
      return `Соответствия: ${pairs.join('; ')}.${fb}`
    }
    case 'FillTheBlank':
      return `Заполните пропуски: ${props.context}\nОтветы: ${(props.correctAnswer || []).join(', ')}.${fb}`
    default:
      return null
  }
}

export function chunkArticles(articles: Article[]): Chunk[] {
  const chunks: Chunk[] = []
  for (const article of articles) {
    for (const section of articleSections(article)) {
      const route = `/article/${article.slug}#${section.id}`
      const topic = articleTopic(article, section)
      splitParagraphs(section.body).forEach((text, i) => {
        chunks.push(makeChunk({
          id: `a${article.id}-${section.id}-p${i}`,
          kind: 'article-section',
          origin: 'human',
          sourceTitle: article.title,
          section: stripEmoji(section.title),
          topic,
          text,
          route,
        }))
      })
      for (const blockIndex of section.blockIndexes) {
        const block = article.content[blockIndex]
        if (block.type !== 'exercise' || !block.component) continue
        const text = describeArticleExercise(block.component, block.props || {})
        if (!text) continue
        chunks.push(makeChunk({
          id: `a${article.id}-ex${blockIndex}`,
          kind: 'article-exercise',
          origin: 'human',
          sourceTitle: article.title,
          section: `Упражнение: ${block.props?.title || stripEmoji(section.title)}`,
          topic,
          text,
          route,
        }))
      }
    }
  }
  return chunks
}

function describeActivity(a: Activity): string {
  const fb = a.feedback ? `\nПояснение: ${a.feedback}` : ''
  switch (a.type) {
    case 'MultipleChoice':
      return `Вопрос: ${a.prompt}\nПравильный ответ: ${a.options[a.correctIndex]}.${fb}`
    case 'TrueFalse':
      return `Утверждение: «${a.prompt}». Это ${a.correctAnswer ? 'верно' : 'неверно'}.${fb}`
    case 'FillTheBlank':
      return `${a.prompt}\nОтветы: ${a.correctAnswers.join(', ')}.${fb}`
    case 'MatchPairs':
      return `${a.prompt}\nСоответствия: ${Object.entries(a.correctPairs)
        .map(([l, r]) => `${a.leftItems[Number(l)]} — ${a.rightItems[Number(r)]}`)
        .join('; ')}.${fb}`
    case 'OrderSteps':
      return `${a.prompt}\nПравильный порядок: ${a.correctOrder.join(' → ')}.${fb}`
    case 'PromptBuilder':
      return `${a.prompt}\nПорядок блоков: ${a.correctOrder.map(i => a.blocks[i]?.type).join(' → ')}.${fb}`
    case 'CategorySort':
      return `${a.prompt}\n${a.items.map((it, i) => `${it} → ${a.categories[a.itemCategory[i]]}`).join('; ')}.${fb}`
    default:
      return `Вопрос: ${a.prompt}${a.modelAnswer ? `\nЭталонный ответ: ${a.modelAnswer}` : ''}${fb}`
  }
}

/** Journey индексируется по чекпоинтам и активностям («вопрос → ответ»). */
export function chunkJourneys(journeys: Journey[]): Chunk[] {
  const chunks: Chunk[] = []
  for (const j of journeys) {
    const origin: ContentOrigin = j.generatedBy === 'ai' ? 'ai' : 'local'
    for (const cp of j.checkpoints) {
      const route = `/journeys/${j.id}`
      const topic = `${j.title} → ${cp.title}`
      chunks.push(makeChunk({
        id: `j${j.id}-${cp.id}`,
        kind: 'journey-checkpoint',
        origin,
        sourceTitle: j.title,
        section: cp.title,
        topic,
        text: [cp.summary, cp.sourceQuote ? `Из исходного текста: «${cp.sourceQuote}»` : '']
          .filter(Boolean)
          .join('\n'),
        route,
      }))
      for (const a of cp.activities) {
        chunks.push(makeChunk({
          id: `j${j.id}-${a.id}`,
          kind: 'journey-activity',
          origin,
          sourceTitle: j.title,
          section: `${cp.title}: ${a.title || 'задание'}`,
          topic,
          text: describeActivity(a),
          route,
        }))
      }
    }
  }
  return chunks
}

export function chunkNotes(notes: AiNote[]): Chunk[] {
  return notes.map(n => makeChunk({
    id: `n${n.id}`,
    kind: 'note',
    origin: 'ai',
    sourceTitle: 'Мои ИИ-заметки',
    section: n.title,
    topic: n.topic,
    text: n.text.slice(0, MAX_CHUNK_CHARS * 2),
    route: n.route || '/progress#notes',
  }))
}
