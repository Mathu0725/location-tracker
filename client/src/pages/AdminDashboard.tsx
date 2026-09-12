import React, { useState } from 'react';
import { useLocation } from 'wouter';
import {
  Plus,
  Users,
  Radio,
  Clock,
  Slash,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Trash2,
  FileText,
  AlertCircle,
  MapPin,
  Smartphone,
  Shield,
  X,
} from 'lucide-react';
import { trpc } from '../lib/trpc';
import { Map } from '../components/Map';
import { formatRelativeTime, formatDateTime, formatAccuracy, formatCoords } from '../lib/utils';

export const AdminDashboard: React.FC = () => {
  const [, navigate] = useLocation();

  // Auth check
  const { data: authData, isLoading: authLoading, refetch: refetchAuth } = trpc.auth.me.useQuery();
  const isAdmin = authData?.user?.role === 'admin';

  // State
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [newSessionResult, setNewSessionResult] = useState<{
    participantName: string;
    token: string;
    expiresAt: number;
    purpose: string;
  } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    participantName: '',
    purpose: '',
    retentionDays: 1,
    expiresInHours: 24,
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Demo login mutation for instant access
  const demoLoginMutation = trpc.auth.demoAdminLogin.useMutation({
    onSuccess: (data) => {
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
      }
      refetchAuth();
    },
  });

  // Queries
  const {
    data: sessions = [],
    isLoading: sessionsLoading,
    isRefetching,
    refetch: refetchSessions,
  } = trpc.admin.listSessions.useQuery(undefined, {
    enabled: isAdmin,
    // Short polling: poll every 15s if there is at least one active session
    refetchInterval: (data) => {
      const hasActive = data?.some((s) => s.status === 'active');
      return hasActive ? 15000 : false;
    },
  });

  const selectedSession = sessions.find((s) => s.id === selectedSessionId) || sessions[0] || null;

  const { data: detailsData } = trpc.admin.getSessionDetails.useQuery(
    { sessionId: selectedSession?.id || '' },
    {
      enabled: isAdmin && !!selectedSession?.id,
      refetchInterval: selectedSession?.status === 'active' ? 15000 : false,
    }
  );

  const { data: auditLogs = [] } = trpc.admin.getAuditLogs.useQuery(
    { limit: 30 },
    { enabled: isAdmin && isAuditOpen }
  );

  // Mutations
  const createSessionMutation = trpc.admin.createSession.useMutation({
    onSuccess: (data) => {
      setNewSessionResult(data.session);
      setFormData({ participantName: '', purpose: '', retentionDays: 1, expiresInHours: 24 });
      setFormError(null);
      refetchSessions();
    },
    onError: (err) => {
      setFormError(err.message);
    },
  });

  const revokeMutation = trpc.admin.revokeSession.useMutation({
    onSuccess: () => {
      refetchSessions();
    },
  });

  const purgeMutation = trpc.admin.purgeRetention.useMutation({
    onSuccess: (data) => {
      alert(`Retention cleanup complete: ${data.purgedUpdatesCount} old location records purged, ${data.expiredSessionsCount} sessions marked expired.`);
      refetchSessions();
    },
  });

  // Copy Link Helper
  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.participantName.trim()) {
      setFormError('Participant name is required.');
      return;
    }
    if (formData.purpose.trim().length < 5) {
      setFormError('Purpose must be at least 5 characters.');
      return;
    }
    setFormError(null);
    createSessionMutation.mutate(formData);
  };

  // Auth gate with Instant 1-Click Admin Access
  if (!authLoading && !isAdmin) {
    return (
      <main className="max-w-md mx-auto px-4 py-16 text-center" role="main">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-lg">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Care Admin Dashboard</h1>
          <p className="mt-2 text-sm text-slate-600">
            Sign in to view real-time participant GPS tracking, manage sessions, and inspect audit logs.
          </p>
          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={() => demoLoginMutation.mutate()}
              disabled={demoLoginMutation.isLoading}
              className="w-full min-h-[48px] py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-md shadow-emerald-200 focus:ring-2 focus:ring-emerald-500 transition-all flex items-center justify-center gap-2"
            >
              <span>?</span>
              <span>{demoLoginMutation.isLoading ? 'Signing In...' : '1-Click Instant Admin Sign In'}</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
            >
              Sign in with password (admin / admin123)
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Stats calculation
  const activeCount = sessions.filter((s) => s.status === 'active').length;
  const pendingCount = sessions.filter((s) => s.status === 'pending').length;
  const revokedCount = sessions.filter((s) => s.status === 'revoked').length;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" role="main">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Care Team Location Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time consented location monitoring, link provisioning, and audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetchSessions()}
            disabled={isRefetching}
            className="p-2.5 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 focus:ring-2 focus:ring-emerald-500 transition-colors"
            aria-label="Refresh sessions"
            title="Refresh sessions"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsAuditOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 focus:ring-2 focus:ring-emerald-500 transition-colors"
            aria-label="View Audit Logs"
          >
            <FileText className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Audit Trail</span>
          </button>

          <button
            onClick={() => {
              if (confirm('Run retention policy data purge? Old location history will be permanently deleted.')) {
                purgeMutation.mutate();
              }
            }}
            disabled={purgeMutation.isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 focus:ring-2 focus:ring-red-500 transition-colors"
            title="Purge expired location updates"
            aria-label="Purge Expired Data"
          >
            <Trash2 className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Purge Expired</span>
          </button>

          <button
            onClick={() => {
              setNewSessionResult(null);
              setIsCreateOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 transition-colors"
            aria-label="Create New Location Sharing Session"
          >
            <Plus className="w-4 h-4" />
            <span>Create Session</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Sharing</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{activeCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pending Consent</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">{pendingCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Revoked / Stopped</div>
            <div className="text-2xl font-bold text-slate-600 mt-1">{revokedCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <Slash className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Content Layout: Table & Map Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8">
        {/* Left Column: Sessions List */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm font-bold text-slate-900">Participant Sessions</h2>
              <span className="text-xs text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full">
                {sessions.length}
              </span>
            </div>
            <span className="text-xs text-slate-400">
              {activeCount > 0 ? 'Auto-polling active (15s)' : 'Polling paused'}
            </span>
          </div>

          {sessionsLoading ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              Loading sessions...
            </div>
          ) : sessions.length === 0 ? (
            /* Polished Empty State */
            <div className="py-16 px-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">No Consent Sessions Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Create a participant link to request informed-consent location tracking for transit safety or care escorts.
              </p>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create First Session</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 overflow-y-auto max-h-[580px]">
              {sessions.map((sess) => {
                const isSelected = selectedSession?.id === sess.id;
                return (
                  <div
                    key={sess.id}
                    onClick={() => setSelectedSessionId(sess.id)}
                    className={`p-4 cursor-pointer transition-colors ${
                      isSelected ? 'bg-emerald-50/50 border-l-4 border-emerald-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-slate-900">{sess.participantName}</h3>
                          {/* Status Badge */}
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider ${
                              sess.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : sess.status === 'pending'
                                ? 'bg-amber-100 text-amber-800'
                                : sess.status === 'revoked'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {sess.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 line-clamp-1">{sess.purpose}</p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleCopyLink(sess.token)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors"
                          title="Copy Participant Link"
                          aria-label={`Copy link for ${sess.participantName}`}
                        >
                          {copiedToken === sess.token ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <a
                          href={`/share/${sess.token}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-slate-400 hover:text-emerald-700 rounded-lg hover:bg-slate-200/60 transition-colors"
                          title="Open Participant Link in New Tab"
                          aria-label={`Open link for ${sess.participantName}`}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>

                    {/* Metadata strip */}
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                      <span>Last seen: {formatRelativeTime(sess.lastSeenAt)}</span>
                      {sess.latestAccuracy && (
                        <span>Accuracy: {formatAccuracy(sess.latestAccuracy)}</span>
                      )}
                      <span>Retention: {sess.retentionDays}d</span>
                      {sess.latestUserAgent && (
                        <span className="truncate max-w-[140px]" title={sess.latestUserAgent}>
                          {sess.latestUserAgent.includes('iPhone')
                            ? 'iPhone'
                            : sess.latestUserAgent.includes('Android')
                            ? 'Android'
                            : 'Desktop'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Selected Session Inspector & Map */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {selectedSession ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <span className="text-xs text-slate-400 font-medium">Selected Participant</span>
                  <h3 className="text-base font-bold text-slate-900">{selectedSession.participantName}</h3>
                </div>

                {selectedSession.status === 'active' && (
                  <button
                    onClick={() => {
                      if (confirm(`Revoke location sharing for ${selectedSession.participantName}?`)) {
                        revokeMutation.mutate({ sessionId: selectedSession.id, reason: 'Admin revoked' });
                      }
                    }}
                    disabled={revokeMutation.isLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 focus:ring-2 focus:ring-rose-500"
                  >
                    <Slash className="w-3.5 h-3.5" />
                    <span>Revoke</span>
                  </button>
                )}
              </div>

              {/* Map Preview */}
              <div className="mt-4">
                <Map
                  latitude={selectedSession.latestLatitude}
                  longitude={selectedSession.latestLongitude}
                  accuracy={selectedSession.latestAccuracy}
                  participantName={selectedSession.participantName}
                  lastSeenAt={selectedSession.lastSeenAt}
                  history={detailsData?.history || []}
                />
              </div>

              {/* Session Meta Specs */}
              <div className="mt-4 space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Coordinates:</span>
                  <span className="font-mono text-slate-800">
                    {formatCoords(selectedSession.latestLatitude, selectedSession.latestLongitude)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Signal Accuracy:</span>
                  <span className="text-slate-800">{formatAccuracy(selectedSession.latestAccuracy)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Consent Granted:</span>
                  <span className="text-slate-800">{formatDateTime(selectedSession.consentedAt)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Expiry Time:</span>
                  <span className="text-slate-800">{formatDateTime(selectedSession.expiresAt)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Created By:</span>
                  <span className="text-slate-800">{selectedSession.createdBy}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center text-slate-400 text-sm">
              Select a session to inspect location history.
            </div>
          )}
        </div>
      </div>

      {/* Accessible Create Session Modal */}
      {isCreateOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-session-title"
        >
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 id="create-session-title" className="text-lg font-bold text-slate-900">
                Create Location Consent Session
              </h2>
              <button
                onClick={() => {
                  setIsCreateOpen(false);
                  setNewSessionResult(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {newSessionResult ? (
              /* Success: Show Generated Link */
              <div className="p-6">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
                  <Check className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 text-center">Session Link Generated!</h3>
                <p className="text-xs text-slate-500 text-center mt-1">
                  Share this secure link with <strong className="text-slate-700">{newSessionResult.participantName}</strong>. Tracking will only begin once they accept informed consent.
                </p>

                <div className="mt-5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase">Participant Link</div>
                  <div className="text-xs font-mono text-emerald-800 break-all select-all mt-1">
                    {window.location.origin}/share/{newSessionResult.token}
                  </div>
                </div>

                <div className="mt-5 flex gap-3">
                  <button
                    onClick={() => handleCopyLink(newSessionResult.token)}
                    className="flex-1 py-3 px-4 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-2 focus:ring-2 focus:ring-emerald-500"
                  >
                    {copiedToken === newSessionResult.token ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>

                  <a
                    href={`/share/${newSessionResult.token}`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-3 px-4 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Open</span>
                  </a>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => {
                      setIsCreateOpen(false);
                      setNewSessionResult(null);
                    }}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-4 py-2"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              /* Input Form */
              <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
                {formError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div>
                  <label htmlFor="pname" className="block text-xs font-semibold text-slate-700 mb-1">
                    Participant Full Name *
                  </label>
                  <input
                    id="pname"
                    type="text"
                    required
                    value={formData.participantName}
                    onChange={(e) => setFormData({ ...formData, participantName: e.target.value })}
                    placeholder="e.g. Maria Santos"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label htmlFor="purpose" className="block text-xs font-semibold text-slate-700 mb-1">
                    Purpose of Location Sharing *
                  </label>
                  <input
                    id="purpose"
                    type="text"
                    required
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    placeholder="e.g. Evening commute safety escort"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Must clearly describe why location is requested.
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="retention" className="block text-xs font-semibold text-slate-700 mb-1">
                      Retention Period
                    </label>
                    <select
                      id="retention"
                      value={formData.retentionDays}
                      onChange={(e) => setFormData({ ...formData, retentionDays: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value={1}>24 Hours (1 Day)</option>
                      <option value={3}>3 Days</option>
                      <option value={7}>7 Days</option>
                      <option value={30}>30 Days</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="expiry" className="block text-xs font-semibold text-slate-700 mb-1">
                      Link Expiry Window
                    </label>
                    <select
                      id="expiry"
                      value={formData.expiresInHours}
                      onChange={(e) => setFormData({ ...formData, expiresInHours: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value={1}>1 Hour</option>
                      <option value={4}>4 Hours</option>
                      <option value={12}>12 Hours</option>
                      <option value={24}>24 Hours (Default)</option>
                      <option value={72}>72 Hours</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createSessionMutation.isLoading}
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 shadow-sm"
                  >
                    {createSessionMutation.isLoading ? 'Creating...' : 'Generate Sharing Link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Audit Log Drawer */}
      {isAuditOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby="audit-logs-title"
        >
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <h2 id="audit-logs-title" className="text-base font-bold text-slate-900">
                  Compliance Audit Trail
                </h2>
              </div>
              <button
                onClick={() => setIsAuditOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                aria-label="Close audit drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 border-b border-slate-100 text-xs text-slate-600">
              Logs records all session creation, consent acceptance, coordinate ingest, and revocations. (Raw coordinates are redacted for privacy).
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-4 space-y-3">
              {auditLogs.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-400">No audit events recorded yet.</div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 uppercase tracking-wider text-[10px]">
                        {log.eventType.replace('_', ' ')}
                      </span>
                      <span className="text-slate-400 text-[10px]">{formatDateTime(log.createdAt)}</span>
                    </div>
                    <div className="mt-1 text-slate-500 text-[11px]">Actor: {log.actorType}</div>
                    {log.details && (
                      <pre className="mt-1.5 p-2 bg-white rounded border border-slate-200 text-[10px] text-slate-700 overflow-x-auto">
                        {log.details}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
