export const THEMES = [
  { key: 'classic', label: 'Classic', dot: '#6b7280' },
  { key: 'dark-glass', label: 'Dark Glass', dot: '#3b82f6' },
  { key: 'deep-blue', label: 'Deep Blue', dot: '#8b5cf6' },
  { key: 'light-glass', label: 'Light Glass', dot: '#e2e8f0' },
]

export function getInitialTheme() {
  try {
    const stored = localStorage.getItem('theme')
    if (stored && THEMES.some(t => t.key === stored)) return stored
  } catch { /* ignore */ }
  return 'classic'
}

export function setTheme(key) {
  document.documentElement.setAttribute('data-theme', key)
  try { localStorage.setItem('theme', key) } catch { /* ignore */ }
}
