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
            <n-tag v-if="article.exercises.length" type="success" size="small">
              {{ article.exercises.length }} упражнений
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
import { useRouter } from 'vue-router'
import { NSpace, NCard, NH1, NH2, NP, NGrid, NGridItem, NTag, NButton } from 'naive-ui'
import { articles } from '../data/articles'

const router = useRouter()

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
