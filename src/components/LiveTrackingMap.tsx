import React, { useState, useEffect, useRef } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  Pin,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  Navigation,
  Thermometer,
   ShieldCheck,
  Camera,
  Bell,
  Star,
  CheckCircle2,
  AlertTriangle,
  Truck,
  Sparkles,
  RefreshCw,
  Share2,
  Play,
  Pause,
  Route as RouteIcon,
} from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import {
  evaluateTransitTemperature,
  aggregateRatings,
  haversineDistanceKm,
  buildDriverBreadcrumbTrail,
  buildOrderSuccessSummary,
  type CustomerReview,
  type TemperatureReading,
  type DriverBreadcrumbTrail,
  type OrderSuccessBannerDetails,
} from '../utils/deliveryLogic';
import type { ActiveDeliveryOrder } from '../data/vexmoData';
import { ShareMealModal } from './ShareMealModal';
import { OrderSuccessAnimation } from './OrderSuccessAnimation';
import { DeliveryMilestoneProgressBar } from './DeliveryMilestoneProgressBar';

const GOOGLE_MAPS_API_KEY =
  (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) || '';

interface RouteOverlayProps {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  onRouteComputed?: (distanceMeters: number, durationMillis: number) => void;
}

interface MapPolyline {
  setMap: (map: unknown) => void;
  setOptions: (opts: Record<string, unknown>) => void;
}

/**
 * Modern Google Maps Routes API integration via useMapsLibrary('routes') and Route.computeRoutes.
 */
const LiveRoutePolyline: React.FC<RouteOverlayProps> = ({
  origin,
  destination,
  onRouteComputed,
}) => {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const polylinesRef = useRef<MapPolyline[]>([]);

  useEffect(() => {
    if (!routesLib || !map) return;

    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    const request = {
      origin,
      destination,
      travelMode: 'DRIVING',
      fields: ['path', 'distanceMeters', 'durationMillis', 'viewport'],
    };

    const routeClass = (
      routesLib as unknown as {
        Route?: {
          computeRoutes?: (req: unknown) => Promise<{
            routes?: Array<{
              createPolylines: () => MapPolyline[];
              viewport?: unknown;
              distanceMeters?: number;
              durationMillis?: number;
            }>;
          }>;
        };
      }
    ).Route;

    if (routeClass && typeof routeClass.computeRoutes === 'function') {
      routeClass
        .computeRoutes(request)
        .then(({ routes }) => {
          if (!routes || routes.length === 0) return;
          const primary = routes[0];
          const lines = primary.createPolylines();
          lines.forEach((line) => {
            line.setOptions({
              strokeColor: '#475569',
              strokeOpacity: 0.35,
              strokeWeight: 4,
            });
            line.setMap(map);
          });
          polylinesRef.current = lines;
          if (primary.viewport) {
            (map as unknown as { fitBounds: (vp: unknown) => void }).fitBounds(
              primary.viewport
            );
          }
          if (onRouteComputed) {
            onRouteComputed(
              primary.distanceMeters ?? 4200,
              primary.durationMillis ?? 540000
            );
          }
        })
        .catch((err: unknown) => {
          const msg = String(err);
          if (msg.includes('OVER_QUERY_LIMIT') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) {
            window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
          }
        });
    }

    return () => {
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [routesLib, map, origin, destination, onRouteComputed]);

  return null;
};

/**
 * Visual 'breadcrumb' animation layer using Google Maps Polyline drawing capabilities.
 * Draws a glowing emerald traveled path polyline with animated breadcrumb symbols
 * along the exact path the delivery driver has taken, plus a dashed remaining route polyline.
 */
const DriverBreadcrumbPolyline: React.FC<{
  trail: DriverBreadcrumbTrail;
}> = ({ trail }) => {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');
  const traveledPolylineRef = useRef<MapPolyline | null>(null);
  const remainingPolylineRef = useRef<MapPolyline | null>(null);

  useEffect(() => {
    if (!mapsLib || !map) return;

    const PolylineCtor = (
      mapsLib as unknown as {
        Polyline?: new (opts: Record<string, unknown>) => MapPolyline;
      }
    ).Polyline;

    if (!PolylineCtor) return;

    if (traveledPolylineRef.current) {
      traveledPolylineRef.current.setMap(null);
    }
    if (remainingPolylineRef.current) {
      remainingPolylineRef.current.setMap(null);
    }

    const breadcrumbSymbol = {
      path: 'M 0,-1 0,1',
      strokeOpacity: 1,
      strokeColor: '#A7F3D0',
      scale: 4,
    };

    const traveledLine = new PolylineCtor({
      path: trail.traveledPath.map((p) => ({ lat: p.lat, lng: p.lng })),
      geodesic: true,
      strokeColor: '#10B981',
      strokeOpacity: 0.92,
      strokeWeight: 6,
      icons: [
        {
          icon: breadcrumbSymbol,
          offset: '0%',
          repeat: '22px',
        },
      ],
      map,
    });

    const remainingLine = new PolylineCtor({
      path: trail.remainingPath.map((p) => ({ lat: p.lat, lng: p.lng })),
      geodesic: true,
      strokeColor: '#F59E0B',
      strokeOpacity: 0.45,
      strokeWeight: 4,
      map,
    });

    traveledPolylineRef.current = traveledLine;
    remainingPolylineRef.current = remainingLine;

    let offsetCount = 0;
    const animTimer = window.setInterval(() => {
      offsetCount = (offsetCount + 2) % 200;
      traveledLine.setOptions({
        icons: [
          {
            icon: breadcrumbSymbol,
            offset: `${offsetCount / 2}%`,
            repeat: '22px',
          },
        ],
      });
    }, 60);

    return () => {
      window.clearInterval(animTimer);
      traveledLine.setMap(null);
      remainingLine.setMap(null);
    };
  }, [mapsLib, map, trail]);

  return null;
};

interface LiveTrackingMapProps {
  order: ActiveDeliveryOrder;
  reviews: CustomerReview[];
  onAddReview: (review: CustomerReview) => void;
  onTriggerPushAlert: (title: string, body: string) => void;
  onUpdateOrderStatus?: (orderId: string, status: 'IN_TRANSIT' | 'DELIVERED') => void;
  realtimeTransportStatus?: 'LIVE_WS' | 'POLLING';
  orderSuccessDetails?: OrderSuccessBannerDetails | null;
  onClearOrderSuccess?: () => void;
}

export const LiveTrackingMap: React.FC<LiveTrackingMapProps> = ({
  order,
  reviews,
  onAddReview,
  onTriggerPushAlert,
  onUpdateOrderStatus,
  realtimeTransportStatus = 'LIVE_WS',
  orderSuccessDetails,
  onClearOrderSuccess,
}) => {
  const [activeSuccessDetails, setActiveSuccessDetails] = useState<OrderSuccessBannerDetails | null>(
    orderSuccessDetails ?? null
  );

  useEffect(() => {
    if (orderSuccessDetails) {
      setActiveSuccessDetails(orderSuccessDetails);
    }
  }, [orderSuccessDetails]);

  const [waypointIndex, setWaypointIndex] = useState<number>(
    order.status === 'DELIVERED' ? order.routeWaypoints.length - 1 : 2
  );
  const [isReplayingBreadcrumbs, setIsReplayingBreadcrumbs] = useState<boolean>(false);
  const [breadcrumbDashOffset, setBreadcrumbDashOffset] = useState<number>(0);
  const [telemetryReadings, setTelemetryReadings] = useState<TemperatureReading[]>(
    order.telemetryReadings
  );
  const [idealRange] = useState<[number, number]>([65, 76]);
  const [scanResult, setScanResult] = useState<{
    overallQualityScore: number;
    sealIntegrity: string;
    thermalCompliance: string;
    portionAccuracyPct: number;
    visualFreshnessCheck: string;
    recommendations: string[];
    verifiedAt?: string;
  } | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // Sync courier position with real-time order status changes ('IN_TRANSIT' <-> 'DELIVERED')
  useEffect(() => {
    if (order.status === 'DELIVERED') {
      setWaypointIndex(order.routeWaypoints.length - 1);
    } else if (order.status === 'IN_TRANSIT') {
      setWaypointIndex((prev) =>
        prev === order.routeWaypoints.length - 1 ? 2 : prev
      );
    }
  }, [order.status, order.routeWaypoints.length]);

  // Continuous visual animation for the polyline breadcrumb stream
  useEffect(() => {
    const streamTimer = window.setInterval(() => {
      setBreadcrumbDashOffset((prev) => (prev - 2) % 48);
    }, 55);
    return () => window.clearInterval(streamTimer);
  }, []);

  // Optional automated step-by-step breadcrumb trail replay
  useEffect(() => {
    if (!isReplayingBreadcrumbs) return;
    const replayTimer = window.setInterval(() => {
      setWaypointIndex((prev) => {
        if (prev >= order.routeWaypoints.length - 1) {
          setIsReplayingBreadcrumbs(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1200);
    return () => window.clearInterval(replayTimer);
  }, [isReplayingBreadcrumbs, order.routeWaypoints.length]);

  // Customer feedback form state
  const [reviewerName, setReviewerName] = useState<string>('Ananya Krishnan');
  const [overallRating, setOverallRating] = useState<number>(5);
  const [tempRating, setTempRating] = useState<number>(5);
  const [packRating, setPackRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewSubmittedBanner, setReviewSubmittedBanner] = useState<boolean>(false);
  const [isShareMealOpen, setIsShareMealOpen] = useState<boolean>(false);

  const isOrderDelivered =
    order.status === 'DELIVERED' ||
    waypointIndex === order.routeWaypoints.length - 1;

  const currentDriverPos =
    order.routeWaypoints[waypointIndex] ?? order.routeWaypoints[0];

  const breadcrumbTrail = buildDriverBreadcrumbTrail(
    order.routeWaypoints,
    waypointIndex
  );

  const remainingDistanceKm = haversineDistanceKm(
    currentDriverPos,
    order.customerDestination
  );
  const dynamicEtaMins = Math.max(
    1,
    Math.round((order.routeWaypoints.length - 1 - waypointIndex) * 3)
  );

  const thermalReport = evaluateTransitTemperature(telemetryReadings, idealRange);
  const ratingSummary = aggregateRatings(reviews);

  const handleToggleBreadcrumbReplay = () => {
    if (isReplayingBreadcrumbs) {
      setIsReplayingBreadcrumbs(false);
      return;
    }
    // Start replay from kitchen origin if already at the end, or advance from origin
    setWaypointIndex(0);
    setIsReplayingBreadcrumbs(true);
  };

  const handleReplayOrderSuccess = () => {
    const replayDetails = buildOrderSuccessSummary({
      orderId: order.orderId,
      grandTotalInr: 1120,
      itemsSummary: 'Double Wagyu Truffle Burger & Korean Gochujang Wings',
      courierName: order.driver.name,
      placedAt: order.placedAt,
      etaMinutes: dynamicEtaMins,
    });
    setActiveSuccessDetails(replayDetails);
    onTriggerPushAlert(
      `Order #${order.orderId} Telemetry`,
      'Order Success animation replayed with live dispatch telemetry.'
    );
  };

  const handleAdvanceDriver = () => {
    const nextIdx = (waypointIndex + 1) % order.routeWaypoints.length;
    setWaypointIndex(nextIdx);
    const wp = order.routeWaypoints[nextIdx];
    const reachedDestination = nextIdx === order.routeWaypoints.length - 1;

    if (reachedDestination && onUpdateOrderStatus) {
      onUpdateOrderStatus(order.orderId, 'DELIVERED');
      return;
    }

    if (!reachedDestination && order.status === 'DELIVERED' && onUpdateOrderStatus) {
      onUpdateOrderStatus(order.orderId, 'IN_TRANSIT');
      return;
    }

    const statusLabel = reachedDestination
      ? 'Arrived at Doorstep · NFC Seal Ready'
      : `Passed ${wp.label}`;
    onTriggerPushAlert(
      `Order #${order.orderId} · ${statusLabel}`,
      `Courier ${order.driver.name} is ${
        reachedDestination
          ? 'at your doorstep!'
          : `${Math.max(2, (order.routeWaypoints.length - 1 - nextIdx) * 3)} mins away.`
      } Pod held at 67.4°C.`
    );
  };

  const handleSimulateThermalDrift = () => {
    if (telemetryReadings.some((r) => r.tempC < 60)) {
      // Restore optimal readings
      setTelemetryReadings(order.telemetryReadings);
      onTriggerPushAlert(
        'Thermal Pod Stabilized',
        'Induction heater restored compartment temperature to 67.8°C.'
      );
    } else {
      // Inject a dip to demonstrate thermal excursion alert
      setTelemetryReadings([
        ...order.telemetryReadings,
        {
          timestamp: '12:31 PM',
          tempC: 57.4,
          humidityPct: 58,
          stage: 'In-Transit Telemetry',
        },
      ]);
      onTriggerPushAlert(
        'Thermal Excursion Alert · Pod #VX8812',
        'Compartment dipped to 57.4°C (below 65°C threshold). Auto-boost heating engaged.'
      );
    }
  };

  const handleRunFoodScan = async () => {
    setIsScanning(true);
    try {
      const latestTemp =
        telemetryReadings[telemetryReadings.length - 1]?.tempC ??
        order.confirmationScan.surfaceTempC;
      const response = await fetch('/api/ai/food-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dishName: 'Thai Green Curry Bowl & FUDORA Club Sandwich',
          surfaceTempC: latestTemp,
          idealTempRangeC: idealRange,
          allergens: ['soy', 'gluten', 'dairy'],
        }),
      });
      const data = await response.json();
      setScanResult(data);
      onTriggerPushAlert(
        `AI Food Quality Scan Verified (${data.overallQualityScore}/100)`,
        `Portion match ${data.portionAccuracyPct}% · Seal ${data.sealIntegrity}`
      );
    } catch {
      setScanResult({
        overallQualityScore: 98,
        sealIntegrity: 'VERIFIED_INTACT',
        thermalCompliance: 'OPTIMAL_HOLD',
        portionAccuracyPct: 99.4,
        visualFreshnessCheck:
          'Optical & thermal verification confirms intact presentation and zero container leakage.',
        recommendations: [
          'Core temperature held within 65°C–76°C target window.',
          'NFC tamper seal #VX8812 verified intact at doorstep.',
        ],
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) return;

    const newReview: CustomerReview = {
      id: `rev-${Date.now()}`,
      customerName: reviewerName.trim() || 'Verified Customer',
      orderId: order.orderId,
      dishName: 'Thai Green Curry Bowl & Club Sandwich',
      rating: overallRating,
      tempAccuracyRating: tempRating,
      packagingRating: packRating,
      comment: reviewComment.trim(),
      createdAt: 'Just now',
      verifiedScan: true,
    };
    onAddReview(newReview);
    setReviewComment('');
    setReviewSubmittedBanner(true);
    setTimeout(() => setReviewSubmittedBanner(false), 4000);
  };

  const hasValidMapsKey =
    Boolean(GOOGLE_MAPS_API_KEY) &&
    GOOGLE_MAPS_API_KEY !== 'MY_GOOGLE_MAPS_API_KEY';

  // Helper to project waypoint stepIndex (0..4) into SVG map coordinates
  const toSvgCoords = (stepIndex: number) => ({
    x: Number((60 + stepIndex * 120).toFixed(1)),
    y: Number((165 - stepIndex * 27).toFixed(1)),
  });

  const svgTraveledPoints = breadcrumbTrail.traveledPath
    .map((pt) => {
      const { x, y } = toSvgCoords(pt.stepIndex);
      return `${x},${y}`;
    })
    .join(' ');

  const svgRemainingPoints = breadcrumbTrail.remainingPath
    .map((pt) => {
      const { x, y } = toSvgCoords(pt.stepIndex);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="space-y-6">
      {/* SUBTLE ORDER SUCCESS ANIMATION (FRAMER-MOTION) */}
      <AnimatePresence>
        {activeSuccessDetails && (
          <div data-testid="tracking-order-success-banner">
            <OrderSuccessAnimation
              details={activeSuccessDetails}
              onDismiss={() => {
                setActiveSuccessDetails(null);
                if (onClearOrderSuccess) onClearOrderSuccess();
              }}
              onShareMeal={() => setIsShareMealOpen(true)}
            />
          </div>
        )}
      </AnimatePresence>

      {/* VISUAL MILESTONE PROGRESS BAR (FRAMER-MOTION ANIMATED) */}
      <DeliveryMilestoneProgressBar
        orderStatus={order.status}
        waypointIndex={waypointIndex}
        totalWaypoints={order.routeWaypoints.length}
        placedAt={order.placedAt}
        driverName={order.driver.name}
        destinationName={order.customerDestination.name}
        onSimulateStage={(st) => {
          if (st === 'Delivered') {
            setWaypointIndex(order.routeWaypoints.length - 1);
            if (onUpdateOrderStatus) onUpdateOrderStatus(order.orderId, 'DELIVERED');
          } else if (st === 'En Route') {
            setWaypointIndex(2);
            if (onUpdateOrderStatus) onUpdateOrderStatus(order.orderId, 'IN_TRANSIT');
          } else if (st === 'Courier Assigned') {
            setWaypointIndex(0);
            if (onUpdateOrderStatus) onUpdateOrderStatus(order.orderId, 'IN_TRANSIT');
          } else {
            setWaypointIndex(0);
          }
          onTriggerPushAlert(
            `Delivery Stage · ${st}`,
            `Live milestone transitioned to ${st} across Colombo delivery network.`
          );
        }}
      />

      {/* TOP ORDER STATUS & DRIVER TELEMETRY HEADER */}
      <section
        aria-label="Live Order Status and Google Maps Driver Tracking"
        className="bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 space-y-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-mono tabular-nums text-amber-500 font-semibold">
                LIVE ORDER #{order.orderId} · PLACED {order.placedAt} · NFC SEAL #VX8812
              </span>
              <span
                data-testid="live-tracking-order-status"
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold font-mono ${
                  order.status === 'DELIVERED'
                    ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                }`}
              >
                {order.status === 'DELIVERED' ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <Truck className="w-3.5 h-3.5" />
                )}
                <span>{order.status}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/25 text-[11px] font-mono text-sky-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>
                  {realtimeTransportStatus === 'LIVE_WS'
                    ? 'WebSocket + Polling Sync'
                    : 'Polling Sync Active'}
                </span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
              {isOrderDelivered
                ? 'Delivered at Altair Residences, Colombo — Doorstep Handoff Verified'
                : `In Transit via ${currentDriverPos.label}`}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Courier: <strong className="text-slate-800 dark:text-slate-200">{order.driver.name}</strong> ({order.driver.vehicle} · {order.driver.plateNumber})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 font-mono tabular-nums text-right">
              <div className="text-[11px] text-slate-400">ESTIMATED ARRIVAL</div>
              <div
                className={`text-lg font-bold ${
                  isOrderDelivered ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {isOrderDelivered
                  ? 'DELIVERED'
                  : `${dynamicEtaMins} MINS (${remainingDistanceKm} km)`}
              </div>
            </div>

            {onUpdateOrderStatus && (
              <button
                type="button"
                data-testid="live-tracking-toggle-status-btn"
                onClick={() =>
                  onUpdateOrderStatus(
                    order.orderId,
                    order.status === 'DELIVERED' ? 'IN_TRANSIT' : 'DELIVERED'
                  )
                }
                className={`min-h-[44px] px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-2 transition-transform active:scale-[0.98] cursor-pointer whitespace-nowrap shrink-0 ${
                  order.status === 'DELIVERED'
                    ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {order.status === 'DELIVERED'
                    ? 'Reset to In Transit (Live Sync)'
                    : 'Mark Delivered (Live Sync)'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsShareMealOpen(true)}
              aria-label="Share Your Meal"
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white/10 hover:bg-slate-800 dark:hover:bg-white/15 border border-slate-700 dark:border-amber-500/40 text-white dark:text-amber-300 font-semibold text-xs flex items-center gap-2 transition-transform active:scale-[0.98] cursor-pointer whitespace-nowrap shrink-0"
            >
              <Share2 className="w-4 h-4 text-amber-400" />
              <span>Share Your Meal</span>
            </button>

            <button
              type="button"
              data-testid="advance-courier-btn"
              onClick={handleAdvanceDriver}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center gap-2 transition-transform active:scale-[0.98] cursor-pointer whitespace-nowrap shrink-0"
            >
              <Navigation className="w-4 h-4" />
              <span>Advance Courier Along Route</span>
            </button>

            <button
              type="button"
              data-testid="replay-order-success-btn"
              onClick={handleReplayOrderSuccess}
              className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 font-semibold text-xs flex items-center gap-1.5 transition-transform active:scale-[0.98] cursor-pointer whitespace-nowrap shrink-0 shadow-sm shadow-emerald-500/10"
              title="Replay subtle Order Success animation"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Replay Success Animation</span>
            </button>
          </div>
        </div>

        {/* GOOGLE MAPS LIVE VIEWPORT + TELEMETRY SIDEBAR */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Map Container Column (CF2: Explicit height h-[380px] + unobstructed Google Attribution) */}
          <div className="lg:col-span-8 flex flex-col justify-between bg-[#0B0F17] border border-slate-800 rounded-xl overflow-hidden">
            {/* Breadcrumb Animation Layer Telemetry Header (Outside Map Viewport) */}
            <div className="bg-slate-950/90 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
              <div
                data-testid="breadcrumb-trail-summary"
                className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-300"
              >
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold">
                  <RouteIcon className="w-3.5 h-3.5" />
                  <span>BREADCRUMB TRAIL ACTIVE</span>
                </span>
                <span>
                  {breadcrumbTrail.visitedCheckpoints.length}/{order.routeWaypoints.length} Checkpoints
                </span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="text-emerald-400 font-semibold">
                  {breadcrumbTrail.completionPct}% Traveled ({breadcrumbTrail.traveledDistanceKm} km)
                </span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="text-slate-400">
                  {breadcrumbTrail.traveledPath.length} Polyline Vertices
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-3 text-[11px] font-mono text-slate-400">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-1 rounded-full bg-emerald-400 inline-block" />
                    <span>Traveled Path</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-1 rounded-full bg-slate-500 border border-dashed border-amber-400 inline-block" />
                    <span>Remaining</span>
                  </span>
                </div>

                <button
                  type="button"
                  data-testid="toggle-breadcrumb-replay-btn"
                  onClick={handleToggleBreadcrumbReplay}
                  className={`px-3 py-1 rounded-lg text-[11px] font-mono font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isReplayingBreadcrumbs
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {isReplayingBreadcrumbs ? (
                    <>
                      <Pause className="w-3 h-3" />
                      <span>Pause Breadcrumb Replay</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3" />
                      <span>Replay Breadcrumb Path</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="w-full h-[380px] relative">
              {hasValidMapsKey ? (
                <APIProvider
                  apiKey={GOOGLE_MAPS_API_KEY}
                  language="en"
                  region="LK"
                >
                  <GoogleMap
                    defaultCenter={{ lat: 6.9192, lng: 79.8542 }}
                    defaultZoom={13}
                    mapId="DEMO_MAP_ID"
                    gestureHandling="greedy"
                    disableDefaultUI={false}
                    internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                    style={{ width: '100%', height: '100%' }}
                  >
                    <LiveRoutePolyline
                      origin={order.kitchenOrigin}
                      destination={order.customerDestination}
                    />

                    {/* Polyline Breadcrumb Animation Layer on Google Map */}
                    <DriverBreadcrumbPolyline trail={breadcrumbTrail} />

                    {/* Visited Breadcrumb Markers Along Traveled Path */}
                    {breadcrumbTrail.traveledPath.map((pt, idx) => (
                      <AdvancedMarker
                        key={`bc-${idx}-${pt.lat}-${pt.lng}`}
                        position={{ lat: pt.lat, lng: pt.lng }}
                        title={`Breadcrumb: ${pt.label}`}
                      >
                        <div
                          className={
                            pt.isInterpolated
                              ? 'w-2.5 h-2.5 rounded-full bg-emerald-300 border border-emerald-950 shadow-sm shadow-emerald-400/80 animate-pulse'
                              : 'w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-950 shadow-md shadow-emerald-500/80'
                          }
                        />
                      </AdvancedMarker>
                    ))}

                    {/* Origin Marker: FUDORA Central Kitchen */}
                    <AdvancedMarker
                      position={order.kitchenOrigin}
                      title={order.kitchenOrigin.name}
                    >
                      <Pin
                        background="#10B981"
                        borderColor="#065F46"
                        glyphColor="#FFFFFF"
                      />
                    </AdvancedMarker>

                    {/* Live Moving Courier Marker */}
                    <AdvancedMarker
                      position={{ lat: currentDriverPos.lat, lng: currentDriverPos.lng }}
                      title={`Courier: ${order.driver.name} (${currentDriverPos.label})`}
                    >
                      <div className="px-2.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs shadow-lg border-2 border-white flex items-center gap-1.5 whitespace-nowrap">
                        <Truck className="w-3.5 h-3.5" />
                        <span>{order.driver.name.split(' ')[0]} · 67.2°C</span>
                      </div>
                    </AdvancedMarker>

                    {/* Destination Marker: Customer */}
                    <AdvancedMarker
                      position={order.customerDestination}
                      title={order.customerDestination.name}
                    >
                      <Pin
                        background="#EF4444"
                        borderColor="#7F1D1D"
                        glyphColor="#FFFFFF"
                      />
                    </AdvancedMarker>
                  </GoogleMap>
                </APIProvider>
              ) : (
                /* Interactive Vector Route Map with Polyline Breadcrumb Animation Layer */
                <div className="w-full h-full flex flex-col justify-between p-6 bg-[#090D14] text-slate-200 relative overflow-hidden">
                  <div className="flex items-center justify-between z-10">
                    <div className="text-xs font-mono text-amber-400">
                      BENGALURU CORRIDOR · LAVELLE RD → INDIRANAGAR 100FT RD
                    </div>
                    <div className="text-xs font-mono text-slate-400">
                      GPS: {currentDriverPos.lat.toFixed(4)}°N, {currentDriverPos.lng.toFixed(4)}°E
                    </div>
                  </div>

                  <svg
                    viewBox="0 0 600 220"
                    className="w-full h-48 my-auto"
                    aria-label="Live Route Telemetry Map"
                  >
                    <defs>
                      <linearGradient id="breadcrumbTraveledGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#10B981" />
                        <stop offset="65%" stopColor="#34D399" />
                        <stop offset="100%" stopColor="#F59E0B" />
                      </linearGradient>
                      <filter id="breadcrumbGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    {/* Subtle Map Street Grid */}
                    <path
                      d="M 0 55 H 600 M 0 110 H 600 M 0 165 H 600 M 120 0 V 220 M 240 0 V 220 M 360 0 V 220 M 480 0 V 220"
                      stroke="rgba(148, 163, 184, 0.1)"
                      strokeWidth="1"
                    />

                    {/* 1. Remaining Route Polyline (Untraveled Path Ahead) */}
                    <polyline
                      data-testid="breadcrumb-remaining-polyline"
                      points={svgRemainingPoints}
                      fill="none"
                      stroke="#475569"
                      strokeWidth="3.5"
                      strokeDasharray="7 6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* 2. Glowing Halo Under Traveled Breadcrumb Polyline */}
                    <polyline
                      data-testid="breadcrumb-traveled-glow"
                      points={svgTraveledPoints}
                      fill="none"
                      stroke="rgba(16, 185, 129, 0.28)"
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter="url(#breadcrumbGlow)"
                    />

                    {/* 3. Primary Traveled Driver Path Polyline */}
                    <polyline
                      data-testid="breadcrumb-traveled-polyline"
                      points={svgTraveledPoints}
                      fill="none"
                      stroke="url(#breadcrumbTraveledGrad)"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* 4. Animated Flowing Breadcrumb Stream Polyline Overlay */}
                    <polyline
                      data-testid="breadcrumb-animated-stream"
                      points={svgTraveledPoints}
                      fill="none"
                      stroke="#ECFDF5"
                      strokeWidth="3"
                      strokeDasharray="4 14"
                      strokeDashoffset={breadcrumbDashOffset}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* 5. Interpolated Intermediate Breadcrumb Trail Dots */}
                    {breadcrumbTrail.traveledPath
                      .filter((pt) => pt.isInterpolated)
                      .map((pt, idx) => {
                        const { x, y } = toSvgCoords(pt.stepIndex);
                        return (
                          <circle
                            key={`interp-${idx}`}
                            data-testid={`breadcrumb-dot-${idx}`}
                            cx={x}
                            cy={y}
                            r={3.5}
                            fill="#6EE7B7"
                            stroke="#064E3B"
                            strokeWidth="1.5"
                          />
                        );
                      })}

                    {/* 6. Route Checkpoint Nodes & Cumulative Distance Tags */}
                    {order.routeWaypoints.map((wp, idx) => {
                      const { x, y } = toSvgCoords(idx);
                      const isCurrent = idx === waypointIndex;
                      const isPassed = idx < waypointIndex;
                      const visitedInfo = breadcrumbTrail.visitedCheckpoints.find(
                        (v) => v.index === idx
                      );

                      return (
                        <g
                          key={wp.label}
                          data-testid={`breadcrumb-checkpoint-${idx}`}
                        >
                          {(isCurrent || isPassed) && (
                            <circle
                              cx={x}
                              cy={y}
                              r={isCurrent ? 16 : 11}
                              fill={
                                isCurrent
                                  ? 'rgba(245, 158, 11, 0.22)'
                                  : 'rgba(16, 185, 129, 0.18)'
                              }
                            />
                          )}
                          <circle
                            cx={x}
                            cy={y}
                            r={isCurrent ? 9.5 : isPassed ? 6.5 : 5.5}
                            fill={
                              isCurrent
                                ? '#F59E0B'
                                : isPassed
                                ? '#10B981'
                                : '#334155'
                            }
                            stroke="#0F172A"
                            strokeWidth="2"
                          />
                          {visitedInfo && (
                            <text
                              x={x}
                              y={y - 14}
                              textAnchor="middle"
                              fill={isCurrent ? '#FCD34D' : '#6EE7B7'}
                              fontSize="9.5"
                              fontFamily="JetBrains Mono, monospace"
                              fontWeight="600"
                            >
                              {visitedInfo.cumulativeDistanceKm === 0
                                ? '0.0 km'
                                : `+${visitedInfo.cumulativeDistanceKm} km`}
                            </text>
                          )}
                          <text
                            x={x}
                            y={y + 24}
                            textAnchor="middle"
                            fill={
                              isCurrent
                                ? '#FBBF24'
                                : isPassed
                                ? '#A7F3D0'
                                : '#94A3B8'
                            }
                            fontSize="10"
                            fontFamily="JetBrains Mono, monospace"
                          >
                            {wp.label.split(' ')[0]}
                          </text>
                        </g>
                      );
                    })}
                  </svg>

                  <div className="flex items-center justify-between text-xs text-slate-400 z-10 border-t border-slate-800/80 pt-3">
                    <span>Origin: {order.kitchenOrigin.name}</span>
                    <span className="font-mono text-emerald-400">
                      Traveled: {breadcrumbTrail.traveledDistanceKm} km / {breadcrumbTrail.totalRouteDistanceKm} km
                    </span>
                    <span>Destination: {order.customerDestination.name}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Dedicated Waypoint Stepper Footer Below Map (Never Obscures Google Logo or Copyright) */}
            <div className="bg-slate-950 border-t border-slate-800 px-3.5 py-2.5 flex items-center gap-2 overflow-x-auto">
              <span className="text-[11px] font-mono text-slate-400 shrink-0">
                Route Checkpoints:
              </span>
              {order.routeWaypoints.map((wp, idx) => {
                const active = idx === waypointIndex;
                const passed = idx < waypointIndex;
                return (
                  <button
                    key={wp.label}
                    type="button"
                    data-testid={`route-checkpoint-btn-${idx}`}
                    onClick={() => {
                      setIsReplayingBreadcrumbs(false);
                      setWaypointIndex(idx);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : passed
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {idx + 1}. {wp.label.split('·')[0].trim()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Continuous Storage Temperature Telemetry Monitor */}
          <div className="lg:col-span-4 bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <Thermometer className="w-4 h-4 text-amber-500" />
                  <span>Transit Storage Temp Log</span>
                </div>
                <span
                  className={`text-xs font-mono font-semibold ${
                    thermalReport.isCompliant ? 'text-emerald-500' : 'text-red-500'
                  }`}
                >
                  {thermalReport.status} ({thermalReport.qualityScore}/100)
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {thermalReport.summary}
              </p>

              {/* Checkpoint Table */}
              <div className="divide-y divide-slate-200 dark:divide-slate-800 border-t border-b border-slate-200 dark:border-slate-800">
                {telemetryReadings.map((reading, i) => {
                  const inRange =
                    reading.tempC >= idealRange[0] && reading.tempC <= idealRange[1];
                  return (
                    <div
                      key={`${reading.stage}-${i}`}
                      className="py-2.5 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {reading.stage}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {reading.timestamp} · Humidity {reading.humidityPct}%
                        </div>
                      </div>
                      <div
                        className={`font-mono tabular-nums font-bold ${
                          inRange ? 'text-emerald-500' : 'text-red-500'
                        }`}
                      >
                        {reading.tempC.toFixed(1)}°C
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleSimulateThermalDrift}
                className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-200/60 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              >
                {telemetryReadings.some((r) => r.tempC < 60)
                  ? 'Restore Optimal Pod Temperature (67.8°C)'
                  : 'Test Thermal Excursion Alert (<60°C)'}
              </button>
              <button
                type="button"
                onClick={() =>
                  onTriggerPushAlert(
                    `Courier ${order.driver.name} Proximity Alert`,
                    `Your order #${order.orderId} is ${dynamicEtaMins} mins away. Thermal seal #VX8812 verified.`
                  )
                }
                className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-semibold text-slate-900 dark:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5 text-amber-500" />
                <span>Send Live Push Status Alert</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* BOTTOM SPLIT: DELIVERED FOOD AI QUALITY SCAN + CUSTOMER FEEDBACK & RATINGS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 6 Cols: Delivered Food Scan & Delivery Confirmation Photo */}
        <section
          aria-label="Delivered Food Quality Scan and Confirmation Photo"
          className="lg:col-span-6 bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between space-y-5"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-amber-500">
                  Quality Assurance & Proof of Delivery
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                  Delivered Food Scan & Photo Confirmation
                </h2>
              </div>
              <Camera className="w-5 h-5 text-amber-500 shrink-0" />
            </div>

            {/* Confirmation Photo Preview + Optical Scan Overlay */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <div className="sm:col-span-5 aspect-[4/3] rounded-lg overflow-hidden bg-slate-900 relative border border-slate-700">
                <img
                  src={order.confirmationScan.capturedThumbnailUrl}
                  alt="Delivery confirmation scan of Thai Green Curry Bowl"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 right-2 bg-black/75 backdrop-blur-xs px-2 py-1 rounded text-[10px] font-mono text-emerald-400">
                  SCAN ID: {order.confirmationScan.scanId}
                </div>
              </div>

              <div className="sm:col-span-7 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2 font-mono tabular-nums">
                  <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap">NFC Tamper Seal:</span>
                  <span className="text-emerald-500 font-semibold whitespace-nowrap">
                    {scanResult?.sealIntegrity ?? order.confirmationScan.tamperSealStatus}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 font-mono tabular-nums">
                  <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap">Dual-Pod Temps:</span>
                  <span className="text-slate-900 dark:text-white font-semibold whitespace-nowrap">
                    {order.confirmationScan.surfaceTempC}°C Hot · {order.confirmationScan.coldPodTempC}°C Cold
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 font-mono tabular-nums">
                  <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap">Portion & Moisture:</span>
                  <span className="text-amber-500 font-semibold whitespace-nowrap">
                    {scanResult?.portionAccuracyPct ?? order.confirmationScan.portionMatchPct}% ·{' '}
                    {order.confirmationScan.moistureIntegrityPct}%
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 pt-1 leading-relaxed">
                  {scanResult?.visualFreshnessCheck ?? order.confirmationScan.inspectorNotes}
                </p>
              </div>
            </div>

            {scanResult && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1.5 text-xs">
                <div className="font-semibold text-emerald-400 flex items-center justify-between">
                  <span>AI Food Quality Scan Report · Score {scanResult.overallQualityScore}/100</span>
                  <span className="font-mono">{scanResult.thermalCompliance}</span>
                </div>
                <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-1">
                  {scanResult.recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleRunFoodScan}
              disabled={isScanning}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Scanning Food Quality...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Run AI Quality & Temp Scan</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsShareMealOpen(true)}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 border border-slate-300 dark:border-amber-500/30 text-slate-900 dark:text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-amber-500" />
              <span>Share Your Meal</span>
            </button>
          </div>
        </section>

        {/* Right 6 Cols: Customer Feedback & Ratings System */}
        <section
          aria-label="Customer Feedback and Ratings"
          className="lg:col-span-6 bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between space-y-5"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-amber-500">
                  Verified Customer Voice
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                  Customer Feedback & Quality Ratings
                </h2>
              </div>
              <div className="text-right font-mono tabular-nums">
                <div className="text-lg font-bold text-amber-400">
                  ★ {ratingSummary.averageOverall} / 5.0
                </div>
                <div className="text-[11px] text-slate-400">
                  {ratingSummary.totalReviews} Verified Scans ({ratingSummary.verifiedScanRatioPct}%)
                </div>
              </div>
            </div>

            {/* Submit Rating Form */}
            <form
              onSubmit={handleSubmitReview}
              className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="rating-overall"
                    className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1"
                  >
                    Overall Rating
                  </label>
                  <select
                    id="rating-overall"
                    value={overallRating}
                    onChange={(e) => setOverallRating(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-700 text-xs font-mono"
                  >
                    <option value={5}>5.0 ★ Exceptional</option>
                    <option value={4}>4.0 ★ Good</option>
                    <option value={3}>3.0 ★ Average</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="rating-temp"
                    className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1"
                  >
                    Temp Accuracy
                  </label>
                  <select
                    id="rating-temp"
                    value={tempRating}
                    onChange={(e) => setTempRating(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-700 text-xs font-mono"
                  >
                    <option value={5}>5.0 ★ Piping Hot</option>
                    <option value={4}>4.0 ★ Warm</option>
                    <option value={3}>3.0 ★ Lukewarm</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="rating-name"
                    className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1"
                  >
                    Your Name
                  </label>
                  <input
                    id="rating-name"
                    type="text"
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-700 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="review-comment-input" className="sr-only">
                  Write your delivery and food quality review
                </label>
                <input
                  id="review-comment-input"
                  type="text"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share feedback on food quality, temperature & 3D menu accuracy..."
                  className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
                <button
                  type="submit"
                  className="min-h-[38px] px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs cursor-pointer whitespace-nowrap shrink-0"
                >
                  Post Review
                </button>
              </div>

              {reviewSubmittedBanner && (
                <div className="text-xs text-emerald-400 font-medium">
                  Thank you! Your verified scan review has been added.
                </div>
              )}
            </form>

            {/* Recent Verified Reviews List */}
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between font-mono tabular-nums">
                    <span className="font-sans font-semibold text-slate-900 dark:text-white">
                      {rev.customerName} · <span className="text-slate-400 font-normal">{rev.dishName}</span>
                    </span>
                    <span className="text-amber-400 font-bold">★ {rev.rating.toFixed(1)}</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{rev.comment}</p>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2">
                    <span>Order #{rev.orderId}</span>
                    <span aria-hidden="true">·</span>
                    <span>Temp {rev.tempAccuracyRating}/5</span>
                    <span aria-hidden="true">·</span>
                    <span>{rev.createdAt}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* SOCIAL MEDIA SHARE YOUR MEAL MODAL */}
      <ShareMealModal
        isOpen={isShareMealOpen}
        onClose={() => setIsShareMealOpen(false)}
        orderId={order.orderId}
        itemsSummary="1x Thai Green Curry & Jasmine Rice, 1x FUDORA Club Sandwich"
        totalCalories={1160}
        totalCostInr={1052}
        courierName={order.driver.name}
        onTriggerPushAlert={onTriggerPushAlert}
      />
    </div>
  );
};
