<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <n-global-style />
    <div class="app-container">
      <n-layout-header bordered class="app-header">
        <n-space justify="space-between" align="center" class="header-content">
          <n-h2 style="margin: 0; cursor: pointer;" @click="$router.push('/')">
            🎯 Prompt Academy
          </n-h2>
          <n-button text @click="$router.push('/')">
            <template #icon>🏠</template>
            Главная
          </n-button>
        </n-space>
      </n-layout-header>

      <n-layout-content class="main-content">
        <router-view />
      </n-layout-content>

      <n-layout-footer bordered class="app-footer">
        <n-p style="text-align: center; margin: 0; color: var(--n-text-color-secondary);">
          Prompt Engineering Academy — учимся создавать эффективные промпты
        </n-p>
      </n-layout-footer>
    </div>
  </n-config-provider>
</template>

<script setup lang="ts">
import { NConfigProvider, NGlobalStyle, NLayoutHeader, NLayoutContent, NLayoutFooter, NSpace, NH2, NButton, NP } from 'naive-ui'

const themeOverrides = {
  common: {
    primaryColor: '#2563eb',
    borderRadius: '12px',
  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  width: 100%;
}

.main-content {
  flex: 1;
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.app-footer {
  padding: 24px;
  margin-top: 24px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
