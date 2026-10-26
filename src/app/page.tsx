'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { homePath } from '@/lib/landing';
import { tenantsApi } from '@/lib/api/tenants';
import { Button } from '@/components/ui/button';
import { BrandMark } from '@/components/brand-mark';
import { LanguageSwitcher } from '@/components/language-switcher';
import { t } from '@/i18n';

// A sale as the till prints it: the most familiar object in the shop
const RECEIPT_LINES: { label: string; qty: string; amount: string }[] = [
  { label: 'Banderole 2 × 1 m', qty: '1', amount: '3 500,00' },
  { label: 'Cartes de visite', qty: '100', amount: '1 750,00' },
  { label: 'Photocopie couleur', qty: '20', amount: '400,00' },
  { label: 'Plastification A4', qty: '4', amount: '300,00' },
];

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const { data: signupEnabled = false } = useQuery({
    queryKey: ['signup-enabled'],
    queryFn: tenantsApi.signupEnabled,
    staleTime: Infinity,
  });

  useEffect(() => {
    // Signed-in users go to the till, or to the admin area when they don't sell
    if (isAuthenticated) {
      router.push(homePath(user));
    }
  }, [isAuthenticated, user, router]);

  const facts = [
    {
      title: t('Keeps selling offline'),
      text: t('When the connection drops, the till goes on and sends the sales once it is back.'),
    },
    {
      title: t('Gourdes and dollars'),
      text: t('Prices in your currency, payments in the other at your buy and sell rates.'),
    },
    {
      title: t('Prints at the counter'),
      text: t('Receipts, labels and A4 documents on the shop’s own printers, and the drawer opens.'),
    },
    {
      title: t('Four languages'),
      text: t('Kreyòl, français, English and español, chosen by each person.'),
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-5 sm:px-8">
        <BrandMark />
        <div className="flex items-center gap-2">
          <LanguageSwitcher compact className="hidden bg-white sm:flex" />
          <Button asChild variant="outline">
            <Link href="/auth/login">{t('Sign in')}</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-4 pb-16 pt-6 sm:px-8 md:grid-cols-[1.1fr_0.9fr] md:gap-16 md:pt-10">
        <div className="max-w-xl">
          <h1 className="text-[2.6rem] font-extrabold leading-[1.02] tracking-[-0.035em] sm:text-6xl">
            {t('Sell, print the receipt, count the drawer.')}
          </h1>
          <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-gray-600">
            {t('Joda POS is the till and the back office of shops in Haiti: sales, stock, customers, cash sessions and reports, on a computer, a tablet or a phone.')}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="px-7">
              <Link href="/auth/login">{t('Sign in')}</Link>
            </Button>
            {signupEnabled && (
              <Button asChild size="lg" variant="outline" className="px-7">
                <Link href="/signup">{t('Create a store')}</Link>
              </Button>
            )}
          </div>
        </div>

        {/* The printer and its receipt: prints once when the page opens */}
        <div className="relative mx-auto w-full max-w-[320px]" aria-hidden>
          <div className="relative z-10 h-6 rounded-t-xl bg-ink shadow-[0_10px_24px_-12px_rgba(23,34,53,0.6)]">
            <div className="absolute inset-x-6 bottom-1.5 h-1 rounded-full bg-black/50" />
          </div>
          <div className="overflow-hidden px-4">
            <div className="receipt-print relative bg-white px-5 pb-6 pt-5 text-[13px] leading-snug text-gray-800 shadow-[0_18px_40px_-24px_rgba(23,34,53,0.45)]">
              <p className="text-center text-base font-bold tracking-[-0.01em] text-ink">Top Multi Services</p>
              <p className="text-center text-gray-500">Reçu de vente</p>
              <p className="mt-3 flex justify-between text-gray-500">
                <span>MAIN-000128</span>
                <span>26/10/2026 09:42</span>
              </p>
              <div className="my-3 border-t border-dashed border-gray-300" />
              <ul className="space-y-1.5">
                {RECEIPT_LINES.map((line) => (
                  <li key={line.label} className="flex justify-between gap-3">
                    <span className="min-w-0 truncate">
                      {line.label} <span className="text-gray-500">×{line.qty}</span>
                    </span>
                    <span>{line.amount}</span>
                  </li>
                ))}
              </ul>
              <div className="my-3 border-t border-dashed border-gray-300" />
              <p className="flex justify-between text-base font-bold text-ink">
                <span>Total HTG</span>
                <span>5 950,00</span>
              </p>
              <p className="flex justify-between text-gray-500">
                <span>Payé USD 45,00</span>
                <span>taux 132,25</span>
              </p>
              <p className="flex justify-between text-gray-500">
                <span>Monnaie HTG</span>
                <span>1,25</span>
              </p>
              <p className="mt-4 text-center text-gray-500">Mèsi, a lòt fwa!</p>
              {/* Torn edge of the roll */}
              <div className="receipt-tear absolute inset-x-4 -bottom-2 h-2" />
            </div>
          </div>
        </div>
      </main>

      <section className="border-t border-gray-200 bg-white">
        <dl className="mx-auto grid max-w-6xl gap-x-10 gap-y-8 px-4 py-12 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
          {facts.map((fact) => (
            <div key={fact.title}>
              <dt className="text-base font-bold tracking-[-0.01em]">{fact.title}</dt>
              <dd className="mt-1.5 leading-relaxed text-gray-600">{fact.text}</dd>
            </div>
          ))}
        </dl>
      </section>

      <footer className="border-t border-gray-200">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-gray-500 sm:px-8">
          <span>© 2026 Joda POS</span>
          <LanguageSwitcher compact className="bg-white sm:hidden" />
        </div>
      </footer>
    </div>
  );
}
