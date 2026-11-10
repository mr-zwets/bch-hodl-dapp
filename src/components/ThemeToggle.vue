<script setup lang="ts">
import { computed } from 'vue'
import { isDark, toggleTheme } from '../composables/useTheme'

const label = computed(() =>
  isDark.value ? 'Switch to light mode' : 'Switch to dark mode',
)
</script>

<template>
  <button
    class="themeToggle"
    type="button"
    :class="{ dark: isDark }"
    :title="label"
    :aria-label="label"
    :aria-pressed="isDark"
    @click="toggleTheme"
  >
    <span class="iconStack" aria-hidden="true">
      <svg class="icon sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round">
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 1.8v2.4M12 19.8v2.4M4.4 4.4l1.7 1.7M17.9 17.9l1.7 1.7M1.8 12h2.4M19.8 12h2.4M4.4 19.6l1.7-1.7M17.9 6.1l1.7-1.7" />
      </svg>
      <svg class="icon moon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.7 14.6A8.7 8.7 0 0 1 9.4 3.3a1 1 0 0 0-1.3-1.2 10.7 10.7 0 1 0 13.8 13.8 1 1 0 0 0-1.2-1.3z" />
      </svg>
    </span>
  </button>
</template>

<style scoped>
.themeToggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--color-border-hover);
  border-radius: 50%;
  background: var(--color-background);
  color: var(--color-heading);
  cursor: pointer;
  vertical-align: middle;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}
.themeToggle:hover {
  background: var(--color-background-mute);
  border-color: var(--color-heading);
}
.themeToggle:focus-visible {
  outline: 2px solid #2c95d6;
  outline-offset: 2px;
}

/* the two glyphs sit on top of each other and swap with a little spin */
.iconStack {
  position: relative;
  display: block;
  width: 16px;
  height: 16px;
}
.icon {
  position: absolute;
  inset: 0;
  width: 16px;
  height: 16px;
  transition: opacity 0.25s ease, transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}
.sun {
  opacity: 0;
  transform: rotate(-70deg) scale(0.5);
}
.moon {
  opacity: 1;
}
.themeToggle.dark .sun {
  opacity: 1;
  transform: rotate(0) scale(1);
}
.themeToggle.dark .moon {
  opacity: 0;
  transform: rotate(70deg) scale(0.5);
}

@media (prefers-reduced-motion: reduce) {
  .themeToggle,
  .icon {
    transition: none;
  }
}
</style>
