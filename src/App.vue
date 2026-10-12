<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <n-global-style />
    <div class="app-container">
      <n-layout-header bordered class="app-header">
        <div class="header-content">
          <span class="brand" @click="$router.push('/')">
            🎯 <span class="brand-text">Prompt Academy</span>
          </span>
          <nav class="header-nav">
            <n-button class="ask-trigger" secondary type="primary" @click="ui.openAsk()">
              🔎 <span class="nav-label">Спросить</span>
              <kbd class="kbd">{{ isMac ? '⌘' : 'Ctrl' }} K</kbd>
            </n-button>
            <n-button text @click="$router.push('/journeys')">🧭 <span class="nav-label">Journey</span></n-button>
            <n-button text @click="$router.push('/progress')">📈 <span class="nav-label">Прогресс</span></n-button>
            <n-button text @click="ui.settingsOpen = true">
              ⚙️ <span class="nav-label">ИИ</span>
              <span class="ai-dot" :class="{ on: settings.hasAi }" />
            </n-button>
          </nav>
        </div>
      </n-layout-header>

      <n-layout-content class="main-content">
        <router-view />
      </n-layout-content>

      <AskDrawer />
      <AiSettingsModal v-model:show="ui.settingsOpen" />

      <n-layout-footer bordered class="app-footer">
        <n-p style="text-align: center; margin: 0; color: var(--n-text-color-secondary);">
          Prompt Engineering Academy — учимся создавать эффективные промпты
        </n-p>
      </n-layout-footer>
    </div>
  </n-config-provider>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { NConfigProvider, NGlobalStyle, NLayoutHeader, NLayoutContent, NLayoutFooter, NButton, NP } from 'naive-ui'
import AskDrawer from './components/ai/AskDrawer.vue'
import AiSettingsModal from './components/journey/AiSettingsModal.vue'
import { useSettingsStore } from './store/settingsStore'
import { useUiStore } from './store/uiStore'

const ui = useUiStore()
const settings = useSettingsStore()
const isMac = /Mac|iPhone|iPad/.test(navigator.platform)

function onKey(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    ui.openAsk()
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

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

.header-nav {
  display: flex;
  align-items: center;
  gap: 16px;
}

.kbd {
  margin-left: 8px;
  padding: 1px 6px;
  border-radius: 6px;
  border: 1px solid currentColor;
  font-family: var(--font-mono);
  font-size: 11px;
  opacity: 0.6;
}

.ai-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-left: 4px;
  border-radius: 50%;
  background: var(--n-text-color-disabled);
}

.ai-dot.on {
  background: var(--n-success-color);
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

  .brand-text,
  .nav-label,
  .kbd {
    display: none;
  }

  .header-nav {
    gap: 12px;
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
