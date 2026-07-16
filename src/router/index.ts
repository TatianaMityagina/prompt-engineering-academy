import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../pages/HomePage.vue'
import ArticlePage from '../pages/ArticlePage.vue'
import TestPage from '../pages/TestPage.vue'

const routes = [
  { path: '/', component: HomePage },
  { path: '/article/:slug', component: ArticlePage },
  { path: '/test/:slug', component: TestPage },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
