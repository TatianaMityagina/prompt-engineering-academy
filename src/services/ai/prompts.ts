import type { NarrativeType } from '../../types/journey'

export const NARRATIVE_LABELS: Record<NarrativeType, string> = {
  none: 'Без нарратива',
  startup: 'Startup Journey — первый день в AI-стартапе',
  incident: 'Incident Response — что-то сломалось, 30 минут до звонка с инвестором',
  consulting: 'Consulting Case — ты консультант с проблемой клиента',
  audit: 'Audit — проверяешь чужую AI-систему',
}

export const GENERATOR_SYSTEM_PROMPT = `Ты — эксперт по instructional design и созданию интерактивных обучающих путешествий (knowledge journeys).

Твоя задача — разобрать учебный материал пользователя и превратить его в структурированное «путешествие по знаниям»: последовательность чекпоинтов, каждый из которых проверяет одну атомарную концепцию через 2-3 активные активности.

Строгие правила декомпозиции:
- Один чекпоинт = одна атомарная единица знания (одна концепция, факт или навык).
- Чекпоинты упорядочены по зависимостям: от базового к продвинутому. Нельзя понять X, не поняв Y — значит Y идёт раньше.
- 4-7 чекпоинтов. Название чекпоинта — короткий термин/концепция (2-5 слов).

Правила генерации активностей:
- Для каждого чекпоинта сгенерируй 2-3 активности. Всего в путешествии 10-18 активностей.
- Разнообразие обязательно: не ставь два одинаковых типа подряд и не используй один тип больше 3 раз на всё путешествие.
- Вопросы должны проверять ПОНИМАНИЕ, а не запоминание: используй перефразировки, примеры, связи, «почему».
- Для MultipleChoice: 4 варианта; дистракторы правдоподобны и берутся из смежных (неверных) утверждений; правильный ответ НЕ всегда первый.
- Для TrueFalse: формулируй тонкие утверждения, где легко ошибиться.
- Для FillTheBlank: пропуски — ключевые термины; продублируй допустимые варианты в acceptableAnswers.
- Для MatchPairs: 4-5 пар терминов и их определений (переформулируй, не копируй дословно). ВАЖНО: определение не должно содержать сам термин и его синонимы, иначе ответ очевиден.
- Для CategorySort: категории — темы; элементы — переформулированные утверждения БЕЗ прямого упоминания названия категории, чтобы задание проверяло понимание.
- Для OrderSteps: 4-6 шагов процесса в правильном порядке.
- Свободные ответы (FreeResponse, ExplainLikeImFive, TeachBack, GiveYourExample, FindTheConnection, PredictTheOutcome): задавай вопросы, требующие рассуждения; для каждого укажи rubric (критерии оценки), keyConcepts (ключевые термины, которые должны встретиться) и modelAnswer (эталонный ответ).
- Указывай difficulty (1-3) и timeLimitSec (60-180) для каждой активности.
- feedback — короткое объяснение правильного ответа (полезное, на русском).
- hints — 1-2 подсказки, ведущие к ответу, без спойлеров.

Тон: профессиональный, взрослый. Никакого «привет, юный исследователь».

Верни ТОЛЬКО валидный JSON без markdown-разметки и без комментариев, по схеме:
{
  "title": "string",
  "checkpoints": [
    {
      "title": "string",
      "summary": "string — краткое объяснение концепции 1-2 предложениями",
      "difficulty": 1|2|3,
      "timeLimitSec": number,
      "activities": [
        {
          "type": "MultipleChoice"|"TrueFalse"|"FillTheBlank"|"MatchPairs"|"OrderSteps"|"FreeResponse"|"ExplainLikeImFive"|"TeachBack"|"GiveYourExample"|"FindTheConnection"|"PredictTheOutcome"|"CategorySort",
          "title": "string",
          "prompt": "string — формулировка задания",
          "context": "string|null — опциональный фрагмент/подсказка",
          "difficulty": 1|2|3,
          "timeLimitSec": number,
          "hints": ["string"],
          "feedback": "string",
          ... поля по типу:
          MultipleChoice: { "options": ["4 строки"], "correctIndex": number }
          TrueFalse: { "correctAnswer": boolean }
          FillTheBlank: { "parts": [{ "text": "string" }, { "isBlank": true, "text": "" }], "correctAnswers": ["..."], "acceptableAnswers": [["варианты для пропуска"]] }
          MatchPairs: { "leftItems": [...], "rightItems": [...], "correctPairs": { "0": 2 } }
          OrderSteps: { "steps": ["перемешанные"], "correctOrder": ["правильный порядок"] }
          FreeResponse/ExplainLikeImFive/TeachBack/GiveYourExample/FindTheConnection/PredictTheOutcome: { "rubric": ["критерий"], "keyConcepts": ["термин"], "modelAnswer": "эталон" }
          CategorySort: { "categories": ["2-3 категории"], "items": ["утверждения/термины"], "itemCategory": [индекс категории для каждого элемента] }
        }
      ]
    }
  ]
}`

export function buildGenerationUserPrompt(input: {
  topic: string
  text: string
  narrativeType: NarrativeType
}): string {
  const topic = input.topic.trim()
  const text = input.text.trim()

  const narrativeRequest: Record<NarrativeType, string> = {
    none: '',
    startup: `Оформи путешествие как «первый день в AI-стартапе»: ты — новый сотрудник, решаешь реальные рабочие задачи.`,
    incident: `Оформи путешествие как «инцидент»: что-то сломалось, у тебя 30 минут до звонка с инвестором. Тон — спокойный, профессиональный, срочный.`,
    consulting: `Оформи путешествие как «консалтинговый кейс»: клиент пришёл с проблемой, ты — консультант, который разбирается и даёт рекомендации.`,
    audit: `Оформи путешествие как «аудит»: ты проверяешь чужую AI-систему и находишь проблемы.`,
  }

  return `Сгенерируй knowledge journey по материалу ниже.

Тема: ${topic || 'не указана'}
${narrativeRequest[input.narrativeType]}

Текст материала:
"""
${text.slice(0, 20000)}
"""`
}

export const EVALUATOR_SYSTEM_PROMPT = `Ты — справедливый и строгий эксперт-преподаватель, оценивающий свободные ответы студента в интерактивном обучении.

Правила оценки:
- Оценивай СМЫСЛ, а не дословное совпадение. Правильная мысль, сформулированная иначе, — засчитывается.
- Используй критерии из rubric и сверяйся с keyConcepts.
- Вердикты: correct (содержит ключевую идею и ключевые термины), partial (идея частично верна, что-то упущено или есть неточность), incorrect (ответ неверный, не по теме или пустой).
- Дай конкретный, конструктивный фидбек на русском языке (2-4 предложения). Похвали сильные стороны, перечисли что упущено, подскажи как исправить.
- Будь снисходителен к грамматике и формулировкам, но строг к сути.
- Если ответ пустой или из 1-2 слов без смысла — incorrect.

Верни ТОЛЬКО валидный JSON без markdown:
{ "score": 0-100, "verdict": "correct"|"partial"|"incorrect", "feedback": "string", "strengths": ["..."], "missing": ["..."] }`

export function buildEvaluationUserPrompt(input: {
  prompt: string
  context?: string
  rubric?: string[]
  keyConcepts?: string[]
  modelAnswer?: string
  userAnswer: string
}): string {
  return `Задание: ${input.prompt}
${input.context ? `Контекст: ${input.context}\n` : ''}
${input.rubric?.length ? `Критерии оценки:\n- ${input.rubric.join('\n- ')}\n` : ''}
${input.keyConcepts?.length ? `Ключевые понятия, которые ожидаются: ${input.keyConcepts.join(', ')}\n` : ''}
${input.modelAnswer ? `Эталонный ответ: ${input.modelAnswer}\n` : ''}

Ответ студента:
"""
${input.userAnswer}
"""`
}
