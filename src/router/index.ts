import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../pages/HomePage.vue'
import ArticlePage from '../pages/ArticlePage.vue'
import TestPage from '../pages/TestPage.vue'
import JourneyHomePage from '../pages/journey/JourneyHomePage.vue'
import JourneyGeneratePage from '../pages/journey/JourneyGeneratePage.vue'
import JourneyIntroPage from '../pages/journey/JourneyIntroPage.vue'
import JourneyRunPage from '../pages/journey/JourneyRunPage.vue'
import JourneyResultPage from '../pages/journey/JourneyResultPage.vue'

const routes = [
  { path: '/', component: HomePage },
  { path: '/article/:slug', component: ArticlePage },
  { path: '/test/:slug', component: TestPage },
  { path: '/journeys', component: JourneyHomePage },
  { path: '/journeys/new', component: JourneyGeneratePage },
  { path: '/journeys/:id', component: JourneyIntroPage },
  { path: '/journeys/:id/run', component: JourneyRunPage },
  { path: '/journeys/:id/result', component: JourneyResultPage },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
