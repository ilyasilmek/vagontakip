import { useEffect, useState } from 'react';

const key = 'vagon-takip-startup-animation';

function readPreference(): boolean {
  try { return localStorage.getItem(key) !== 'off'; }
  catch { return true; }
}

export function useStartupAnimation() {
  const [startupAnimation, setStartupAnimation] = useState(readPreference);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === key || event.key === null) setStartupAnimation(readPreference());
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  function changeStartupAnimation(enabled: boolean) {
    try { localStorage.setItem(key, enabled ? 'on' : 'off'); }
    catch { /* Keep the preference usable for the current session. */ }
    setStartupAnimation(enabled);
  }
  return { startupAnimation, changeStartupAnimation };
}
