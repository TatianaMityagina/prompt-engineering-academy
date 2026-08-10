<template>
  <MultipleChoice
    v-if="activity.type === 'MultipleChoice'"
    :title="activity.title"
    :question="activity.prompt"
    :options="activity.options"
    :correctAnswer="activity.correctIndex"
    :feedback="activity.feedback"
    :mode="mode"
    @answered="handleAnswered"
  />
  <TrueFalse
    v-else-if="activity.type === 'TrueFalse'"
    :title="activity.title"
    :statement="activity.context || activity.prompt"
    :correctAnswer="activity.correctAnswer"
    :feedback="activity.feedback"
    :mode="mode"
    @answered="handleAnswered"
  />
  <FillTheBlank
    v-else-if="activity.type === 'FillTheBlank'"
    :title="activity.title"
    :parts="activity.parts"
    :correctAnswer="activity.correctAnswers"
    :feedback="activity.feedback"
    :mode="mode"
    @answered="handleAnswered"
  />
  <MatchPairs
    v-else-if="activity.type === 'MatchPairs'"
    :title="activity.title"
    :leftItems="activity.leftItems"
    :rightItems="activity.rightItems"
    :correctAnswer="activity.correctPairs"
    :feedback="activity.feedback"
    :mode="mode"
    @answered="handleAnswered"
  />
  <OrderSteps
    v-else-if="activity.type === 'OrderSteps'"
    :title="activity.title"
    :steps="activity.steps"
    :correctAnswer="activity.correctOrder"
    :feedback="activity.feedback"
    :mode="mode"
    @answered="handleAnswered"
  />
  <PromptBuilder
    v-else-if="activity.type === 'PromptBuilder'"
    :title="activity.title"
    :blocks="activity.blocks"
    :correctAnswer="activity.correctOrder"
    :feedback="activity.feedback"
    :mode="mode"
    @answered="handleAnswered"
  />
  <CategorySort
    v-else-if="activity.type === 'CategorySort'"
    :title="activity.title"
    :prompt="activity.prompt"
    :categories="activity.categories"
    :items="activity.items"
    :itemCategory="activity.itemCategory"
    :feedback="activity.feedback"
    :mode="mode"
    @answered="handleAnswered"
  />
  <FreeResponse
    v-else
    :title="activity.title"
    :prompt="activity.prompt"
    :context="activity.context"
    :response-type="activity.type"
    :evaluating="evaluating"
    @submit="emit('free-submit', $event)"
  />
</template>

<script setup lang="ts">
import type { Activity } from '../../types/journey'
import MultipleChoice from '../exercises/MultipleChoice.vue'
import TrueFalse from '../exercises/TrueFalse.vue'
import FillTheBlank from '../exercises/FillTheBlank.vue'
import MatchPairs from '../exercises/MatchPairs.vue'
import OrderSteps from '../exercises/OrderSteps.vue'
import PromptBuilder from '../exercises/PromptBuilder.vue'
import CategorySort from '../exercises/CategorySort.vue'
import FreeResponse from '../exercises/FreeResponse.vue'

interface Props {
  activity: Activity
  mode?: 'inline' | 'test'
  evaluating?: boolean
}

withDefaults(defineProps<Props>(), {
  mode: 'inline',
  evaluating: false,
})

const emit = defineEmits<{
  (e: 'answered', isCorrect: boolean): void
  (e: 'free-submit', text: string): void
}>()

function handleAnswered(isCorrect: boolean) {
  emit('answered', isCorrect)
}
</script>
