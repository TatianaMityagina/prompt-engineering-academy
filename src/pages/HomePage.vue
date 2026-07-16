<template>
  <n-space vertical size="large" style="max-width: 1200px; margin: 0 auto;">
    <n-card style="text-align: center; background: var(--n-color-embedded);">
      <n-h1 style="font-size: 48px; margin-bottom: 8px;">
        🎯 Prompt Engineering Academy
      </n-h1>
      <n-p style="font-size: 20px; color: var(--n-text-color-secondary);">
        Образовательный портал, где теория встречается с практикой
      </n-p>
    </n-card>

    <n-grid :x-gap="24" :y-gap="24" cols="1 s:2 m:3">
      <n-grid-item v-for="article in articles" :key="article.id">
        <n-card
          :title="article.title"
          :bordered="true"
          hoverable
          style="height: 100%; cursor: pointer;"
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
            <n-space justify="space-between">
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
import { NSpace, NCard, NH1, NP, NGrid, NGridItem, NTag, NButton } from 'naive-ui'
import { articles } from '../data/articles'

const router = useRouter()

const goToArticle = (slug: string) => {
  router.push(`/article/${slug}`)
}

const goToTest = (slug: string) => {
  router.push(`/test/${slug}`)
}
</script>
