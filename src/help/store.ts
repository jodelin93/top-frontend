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
  /** Topic shown; null = the topic list (search and categories) */
  topicId: string | null;
  /** Topic list: the topics of the page help was opened on, or every topic */
  scope: 'page' | 'all';
  /** Topics visited before the current one (Back) */
  history: (string | null)[];
  query: string;
  /** Location when the drawer was opened, for the page's own topic */
  location: { pathname: string; search: string } | null;
  /** Topics of what is open on screen (dialogs, tabs), innermost last */
  contexts: { key: number; topicId: string }[];
  openHelp: (topicId?: string | null) => void;
  close: () => void;
  showTopic: (topicId: string | null) => void;
  back: () => void;
  setQuery: (query: string) => void;
  /** Back to the topic list, of the page or of every topic */
  setScope: (scope: 'page' | 'all') => void;
}

export const useHelpStore = create<HelpState>()((set, get) => ({
  open: false,
  topicId: null,
  scope: 'page',
  history: [],
  query: '',
  location: null,
  contexts: [],
  openHelp: (topicId) => {
    const contexts = get().contexts;
    const contextTopic = contexts.length ? contexts[contexts.length - 1].topicId : null;
    // A given topic or the open dialog's own topic, else the list of the page's topics
    set({
      open: true,
      topicId: topicId ?? contextTopic,
      scope: 'page',
      history: [],
      query: '',
      location:
        typeof window === 'undefined'
          ? null
          : { pathname: window.location.pathname, search: window.location.search },
    });
  },
  close: () => set({ open: false }),
  showTopic: (topicId) => {
    const { topicId: current, history } = get();
    if (topicId === current) return set({ query: '' });
    set({ topicId, history: [...history, current], query: '' });
  },
  back: () => {
    const history = get().history;
    if (!history.length) return set({ topicId: null, query: '' });
    set({ topicId: history[history.length - 1], history: history.slice(0, -1), query: '' });
  },
  setQuery: (query) => set({ query }),
  setScope: (scope) => {
    const { topicId, history } = get();
    set({ scope, topicId: null, query: '', history: topicId === null ? history : [...history, topicId] });
  },
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
