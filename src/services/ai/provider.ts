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

export function defaultSettings(provider: AiSettings['provider']): AiSettings {
  return {
    provider,
    baseUrl: DEFAULT_BASE_URLS[provider],
    apiKey: '',
    model: DEFAULT_MODELS[provider],
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

export async function chatCompletion(
  settings: AiSettings,
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number } = {},
): Promise<string> {
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
        temperature: opts.temperature ?? 0.4,
        max_tokens: opts.maxTokens ?? 3500,
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
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Пустой ответ от модели.')
  }
  return content
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
