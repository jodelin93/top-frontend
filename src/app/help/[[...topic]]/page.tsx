'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CircleHelp } from 'lucide-react';
import { LanguageSwitcher } from '@/components/language-switcher';
import { t } from '@/i18n';
import { HelpView } from '@/help/help-view';
import { canUseAdmin, useAuthStore } from '@/stores/auth-store';

/**
 * Help center as a page: /help (home) and /help/<topicId>. Open to everyone signed in;
 * without a session only the public topics (signing in, creating a store) are listed.
 */
export default function HelpPage({ params }: { params: Promise<{ topic?: string[] }> }) {
  const { topic } = use(params);
  const topicId = topic?.[0] ? decodeURIComponent(topic[0]) : null;
  const router = useRouter();
  const [query, setQuery] = useState('');
  const { isAuthenticated, user } = useAuthStore();
  const home = !isAuthenticated ? '/auth/login' : canUseAdmin(user) ? '/admin' : '/pos';

  const open = (id: string | null) => {
    setQuery('');
    router.push(id ? `/help/${id}` : '/help');
  };

  return (
    <div className="flex h-dvh flex-col bg-gray-50">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-white px-3 sm:px-4">
        <Link
          href={home}
          className="flex h-10 items-center gap-1 rounded-md px-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="max-sm:sr-only">{isAuthenticated ? t('Back to the app') : t('Sign in')}</span>
        </Link>
        <h1 className="flex flex-1 items-center gap-2 truncate text-base font-semibold">
          <CircleHelp className="h-5 w-5 text-blue-600" aria-hidden />
          {t('Help center')}
        </h1>
        <LanguageSwitcher compact className="bg-white" />
      </header>
      <HelpView
        className="mx-auto w-full max-w-3xl flex-1 bg-white sm:border-x"
        topicId={topicId}
        query={query}
        onQuery={setQuery}
        onOpenTopic={open}
      />
    </div>
  );
}
