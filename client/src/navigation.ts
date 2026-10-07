import { useCallback, useEffect, useRef, useState } from 'react';
import type { CollectionName } from '../../shared/types';

export type Page = 'dashboard' | CollectionName | 'admin' | 'account' | 'maintenance';
const pages: Page[] = ['dashboard', 'wagons', 'parts', 'inventory', 'admin', 'account', 'maintenance'];
const key = 'vagonNavigation';
interface NavigationState { page: Page; modal?: string; }

function readNavigation(): NavigationState {
  const value = window.history.state?.[key];
  return value && pages.includes(value.page) ? value : { page: 'dashboard' };
}
function state(value: NavigationState) {
  return { ...window.history.state, [key]: value };
}

export function usePageNavigation() {
  const [page, updatePage] = useState<Page>(() => readNavigation().page);
  useEffect(() => {
    // Restore the page after a reload, but never restore an old form or record.
    window.history.replaceState(state({ page: readNavigation().page }), '');
    const pop = () => updatePage(readNavigation().page);
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, []);
  const navigate = useCallback((next: Page) => {
    if (readNavigation().page !== next) window.history.pushState(state({ page: next }), '');
    updatePage(next);
  }, []);
  const reset = useCallback(() => {
    window.history.replaceState(state({ page: 'dashboard' }), '');
    updatePage('dashboard');
  }, []);
  return { page, navigate, reset };
}

export function useModalHistory(onClose: () => void, canClose = true) {
  const close = useRef(onClose);
  close.current = onClose;
  const allowed = useRef(canClose);
  allowed.current = canClose;
  const session = useRef({ token: crypto.randomUUID(), mounted: false, registered: false });
  useEffect(() => {
    const current = session.current;
    current.mounted = true;
    if (readNavigation().modal !== current.token) {
      window.history.pushState(state({ ...readNavigation(), modal: current.token }), '');
    }
    current.registered = true;
    const pop = () => {
      if (current.registered && readNavigation().modal !== current.token) {
        if (!allowed.current) {
          window.history.pushState(state({ ...readNavigation(), modal: current.token }), '');
          return;
        }
        current.registered = false;
        close.current();
      }
    };
    window.addEventListener('popstate', pop);
    return () => {
      current.mounted = false;
      window.removeEventListener('popstate', pop);
      // StrictMode immediately mounts again; only an actual close consumes history.
      queueMicrotask(() => {
        if (!current.mounted && current.registered && readNavigation().modal === current.token) {
          current.registered = false;
          window.history.back();
        }
      });
    };
  }, []);
}
