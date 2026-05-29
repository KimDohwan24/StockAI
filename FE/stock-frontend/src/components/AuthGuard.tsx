'use client';

import { getPortfolio, PortfolioResponse } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

const AUTH_ONLY_PATHS = ['/onboarding'];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const router = useRouter();
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [portfolioFetched, setPortfolioFetched] = useState(false);

  const fetchPortfolio = useCallback(() => {
    if (!isAuthenticated) return;
    getPortfolio()
      .then((p) => setPortfolio(p))
      .catch(() => setPortfolio(null))
      .finally(() => setPortfolioFetched(true));
  }, [isAuthenticated]);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      if (AUTH_ONLY_PATHS.some((p) => window.location.pathname.startsWith(p))) {
        router.replace('/login');
      }
      return;
    }

    fetchPortfolio();
  }, [authLoading, isAuthenticated, router, fetchPortfolio]);

  useEffect(() => {
    if (authLoading || !portfolioFetched || !isAuthenticated) return;

    // Exempt ADMIN from having a portfolio redirect to onboarding
    if (user?.role === 'ADMIN') return;

    if (!portfolio && !window.location.pathname.startsWith('/onboarding')) {
      router.replace('/onboarding');
    }
  }, [authLoading, isAuthenticated, portfolio, portfolioFetched, router, user]);

  const showSpinner = authLoading || (isAuthenticated && !portfolioFetched);

  if (showSpinner) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-meta-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}