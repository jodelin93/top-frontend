'use client';

import { useEffect } from 'react';
import { create } from 'zustand';

/**
 * Help drawer state. Kept in a store (not component state) so the drawer survives the
 * re-render of the whole app when the language changes, and so any component can open
 * it: `useHelpStore.getState().openHelp()` or `openHelp('pos-payment')`.
 */
interface HelpState {
  open: boolean;
  /** Topic shown; null = the help home (search and categories) */
  topicId: string | null;
  /** Topics visited before the current one (Back) */
  history: (string | null)[];
  query: string;
  /** Location when the drawer was opened, for the page's own topic */
  location: { pathname: string; search: string } | null;
  /** Opened without a topic: show the page's own topic once the index is loaded */
  routePending: boolean;
  /** Topics of what is open on screen (dialogs, tabs), innermost last */
  contexts: { key: number; topicId: string }[];
  openHelp: (topicId?: string | null) => void;
  close: () => void;
  showTopic: (topicId: string | null) => void;
  back: () => void;
  setQuery: (query: string) => void;
}

export const useHelpStore = create<HelpState>()((set, get) => ({
  open: false,
  topicId: null,
  history: [],
  query: '',
  location: null,
  routePending: false,
  contexts: [],
  openHelp: (topicId) => {
    const contexts = get().contexts;
    const contextTopic = contexts.length ? contexts[contexts.length - 1].topicId : null;
    const chosen = topicId ?? contextTopic;
    set({
      open: true,
      topicId: chosen,
      routePending: !chosen,
      history: [],
      query: '',
      location:
        typeof window === 'undefined'
          ? null
          : { pathname: window.location.pathname, search: window.location.search },
    });
  },
  close: () => set({ open: false, routePending: false }),
  showTopic: (topicId) => {
    const { topicId: current, history } = get();
    if (topicId === current) return set({ query: '' });
    set({ topicId, history: [...history, current], query: '', routePending: false });
  },
  back: () => {
    const history = get().history;
    if (!history.length) return set({ topicId: null, query: '', routePending: false });
    set({ topicId: history[history.length - 1], history: history.slice(0, -1), query: '', routePending: false });
  },
  setQuery: (query) => set({ query }),
}));

let nextKey = 1;

/**
 * Declares the help topic of what a component shows while it is mounted (and topicId is
 * set): opening help (button or F1) then shows this topic. For a dialog:
 * `useHelpContext(open ? 'pos-payment' : null)`.
 */
export function useHelpContext(topicId: string | null | undefined) {
  useEffect(() => {
    if (!topicId) return;
    const key = nextKey++;
    useHelpStore.setState((state) => ({ contexts: [...state.contexts, { key, topicId }] }));
    return () => {
      useHelpStore.setState((state) => ({ contexts: state.contexts.filter((c) => c.key !== key) }));
    };
  }, [topicId]);
}
