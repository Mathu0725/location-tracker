import React from 'react';
import { Link } from 'wouter';
import {
  ShieldCheck,
  Eye,
  Clock,
  Radio,
  Slash,
  AlertTriangle,
  Smartphone,
  CheckCircle2,
  Lock,
  ArrowRight,
  Sparkles,
  Layers,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24 bg-gradient-to-b from-emerald-50/50 via-white to-slate-50 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/80 text-emerald-800 text-xs font-semibold uppercase tracking-wider mb-6 border border-emerald-200">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            Informed-Consent Location Sharing Platform
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Consent-Based Location Sharing <br className="hidden sm:inline" />
            <span className="text-emerald-600">Without Covert Tracking</span>
          </h1>

          <p className="mt-5 text-base sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Built for care teams, family transit escorts, and safety check-ins. No hidden trackers,
            no fake terms, and no background permission tricks. The participant retains total control
            at every second.
          </p>

          {/* Quick Actions */}
          <div className="mt-6 mb-2 inline-flex items-center gap-2 p-2 px-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
            <span>Featured Retail Flow:</span>
            <Link href="/dialog-offers" className="font-bold underline hover:text-red-900">
              Dialog 5G Offer & Store Locator Flow ?
            </Link>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/share/demo-aria"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 transition-all"
            >
              <span>Try Participant Demo</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>

            <Link
              href="/admin"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-all"
            >
              <Lock className="w-4 h-4 text-slate-500" aria-hidden="true" />
              <span>Admin Dashboard</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 5 Core Consent Principles */}
      <section className="py-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            The 5 Transparency Safeguards
          </h2>
          <p className="mt-2 text-slate-600 max-w-2xl mx-auto">
            Mandatory privacy standards guaranteed for every participant on Android and iPhone browsers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-200 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 mb-4">
              <Eye className="w-5 h-5" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">1. Clear Recipient Identity</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              The participant is informed exactly which organization, caregiver, or administrator
              will have access to their location before any permission prompt appears.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-200 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 mb-4">
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">2. Explicit Purpose Disclosure</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Every sharing link requires a specific declared purpose (e.g., "Transit safety check-in")
              preventing broad or unrestricted collection.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-200 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 mb-4">
              <Clock className="w-5 h-5" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">3. Strict Retention & Expiry</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Data is automatically deleted after the configured retention window (e.g. 24 hours),
              and the session link expires automatically.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-200 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 mb-4">
              <Radio className="w-5 h-5" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">4. Visible Active-Sharing State</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              An unambiguous pulsing visual badge and screen-reader status announce when GPS
              coordinates are actively transmitting.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-200 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700 mb-4">
              <Slash className="w-5 h-5" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">5. 1-Click Revoke & Stop</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              The participant can revoke consent instantly with an accessible "Stop Sharing" button.
              Revocation is immediately committed server-side.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-200 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 mb-4">
              <Layers className="w-5 h-5" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Cryptographic Random Tokens</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              256-bit URL-safe tokens ensure links are completely unguessable. Database IDs and
              passwords are never exposed publicly.
            </p>
          </div>
        </div>
      </section>

      {/* Honest Technical Limitation Disclosure */}
      <section className="py-12 bg-amber-50/70 border-y border-amber-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 shrink-0">
              <AlertTriangle className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-amber-950">
                Technical Disclosure: Browser Geolocation vs. Native Background Tracking
              </h2>
              <p className="mt-2 text-sm text-amber-900/90 leading-relaxed">
                Standard mobile web browsers (Safari iOS and Chrome Android) operate inside a strict OS
                sandbox. <strong>Web geolocation typically halts when the browser tab is closed, screen is locked, or the app is backgrounded.</strong>
              </p>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-white/80 p-3.5 rounded-xl border border-amber-200/60">
                  <span className="font-semibold text-slate-900 block mb-1">Web Link (This System)</span>
                  <ul className="space-y-1 text-slate-600">
                    <li>? Zero app installation required</li>
                    <li>? High accuracy while browser tab remains open</li>
                    <li>? Strict participant-controlled consent modal</li>
                    <li>? Pauses when screen locks or tab closes</li>
                  </ul>
                </div>

                <div className="bg-white/80 p-3.5 rounded-xl border border-amber-200/60">
                  <span className="font-semibold text-slate-900 block mb-1">Native App Roadmap (Required for 24/7 background)</span>
                  <ul className="space-y-1 text-slate-600">
                    <li>? iOS: CoreLocation with Background Location capability</li>
                    <li>? Android: Foreground Service with persistent notification bar</li>
                    <li>? Explicit OS system settings permission ("Always Allow")</li>
                    <li>? App Store & Google Play privacy review compliance</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Highlights */}
      <section className="py-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6">
          Security & Privacy Engineering
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
          <div className="p-4 bg-white rounded-xl border border-slate-200">
            <div className="text-emerald-600 font-bold text-lg mb-1">256-Bit</div>
            <div className="text-xs text-slate-600">High-entropy cryptographic tokens prevent link guessing</div>
          </div>
          <div className="p-4 bg-white rounded-xl border border-slate-200">
            <div className="text-emerald-600 font-bold text-lg mb-1">Rate-Limited</div>
            <div className="text-xs text-slate-600">Throttled GPS updates protect battery and prevent abuse</div>
          </div>
          <div className="p-4 bg-white rounded-xl border border-slate-200">
            <div className="text-emerald-600 font-bold text-lg mb-1">Sanitized Logs</div>
            <div className="text-xs text-slate-600">Raw coordinates are never stored in server audit logs</div>
          </div>
          <div className="p-4 bg-white rounded-xl border border-slate-200">
            <div className="text-emerald-600 font-bold text-lg mb-1">WCAG 2.1 AA</div>
            <div className="text-xs text-slate-600">High-contrast, screen-reader friendly, large touch targets</div>
          </div>
        </div>
      </section>
    </div>
  );
};
