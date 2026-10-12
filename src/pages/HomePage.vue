<template>
  <n-space vertical size="large" style="max-width: 1200px; margin: 0 auto;">
    <n-card class="home-hero">
      <n-h1 class="hero-h1">
        🎯 Prompt Engineering Academy
      </n-h1>
      <n-p class="hero-sub">
        Образовательный портал, где теория встречается с практикой
      </n-p>
    </n-card>

    <n-card hoverable class="journey-cta" @click="$router.push('/journeys')">
      <div class="journey-cta-inner">
        <div class="journey-cta-text">
          <n-h2 style="margin: 0; color: #fff;">🧭 Knowledge Journey</n-h2>
          <n-p style="margin: 8px 0 0; color: rgba(255,255,255,0.85); max-width: 620px;">
            Вставь любой учебный текст и получи персональное путешествие по знаниям:
            генерация тестов, давление времени, XP и финальный отчёт.
          </n-p>
        </div>
        <n-button size="large" type="primary" class="cta-button">Открыть →</n-button>
      </div>
    </n-card>

    <n-card class="next-card">
      <template #header>
        <div class="next-head">
          <n-h3 style="margin: 0;">🧩 Что изучить дальше</n-h3>
          <n-space size="small">
            <n-button size="small" secondary type="primary" @click="ui.openAsk()">🔎 Спросить по материалам</n-button>
            <n-button size="small" @click="$router.push('/progress')">📈 Мой прогресс</n-button>
          </n-space>
        </div>
      </template>
      <div class="next-list">
        <div
          v-for="rec in learner.recommendations"
          :key="rec.route + rec.title"
          class="next-item"
          @click="$router.push(rec.route)"
        >
          <span class="next-icon">{{ REC_ICON[rec.kind] }}</span>
          <div>
            <div class="next-title">{{ rec.title }}</div>
            <n-text depth="3" class="next-reason">{{ rec.reason }}</n-text>
          </div>
        </div>
        <n-text v-if="!learner.recommendations.length" depth="3">
          Всё прочитано и пройдено 🎉 Создай Journey по новой теме или спроси ассистента.
        </n-text>
      </div>
    </n-card>

    <n-h2 style="margin: 8px 0 0;">📚 Cтатьи с упражнениями</n-h2>
    <n-grid :x-gap="24" :y-gap="24" cols="1 s:2 m:3" responsive="screen">
      <n-grid-item v-for="article in articles" :key="article.id">
        <n-card
          :title="article.title"
          :bordered="true"
          hoverable
          class="article-card"
          @click="goToArticle(article.slug)"
        >
          <template #header-extra>
            <n-tag v-if="readSlugs.has(article.slug)" size="small" :bordered="false" style="margin-right: 6px;">✓ прочитано</n-tag>
            <n-tag v-if="article.exercises.length" type="success" size="small">
              {{ plural(article.exercises.length, ['упражнение', 'упражнения', 'упражнений']) }}
            </n-tag>
          </template>
          <n-p style="color: var(--n-text-color-secondary);">
            {{ article.description }}
          </n-p>
          <template #footer>
            <n-space justify="space-between" class="card-actions">
              <n-button type="primary" @click.stop="goToArticle(article.slug)">
                Читать статью
              </n-button>
              <n-button quaternary @click.stop="goToTest(article.slug)">
                Пройти тест
              </n-button>
            </n-space>
          </template>
        </n-card>
      </n-grid-item>
    </n-grid>
  </n-space>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { NSpace, NCard, NH1, NH2, NH3, NP, NText, NGrid, NGridItem, NTag, NButton } from 'naive-ui'
import { articles } from '../data/articles'
import { plural } from '../utils/plural'
import { useLearnerStore, type Recommendation } from '../store/learnerStore'
import { useUiStore } from '../store/uiStore'

const router = useRouter()
const learner = useLearnerStore()
const ui = useUiStore()

const REC_ICON: Record<Recommendation['kind'], string> = { repeat: '🔁', read: '📖', test: '📝', journey: '🧭' }
const readSlugs = computed(() => new Set(learner.data.reading.map(r => r.slug)))

const goToArticle = (slug: string) => {
  router.push(`/article/${slug}`)
}

const goToTest = (slug: string) => {
  router.push(`/test/${slug}`)
}
</script>

<style scoped>
.home-hero {
  text-align: center;
  background: var(--n-color-embedded);
}

.hero-h1 {
  font-size: clamp(28px, 6vw, 48px);
  margin-bottom: 8px;
  line-height: 1.15;
}

.hero-sub {
  font-size: clamp(16px, 3vw, 20px);
  color: var(--n-text-color-secondary);
}

.journey-cta {
  background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #3b82f6 100%);
  cursor: pointer;
}

.journey-cta-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
}

.journey-cta-text {
  flex: 1;
  min-width: 0;
}

.cta-button {
  flex-shrink: 0;
  --n-button-color: #ffffff;
  --n-button-color-hover: #eef4ff;
  --n-button-color-pressed: #dce8ff;
  --n-button-text-color: var(--n-primary-color);
  --n-button-text-color-hover: var(--n-primary-color);
  --n-button-text-color-pressed: var(--n-primary-color);
  --n-button-border: none;
  --n-button-border-hover: none;
  --n-button-border-pressed: none;
  font-weight: 700;
}

.next-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.next-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}

.next-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--n-border-color);
  cursor: pointer;
  transition: border-color 0.2s;
}

.next-item:hover {
  border-color: var(--n-primary-color);
}

.next-icon {
  font-size: 20px;
}

.next-title {
  font-weight: 600;
  font-size: 14px;
}

.next-reason {
  font-size: 12px;
}

.article-card {
  height: 100%;
  cursor: pointer;
}

.card-actions {
  width: 100%;
}

@media (max-width: 640px) {
  .journey-cta-inner {
    flex-direction: column;
    align-items: stretch;
  }

  .cta-button {
    width: 100%;
  }

  .card-actions {
    flex-wrap: wrap;
    gap: 8px;
  }
}
</style>
