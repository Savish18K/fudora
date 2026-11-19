/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShoppingBag,
  Bell,
  X,
  UtensilsCrossed,
  Navigation,
  BarChart3,
  Settings as SettingsIcon,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import {
  VEXMO_MENU_ITEMS,
  INITIAL_ACTIVE_ORDER,
  INITIAL_CUSTOMER_REVIEWS,
  INITIAL_ORDER_HISTORY,
  type ActiveDeliveryOrder,
} from './data/vexmoData';
import {
  calculateCartNutrition,
  rateCompletedOrder,
  submitOrderFeedback,
  applyOrderStatusUpdate,
  buildOrderSuccessSummary,
  type CartItem,
  type AllergenType,
  type MenuItem,
  type CustomerReview,
  type OrderHistoryRecord,
  type OrderStatusEvent,
  type FudoraUserSession,
  type OrderSuccessBannerDetails,
} from './utils/deliveryLogic';
import { Menu3DStage } from './components/Menu3DStage';
import { CartCheckoutModal } from './components/CartCheckoutModal';
import { LiveTrackingMap } from './components/LiveTrackingMap';
import { AdminAnalyticsView } from './components/AdminAnalyticsView';
import { SettingsView } from './components/SettingsView';
import { CulinaryAssistantDrawer } from './components/CulinaryAssistantDrawer';
import { FudoraLoginView } from './components/FudoraLoginView';

type ActiveTab = 'menu' | 'tracking' | 'admin' | 'settings' | 'login';

interface PushNotificationItem {
  id: string;
  title: string;
  body: string;
  timestamp: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('menu');
  const [fudoraSession, setFudoraSession] = useState<FudoraUserSession | null>(null);
  const [isDark, setIsDark] = useState<boolean>(true);
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState<boolean>(false);

  // Cart & Dietary State
  const [cart, setCart] = useState<CartItem[]>([
    { item: VEXMO_MENU_ITEMS[0], quantity: 1 }, // Double Wagyu Truffle Burger
    { item: VEXMO_MENU_ITEMS[3], quantity: 1 }, // Colombo Fire Chicken & Cheese Koththu
  ]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isAiConciergeOpen, setIsAiConciergeOpen] = useState<boolean>(false);
  const [userAllergens, setUserAllergens] = useState<AllergenType[]>(['shellfish']);
  const [dailyCalorieGoal, setDailyCalorieGoal] = useState<number>(2000);

  // Order Tracking, Order History & Reviews State
  const [activeOrder, setActiveOrder] = useState<ActiveDeliveryOrder>(INITIAL_ACTIVE_ORDER);
  const [orderHistory, setOrderHistory] = useState<OrderHistoryRecord[]>(INITIAL_ORDER_HISTORY);
  const orderHistoryRef = useRef<OrderHistoryRecord[]>(INITIAL_ORDER_HISTORY);
  const [reviews, setReviews] = useState<CustomerReview[]>(INITIAL_CUSTOMER_REVIEWS);
  const [recentOrderSuccess, setRecentOrderSuccess] = useState<OrderSuccessBannerDetails | null>(null);

  // Real-Time WebSocket & Polling Listener State
  const [realtimeTransportStatus, setRealtimeTransportStatus] = useState<'LIVE_WS' | 'POLLING'>('POLLING');
  const orderWsRef = useRef<WebSocket | null>(null);

  // Push Notification System State
  const [pushEnabled, setPushEnabled] = useState<boolean>(true);
  const pushEnabledRef = useRef<boolean>(true);
  const [activeToast, setActiveToast] = useState<PushNotificationItem | null>(null);

  // Cross-Platform Responsive Viewport Simulator
  const [devicePreviewMode, setDevicePreviewMode] = useState<
    'responsive' | 'ios-mobile' | 'android-mobile' | 'tablet'
  >('responsive');

  useEffect(() => {
    orderHistoryRef.current = orderHistory;
  }, [orderHistory]);

  useEffect(() => {
    pushEnabledRef.current = pushEnabled;
  }, [pushEnabled]);

  // Listen for Google Maps Platform Quota Exceeded Event (Mandatory Case A Defense)
  useEffect(() => {
    const handleQuotaExceeded = () => setGmpQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
  }, []);

  // Sync Dark Mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  const triggerPushAlert = useCallback((title: string, body: string) => {
    if (!pushEnabledRef.current) return;
    const item: PushNotificationItem = {
      id: `push-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      body,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setActiveToast(item);
  }, []);

  // Idempotent processor for incoming WebSocket or HTTP polling order status events
  const processOrderStatusEvent = useCallback(
    (event: OrderStatusEvent, allowNotification: boolean = true) => {
      const result = applyOrderStatusUpdate(orderHistoryRef.current, event);
      if (!result.changedOrder) return;

      orderHistoryRef.current = result.updatedOrders;
      setOrderHistory(result.updatedOrders);

      setActiveOrder((prev) => {
        if (prev.orderId !== event.orderId) return prev;
        return {
          ...prev,
          status: event.status === 'DELIVERED' ? 'DELIVERED' : 'IN_TRANSIT',
          etaMinutes: event.status === 'DELIVERED' ? 0 : 9,
        };
      });

      if (allowNotification && result.notification) {
        triggerPushAlert(result.notification.title, result.notification.body);
      }
    },
    [triggerPushAlert]
  );

  // Real-Time WebSocket (/ws/orders) + Resilient Polling (/api/orders/status) Listener
  useEffect(() => {
    let isMounted = true;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let hasInitializedFromServer = false;

    const connectOrderWebSocket = () => {
      if (!isMounted) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/orders`;

      try {
        const ws = new WebSocket(wsUrl);
        orderWsRef.current = ws;

        ws.onopen = () => {
          if (isMounted) {
            setRealtimeTransportStatus('LIVE_WS');
          }
        };

        ws.onmessage = (msgEvent) => {
          if (!isMounted) return;
          try {
            const payload = JSON.parse(msgEvent.data);
            if (payload?.type === 'orders:init' && Array.isArray(payload.statuses)) {
              for (const st of payload.statuses) {
                if (st?.orderId && st?.status) {
                  processOrderStatusEvent(
                    { orderId: st.orderId, status: st.status, updatedAt: st.updatedAt },
                    hasInitializedFromServer
                  );
                }
              }
              hasInitializedFromServer = true;
            } else if (
              payload?.type === 'order:status_updated' &&
              payload.orderId &&
              payload.status
            ) {
              processOrderStatusEvent(
                {
                  orderId: payload.orderId,
                  status: payload.status,
                  updatedAt: payload.updatedAt,
                },
                true
              );
            }
          } catch {
            // Ignore malformed message
          }
        };

        ws.onclose = () => {
          if (!isMounted) return;
          setRealtimeTransportStatus('POLLING');
          reconnectTimer = setTimeout(connectOrderWebSocket, 3000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        if (isMounted) {
          setRealtimeTransportStatus('POLLING');
        }
      }
    };

    connectOrderWebSocket();

    // Active HTTP polling listener every 3.5s to guarantee status sync across all views
    const pollOrderStatuses = async () => {
      if (!isMounted) return;
      try {
        const res = await fetch('/api/orders/status');
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data?.statuses)) {
          for (const st of data.statuses) {
            if (st?.orderId && st?.status) {
              processOrderStatusEvent(
                { orderId: st.orderId, status: st.status, updatedAt: st.updatedAt },
                hasInitializedFromServer
              );
            }
          }
          hasInitializedFromServer = true;
        }
      } catch {
        // Ignore transient polling error
      }
    };

    const pollInterval = setInterval(pollOrderStatuses, 3500);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (orderWsRef.current) {
        orderWsRef.current.close();
        orderWsRef.current = null;
      }
    };
  }, [processOrderStatusEvent]);

  // Dispatch an order status change via WebSocket & REST API and apply immediately
  const handleUpdateOrderStatus = useCallback(
    async (orderId: string, nextStatus: OrderHistoryRecord['status']) => {
      processOrderStatusEvent({ orderId, status: nextStatus }, true);

      if (orderWsRef.current && orderWsRef.current.readyState === WebSocket.OPEN) {
        orderWsRef.current.send(
          JSON.stringify({
            type: 'order:update_status',
            orderId,
            status: nextStatus,
          })
        );
      }

      try {
        await fetch('/api/orders/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, status: nextStatus }),
        });
      } catch {
        // Local state already updated optimistically
      }
    },
    [processOrderStatusEvent]
  );

  const handleToggleUserAllergen = (allergen: AllergenType) => {
    setUserAllergens((prev) =>
      prev.includes(allergen) ? prev.filter((a) => a !== allergen) : [...prev, allergen]
    );
  };

  const handleAddToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
    triggerPushAlert(
      `Added ${item.name}`,
      `${item.calories} kcal · Sealed for ${item.idealTempRangeC[0]}°C–${item.idealTempRangeC[1]}°C transit.`
    );
  };

  const handleUpdateCartQuantity = (dishId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.item.id === dishId ? { ...c, quantity: c.quantity + delta } : c
        )
        .filter((c) => c.quantity > 0)
    );
  };

  const handleReorderHistoryItem = (order: OrderHistoryRecord) => {
    const matchedItems = VEXMO_MENU_ITEMS.filter((m) => order.itemIds.includes(m.id));
    if (matchedItems.length > 0) {
      setCart(matchedItems.map((item) => ({ item, quantity: 1 })));
    }
    setIsCartOpen(true);
    triggerPushAlert(
      `Reordered #${order.orderId}`,
      `${order.itemsSummary} added back to your active Order Bag.`
    );
  };

  const handleRateOrder = (orderId: string, rating: number) => {
    setOrderHistory((prev) => {
      const updated = rateCompletedOrder(prev, orderId, rating);
      orderHistoryRef.current = updated;
      return updated;
    });
    triggerPushAlert(
      `Rated Order #${orderId} (${rating}/5 ★)`,
      `Thank you! Your ${rating}-star rating has been saved to your Order History.`
    );
  };

  const handleSubmitOrderFeedback = (
    orderId: string,
    feedback: { comment: string; tags: string[] }
  ) => {
    setOrderHistory((prev) => {
      const updated = submitOrderFeedback(prev, orderId, feedback);
      orderHistoryRef.current = updated;
      return updated;
    });
    triggerPushAlert(
      `Feedback Logged for #${orderId}`,
      'Thank you for sharing your qualitative delivery feedback with our Quality Assurance team.'
    );
  };

  const handleCompleteCheckout = (details: {
    orderId: string;
    customerName: string;
    phone: string;
    address: string;
    paymentMethod: string;
    promoCode: string;
    grandTotalInr: number;
  }) => {
    const newOrderId = details.orderId;
    const placedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const summaryText = cart.map((c) => `${c.quantity}x ${c.item.name}`).join(', ');
    const itemIds = cart.map((c) => c.item.id);

    setActiveOrder((prev) => ({
      ...prev,
      orderId: newOrderId,
      placedAt: placedTime,
      status: 'IN_TRANSIT',
      etaMinutes: 9,
      customerDestination: {
        ...prev.customerDestination,
        name: `${details.customerName} · Verified Drop-off`,
        address: details.address,
      },
    }));

    const newHistoryEntry: OrderHistoryRecord = {
      orderId: newOrderId,
      deliveryDate: `Today · ${placedTime}`,
      itemsSummary: summaryText || '1x Double Wagyu Truffle Burger',
      itemIds,
      totalCostInr: details.grandTotalInr,
      status: 'IN_TRANSIT',
      thermalComplianceScore: 100,
      paymentMethod: details.paymentMethod,
      courierName: activeOrder.driver.name,
    };
    setOrderHistory((prev) => {
      const next = [newHistoryEntry, ...prev];
      orderHistoryRef.current = next;
      return next;
    });

    fetch('/api/orders/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: newOrderId, status: 'IN_TRANSIT' }),
    }).catch(() => {});

    const successSummary = buildOrderSuccessSummary({
      orderId: newOrderId,
      grandTotalInr: details.grandTotalInr,
      itemsSummary: summaryText || '1x Double Wagyu Truffle Burger',
      courierName: activeOrder.driver.name,
      placedAt: placedTime,
      etaMinutes: 9,
    });
    setRecentOrderSuccess(successSummary);

    setActiveTab('tracking');
    triggerPushAlert(
      `Order #${newOrderId} Confirmed (LKR ${details.grandTotalInr})`,
      `Paid via ${details.paymentMethod}. Dual-zone thermal pod assigned to courier ${activeOrder.driver.name}.`
    );
  };

  const cartItemCount = cart.reduce((sum, entry) => sum + entry.quantity, 0);
  const cartNutrition = calculateCartNutrition(cart, dailyCalorieGoal);

  const containerMaxWidthClass =
    devicePreviewMode === 'ios-mobile'
      ? 'max-w-[390px] mx-auto border-x border-slate-800 min-h-screen shadow-2xl'
      : devicePreviewMode === 'android-mobile'
      ? 'max-w-[412px] mx-auto border-x border-slate-800 min-h-screen shadow-2xl'
      : devicePreviewMode === 'tablet'
      ? 'max-w-[820px] mx-auto border-x border-slate-800 min-h-screen shadow-2xl'
      : 'max-w-7xl mx-auto';

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#080B12] text-slate-900 dark:text-slate-100 transition-colors pb-20 md:pb-12 relative overflow-x-hidden">
      {/* Ambient Glassmorphism Background Accents */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none overflow-hidden z-0"
      >
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      {/* MANDATORY GOOGLE MAPS PLATFORM QUOTA BANNER (Section 8 Case A) */}
      {gmpQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* TOP BAR CONTRACT: [Brand Title, 1 line] — [5 Nav Links, single-line] — [1 Primary Action] */}
      <header className="sticky top-0 z-30 bg-white/75 dark:bg-[#0B0F17]/75 backdrop-blur-2xl border-b border-white/30 dark:border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-6 py-4">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#menu"
            data-testid="brand-wordmark"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('menu');
            }}
            className="text-lg font-bold tracking-tight text-slate-900 dark:text-white font-display whitespace-nowrap shrink-0"
          >
            FUDORA
          </a>

          {/* Zone 2: 5 concise single-line text navigation links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300"
          >
            <button
              type="button"
              onClick={() => setActiveTab('menu')}
              className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
                activeTab === 'menu'
                  ? 'text-amber-500 dark:text-amber-400 border-b-2 border-amber-500 font-semibold'
                  : ''
              }`}
            >
              3D Menu
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tracking')}
              className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
                activeTab === 'tracking'
                  ? 'text-amber-500 dark:text-amber-400 border-b-2 border-amber-500 font-semibold'
                  : ''
              }`}
            >
              Live Tracking
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
                activeTab === 'admin'
                  ? 'text-amber-500 dark:text-amber-400 border-b-2 border-amber-500 font-semibold'
                  : ''
              }`}
            >
              Admin & AI
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
                activeTab === 'settings'
                  ? 'text-amber-500 dark:text-amber-400 border-b-2 border-amber-500 font-semibold'
                  : ''
              }`}
            >
              Settings
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('login')}
              className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
                activeTab === 'login'
                  ? 'text-amber-500 dark:text-amber-400 border-b-2 border-amber-500 font-semibold'
                  : ''
              }`}
            >
              {fudoraSession ? `Member (${fudoraSession.name.split(' ')[0]})` : 'Login'}
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              aria-label={`Open Order Bag (${cartItemCount} items)`}
              className="min-h-[40px] px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer shadow-md shadow-amber-500/20"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Order Bag ({cartItemCount})</span>
            </button>
          </div>
        </div>
      </header>

      {/* LIVE PUSH NOTIFICATION TOAST ALERT */}
      <AnimatePresence>
        {activeToast && (
          <motion.div
            key={activeToast.id}
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.18 }}
            role="status"
            aria-live="polite"
            className="fixed top-20 right-6 z-40 max-w-sm bg-slate-900/90 text-white border border-amber-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-xl flex items-start gap-3"
          >
            <Bell className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-amber-300 truncate">
                {activeToast.title}
              </div>
              <div className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                {activeToast.body}
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-1">
                Push Alert · {activeToast.timestamp}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveToast(null)}
              aria-label="Dismiss notification"
              className="text-slate-400 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN VIEWPORT CONTAINER */}
      <main className={`${containerMaxWidthClass} px-4 sm:px-6 pt-6 sm:pt-8 relative z-10`}>
        {devicePreviewMode !== 'responsive' && (
          <div className="mb-4 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-400">
            <span>
              Previewing <strong>{devicePreviewMode.toUpperCase()}</strong> viewport frame
            </span>
            <button
              type="button"
              onClick={() => setDevicePreviewMode('responsive')}
              className="underline font-semibold cursor-pointer"
            >
              Exit Frame Preview
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === 'menu' && (
            <motion.div
              key="view-menu"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              <Menu3DStage
                items={VEXMO_MENU_ITEMS}
                userAllergens={userAllergens}
                onToggleUserAllergen={handleToggleUserAllergen}
                dailyCalorieGoal={dailyCalorieGoal}
                currentCartCalories={cartNutrition.totalCalories}
                onAddToCart={handleAddToCart}
                onOpenCart={() => setIsCartOpen(true)}
                onOpenAiConcierge={() => setIsAiConciergeOpen(true)}
                onTriggerPushAlert={triggerPushAlert}
              />
            </motion.div>
          )}

          {activeTab === 'tracking' && (
            <motion.div
              key="view-tracking"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              <LiveTrackingMap
                order={activeOrder}
                reviews={reviews}
                onAddReview={(rev) => setReviews((prev) => [rev, ...prev])}
                onTriggerPushAlert={triggerPushAlert}
                onUpdateOrderStatus={handleUpdateOrderStatus}
                realtimeTransportStatus={realtimeTransportStatus}
                orderSuccessDetails={recentOrderSuccess}
                onClearOrderSuccess={() => setRecentOrderSuccess(null)}
              />
            </motion.div>
          )}

          {activeTab === 'admin' && (
            <motion.div
              key="view-admin"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              <AdminAnalyticsView onTriggerPushAlert={triggerPushAlert} />
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="view-settings"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              <SettingsView
                orderHistory={orderHistory}
                onReorderHistoryItem={handleReorderHistoryItem}
                onRateOrder={handleRateOrder}
                onSubmitOrderFeedback={handleSubmitOrderFeedback}
                onUpdateOrderStatus={handleUpdateOrderStatus}
                realtimeTransportStatus={realtimeTransportStatus}
                userAllergens={userAllergens}
                onToggleUserAllergen={handleToggleUserAllergen}
                dailyCalorieGoal={dailyCalorieGoal}
                onChangeCalorieGoal={setDailyCalorieGoal}
                pushEnabled={pushEnabled}
                onTogglePushEnabled={() => setPushEnabled((p) => !p)}
                devicePreviewMode={devicePreviewMode}
                onChangeDevicePreviewMode={setDevicePreviewMode}
                isDark={isDark}
                onToggleTheme={() => setIsDark((d) => !d)}
                onTriggerPushAlert={triggerPushAlert}
              />
            </motion.div>
          )}
          {activeTab === 'login' && (
            <motion.div
              key="view-login"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              <FudoraLoginView
                items={VEXMO_MENU_ITEMS}
                currentSession={fudoraSession}
                onAuthenticated={(session) => {
                  setFudoraSession(session);
                  setActiveTab('menu');
                  triggerPushAlert(
                    `Welcome to FUDORA, ${session.name}`,
                    `${session.tierLabel} · Personalized FUDORA 3D Menu Book unlocked.`
                  );
                }}
                onSignOut={() => {
                  setFudoraSession(null);
                  triggerPushAlert(
                    'Signed Out of FUDORA',
                    'You have signed out of your FUDORA member session.'
                  );
                }}
                onExploreMenuBook={() => setActiveTab('menu')}
                onTriggerPushAlert={triggerPushAlert}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* FLOATING AI VOICE & SEARCH CONCIERGE LAUNCHER */}
      <button
        type="button"
        onClick={() => setIsAiConciergeOpen(true)}
        aria-label="Open FUDORA AI Voice & Search Concierge"
        className="fixed bottom-20 md:bottom-6 right-6 z-30 px-4 py-3 rounded-2xl bg-slate-900/90 dark:bg-amber-500 text-white dark:text-slate-950 font-semibold text-xs flex items-center gap-2 shadow-2xl border border-white/15 cursor-pointer hover:scale-[1.02] transition-transform"
      >
        <Sparkles className="w-4 h-4" />
        <span>AI Voice & Search</span>
      </button>

      {/* MOBILE BOTTOM NAVIGATION BAR (iOS 18 & Android 15 Thumb-Zone Pattern) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/85 dark:bg-[#0B0F17]/85 backdrop-blur-2xl border-t border-slate-200 dark:border-white/10 grid grid-cols-5 items-center h-16"
      >
        {[
          { id: 'menu', label: '3D Menu', icon: UtensilsCrossed },
          { id: 'tracking', label: 'Live Track', icon: Navigation },
          { id: 'admin', label: 'Admin AI', icon: BarChart3 },
          { id: 'settings', label: 'Settings', icon: SettingsIcon },
          { id: 'login', label: 'Login', icon: UserCheck },
        ].map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id as ActiveTab)}
              className={`min-h-[44px] flex flex-col items-center justify-center transition-colors cursor-pointer ${
                active
                  ? 'text-amber-500 font-semibold'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] tracking-tight mt-1">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* SLIDE-OVER CART & SECURE CHECKOUT DRAWER */}
      <CartCheckoutModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onClearCart={() => setCart([])}
        userAllergens={userAllergens}
        dailyCalorieGoal={dailyCalorieGoal}
        onCompleteCheckout={handleCompleteCheckout}
        onTriggerPushAlert={triggerPushAlert}
      />

      {/* GEMINI AI CULINARY CONCIERGE, AUDIO TRANSCRIPTION & LIVE VOICE DRAWER */}
      <CulinaryAssistantDrawer
        isOpen={isAiConciergeOpen}
        onClose={() => setIsAiConciergeOpen(false)}
      />
    </div>
  );
}
