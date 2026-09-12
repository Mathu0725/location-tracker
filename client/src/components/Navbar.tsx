import React from 'react';
import { Link, useLocation } from 'wouter';
import { ShieldCheck, MapPin, Lock, LogOut, Navigation, ExternalLink } from 'lucide-react';
import { trpc } from '../lib/trpc';

export const Navbar: React.FC = () => {
  const [location, navigate] = useLocation();
  const { data: authData, refetch } = trpc.auth.me.useQuery();
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      refetch();
      navigate('/login');
    },
  });

  const isLoggedIn = !!authData?.user;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2.5 font-bold text-lg text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-lg p-1"
              aria-label="Location Consent Hub Home"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-200">
                <ShieldCheck className="w-5 h-5" aria-hidden="true" />
              </div>
              <span className="tracking-tight font-semibold">Location Consent Hub</span>
            </Link>
            <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              Informed Consent
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-2 sm:gap-4" aria-label="Main Navigation">
            <Link
              href="/"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                location === '/'
                  ? 'text-emerald-700 bg-emerald-50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Overview
            </Link>

            <Link
              href="/dialog-offers"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                location.startsWith('/dialog-offers') || location === '/offers'
                  ? 'text-red-700 bg-red-50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <MapPin className="w-4 h-4 text-red-600" aria-hidden="true" />
              <span>Dialog Offers</span>
            </Link>

            <Link
              href="/share/demo-aria"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                location.startsWith('/share')
                  ? 'text-emerald-700 bg-emerald-50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Navigation className="w-4 h-4" aria-hidden="true" />
              <span>Demo Flow</span>
            </Link>

            <Link
              href="/admin"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                location === '/admin'
                  ? 'text-emerald-700 bg-emerald-50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Lock className="w-4 h-4" aria-hidden="true" />
              <span>Admin Dashboard</span>
            </Link>

            {isLoggedIn ? (
              <button
                onClick={() => logoutMutation.mutate()}
                className="ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg border border-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                aria-label="Log out of Admin Dashboard"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            ) : (
              <Link
                href="/login"
                className="ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Admin Login</span>
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};
