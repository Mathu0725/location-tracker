
const POPULAR_CITIES = [
  { name: 'Colombo', lat: 6.9186, lng: 79.8569 },
  { name: 'Bambalapitiya', lat: 6.8920, lng: 79.8550 },
  { name: 'Nugegoda', lat: 6.8720, lng: 79.8980 },
  { name: 'Kandy', lat: 7.2936, lng: 80.6370 },
  { name: 'Galle', lat: 6.0367, lng: 80.2170 },
  { name: 'Jaffna', lat: 9.6647, lng: 80.0167 },
  { name: 'Negombo', lat: 7.2084, lng: 79.8358 },
  { name: 'Kurunegala', lat: 7.4863, lng: 80.3623 },
];
import React, { useState } from 'react';
import {
  MapPin,
  Sparkles,
  Zap,
  Wifi,
  ShieldCheck,
  CheckCircle2,
  Navigation,
  Clock,
  Phone,
  Slash,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Info,
  Gift,
  Award,
} from 'lucide-react';
import { DIALOG_STORES, calculateDistanceKm, DialogStore } from '../data/dialogStores';
import { DialogMap } from '../components/DialogMap';
import { trpc } from '../lib/trpc';

export const DialogOffersPage: React.FC = () => {
  // States
  const [step, setStep] = useState<'offer' | 'consent_modal' | 'dashboard'>('offer');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [activeSessionToken, setActiveSessionToken] = useState<string | null>(null);

  // tRPC mutation for recording consent & coordinates on backend for audit trail
  const submitVisitorLocationMutation = trpc.participant.submitVisitorLocation.useMutation({
    onSuccess: (data) => {
      if (data?.token) setActiveSessionToken(data.token);
    },
  });
  const revokeConsentMutation = trpc.participant.revokeConsent.useMutation();

  // Triggered when user taps "Allow Location" in the pre-permission modal
  const handleAllowLocation = () => {
    if (!('geolocation' in navigator)) {
      setGeoError('Geolocation is not supported by this browser.');
      return;
    }

    setIsLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setCoords({ latitude, longitude, accuracy });
        setIsLocating(false);
        setStep('dashboard');

        // Submit location immediately to Admin dashboard!
        try {
          const res = await submitVisitorLocationMutation.mutateAsync({
            latitude,
            longitude,
            accuracy,
            deviceInfo: navigator.userAgent,
            existingToken: activeSessionToken || undefined,
          });
          if (res?.token) {
            setActiveSessionToken(res.token);
          }
        } catch (e) {
          console.error('Failed to submit visitor location to admin:', e);
        }
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError('Location permission was denied. Please allow location access in your browser to check nearby Dialog stores.');
        } else {
          setGeoError('Unable to retrieve your location. Please check your GPS signal.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  const handleStopSharing = () => {
    if (activeSessionToken) {
      revokeConsentMutation.mutate({ token: activeSessionToken, reason: 'User cleared Dialog location' });
    }
    setCoords(null);
    setStep('offer');
  };

  // Calculate distances to Dialog stores when coords are available
  const sortedStores: (DialogStore & { distanceKm: number })[] = coords
    ? DIALOG_STORES.map((store) => ({
        ...store,
        distanceKm: calculateDistanceKm(coords.latitude, coords.longitude, store.latitude, store.longitude),
      })).sort((a, b) => a.distanceKm - b.distanceKm)
    : [];

  const nearestStore = sortedStores[0] || null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Dialog Axiata Top Header Bar */}
      <div className="bg-gradient-to-r from-red-700 via-red-600 to-orange-600 text-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center font-black text-red-600 text-lg shadow-sm">
              D
            </div>
            <div>
              <span className="font-bold tracking-tight text-base sm:text-lg">Dialog Axiata</span>
              <span className="hidden sm:inline-block ml-2 text-xs font-medium text-red-100 border-l border-red-400 pl-2">
                The Future.Today.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs bg-black/20 px-3 py-1.5 rounded-full border border-white/10">
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            <span className="font-medium">Informed Consent Verified</span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Step 1 & 2: Offer Page & Pre-Consent Modal */}
        {step !== 'dashboard' && (
          <div className="space-y-8">
            {/* Promotional Hero */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-red-600 to-orange-500 p-6 sm:p-10 text-white">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm mb-3">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                  Exclusive Regional Promotions 2026
                </div>
                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                  Dialog 5G & Home Broadband Special Offers
                </h1>
                <p className="mt-2 text-sm sm:text-base text-red-100 max-w-2xl leading-relaxed">
                  Experience lightning-fast 5G speeds, free SIM upgrades, and bonus Anytime Data packages
                  customized for your area.
                </p>
              </div>

              {/* Offer Cards Preview */}
              <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-red-50/50 border border-red-100 flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center mb-3">
                      <Zap className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-base">5G Unlimited Trial Pass</h3>
                    <p className="text-xs text-slate-600 mt-1">
                      Enjoy unlimited data for 30 days when connected to any active Dialog 5G cell site.
                    </p>
                  </div>
                  <span className="mt-4 inline-block text-[11px] font-semibold text-red-700 uppercase">
                    Location-Qualified
                  </span>
                </div>

                <div className="p-5 rounded-2xl bg-orange-50/50 border border-orange-100 flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center mb-3">
                      <Wifi className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-base">Home Broadband 100GB Bonus</h3>
                    <p className="text-xs text-slate-600 mt-1">
                      Get 100GB Anytime Data free upon activating or upgrading a Home Fibre connection.
                    </p>
                  </div>
                  <span className="mt-4 inline-block text-[11px] font-semibold text-orange-700 uppercase">
                    Coverage-Dependent
                  </span>
                </div>

                <div className="p-5 rounded-2xl bg-amber-50/50 border border-amber-100 flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center mb-3">
                      <Award className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-base">Instant eSIM & VIP Fast-Track</h3>
                    <p className="text-xs text-slate-600 mt-1">
                      Free instant eSIM QR code transfer and priority queue token at your nearest Experience Centre.
                    </p>
                  </div>
                  <span className="mt-4 inline-block text-[11px] font-semibold text-amber-700 uppercase">
                    Store-Specific
                  </span>
                </div>
              </div>
            </div>

            {/* Step: ?Check eligibility / Find nearby Dialog stores? Card */}
            <div className="bg-white rounded-3xl border-2 border-red-500/80 shadow-lg p-6 sm:p-10 text-center">
              <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8" />
              </div>

              <h2 className="text-xl sm:text-3xl font-bold text-slate-900">
                Check Eligibility & Find Nearby Dialog Stores
              </h2>
              <div className="mt-2 text-xs text-slate-500">
                (Or pick your city directly below)
              </div>
              <div className="mt-3 flex flex-wrap justify-center gap-1.5 max-w-lg mx-auto">
                {POPULAR_CITIES.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => {
                      setCoords({ latitude: c.lat, longitude: c.lng, accuracy: 10 });
                      setStep('dashboard');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-red-600 hover:text-white text-slate-700 text-xs font-medium transition-colors"
                  >
                    ?? {c.name}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-xl mx-auto">
                Allow Dialog to check your location to unlock regional 5G promotions and calculate driving
                distance to the nearest Dialog Experience Centre.
              </p>

              {/* Informed Consent Disclosure Notice */}
              <div className="mt-6 max-w-lg mx-auto p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2">
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Informed-Consent Location Transparency</span>
                </div>
                <div className="text-slate-600">
                  ? <strong>Recipient:</strong> Dialog Axiata PLC Retail Operations
                </div>
                <div className="text-slate-600">
                  ? <strong>Purpose:</strong> Verifying local 5G cell site eligibility and finding nearest Experience Centre
                </div>
                <div className="text-slate-600">
                  ? <strong>Retention:</strong> Transient session processing (can be stopped/cleared anytime)
                </div>
              </div>

              {/* Action Button: ?Check eligibility / Find nearby Dialog stores? */}
              <div className="mt-8">
                <button
                  onClick={() => setStep('consent_modal')}
                  className="w-full sm:w-auto min-h-[52px] px-8 py-4 rounded-2xl text-base font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 shadow-md shadow-red-200 focus:outline-none focus:ring-4 focus:ring-red-500/30 transition-all inline-flex items-center justify-center gap-2.5"
                  aria-label="Check eligibility and find nearby Dialog stores"
                >
                  <Navigation className="w-5 h-5" />
                  <span>Check eligibility / Find nearby Dialog stores</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Pre-permission Modal with ?Allow Location? */}
        {step === 'consent_modal' && (
          <div
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="consent-modal-title"
          >
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 sm:p-8 text-center animate-in fade-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                <Navigation className="w-7 h-7" />
              </div>

              <h3 id="consent-modal-title" className="text-xl font-bold text-slate-900">
                Allow Location Access for Dialog
              </h3>

              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Dialog needs your device GPS coordinates to calculate driving distance to the nearest Experience Centre and confirm local 5G offer eligibility.
              </p>

              {geoError && (
                <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2 text-left">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{geoError}</span>
                </div>
              )}

              <div className="mt-6 p-3.5 rounded-2xl bg-blue-50 border border-blue-100 text-xs text-blue-900 text-left flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block">Browser Prompt Notice:</strong>
                  When you tap <strong>?Allow Location?</strong>, your browser (Safari or Chrome) will display a permission prompt. Tap <strong>"Allow"</strong> or <strong>"Allow While Visiting"</strong>.
                </div>
              </div>

              {/* Action Button: ?Allow Location? */}
              <div className="mt-6 flex flex-col gap-2.5">
                <button
                  onClick={handleAllowLocation}
                  disabled={isLocating}
                  className="w-full min-h-[48px] py-3.5 px-4 rounded-xl text-base font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-all flex items-center justify-center gap-2"
                  aria-label="Allow Location"
                >
                  <MapPin className="w-5 h-5" />
                  <span>{isLocating ? 'Requesting GPS Permission...' : 'Allow Location'}</span>
                </button>

                <button
                  onClick={() => setStep('offer')}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 5 & 6: Latitude/Longitude ? Map / Dashboard */}
        {step === 'dashboard' && coords && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {coords.accuracy >= 1000 && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                <div>
                  <strong className="block text-sm text-amber-950">
                    ?? Desktop PC Network Location Detected (?${Math.round(coords.accuracy / 1000)} km ISP node)
                  </strong>
                  <span className="text-amber-900 mt-0.5 block">
                    Windows PCs without satellite GPS estimate location via Internet Provider IP. 
                    <strong> Click anywhere on the map or drag the pin</strong> to set your exact location, or choose your city below!
                  </span>
                </div>
                <span className="px-3 py-1.5 rounded-lg bg-amber-100 font-bold text-[11px] text-amber-900 shrink-0">
                  Tip: Test on mobile for exact GPS
                </span>
              </div>
            )}

            {/* Quick City Jumper */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs shadow-sm">
              <span className="font-semibold text-slate-600">?? Jump directly to city:</span>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_CITIES.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setCoords({ latitude: c.lat, longitude: c.lng, accuracy: 10 })}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-red-600 hover:text-white text-slate-700 font-medium transition-colors"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
            {/* Top Status Bar with Live Coordinates & Stop Sharing */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center">
                  <span className="absolute w-6 h-6 rounded-full bg-red-400 opacity-75 animate-ping"></span>
                  <span className="relative w-3.5 h-3.5 rounded-full bg-red-600"></span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                      GPS Active
                    </span>
                    <h2 className="text-base font-bold text-slate-900">Your Location Verified</h2>
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-1 flex flex-wrap gap-x-3">
                    <span>Latitude: {coords.latitude.toFixed(5)}?</span>
                    <span>Longitude: {coords.longitude.toFixed(5)}?</span>
                    <span className="text-emerald-700 font-sans font-medium">?{Math.round(coords.accuracy)}m accuracy</span>
                  </div>
                </div>
              </div>

              {/* Accessible Stop Sharing Control */}
              <button
                onClick={handleStopSharing}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 focus:ring-2 focus:ring-rose-500 transition-colors"
                aria-label="Stop Sharing and Clear Location"
              >
                <Slash className="w-4 h-4" />
                <span>Stop Sharing / Clear Location</span>
              </button>
            </div>

            {/* Interactive Map & Nearest Store Highlight */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Map Column */}
              <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Dialog Experience Centres Map</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Showing nearest authorized centres relative to your GPS position</p>
                  </div>
                  {nearestStore && (
                    <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
                      Closest: {nearestStore.distanceKm} km
                    </span>
                  )}
                </div>

                <DialogMap userCoords={coords} stores={sortedStores} onLocationChange={(lat, lng) => setCoords({ latitude: lat, longitude: lng, accuracy: 10 })} />
              </div>

              {/* Nearest Store Card Column */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                {nearestStore && (
                  <div className="bg-white rounded-3xl border-2 border-red-500/80 shadow-md p-5 flex flex-col justify-between">
                    <div>
                      <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 text-[11px] font-bold uppercase tracking-wider mb-2">
                        <MapPin className="w-3.5 h-3.5" />
                        Nearest Centre ({nearestStore.distanceKm} km away)
                      </div>
                      <h4 className="text-lg font-bold text-slate-900">{nearestStore.name}</h4>
                      <p className="text-xs text-slate-600 mt-1">{nearestStore.address}</p>

                      <div className="mt-3 space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{nearestStore.hours}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{nearestStore.phone}</span>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">Available Services:</span>
                        <div className="flex flex-wrap gap-1">
                          {nearestStore.services.map((s, idx) => (
                            <span key={idx} className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded-md font-medium">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${nearestStore.latitude},${nearestStore.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Navigation className="w-4 h-4" />
                        <span>Get Driving Directions</span>
                        <ExternalLink className="w-3.5 h-3.5 ml-1" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Unlocked Regional Offers Dashboard */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Unlocked Regional Offers For Your Area
                  </h3>
                  <p className="text-xs text-slate-500">
                    Location eligibility verified at Latitude {coords.latitude.toFixed(4)}?, Longitude {coords.longitude.toFixed(4)}?
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="p-5 rounded-2xl bg-gradient-to-br from-red-50 to-white border border-red-200">
                  <div className="flex items-center justify-between">
                    <span className="bg-red-600 text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
                      Eligible
                    </span>
                    <Zap className="w-5 h-5 text-red-600" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mt-3">Dialog 5G Unlimited Trial</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Your location is within active range of a Dialog 5G cell tower. Enjoy zero-rated 5G speeds.
                  </p>
                  <button className="mt-4 w-full py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold">
                    Claim 5G Trial
                  </button>
                </div>

                <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-50 to-white border border-orange-200">
                  <div className="flex items-center justify-between">
                    <span className="bg-orange-600 text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
                      Eligible
                    </span>
                    <Wifi className="w-5 h-5 text-orange-600" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mt-3">100GB Fibre Anytime Bonus</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Applicable for Home Broadband router upgrades at your nearest Experience Centre ({nearestStore?.name}).
                  </p>
                  <button className="mt-4 w-full py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold">
                    Reserve at Store
                  </button>
                </div>

                <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-white border border-amber-200">
                  <div className="flex items-center justify-between">
                    <span className="bg-amber-600 text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
                      Store VIP Pass
                    </span>
                    <Award className="w-5 h-5 text-amber-600" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mt-3">eSIM Free QR Fast-Track</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Skip the queue at {nearestStore?.name}. Show this digital pass at the priority counter.
                  </p>
                  <button className="mt-4 w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold">
                    Show Priority Pass
                  </button>
                </div>
              </div>
            </div>

            {/* List of All Nearby Dialog Stores */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
              <h3 className="text-base font-bold text-slate-900 mb-4">
                All Authorized Dialog Experience Centres (Sorted by Distance)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sortedStores.map((store) => (
                  <div
                    key={store.id}
                    className="p-4 rounded-2xl border border-slate-200 hover:border-red-300 hover:bg-red-50/20 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-900 text-sm">{store.name}</h4>
                        <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                          {store.distanceKm} km
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{store.address}</p>
                      <p className="text-[11px] text-slate-400 mt-1">?? {store.hours}</p>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-600 font-mono">{store.phone}</span>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1"
                      >
                        <span>Directions</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
