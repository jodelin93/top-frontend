'use client';

import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '@/lib/api/settings';
import { useAuthStore } from '@/stores/auth-store';
import { isLang, type Lang, useI18nStore, useLang } from './index';

/**
 * Applies the active language: re-renders the whole app when it changes, keeps
 * <html lang> and the "lang" cookie (read by the server on the next page load) in sync,
 * and follows the store default from the settings once signed in.
 */
export function I18nRoot({ initialLang, children }: { initialLang: Lang; children: ReactNode }) {
  // Before the first render: the language the server rendered with
  useState(() => {
    if (useI18nStore.getState().initial !== initialLang) useI18nStore.setState({ initial: initialLang });
    return true;
  });
  const lang = useLang();

  useEffect(() => {
    document.documentElement.lang = lang;
    document.cookie = `lang=${lang}; path=/; max-age=31536000; samesite=lax`;
  }, [lang]);

  return (
    <>
      <StoreLanguage />
      {/* Remount on change so every t() call re-runs */}
      <Fragment key={lang}>{children}</Fragment>
    </>
  );
}

/** Store default language (Settings → General), once signed in */
function StoreLanguage() {
  const signedIn = useAuthStore((state) => state.isAuthenticated);
  const { data } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
    staleTime: 5 * 60_000,
    enabled: signedIn,
  });
  const language = data?.language;
  useEffect(() => {
    useI18nStore.getState().setStoreDefault(isLang(language) ? language : null);
  }, [language]);
  return null;
}
