'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { homePath } from '@/lib/landing';
import { ShoppingCart, Package, Users, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { t } from '@/i18n';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    // Signed-in users go to the till, or to the admin area when they don't sell
    if (isAuthenticated) {
      router.push(homePath(user));
    }
  }, [isAuthenticated, user, router]);

  const handleLogin = () => {
    router.push('/auth/login');
  };

  const features = [
    {
      icon: ShoppingCart,
      title: t('Point of Sale'),
      description: t('Fast and intuitive checkout experience with barcode scanning'),
    },
    {
      icon: Package,
      title: t('Inventory Management'),
      description: t('Track stock levels, movements, and transfers across locations'),
    },
    {
      icon: Users,
      title: t('Customer Management'),
      description: t('Manage customer profiles, loyalty points, and purchase history'),
    },
    {
      icon: BarChart3,
      title: t('Reports & Analytics'),
      description: t('Real-time insights into sales, inventory, and customer trends'),
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Modern POS</h1>
          </div>
          <Button onClick={handleLogin}>{t('Sign In')}</Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto flex-1 px-4 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-6 text-5xl font-bold tracking-tight text-gray-900">
            {t('Modern Point of Sale System')}
          </h2>
          <p className="mb-8 text-xl text-gray-600">
            {t('Streamline your retail operations with our comprehensive POS solution. Manage sales, inventory, customers, and analytics all in one place.')}
          </p>
          <div className="flex justify-center gap-4">
            <Button size="lg" onClick={handleLogin} className="px-8">
              {t('Get Started')}
            </Button>
            <Button size="lg" variant="outline" className="px-8">
              {t('Learn More')}
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mx-auto mt-20 grid max-w-5xl gap-6 sm:grid-cols-2">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="border-2 transition-shadow hover:shadow-lg">
                <CardContent className="p-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                    <Icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-gray-900">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* CTA Section */}
        <div className="mx-auto mt-20 max-w-2xl text-center">
          <div className="rounded-2xl bg-blue-600 p-8 text-white shadow-xl">
            <h3 className="mb-4 text-2xl font-bold">{t('Ready to modernize your business?')}</h3>
            <p className="mb-6 text-blue-100">
              {t('Join thousands of businesses using Modern POS to streamline their operations.')}
            </p>
            <Button
              size="lg"
              variant="secondary"
              onClick={handleLogin}
              className="bg-white text-blue-600 hover:bg-blue-50"
            >
              {t('Sign In to Continue')}
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-gray-50">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-gray-600">
          <p>{t('© 2026 Modern POS. All rights reserved.')}</p>
        </div>
      </footer>
    </div>
  );
}
