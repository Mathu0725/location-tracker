import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { ShieldCheck, Lock, User, AlertCircle, Sparkles } from 'lucide-react';
import { trpc } from '../lib/trpc';

export const AdminLogin: React.FC = () => {
  const [, navigate] = useLocation();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const utils = trpc.useContext();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      if (data.token) localStorage.setItem('auth_token', data.token);
      utils.auth.me.invalidate();
      navigate('/admin');
    },
    onError: (err) => {
      setErrorMsg(err.message || 'Login failed.');
    },
  });

  const demoLoginMutation = trpc.auth.demoAdminLogin.useMutation({
    onSuccess: (data) => {
      if (data.token) localStorage.setItem('auth_token', data.token);
      utils.auth.me.invalidate();
      navigate('/admin');
    },
    onError: (err) => {
      setErrorMsg(err.message || 'Demo login failed.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    loginMutation.mutate({ username, password });
  };

  return (
    <main className="min-h-[80vh] flex flex-col items-center justify-center p-4" role="main">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-md p-6 sm:p-8">
        <div className="text-center pb-6 border-b border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Admin Sign In</h1>
          <p className="text-xs text-slate-500 mt-1">
            Access authorized consent sessions and participant tracking
          </p>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1-Click Demo Login Button for instant access */}
        <div className="mt-5">
          <button
            type="button"
            onClick={() => demoLoginMutation.mutate()}
            disabled={demoLoginMutation.isLoading}
            className="w-full py-3 px-4 rounded-xl text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 flex items-center justify-center gap-2 focus:ring-2 focus:ring-emerald-500 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>1-Click Demo Admin Sign In</span>
          </button>
        </div>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <span className="relative bg-white px-3 text-xs text-slate-400">or enter credentials</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-xs font-semibold text-slate-700 mb-1">
              Username
            </label>
            <div className="relative">
              <input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-slate-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loginMutation.isLoading}
            className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 shadow-sm transition-colors mt-2"
          >
            {loginMutation.isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          Default seed: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">admin</code> / <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">admin123</code>
        </div>
      </div>
    </main>
  );
};
