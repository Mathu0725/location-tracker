import React, { useState, useEffect, useRef } from 'react';
import { useRoute } from 'wouter';
import {
  ShieldCheck,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Slash,
  Eye,
  Radio,
  ExternalLink,
  RefreshCw,
  Info,
  Lock,
} from 'lucide-react';
import { trpc } from '../lib/trpc';
import { formatAccuracy, formatRelativeTime, formatDateTime } from '../lib/utils';

export const ParticipantShare: React.FC = () => {
  const [, params] = useRoute('/share/:token');
  const token = params?.token || '';

  // State
  const [hasAgreedToTerms, setHasAgreedToTerms] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [currentCoords, setCurrentCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
  } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isRevokedBySelf, setIsRevokedBySelf] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  // Queries & Mutations
  const { data: session, isLoading, error, refetch } = trpc.participant.getSession.useQuery(
    { token },
    {
      enabled: !!token,
      retry: 1,
      refetchInterval: (data) => (data?.status === 'active' ? 20000 : false),
    }
  );

  const recordConsentMutation = trpc.participant.recordConsent.useMutation();
  const updateLocationMutation = trpc.participant.updateLocation.useMutation();
  const revokeConsentMutation = trpc.participant.revokeConsent.useMutation({
    onSuccess: () => {
      stopGeoWatch();
      setIsRevokedBySelf(true);
      refetch();
    },
  });

  const stopGeoWatch = () => {
    if (watchIdRef.current !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsLocating(false);
  };

  // Start browser geolocation tracking
  const startGeoWatch = () => {
    if (!('geolocation' in navigator)) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    setGeoError(null);
    setIsLocating(true);

    const onPosSuccess = (pos: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = pos.coords;
      const timestamp = pos.timestamp;

      setCurrentCoords({ latitude, longitude, accuracy, timestamp });
      setGeoError(null);

      // Send update to server (rate limiter handles throttling)
      updateLocationMutation.mutate(
        {
          token,
          latitude,
          longitude,
          accuracy,
          timestamp,
        },
        {
          onError: (err) => {
            // Ignore benign 429 throttle messages
            if (!err.message.includes('throttled')) {
              console.warn('Location send error:', err.message);
            }
          },
        }
      );
    };

    const onPosError = (err: GeolocationPositionError) => {
      setIsLocating(false);
      switch (err.code) {
        case err.PERMISSION_DENIED:
          setGeoError('Location permission was denied. Please allow location access in your browser settings.');
          break;
        case err.POSITION_UNAVAILABLE:
          setGeoError('Location information is currently unavailable. Please check GPS signal.');
          break;
        case err.TIMEOUT:
          setGeoError('Location request timed out. Retrying...');
          break;
        default:
          setGeoError('An unknown error occurred while requesting location.');
      }
    };

    // Watch position
    watchIdRef.current = navigator.geolocation.watchPosition(onPosSuccess, onPosError, {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0,
    });
  };

  // Auto-start watch if session is already active in database
  useEffect(() => {
    if (session?.status === 'active' && watchIdRef.current === null && !isRevokedBySelf) {
      startGeoWatch();
    }
    return () => {
      stopGeoWatch();
    };
  }, [session?.status]);

  const handleStartSharing = async () => {
    try {
      setGeoError(null);
      await recordConsentMutation.mutateAsync({
        token,
        consentVersion: session?.consentVersion || 'v1.0.0',
        deviceMetadata: navigator.userAgent,
      });
      startGeoWatch();
      refetch();
    } catch (err: any) {
      setGeoError(err.message || 'Failed to record consent.');
    }
  };

  const handleStopSharing = () => {
    if (window.confirm('Are you sure you want to stop sharing your location? Consent will be revoked immediately.')) {
      revokeConsentMutation.mutate({ token, reason: 'Participant stopped sharing' });
    }
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm text-slate-600 font-medium">Verifying sharing link...</p>
      </div>
    );
  }

  // Error / Invalid / Expired / Revoked States
  if (error || !session) {
    const isRevoked = error?.message?.toLowerCase().includes('revoked');
    const isExpired = error?.message?.toLowerCase().includes('expired');

    return (
      <main className="max-w-md mx-auto px-4 py-12" role="main">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center">
          <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4 ${
            isRevoked
              ? 'bg-red-100 text-red-600'
              : isExpired
              ? 'bg-amber-100 text-amber-600'
              : 'bg-slate-100 text-slate-500'
          }`}>
            {isRevoked ? (
              <Slash className="w-7 h-7" aria-hidden="true" />
            ) : isExpired ? (
              <Clock className="w-7 h-7" aria-hidden="true" />
            ) : (
              <AlertTriangle className="w-7 h-7" aria-hidden="true" />
            )}
          </div>

          <h1 className="text-xl font-bold text-slate-900">
            {isRevoked
              ? 'Location Sharing Revoked'
              : isExpired
              ? 'Sharing Link Expired'
              : 'Invalid Sharing Link'}
          </h1>

          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            {error?.message || 'This location sharing session is no longer valid or could not be found.'}
          </p>

          <div className="mt-6 pt-6 border-t border-slate-100 text-xs text-slate-500">
            If you believe this is an error, please ask your care team or administrator for a new link.
          </div>
        </div>
      </main>
    );
  }

  // Active Sharing Screen
  if (session.status === 'active' && !isRevokedBySelf) {
    return (
      <main className="max-w-lg mx-auto px-4 py-8" role="main">
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-md p-6 sm:p-8">
          {/* Active Banner */}
          <div className="flex items-center justify-between pb-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center">
                <span className="absolute w-6 h-6 rounded-full bg-emerald-400 opacity-75 animate-ping"></span>
                <span className="relative w-3.5 h-3.5 rounded-full bg-emerald-600"></span>
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Sharing Active
                </span>
                <h1 className="text-lg font-bold text-slate-900 mt-1">Live Location Sharing</h1>
              </div>
            </div>

            <button
              onClick={() => refetch()}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 focus:ring-2 focus:ring-emerald-500"
              aria-label="Refresh status"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Screen Reader Announcement */}
          <div className="sr-only" aria-live="polite">
            Location sharing is active. Your position is being shared with {session.createdBy}.
          </div>

          {/* Geolocation error warning if present */}
          {geoError && (
            <div className="mt-5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{geoError}</span>
            </div>
          )}

          {/* Participant Sharing Details */}
          <div className="mt-6 space-y-4">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <div className="text-xs text-slate-500">Sharing with:</div>
              <div className="text-sm font-semibold text-slate-900 mt-0.5 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>{session.createdBy} (Care Team)</span>
              </div>

              <div className="mt-3 text-xs text-slate-500">Purpose:</div>
              <div className="text-sm text-slate-800 font-medium mt-0.5">{session.purpose}</div>

              <div className="mt-3 text-xs text-slate-500">Data Retention:</div>
              <div className="text-sm text-slate-800 mt-0.5">
                Retained for {session.retentionDays} day{session.retentionDays > 1 ? 's' : ''}, then permanently purged.
              </div>
            </div>

            {/* Current Signal Card */}
            <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="flex items-center gap-1.5 font-medium text-emerald-800">
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                  GPS Signal Status
                </span>
                <span className="font-semibold text-slate-900">
                  {currentCoords ? formatAccuracy(currentCoords.accuracy) : 'Acquiring GPS...'}
                </span>
              </div>

              <div className="mt-2 text-xs text-slate-500">
                Last transmitted: {currentCoords ? formatRelativeTime(currentCoords.timestamp) : 'Pending...'}
              </div>
            </div>

            {/* Browser Sandboxing Reminder */}
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p>
                <strong>Keep this browser tab open</strong> while traveling. Mobile browsers (Safari & Chrome) pause location when the tab is closed or the screen is locked.
              </p>
            </div>
          </div>

          {/* Accessible Stop Sharing Button */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <button
              onClick={handleStopSharing}
              disabled={revokeConsentMutation.isLoading}
              className="w-full min-h-[48px] py-3.5 px-4 rounded-xl text-base font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 transition-all flex items-center justify-center gap-2"
              aria-label="Stop Sharing Location and Revoke Consent"
            >
              <Slash className="w-5 h-5" aria-hidden="true" />
              <span>{revokeConsentMutation.isLoading ? 'Revoking...' : 'Stop Sharing / Revoke Consent'}</span>
            </button>
            <p className="text-center text-xs text-slate-500 mt-2">
              You can stop sharing at any moment. No further coordinates will be recorded.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // Pre-Consent Informed Agreement Screen
  return (
    <main className="max-w-lg mx-auto px-4 py-8" role="main">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        {/* Header */}
        <div className="text-center pb-6 border-b border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="w-6 h-6" aria-hidden="true" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Location Consent Request
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Care check-in request for <span className="font-semibold text-slate-900">{session.participantName}</span>
          </p>
        </div>

        {/* 5 Points Transparency Card */}
        <div className="mt-6 space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3 text-xs">
            <div className="flex items-start gap-2.5">
              <Eye className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block">Who receives your location:</strong>
                <span className="text-slate-600">{session.createdBy} (Authorized Care Team)</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block">Why it is collected:</strong>
                <span className="text-slate-600">{session.purpose}</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block">Retention period:</strong>
                <span className="text-slate-600">
                  Retained for {session.retentionDays} day{session.retentionDays > 1 ? 's' : ''}, after which coordinates are permanently deleted.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Radio className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block">When sharing is active:</strong>
                <span className="text-slate-600">
                  Only while this tab is open and you see the green "Sharing Active" badge.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Slash className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block">How to stop sharing:</strong>
                <span className="text-slate-600">
                  Click the prominent "Stop Sharing" button at any time to immediately revoke consent.
                </span>
              </div>
            </div>
          </div>

          {/* Browser Permission Prompt Guidance */}
          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Browser Permission Prompt:</span>
              When you click the button below, your browser will ask for location permission. Choose <strong>"Allow"</strong> or <strong>"While Using the App"</strong>.
            </div>
          </div>

          {/* Geolocation Error if encountered */}
          {geoError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{geoError}</span>
            </div>
          )}

          {/* Explicit Agreement Checkbox */}
          <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={hasAgreedToTerms}
              onChange={(e) => setHasAgreedToTerms(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
              aria-label="I understand and agree to share my location for the stated purpose"
            />
            <span className="text-xs text-slate-700 leading-relaxed select-none">
              I have read the transparency details and consent to sharing my location with <strong>{session.createdBy}</strong> for <strong>{session.purpose}</strong>. (Version: {session.consentVersion})
            </span>
          </label>
        </div>

        {/* Start Sharing Action Button */}
        <div className="mt-6 pt-4 border-t border-slate-100">
          <button
            onClick={handleStartSharing}
            disabled={!hasAgreedToTerms || recordConsentMutation.isLoading}
            className={`w-full min-h-[48px] py-3.5 px-4 rounded-xl text-base font-semibold text-white transition-all flex items-center justify-center gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              hasAgreedToTerms && !recordConsentMutation.isLoading
                ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 focus:ring-emerald-600'
                : 'bg-slate-300 cursor-not-allowed text-slate-500'
            }`}
            aria-label="Agree and Start Sharing Location"
          >
            <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
            <span>{recordConsentMutation.isLoading ? 'Starting...' : 'Agree & Start Sharing Location'}</span>
          </button>
          <p className="text-center text-xs text-slate-500 mt-2">
            No tracking occurs until you click Agree and grant browser permission.
          </p>
        </div>
      </div>
    </main>
  );
};
