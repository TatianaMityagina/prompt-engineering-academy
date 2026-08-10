<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <n-global-style />
    <div class="app-container">
      <n-layout-header bordered class="app-header">
        <div class="header-content">
          <span class="brand" @click="$router.push('/')">
            🎯 <span class="brand-text">Prompt Academy</span>
          </span>
          <n-button text @click="$router.push('/')">
            <template #icon>🏠</template>
            Главная
          </n-button>
        </div>
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
import { NConfigProvider, NGlobalStyle, NLayoutHeader, NLayoutContent, NLayoutFooter, NButton, NP } from 'naive-ui'

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

.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.header-content {
  max-width: var(--container-max);
  margin: 0 auto;
  padding: 12px 24px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.brand {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.02em;
  cursor: pointer;
  color: var(--n-text-color);
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.brand:hover {
  color: var(--n-primary-color);
}

.main-content {
  flex: 1;
  padding: 24px;
  max-width: var(--container-max);
  margin: 0 auto;
  width: 100%;
}

.app-footer {
  padding: 20px 16px;
  margin-top: 24px;
  font-size: 13px;
}

@media (max-width: 640px) {
  .header-content {
    padding: 10px 16px;
  }

  .brand {
    font-size: 17px;
  }

  .main-content {
    padding: 16px;
  }

  .app-footer {
    padding: 16px;
    margin-top: 16px;
    font-size: 12px;
  }
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
