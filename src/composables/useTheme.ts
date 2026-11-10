import { ref, watch } from 'vue'

/**
 * Single source of truth for the theme.
 *
 * Writes `data-theme="dark" | "light"` on <html>, which is what the palette in
 * base.css keys on, and persists an explicit choice under `hodl-theme`.
 * With nothing stored the theme follows the OS setting, also when it changes.
 * index.html resolves the initial value before first paint to avoid a flash.
 */
const STORAGE_KEY = 'hodl-theme'
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function initialIsDark(): boolean {
  const attr = document.documentElement.dataset.theme
  if (attr === 'dark' || attr === 'light') return attr === 'dark'
  const stored = readStored()
  if (stored === 'dark' || stored === 'light') return stored === 'dark'
  return darkQuery.matches
}

export const isDark = ref(initialIsDark())

watch(isDark, (dark) => {
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
}, { immediate: true })

// follow the OS while the user has not made an explicit choice
darkQuery.addEventListener('change', (event) => {
  const stored = readStored()
  if (stored !== 'dark' && stored !== 'light') isDark.value = event.matches
})

export function toggleTheme() {
  isDark.value = !isDark.value
  try {
    localStorage.setItem(STORAGE_KEY, isDark.value ? 'dark' : 'light')
  } catch { /* storage unavailable, the choice just won't persist */ }
}
