import type { Journey, NarrativeType } from '../../types/journey'

interface NarrativeTemplate {
  title: string
  context: string
  episode: (checkpointTitle: string, index: number, total: number) => string
  completion: string
}

const TEMPLATES: Record<Exclude<NarrativeType, 'none'>, NarrativeTemplate> = {
  startup: {
    title: 'Первый день в AI-стартапе',
    context:
      'Понедельник, 9:00. Ты — новый инженер по качеству в стартапе, который вчера влил $2 млн инвестиций. Фаундер даёт тебе доступ к системе и говорит: «Разберись, что здесь как работает, — от этого зависит, выживем мы или нет». Команда ждёт твоих решений.',
    episode: (title, index, total) =>
      `Задача ${index + 1} из ${total}: чтобы двигаться дальше, нужно уверенно разбираться в «${title}». Покажи, что ты разобрался.`,
    completion: 'Ты справился с первым рабочим днём. Команда смотрит на тебя с уважением.',
  },
  incident: {
    title: 'Инкудент: 30 минут до звонка',
    context:
      '9:15. Slack взрывается уведомлениями: система, за которую вы отвечаете, выдала клиентам ошибочные данные. Через 30 минут звонок с инвестором. Чтобы объяснить, что произошло и как это исправить, тебе нужно быстро вспомнить базовые принципы работы системы.',
    episode: (title, index) =>
      `Осталось ${30 - index * 4} минут до звонка. Проверь себя по ключевой теме «${title}» — без этого не объяснишь инвестору, что случилось.`,
    completion: 'Звонок прошёл хорошо: ты объяснил причины инцидента и план действий.',
  },
  consulting: {
    title: 'Консалтинговый кейс',
    context:
      'Клиент — средний бизнес, который внедряет AI, но не понимает его ограничения. Он нанял тебя как консультанта. Через час встреча с руководством клиента — ты должен показать, что действительно разбираешься в материале, а не просто читал брошюры.',
    episode: (title, index, total) =>
      `Блок ${index + 1} из ${total}: клиент задаст вопросы про «${title}». Убедись, что сможешь объяснить это на пальцах.`,
    completion: 'Клиент доволен: ты дал понятные и честные ответы.',
  },
  audit: {
    title: 'Аудит чужой AI-системы',
    context:
      'Тебя позвали провести аудит сторонней AI-системы перед её покупкой. Твоя задача — проверить, насколько команда разбирается в основах, и найти слабые места. Каждая ошибка в твоих рассуждениях стоит денег заказчику.',
    episode: (title, index, total) =>
      `Пункт аудита ${index + 1} из ${total}: проверь понимание «${title}» у проверяемой команды (а значит — у себя).`,
    completion: 'Аудит завершён, отчёт передан заказчику. Слабые места найдены.',
  },
}

export function applyNarrative(journey: Journey): Journey {
  if (journey.narrativeType === 'none' || !TEMPLATES[journey.narrativeType]) {
    journey.narrativeTitle = undefined
    journey.narrativeContext = undefined
    journey.narrativeEpisodes = undefined
    return journey
  }
  const t = TEMPLATES[journey.narrativeType]
  journey.narrativeTitle = t.title
  journey.narrativeContext = t.context
  journey.narrativeEpisodes = journey.checkpoints.map((c, i) => ({
    checkpointId: c.id,
    text: t.episode(c.title, i, journey.checkpoints.length),
  }))
  return journey
}

export function narrativeCompletion(journey: Journey): string {
  if (journey.narrativeType === 'none' || !TEMPLATES[journey.narrativeType]) return ''
  return TEMPLATES[journey.narrativeType].completion
}
