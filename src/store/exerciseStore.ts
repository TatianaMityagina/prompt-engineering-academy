import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useExerciseStore = defineStore('exercise', () => {
  const testMode = ref(false)
  const currentAnswers = ref<(boolean | undefined)[]>([])
  const currentQuestionIndex = ref(0)
  const totalQuestions = ref(0)

  const progress = computed(() => {
    if (currentAnswers.value.length === 0) return 0
    const answered = currentAnswers.value.filter(a => a !== undefined && a !== null).length
    return Math.round((answered / currentAnswers.value.length) * 100)
  })

  const score = computed(() => {
    const answered = currentAnswers.value.filter(a => a !== undefined && a !== null)
    if (answered.length === 0) return 0
    const correct = answered.filter(a => a === true).length
    return Math.round((correct / answered.length) * 100)
  })

  const correctCount = computed(() => {
    return currentAnswers.value.filter(a => a === true).length
  })

  const incorrectCount = computed(() => {
    return currentAnswers.value.filter(a => a === false).length
  })

  const isTestComplete = computed(() => {
    if (currentAnswers.value.length === 0) return false
    return currentAnswers.value.every(a => a !== undefined && a !== null)
  })

  function startTest(questionsCount: number) {
    testMode.value = true
    currentAnswers.value = new Array(questionsCount).fill(undefined)
    currentQuestionIndex.value = 0
    totalQuestions.value = questionsCount
  }

  function submitAnswer(questionIndex: number, answer: boolean) {
    if (questionIndex >= 0 && questionIndex < currentAnswers.value.length) {
      currentAnswers.value[questionIndex] = answer
      saveProgress()
    }
  }

  function nextQuestion() {
    if (currentQuestionIndex.value < totalQuestions.value - 1) {
      currentQuestionIndex.value++
    }
  }

  function previousQuestion() {
    if (currentQuestionIndex.value > 0) {
      currentQuestionIndex.value--
    }
  }

  function getAnswer(index: number) {
    return currentAnswers.value[index]
  }

  function isAnswered(index: number) {
    return currentAnswers.value[index] !== undefined && currentAnswers.value[index] !== null
  }

  function resetTest() {
    testMode.value = false
    currentAnswers.value = []
    currentQuestionIndex.value = 0
    totalQuestions.value = 0
    localStorage.removeItem('test_progress')
  }

  function getResultSummary() {
    return {
      total: currentAnswers.value.length,
      correct: correctCount.value,
      incorrect: incorrectCount.value,
      score: score.value,
      answers: currentAnswers.value
    }
  }

  function saveProgress() {
    try {
      const data = {
        answers: currentAnswers.value,
        index: currentQuestionIndex.value,
        total: totalQuestions.value,
      }
      localStorage.setItem('test_progress', JSON.stringify(data))
    } catch (e) {
      // ignore
    }
  }

  function loadProgress() {
    try {
      const saved = localStorage.getItem('test_progress')
      if (saved) {
        const data = JSON.parse(saved)
        if (data.answers && data.answers.length > 0) {
          currentAnswers.value = data.answers
          currentQuestionIndex.value = data.index || 0
          totalQuestions.value = data.total || data.answers.length
          testMode.value = true
          return true
        }
      }
    } catch (e) {
      // ignore
    }
    return false
  }

  return {
    testMode,
    currentAnswers,
    currentQuestionIndex,
    totalQuestions,
    progress,
    score,
    correctCount,
    incorrectCount,
    isTestComplete,
    startTest,
    submitAnswer,
    nextQuestion,
    previousQuestion,
    getAnswer,
    isAnswered,
    resetTest,
    getResultSummary,
    loadProgress,
    saveProgress
  }
})
