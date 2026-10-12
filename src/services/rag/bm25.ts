import type { Chunk } from './types'
import { tokenize } from './tokenize'

const K1 = 1.4
const B = 0.75

interface DocStats {
  chunk: Chunk
  tf: Map<string, number>
  length: number
}

/** Заголовок секции учитывается дважды (буст). */
export class Bm25Index {
  private docs: DocStats[] = []
  private df = new Map<string, number>()
  private avgLength = 0

  constructor(chunks: Chunk[]) {
    for (const chunk of chunks) {
      const tokens = tokenize(`${chunk.section} ${chunk.section} ${chunk.sourceTitle} ${chunk.text}`)
      const tf = new Map<string, number>()
      for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1)
      for (const t of tf.keys()) this.df.set(t, (this.df.get(t) ?? 0) + 1)
      this.docs.push({ chunk, tf, length: tokens.length })
    }
    this.avgLength = this.docs.reduce((s, d) => s + d.length, 0) / Math.max(1, this.docs.length)
  }

  search(query: string, limit = 20): Array<{ chunk: Chunk; score: number }> {
    const terms = [...new Set(tokenize(query))]
    if (!terms.length) return []
    const n = this.docs.length
    const scored = this.docs.map(doc => {
      let score = 0
      for (const term of terms) {
        const f = doc.tf.get(term)
        if (!f) continue
        const df = this.df.get(term) ?? 0
        const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5))
        score += idf * ((f * (K1 + 1)) / (f + K1 * (1 - B + (B * doc.length) / this.avgLength)))
      }
      return { chunk: doc.chunk, score }
    })
    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }
}
