export type ActivityType =
  | 'MultipleChoice'
  | 'TrueFalse'
  | 'FillTheBlank'
  | 'MatchPairs'
  | 'OrderSteps'
  | 'PromptBuilder'
  | 'FreeResponse'
  | 'ExplainLikeImFive'
  | 'TeachBack'
  | 'GiveYourExample'
  | 'FindTheConnection'
  | 'PredictTheOutcome'
  | 'CategorySort'

export const FREE_RESPONSE_TYPES: ActivityType[] = [
  'FreeResponse',
  'ExplainLikeImFive',
  'TeachBack',
  'GiveYourExample',
  'FindTheConnection',
  'PredictTheOutcome',
]

export const isFreeResponseType = (t: ActivityType): boolean => FREE_RESPONSE_TYPES.includes(t)

export interface Hint {
  text: string
  xpCost?: number
}

export interface BaseActivity {
  id: string
  type: ActivityType
  title?: string
  prompt: string
  context?: string
  difficulty: 1 | 2 | 3
  xpBase: number
  hints?: Hint[]
  conceptId?: string
  feedback: string
  order?: number
}

export interface MultipleChoiceActivity extends BaseActivity {
  type: 'MultipleChoice'
  options: string[]
  correctIndex: number
}

export interface TrueFalseActivity extends BaseActivity {
  type: 'TrueFalse'
  correctAnswer: boolean
}

export interface FillTheBlankActivity extends BaseActivity {
  type: 'FillTheBlank'
  parts: Array<{ text?: string; isBlank?: boolean }>
  correctAnswers: string[]
  acceptableAnswers?: string[][]
}

export interface MatchPairsActivity extends BaseActivity {
  type: 'MatchPairs'
  leftItems: string[]
  rightItems: string[]
  correctPairs: Record<number, number>
}

export interface OrderStepsActivity extends BaseActivity {
  type: 'OrderSteps'
  steps: string[]
  correctOrder: string[]
}

export interface PromptBuilderActivity extends BaseActivity {
  type: 'PromptBuilder'
  blocks: Array<{ type: string; text: string }>
  correctOrder: number[]
}

export interface FreeResponseActivity extends BaseActivity {
  type: 'FreeResponse' | 'ExplainLikeImFive' | 'TeachBack' | 'GiveYourExample' | 'FindTheConnection' | 'PredictTheOutcome'
  rubric?: string[]
  keyConcepts?: string[]
  modelAnswer?: string
}

export interface CategorySortActivity extends BaseActivity {
  type: 'CategorySort'
  categories: string[]
  items: string[]
  itemCategory: number[]
}

export type Activity =
  | MultipleChoiceActivity
  | TrueFalseActivity
  | FillTheBlankActivity
  | MatchPairsActivity
  | OrderStepsActivity
  | PromptBuilderActivity
  | FreeResponseActivity
  | CategorySortActivity

export interface Checkpoint {
  id: string
  order: number
  title: string
  summary: string
  sourceQuote?: string
  difficulty: 1 | 2 | 3
  timeLimitSec: number
  activities: Activity[]
}

export type NarrativeType = 'none' | 'startup' | 'incident' | 'consulting' | 'audit'

export interface NarrativeEpisode {
  checkpointId: string
  text: string
}

export interface Journey {
  id: string
  title: string
  sourceTopic: string
  sourceText: string
  narrativeType: NarrativeType
  narrativeTitle?: string
  narrativeContext?: string
  narrativeEpisodes?: NarrativeEpisode[]
  checkpoints: Checkpoint[]
  totalTimeSec: number
  createdAt: number
  generatedBy: 'ai' | 'local'
}

export interface ActivityResult {
  activityId: string
  activityType: ActivityType
  prompt: string
  correct: boolean
  partial?: number
  verdict: 'correct' | 'partial' | 'incorrect' | 'timeout'
  answer: unknown
  userText?: string
  feedback: string
  xpEarned: number
  timeSpentSec: number
  hintsUsed: number
}

export interface CheckpointResult {
  checkpointId: string
  title: string
  score: number
  xpEarned: number
  completed: boolean
  timedOut: boolean
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  earnedAt: number
}

export interface ConceptReview {
  checkpointId: string
  title: string
  score: number
  strengths: string[]
  improvements: string[]
}

export interface JourneyResult {
  journeyId: string
  journeyTitle: string
  startedAt: number
  finishedAt: number
  totalTimeSec: number
  totalXp: number
  xpBreakdown: {
    correctBase: number
    speedBonus: number
    streakBonus: number
    checkpointBonus: number
    completionBonus: number
  }
  activities: ActivityResult[]
  checkpoints: CheckpointResult[]
  achievements: Achievement[]
  conceptReviews: ConceptReview[]
  summaryText: string
}

export interface FreeAnswerEvaluation {
  score: number
  verdict: 'correct' | 'partial' | 'incorrect'
  feedback: string
  strengths: string[]
  missing: string[]
}

export interface AiSettings {
  provider: 'openai' | 'openrouter' | 'ollama' | 'custom'
  baseUrl: string
  apiKey: string
  model: string
}
