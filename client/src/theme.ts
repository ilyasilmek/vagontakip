import { useEffect, useState } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark' | 'modern';
const key = 'vagon-takip-theme';
function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(key);
    if (stored === 'light' || stored === 'dark' || stored === 'modern') return stored;
  } catch { /* The system preference still works without browser storage. */ }
  return 'system';
}
export function applyTheme(preference: ThemePreference): void {
  const dark = preference === 'dark' || (preference === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = preference === 'modern' ? 'modern' : dark ? 'dark' : 'light';
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', preference === 'modern' ? '#242E39' : dark ? '#101C25' : '#182C3A');
}
export function initializeTheme(): void { applyTheme(readPreference()); }
export function useTheme() {
  const [theme, setTheme] = useState<ThemePreference>(readPreference);
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const update = () => applyTheme(theme);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [theme]);
  useEffect(() => {
    const sync = (event: StorageEvent) => { if (event.key === key) setTheme(readPreference()); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  function changeTheme(value: ThemePreference) {
    try { localStorage.setItem(key, value); } catch { /* Keep this session usable. */ }
    applyTheme(value);
    setTheme(value);
  }
  return { theme, changeTheme };
}
