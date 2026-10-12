import type { Article } from '../../data/articles'

export interface ArticleSection {
  /** `sec-N` */
  id: string
  index: number
  title: string
  body: string
  /** Текстовый блок и следующие за ним упражнения */
  blockIndexes: number[]
}

/** Заголовок секции — первая строка текстового блока, набранная капсом. */
const HEADING_RE = /^\s*\S*\s*[A-ZА-ЯЁ0-9][A-ZА-ЯЁ0-9 \-—:,()«»"'.]{3,}$/u

function splitHeading(text: string): { title: string | null; body: string } {
  const [first, ...rest] = text.split('\n')
  // Уточнение в скобках может быть строчными.
  const head = first.replace(/\([^)]*\)/g, '').trim()
  const letters = head.replace(/[^A-Za-zА-Яа-яЁё]/g, '')
  const upperRatio = letters ? letters.replace(/[^A-ZА-ЯЁ]/g, '').length / letters.length : 0
  if (rest.length && HEADING_RE.test(head) && upperRatio > 0.6) {
    return { title: prettifyHeading(first), body: rest.join('\n').trim() }
  }
  return { title: null, body: text.trim() }
}

function prettifyHeading(line: string): string {
  const clean = line.trim()
  const emoji = clean.match(/^[^\p{L}\p{N}]+/u)?.[0] ?? ''
  const words = clean.slice(emoji.length)
  const sentence = words
    .split(' ')
    .map((w, i) => {
      if (/^[A-Z0-9-]+$/.test(w) && w.length <= 4) return w // аббревиатуры
      const lower = w.toLowerCase()
      return i === 0 ? lower.charAt(0).toUpperCase() + lower.slice(1) : lower
    })
    .join(' ')
  return `${emoji}${sentence}`.trim()
}

export function articleSections(article: Article): ArticleSection[] {
  const sections: ArticleSection[] = []
  article.content.forEach((block, blockIndex) => {
    if (block.type === 'text' && block.content) {
      const { title, body } = splitHeading(block.content)
      sections.push({
        id: `sec-${sections.length}`,
        index: sections.length,
        title: title ?? (sections.length === 0 ? 'Введение' : `Часть ${sections.length + 1}`),
        body,
        blockIndexes: [blockIndex],
      })
    } else if (sections.length) {
      sections[sections.length - 1].blockIndexes.push(blockIndex)
    }
  })
  return sections
}

export function sectionForBlock(article: Article, blockIndex: number): ArticleSection | null {
  return articleSections(article).find(s => s.blockIndexes.includes(blockIndex)) ?? null
}

/** Порядок вопросов теста совпадает с порядком упражнений в статье. */
export function sectionForTestQuestion(article: Article, questionIndex: number): ArticleSection | null {
  const exerciseBlocks = article.content
    .map((b, i) => (b.type === 'exercise' ? i : -1))
    .filter(i => i >= 0)
  const blockIndex = exerciseBlocks[questionIndex]
  return blockIndex === undefined ? null : sectionForBlock(article, blockIndex)
}

/** Формулировка вопроса для истории ответов; у части типов упражнений есть только заголовок. */
export function exerciseQuestionText(props: Record<string, any>): string {
  const text = props.question || props.statement || props.context || props.title || ''
  return String(text).slice(0, 160)
}

/** props встроенного упражнения, соответствующего вопросу теста */
export function inlineExerciseProps(article: Article, questionIndex: number): Record<string, any> {
  const blocks = article.content.filter(b => b.type === 'exercise')
  return blocks[questionIndex]?.props ?? {}
}

export function articleTopic(article: Article, section: ArticleSection | null): string {
  return section ? `${article.title} → ${stripEmoji(section.title)}` : article.title
}

export function stripEmoji(s: string): string {
  return s.replace(/^[^\p{L}\p{N}]+/u, '').trim()
}
