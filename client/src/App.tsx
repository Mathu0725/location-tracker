import React, { useState } from 'react';
import { Switch, Route } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { trpc } from './lib/trpc';
import { Navbar } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { ParticipantShare } from './pages/ParticipantShare';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminLogin } from './pages/AdminLogin';
import { DialogOffersPage } from './pages/DialogOffersPage';

export const App: React.FC = () => {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        staleTime: 5000,
      },
    },
  }));

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
          fetch(url, options) {
            const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
            return fetch(url, {
              ...options,
              credentials: 'include',
              headers: {
                ...options?.headers,
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
            });
          },
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
          <Navbar />
          <div className="flex-1">
            <Switch>
              <Route path="/" component={LandingPage} />
              <Route path="/dialog-offers" component={DialogOffersPage} />
              <Route path="/offers" component={DialogOffersPage} />
              <Route path="/login" component={AdminLogin} />
              <Route path="/admin" component={AdminDashboard} />
              <Route path="/share/:token" component={ParticipantShare} />
              <Route>
                <div className="max-w-md mx-auto py-16 text-center">
                  <h1 className="text-2xl font-bold text-slate-800">404 - Page Not Found</h1>
                  <p className="text-sm text-slate-500 mt-2">The requested page does not exist.</p>
                  <a href="/" className="mt-4 inline-block text-sm text-emerald-600 font-semibold hover:underline">
                    Return Home
                  </a>
                </div>
              </Route>
            </Switch>
          </div>
        </div>
      </QueryClientProvider>
    </trpc.Provider>
  );
};

export default App;
