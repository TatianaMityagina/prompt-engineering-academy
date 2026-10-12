import type { AiSettings } from '../../types/journey'

const DEFAULT_MODELS: Record<AiSettings['provider'], string> = {
  openai: 'gpt-4o-mini',
  openrouter: 'openai/gpt-4o-mini',
  ollama: 'llama3.1',
  custom: 'gpt-4o-mini',
}

const DEFAULT_BASE_URLS: Record<AiSettings['provider'], string> = {
  openai: 'https://api.openai.com/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  ollama: 'http://localhost:11434/v1',
  custom: 'https://api.openai.com/v1',
}

const DEFAULT_EMBEDDING_MODELS: Record<AiSettings['provider'], string> = {
  openai: 'text-embedding-3-small',
  openrouter: 'openai/text-embedding-3-small',
  ollama: 'nomic-embed-text',
  custom: '',
}

export function defaultSettings(provider: AiSettings['provider']): AiSettings {
  return {
    provider,
    baseUrl: DEFAULT_BASE_URLS[provider],
    apiKey: '',
    model: DEFAULT_MODELS[provider],
    embeddingModel: DEFAULT_EMBEDDING_MODELS[provider],
  }
}

export function isAiConfigured(settings: AiSettings | null): boolean {
  if (!settings) return false
  if (settings.provider !== 'openai') return true
  return settings.apiKey.trim().length > 0
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AiError extends Error {
  status?: number
}

export function normalizeSettings(settings: AiSettings): AiSettings {
  let baseUrl = settings.baseUrl.trim().replace(/\/+$/, '')
  if (!baseUrl.startsWith('http')) baseUrl = `https://${baseUrl}`
  const model = settings.model.trim() || DEFAULT_MODELS[settings.provider]
  return { ...settings, baseUrl, model }
}

const EMPTY_RETRY_DELAY_MS = 1500
const MAX_RETRY_TOKENS = 6000

interface CompletionOutcome {
  content: string
  finishReason?: string
  hadReasoning: boolean
}

async function requestCompletion(
  settings: AiSettings,
  messages: ChatMessage[],
  temperature: number,
  maxTokens: number,
): Promise<CompletionOutcome> {
  const { baseUrl, apiKey, model } = normalizeSettings(settings)
  const url = `${baseUrl}/chat/completions`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (apiKey.trim()) {
    headers['Authorization'] = `Bearer ${apiKey.trim()}`
  }

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false,
      }),
    })
  } catch (e) {
    const err = new Error(
      `Не удалось соединиться с ${baseUrl}. Проверьте адрес сервера и доступность сети.`,
    ) as AiError
    err.status = -1
    throw err
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    const message = text.includes('"message"') ? extractErrorMessage(text) : text || res.statusText
    const err = new Error(
      `Ошибка API (${res.status}): ${message.slice(0, 300)}`,
    ) as AiError
    err.status = res.status
    throw err
  }

  const data = await res.json()
  const choice = data?.choices?.[0]
  const content = choice?.message?.content
  return {
    content: typeof content === 'string' ? content : '',
    finishReason: choice?.finish_reason,
    // reasoning / reasoning_content — признак reasoning-модели
    hadReasoning: !!(choice?.message?.reasoning || choice?.message?.reasoning_content),
  }
}

/** Один повтор при пустом ответе с увеличенным max_tokens: reasoning-модель может исчерпать лимит на рассуждение. */
export async function chatCompletion(
  settings: AiSettings,
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number } = {},
): Promise<string> {
  const temperature = opts.temperature ?? 0.4
  const maxTokens = opts.maxTokens ?? 3500
  const first = await requestCompletion(settings, messages, temperature, maxTokens)
  if (first.content.trim()) return first.content

  console.warn('[ai] пустой ответ модели', { finishReason: first.finishReason, hadReasoning: first.hadReasoning, maxTokens })
  await new Promise(r => setTimeout(r, EMPTY_RETRY_DELAY_MS))
  const retryTokens = Math.min(MAX_RETRY_TOKENS, Math.max(maxTokens * 3, 1000))
  const second = await requestCompletion(settings, messages, temperature, retryTokens)
  if (second.content.trim()) return second.content

  console.warn('[ai] пустой ответ и после повтора', { finishReason: second.finishReason, hadReasoning: second.hadReasoning, retryTokens })
  const why = second.finishReason === 'length' && second.hadReasoning
    ? ' Похоже, reasoning-модель израсходовала лимит токенов на рассуждение — попробуйте другую модель.'
    : ''
  throw new Error(`Пустой ответ от модели (дважды).${why}`)
}

export async function testConnection(settings: AiSettings): Promise<string> {
  const content = await chatCompletion(settings, [
    { role: 'user', content: 'Ответь одним словом: ok' },
  ], { maxTokens: 16 })
  return content.trim()
}

/** Extract the first JSON object from a model reply (tolerates ```json fences and prose). */
export function extractJson<T>(raw: string): T {
  const trimmed = raw.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced ? fenced[1] : trimmed
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Модель не вернула JSON. Попробуйте ещё раз.')
  }
  return JSON.parse(candidate.slice(start, end + 1)) as T
}

function extractErrorMessage(text: string): string {
  try {
    const parsed = JSON.parse(text)
    return parsed?.error?.message || parsed?.error || text
  } catch {
    return text
  }
}
