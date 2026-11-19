import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldAlert,
  Bell,
  Smartphone,
  Tablet,
  Monitor,
  Sun,
  Moon,
  Flame,
  Clock,
  RotateCcw,
  Search,
  LogIn,
  LogOut,
  CheckCircle2,
  Truck,
  RefreshCcw,
  Star,
  MessageSquarePlus,
  X,
  Award,
  Gift,
  Lock,
  Check,
  Sparkles,
} from 'lucide-react';
import { signInWithPopup, signOut, onAuthStateChanged, type User } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import {
  filterOrderHistory,
  shouldTriggerFeedbackModal,
  calculateLoyaltyProgress,
  calculateOrderLoyaltyPoints,
  type AllergenType,
  type OrderHistoryRecord,
} from '../utils/deliveryLogic';

interface SettingsViewProps {
  orderHistory: OrderHistoryRecord[];
  onReorderHistoryItem: (order: OrderHistoryRecord) => void;
  onRateOrder: (orderId: string, rating: number) => void;
  onSubmitOrderFeedback: (
    orderId: string,
    feedback: { comment: string; tags: string[] }
  ) => void;
  onUpdateOrderStatus?: (
    orderId: string,
    status: OrderHistoryRecord['status']
  ) => void;
  realtimeTransportStatus?: 'LIVE_WS' | 'POLLING';
  userAllergens: AllergenType[];
  onToggleUserAllergen: (allergen: AllergenType) => void;
  dailyCalorieGoal: number;
  onChangeCalorieGoal: (goal: number) => void;
  pushEnabled: boolean;
  onTogglePushEnabled: () => void;
  devicePreviewMode: 'responsive' | 'ios-mobile' | 'android-mobile' | 'tablet';
  onChangeDevicePreviewMode: (
    mode: 'responsive' | 'ios-mobile' | 'android-mobile' | 'tablet'
  ) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onTriggerPushAlert: (title: string, body: string) => void;
}

const FEEDBACK_ISSUE_TAGS = [
  'Temperature Excursion',
  'Packaging / Thermal Seal',
  'Courier Arrival Delay',
  'Portion or Missing Item',
  'Taste & Preparation',
] as const;

const SETTINGS_TABS = [
  { id: 'order-history', label: 'Order History', icon: Clock },
  { id: 'fudora-rewards', label: 'Fudora Rewards', icon: Award },
  { id: 'dietary', label: 'Allergens & Calories', icon: ShieldAlert },
  { id: 'notifications', label: 'Push & Thermal Alerts', icon: Bell },
  { id: 'platform', label: 'iOS / Android & Display', icon: Smartphone },
] as const;

const ALLERGEN_CATALOG: {
  id: AllergenType;
  label: string;
  description: string;
}[] = [
  {
    id: 'shellfish',
    label: 'Crustacean Shellfish',
    description: 'Flags dishes containing prawns, crab, or lobster (e.g. Grilled Prawn Skewers).',
  },
  {
    id: 'gluten',
    label: 'Wheat & Gluten',
    description: 'Flags brioche, artisanal breads, koththu roti, parotas, and waffle batters.',
  },
  {
    id: 'dairy',
    label: 'Milk & Aged Dairy',
    description: 'Flags cheddar, smoked gouda, burrata, cultured ghee, and cream.',
  },
  {
    id: 'nuts',
    label: 'Tree Nuts & Peanuts',
    description: 'Flags roasted cashews, nut oils, pralines, and cross-contact garnishes.',
  },
  {
    id: 'eggs',
    label: 'Poultry Eggs',
    description: 'Flags bronze-die egg pasta, sunny-side eggs, aioli, and waffle batters.',
  },
  {
    id: 'soy',
    label: 'Soybean & Lecithin',
    description: 'Flags char siu glazes, Szechuan sauces, and dark chocolate emulsifiers.',
  },
  {
    id: 'spicy',
    label: 'Capsaicin / High Heat',
    description: 'Flags Colombo fire koththu, Szechuan chili oil, and bird’s eye pepper.',
  },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  orderHistory,
  onReorderHistoryItem,
  onRateOrder,
  onSubmitOrderFeedback,
  onUpdateOrderStatus,
  realtimeTransportStatus = 'LIVE_WS',
  userAllergens,
  onToggleUserAllergen,
  dailyCalorieGoal,
  onChangeCalorieGoal,
  pushEnabled,
  onTogglePushEnabled,
  devicePreviewMode,
  onChangeDevicePreviewMode,
  isDark,
  onToggleTheme,
  onTriggerPushAlert,
}) => {
  const [activeTab, setActiveTab] = useState<
    'order-history' | 'fudora-rewards' | 'dietary' | 'notifications' | 'platform'
  >('order-history');
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'DELIVERED' | 'IN_TRANSIT' | 'REFUNDED'
  >('ALL');
  const [historySearch, setHistorySearch] = useState<string>('');
  const [hoveredRatingMap, setHoveredRatingMap] = useState<Record<string, number>>({});
  const [feedbackModalState, setFeedbackModalState] = useState<{
    order: OrderHistoryRecord;
    submittedRating: number;
  } | null>(null);
  const [feedbackComment, setFeedbackComment] = useState<string>('');
  const [selectedFeedbackTags, setSelectedFeedbackTags] = useState<string[]>([]);
  const [redeemedPromoCode, setRedeemedPromoCode] = useState<string | null>(null);
  const [bonusLoyaltyPoints, setBonusLoyaltyPoints] = useState<number>(0);
  const [perkFilter, setPerkFilter] = useState<'ALL' | 'UNLOCKED' | 'LOCKED'>('ALL');
  const [tempThresholdAlert, setTempThresholdAlert] = useState<boolean>(true);
  const [doorstepPhotoAlert, setDoorstepPhotoAlert] = useState<boolean>(true);

  const handleStarRatingSelect = (order: OrderHistoryRecord, rating: number) => {
    onRateOrder(order.orderId, rating);
    if (shouldTriggerFeedbackModal(rating)) {
      setFeedbackComment(order.feedbackComment ?? '');
      setSelectedFeedbackTags(order.feedbackTags ?? []);
      setFeedbackModalState({ order, submittedRating: rating });
    }
  };

  const handleToggleFeedbackTag = (tag: string) => {
    setSelectedFeedbackTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSaveQualitativeFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackModalState) return;
    onSubmitOrderFeedback(feedbackModalState.order.orderId, {
      comment: feedbackComment,
      tags: selectedFeedbackTags,
    });
    setFeedbackModalState(null);
    setFeedbackComment('');
    setSelectedFeedbackTags([]);
  };

  const handleDismissFeedbackModal = () => {
    setFeedbackModalState(null);
    setFeedbackComment('');
    setSelectedFeedbackTags([]);
  };

  // Firebase Auth User State (for syncing orders with Cloud SQL)
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [cloudOrders, setCloudOrders] = useState<OrderHistoryRecord[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const token = await user.getIdToken();
          const res = await fetch('/api/orders', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.orders) && data.orders.length > 0) {
              setCloudOrders(data.orders);
            }
          }
        } catch {
          // Fallback to existing orderHistory state cleanly
        }
      } else {
        setCloudOrders([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const token = await cred.user.getIdToken();
      await fetch('/api/orders/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orders: orderHistory }),
      });
      onTriggerPushAlert(
        `Signed in as ${cred.user.displayName || cred.user.email}`,
        'Order history synchronized with your account.'
      );
    } catch {
      onTriggerPushAlert(
        'Google Sign-In Popup',
        'Sign-in window closed or blocked by browser popup settings.'
      );
    }
  };

  const handleGoogleSignOut = async () => {
    await signOut(auth);
    setCloudOrders([]);
  };

  // Merge any local real-time status, star rating, and qualitative feedback updates into cloudOrders if present
  const mergedOrders =
    cloudOrders.length > 0
      ? cloudOrders.map((co) => {
          const localMatch = orderHistory.find((lo) => lo.orderId === co.orderId);
          return localMatch
            ? {
                ...co,
                status: localMatch.status,
                userRating: localMatch.userRating ?? co.userRating,
                feedbackComment: localMatch.feedbackComment ?? co.feedbackComment,
                feedbackTags: localMatch.feedbackTags ?? co.feedbackTags,
              }
            : co;
        })
      : orderHistory;

  const { filteredOrders, totalSpentInr, deliveredCount, averageRating } = filterOrderHistory(
    mergedOrders,
    statusFilter,
    historySearch
  );

  const loyaltyProgress = calculateLoyaltyProgress(mergedOrders, bonusLoyaltyPoints);

  const filteredUnlockablePerks = loyaltyProgress.unlockablePerks.filter((perk) => {
    if (perkFilter === 'UNLOCKED') return perk.unlocked;
    if (perkFilter === 'LOCKED') return !perk.unlocked;
    return true;
  });

  const rewardTierMilestones = [
    { label: 'Silver Gourmet', points: 100 },
    { label: 'Gold Culinary', points: 250 },
    { label: '3D Signature', points: 500 },
    { label: 'Platinum Reserve', points: 750 },
  ];

  const renderFudoraRewardsSection = () => (
    <div
      role="region"
      aria-label="Fudora Rewards"
      data-testid="fudora-rewards-section"
      className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-amber-500/10 via-white/85 to-sky-500/5 dark:from-amber-500/15 dark:via-[#0B0F17]/95 dark:to-sky-500/10 border border-amber-500/30 shadow-lg space-y-6"
    >
      {/* Header & Loyalty Points Earned Summary */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-500">
            <Award className="w-4 h-4" />
            <span>Fudora Rewards · {loyaltyProgress.currentTierName} Tier</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Fudora Rewards — Loyalty Points & Unlockable Perks
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl">
            Earn{' '}
            <span className="font-mono font-semibold text-amber-500">
              {loyaltyProgress.pointsPerRupeeRatio}
            </span>{' '}
            on every non-refunded order (LKR {loyaltyProgress.eligibleSpendInr.toLocaleString('en-US')}{' '}
            qualifying spend) to advance through reward tiers and claim exclusive culinary perks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 px-4 py-3 rounded-2xl bg-white/90 dark:bg-[#111622]/90 border border-amber-500/30 shadow-sm shrink-0">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
              Loyalty Points Earned
            </div>
            <div
              data-testid="loyalty-total-points"
              className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-amber-500"
            >
              {loyaltyProgress.totalPoints.toLocaleString('en-IN')} pts
            </div>
            <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
              {loyaltyProgress.orderPoints} order pts
              {loyaltyProgress.bonusPoints > 0
                ? ` + ${loyaltyProgress.bonusPoints} bonus pts`
                : ''}
            </div>
          </div>
          <div className="h-10 w-px bg-slate-200 dark:bg-white/10" />
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
              Next Reward Tier
            </div>
            <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-0.5">
              {loyaltyProgress.nextReward
                ? `${loyaltyProgress.pointsToNextReward} pts to ${loyaltyProgress.nextReward.promoCode}`
                : 'All Tiers Unlocked!'}
            </div>
            <div className="text-[10px] font-mono text-emerald-500 font-semibold mt-0.5">
              {loyaltyProgress.unlockedPerksCount} of {loyaltyProgress.unlockablePerks.length} Perks Unlocked
            </div>
          </div>
          <div className="h-10 w-px bg-slate-200 dark:bg-white/10 hidden sm:block" />
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              data-testid="fudora-rewards-bonus-btn"
              onClick={() => {
                const nextBonus = bonusLoyaltyPoints + 100;
                setBonusLoyaltyPoints(nextBonus);
                onTriggerPushAlert(
                  'Fudora Rewards · +100 Bonus Points Added',
                  `Your Fudora Rewards balance is now ${loyaltyProgress.orderPoints + nextBonus} pts.`
                );
              }}
              className="min-h-[38px] px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>+100 Bonus Pts</span>
            </button>
            {bonusLoyaltyPoints > 0 && (
              <button
                type="button"
                data-testid="fudora-rewards-reset-bonus-btn"
                onClick={() => setBonusLoyaltyPoints(0)}
                className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-slate-200/80 dark:bg-white/10 text-[11px] font-mono text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer whitespace-nowrap"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar Towards the Next Reward Tier */}
      <div className="p-4 rounded-2xl bg-white/75 dark:bg-[#111622]/75 border border-slate-200/80 dark:border-white/10 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {loyaltyProgress.nextReward ? (
              <>
                Progress toward next reward tier:{' '}
                <span className="text-amber-500 font-bold">
                  {loyaltyProgress.nextReward.title} ({loyaltyProgress.nextReward.pointsRequired} pts)
                </span>
              </>
            ) : (
              <span className="text-emerald-500 font-bold">
                Maximum Platinum Reserve tier reached — all Fudora Rewards perks unlocked!
              </span>
            )}
          </span>
          <span
            data-testid="fudora-rewards-progress-label"
            className="font-mono font-semibold text-amber-500 tabular-nums"
          >
            {loyaltyProgress.nextReward
              ? `${loyaltyProgress.totalPoints} / ${loyaltyProgress.nextReward.pointsRequired} pts (${loyaltyProgress.progressPct}%)`
              : `${loyaltyProgress.totalPoints} pts (100%)`}
          </span>
        </div>

        <div
          role="progressbar"
          aria-label="Progress towards next Fudora Rewards tier"
          data-testid="fudora-rewards-progress-bar"
          aria-valuenow={loyaltyProgress.progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-3.5 w-full rounded-full bg-slate-200/80 dark:bg-white/10 overflow-hidden p-0.5"
        >
          <div
            style={{ width: `${loyaltyProgress.progressPct}%` }}
            className="h-full rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 transition-all duration-500"
          />
        </div>

        {/* Tier Milestones Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {rewardTierMilestones.map((milestone) => {
            const reached = loyaltyProgress.totalPoints >= milestone.points;
            return (
              <div
                key={milestone.label}
                className={`px-3 py-2 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                  reached
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold'
                    : 'bg-slate-100/70 dark:bg-[#0B0F17]/70 border-slate-200/70 dark:border-white/10 text-slate-500 dark:text-slate-400'
                }`}
              >
                <span className="truncate">{milestone.label}</span>
                <span className="font-mono text-[11px] font-bold shrink-0 flex items-center gap-1">
                  {reached ? <Check className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  {milestone.points} pts
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Unlockable Perks List Header & Filter */}
      <div className="space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Gift className="w-4 h-4 text-amber-500" />
              <span>Unlockable Perks & Member Benefits</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Activate unlocked perks to apply instant promo codes and thermal pod upgrades at checkout.
            </p>
          </div>

          <div
            role="group"
            aria-label="Filter unlockable perks"
            className="flex items-center gap-1.5"
          >
            {(
              [
                { id: 'ALL', label: `All Perks (${loyaltyProgress.unlockablePerks.length})` },
                { id: 'UNLOCKED', label: `Unlocked (${loyaltyProgress.unlockedPerksCount})` },
                {
                  id: 'LOCKED',
                  label: `Locked (${
                    loyaltyProgress.unlockablePerks.length - loyaltyProgress.unlockedPerksCount
                  })`,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPerkFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                  perkFilter === tab.id
                    ? 'bg-amber-500 text-slate-950 border-amber-500 font-semibold'
                    : 'bg-white/70 dark:bg-[#111622]/70 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Unlockable Perks Grid */}
        <div
          data-testid="fudora-unlockable-perks-list"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5"
        >
          {filteredUnlockablePerks.map((perk) => {
            const isRedeemed = redeemedPromoCode === perk.promoCode;
            const perkProgressPct = perk.unlocked
              ? 100
              : Math.min(
                  99,
                  Math.max(5, Math.round((loyaltyProgress.totalPoints / perk.pointsRequired) * 100))
                );

            return (
              <div
                key={perk.id}
                data-testid={`fudora-perk-${perk.id}`}
                className={`p-4 rounded-2xl border flex flex-col justify-between gap-3.5 transition-all ${
                  perk.unlocked
                    ? 'bg-white/95 dark:bg-[#111622]/95 border-emerald-500/40 shadow-sm'
                    : 'bg-white/55 dark:bg-[#0B0F17]/65 border-slate-200/80 dark:border-white/10'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono text-xs font-bold">
                        {perk.pointsRequired} PTS
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 text-[10px] font-semibold uppercase tracking-wider">
                        {perk.category}
                      </span>
                    </div>

                    {perk.unlocked ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-500">
                        <Check className="w-3.5 h-3.5" />
                        <span>Unlocked</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400">
                        <Lock className="w-3 h-3" />
                        <span>{perk.pointsNeeded} pts needed</span>
                      </span>
                    )}
                  </div>

                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    {perk.title}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {perk.description}
                  </p>

                  <div className="text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                    Benefit: <span className="font-semibold text-amber-500">{perk.discountLabel}</span> · Code:{' '}
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {perk.promoCode}
                    </span>
                  </div>
                </div>

                {perk.unlocked ? (
                  <button
                    type="button"
                    data-testid={`claim-perk-${perk.promoCode}`}
                    onClick={() => {
                      setRedeemedPromoCode(perk.promoCode);
                      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                        navigator.clipboard.writeText(perk.promoCode).catch(() => {});
                      }
                      onTriggerPushAlert(
                        `Fudora Perk Activated · ${perk.promoCode}`,
                        `${perk.title} (${perk.discountLabel}) code copied and ready for checkout.`
                      );
                    }}
                    className={`min-h-[38px] w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      isRedeemed
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    }`}
                  >
                    <Gift className="w-3.5 h-3.5" />
                    <span>
                      {isRedeemed
                        ? `Active Perk Code: ${perk.promoCode}`
                        : `Claim Perk (${perk.promoCode})`}
                    </span>
                  </button>
                ) : (
                  <div className="space-y-1.5 bg-slate-100/80 dark:bg-white/5 px-3 py-2 rounded-xl">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      <span>Spend LKR {(perk.pointsNeeded * 10).toLocaleString('en-US')} more</span>
                      <span>{perkProgressPct}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                      <div
                        style={{ width: `${perkProgressPct}%` }}
                        className="h-full rounded-full bg-amber-500/70"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const getStatusBadgeStyle = (status: OrderHistoryRecord['status']) => {
    if (status === 'DELIVERED') {
      return {
        label: 'Delivered',
        classes:
          'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30',
        Icon: CheckCircle2,
      };
    }
    if (status === 'IN_TRANSIT') {
      return {
        label: 'In Transit',
        classes:
          'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30',
        Icon: Truck,
      };
    }
    return {
      label: 'Refunded',
      classes:
        'bg-slate-500/15 text-slate-600 dark:text-slate-300 border border-slate-500/30',
      Icon: RefreshCcw,
    };
  };

  return (
    <div className="bg-white/75 dark:bg-[#111622]/75 backdrop-blur-2xl border border-white/30 dark:border-white/10 rounded-3xl p-6 lg:p-8 space-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-white/10 pb-5">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-500">
            Personalization, Fudora Rewards & System Preferences
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
            Settings, Fudora Rewards & Dietary Guardrails
          </h1>
        </div>

        {/* Settings Sub-Navigation Tabs */}
        <div
          role="tablist"
          aria-label="Settings Categories"
          className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100/80 dark:bg-[#0B0F17]/80 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-white/10 shrink-0"
        >
          {SETTINGS_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Animated Settings Content Panel */}
      <AnimatePresence mode="wait">
        {activeTab === 'order-history' && (
          <motion.section
            key="order-history"
            aria-label="Order History"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
            {/* FUDORA REWARDS SECTION */}
            {renderFudoraRewardsSection()}

            {/* Top Summary & Filter Bar */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
              <div className="lg:col-span-5 flex flex-wrap items-center gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      Order History
                    </h2>
                    <span
                      data-testid="order-history-realtime-badge"
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-mono font-semibold text-emerald-500"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>
                        {realtimeTransportStatus === 'LIVE_WS'
                          ? 'Live WebSocket + Polling'
                          : 'Polling Sync Active'}
                      </span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Previous orders with live status sync, delivery dates, total costs & 1–5 star ratings
                  </p>
                </div>
              </div>

              {/* Account Sync & Search / Status Filters */}
              <div className="lg:col-span-7 flex flex-wrap items-center justify-end gap-2.5">
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Filter by Order ID, dish, or date..."
                    aria-label="Search Order History"
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-white/80 dark:bg-[#0B0F17]/80 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {(['ALL', 'DELIVERED', 'IN_TRANSIT', 'REFUNDED'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                      statusFilter === st
                        ? 'bg-amber-500 text-slate-950 border-amber-500 font-semibold'
                        : 'bg-white/60 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {st === 'ALL'
                      ? 'All Orders'
                      : st === 'DELIVERED'
                      ? 'Delivered'
                      : st === 'IN_TRANSIT'
                      ? 'In Transit'
                      : 'Refunded'}
                  </button>
                ))}

                {firebaseUser ? (
                  <button
                    type="button"
                    onClick={handleGoogleSignOut}
                    className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-white/10 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-500 dark:text-amber-400 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Google Sign-In Sync</span>
                  </button>
                )}
              </div>
            </div>

            {/* Summary KPI Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-white/60 dark:bg-[#0B0F17]/75 border border-slate-200/80 dark:border-white/10">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Total Orders Displayed
                </div>
                <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                  {filteredOrders.length}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-white/60 dark:bg-[#0B0F17]/75 border border-slate-200/80 dark:border-white/10">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Completed Deliveries
                </div>
                <div className="text-2xl font-bold font-mono tabular-nums text-emerald-500 mt-1">
                  {deliveredCount}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-white/60 dark:bg-[#0B0F17]/75 border border-slate-200/80 dark:border-white/10">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Your Avg Order Rating
                </div>
                <div className="text-2xl font-bold font-mono tabular-nums text-amber-400 mt-1 flex items-center gap-1.5">
                  <span>{averageRating !== null ? `${averageRating} / 5` : '—'}</span>
                  <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-white/60 dark:bg-[#0B0F17]/75 border border-slate-200/80 dark:border-white/10">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Net Order Spend
                </div>
                <div className="text-2xl font-bold font-mono tabular-nums text-amber-500 mt-1">
                  LKR {totalSpentInr.toLocaleString('en-US')}
                </div>
              </div>
            </div>

            {/* Previous Orders List */}
            <div className="space-y-3">
              {filteredOrders.map((order) => {
                const badge = getStatusBadgeStyle(order.status);
                const BadgeIcon = badge.Icon;
                const isCompleted = order.status === 'DELIVERED';
                const currentRating = order.userRating ?? 0;
                const previewRating = hoveredRatingMap[order.orderId] ?? currentRating;

                return (
                  <article
                    key={order.orderId}
                    className="p-5 rounded-2xl bg-white/70 dark:bg-[#0B0F17]/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-amber-500/40 transition-colors"
                  >
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                          Order #{order.orderId}
                        </span>
                        {/* Status Badge */}
                        <span
                          data-testid={`order-status-badge-${order.orderId}`}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge.classes}`}
                        >
                          <BadgeIcon className="w-3.5 h-3.5" />
                          <span>{badge.label}</span>
                        </span>
                        {/* Delivery Date */}
                        <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                          {order.deliveryDate}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200">
                        {order.itemsSummary}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <span>Payment: {order.paymentMethod}</span>
                        <span aria-hidden="true">·</span>
                        <span>Courier: {order.courierName}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-emerald-500 font-mono tabular-nums">
                          Thermal QA: {order.thermalComplianceScore}%
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="text-amber-500 font-mono font-semibold tabular-nums">
                          {order.status !== 'REFUNDED'
                            ? `+${calculateOrderLoyaltyPoints(order)} Loyalty Pts`
                            : '0 Loyalty Pts (Refunded)'}
                        </span>
                      </div>

                      {/* 1-to-5 Star Rating Bar for Completed ('DELIVERED') Orders */}
                      <div className="pt-1 flex flex-wrap items-center gap-3">
                        {isCompleted ? (
                          <div
                            role="group"
                            aria-label={`Star rating for completed order ${order.orderId}`}
                            onMouseLeave={() =>
                              setHoveredRatingMap((prev) => {
                                const next = { ...prev };
                                delete next[order.orderId];
                                return next;
                              })
                            }
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-white/5 border border-slate-200/80 dark:border-white/10"
                          >
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                              {currentRating > 0 ? 'Your Rating:' : 'Rate Completed Order:'}
                            </span>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((starValue) => {
                                const filled = starValue <= previewRating;
                                const isSelected = starValue === currentRating;
                                return (
                                  <button
                                    key={starValue}
                                    type="button"
                                    aria-label={`Rate order ${order.orderId} ${starValue} out of 5 stars`}
                                    aria-pressed={isSelected}
                                    onMouseEnter={() =>
                                      setHoveredRatingMap((prev) => ({
                                        ...prev,
                                        [order.orderId]: starValue,
                                      }))
                                    }
                                    onClick={() => handleStarRatingSelect(order, starValue)}
                                    className="p-1 rounded-md hover:scale-110 transition-transform cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-400"
                                  >
                                    <Star
                                      className={`w-4 h-4 transition-colors ${
                                        filled
                                          ? 'fill-amber-400 text-amber-400'
                                          : 'text-slate-400 dark:text-slate-600 hover:text-amber-300'
                                      }`}
                                    />
                                  </button>
                                );
                              })}
                            </div>
                            <span className="text-xs font-mono tabular-nums font-semibold text-amber-500 dark:text-amber-400 ml-0.5">
                              {currentRating > 0 ? `${currentRating}/5 ★` : 'Tap 1–5 ★'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                            {order.status === 'IN_TRANSIT'
                              ? '★ 1–5 Star Rating unlocks once order is Delivered'
                              : 'Order refunded — rating disabled'}
                          </span>
                        )}

                        {isCompleted && currentRating > 0 && currentRating <= 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              setFeedbackComment(order.feedbackComment ?? '');
                              setSelectedFeedbackTags(order.feedbackTags ?? []);
                              setFeedbackModalState({
                                order,
                                submittedRating: currentRating,
                              });
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-500 dark:text-amber-300 text-xs font-medium cursor-pointer transition-colors"
                          >
                            <MessageSquarePlus className="w-3.5 h-3.5" />
                            <span>
                              {order.feedbackComment || (order.feedbackTags && order.feedbackTags.length > 0)
                                ? 'Edit Qualitative Feedback'
                                : 'Add Qualitative Feedback'}
                            </span>
                          </button>
                        )}
                      </div>

                      {/* Display saved qualitative feedback when recorded */}
                      {isCompleted &&
                        (order.feedbackComment ||
                          (order.feedbackTags && order.feedbackTags.length > 0)) && (
                          <div className="mt-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-1.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-500 dark:text-amber-400">
                                Recorded Delivery Experience Feedback
                              </span>
                              {order.feedbackTags && order.feedbackTags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {order.feedbackTags.map((tag) => (
                                    <span
                                      key={tag}
                                      className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-300 text-[10px] font-semibold"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            {order.feedbackComment && (
                              <p className="text-xs text-slate-700 dark:text-slate-200 italic">
                                &ldquo;{order.feedbackComment}&rdquo;
                              </p>
                            )}
                          </div>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-200/60 dark:border-white/10 shrink-0">
                      <div className="text-left lg:text-right">
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Total Cost
                        </div>
                        <div className="text-lg font-bold font-mono tabular-nums text-amber-500">
                          LKR {order.totalCostInr.toLocaleString('en-US')}
                        </div>
                      </div>

                      {onUpdateOrderStatus && order.status === 'IN_TRANSIT' && (
                        <button
                          type="button"
                          data-testid={`simulate-delivered-${order.orderId}`}
                          onClick={() => onUpdateOrderStatus(order.orderId, 'DELIVERED')}
                          className="min-h-[40px] px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shadow-sm shadow-emerald-500/20"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Delivered (Live Sync)</span>
                        </button>
                      )}

                      {onUpdateOrderStatus &&
                        order.orderId === 'VX-9042' &&
                        order.status === 'DELIVERED' && (
                          <button
                            type="button"
                            data-testid={`simulate-intransit-${order.orderId}`}
                            onClick={() => onUpdateOrderStatus(order.orderId, 'IN_TRANSIT')}
                            className="min-h-[40px] px-3 py-2 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 border border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <Truck className="w-3.5 h-3.5 text-amber-500" />
                            <span>Reset In Transit</span>
                          </button>
                        )}

                      <button
                        type="button"
                        onClick={() => onReorderHistoryItem(order)}
                        className="min-h-[40px] px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reorder</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </motion.section>
        )}

        {activeTab === 'fudora-rewards' && (
          <motion.section
            key="fudora-rewards"
            aria-label="Fudora Rewards Tab"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
            {renderFudoraRewardsSection()}
          </motion.section>
        )}

        {activeTab === 'dietary' && (
          <motion.div
            key="dietary"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            <div className="lg:col-span-7 space-y-3">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Ingredient Allergen Alert Triggers
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Any dish containing selected allergens will display an immediate warning badge in the 3D Pop-Up Menu and checkout drawer.
              </p>

              <div className="divide-y divide-slate-200 dark:divide-white/10 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
                {ALLERGEN_CATALOG.map((alg) => {
                  const active = userAllergens.includes(alg.id);
                  return (
                    <div
                      key={alg.id}
                      className="p-3.5 bg-white/60 dark:bg-[#0B0F17]/80 flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-white">
                          {alg.label}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {alg.description}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onToggleUserAllergen(alg.id)}
                        aria-pressed={active}
                        className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                          active
                            ? 'bg-red-500 text-white'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {active ? 'Alert Active' : 'Enable Alert'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-5 space-y-4">
              <div className="p-5 rounded-2xl bg-white/60 dark:bg-[#0B0F17]/80 border border-slate-200 dark:border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-amber-500" />
                    <span>Daily Calorie Goal</span>
                  </span>
                  <span className="text-lg font-bold font-mono tabular-nums text-amber-500">
                    {dailyCalorieGoal} kcal
                  </span>
                </div>

                <label htmlFor="calorie-goal-range" className="block text-xs text-slate-500">
                  Adjust target daily intake (1,200 – 3,200 kcal)
                </label>
                <input
                  id="calorie-goal-range"
                  type="range"
                  min={1200}
                  max={3200}
                  step={50}
                  value={dailyCalorieGoal}
                  onChange={(e) => onChangeCalorieGoal(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />

                <div className="flex justify-between text-[11px] font-mono text-slate-400">
                  <span>1,200 kcal (Cut)</span>
                  <span>2,000 kcal (Balanced)</span>
                  <span>3,200 kcal (Athletic)</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'notifications' && (
          <motion.div
            key="notifications"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-4 max-w-2xl"
          >
            <div className="p-4 rounded-2xl bg-white/60 dark:bg-[#0B0F17]/80 border border-slate-200 dark:border-white/10 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  Real-Time Delivery Status Push Notifications
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Receive instant alerts when kitchen seals your pod, courier departs, and arrives.
                </div>
              </div>
              <button
                type="button"
                onClick={onTogglePushEnabled}
                aria-pressed={pushEnabled}
                className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                  pushEnabled
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {pushEnabled ? 'Enabled' : 'Muted'}
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-white/60 dark:bg-[#0B0F17]/80 border border-slate-200 dark:border-white/10 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  Storage Temperature Excursion Warning
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Alert immediately if hot-hold pod drops below 60°C or cold pod rises above 6°C.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTempThresholdAlert((p) => !p)}
                aria-pressed={tempThresholdAlert}
                className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                  tempThresholdAlert
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {tempThresholdAlert ? 'Active' : 'Off'}
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-white/60 dark:bg-[#0B0F17]/80 border border-slate-200 dark:border-white/10 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  Delivered Food Scan & Photo Verification Alert
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Attach optical scan score and NFC seal status to delivery completion alert.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDoorstepPhotoAlert((p) => !p)}
                aria-pressed={doorstepPhotoAlert}
                className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                  doorstepPhotoAlert
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {doorstepPhotoAlert ? 'Active' : 'Off'}
              </button>
            </div>

            <button
              type="button"
              onClick={() =>
                onTriggerPushAlert(
                  'Test Push Notification · FUDORA Thermal Telemetry',
                  'Push channel verified for iOS 18 APNs & Android 15 FCM standards.'
                )
              }
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs cursor-pointer"
            >
              Send Test Push Notification Now
            </button>
          </motion.div>
        )}

        {activeTab === 'platform' && (
          <motion.div
            key="platform"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            <div className="lg:col-span-7 space-y-4">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                iOS 18, Android 15 & Tablet Responsive Viewport Simulator
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Preview how FUDORA adapts across desktop, iPadOS tablet split-views, and iOS/Android mobile safe-area thumb ergonomics.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    id: 'responsive',
                    label: 'Adaptive Full Viewport (Default)',
                    sub: '1440px Desktop / Fluid Grid',
                    icon: Monitor,
                  },
                  {
                    id: 'tablet',
                    label: 'Tablet View (iPadOS / Android Tab)',
                    sub: '820px Multi-Column Touch Frame',
                    icon: Tablet,
                  },
                  {
                    id: 'ios-mobile',
                    label: 'iOS 18 Standard (iPhone 16 Pro)',
                    sub: '390px Safe-Area & Thumb Bar',
                    icon: Smartphone,
                  },
                  {
                    id: 'android-mobile',
                    label: 'Android 15 Material Adaptive',
                    sub: '412px Edge-to-Edge Touch Frame',
                    icon: Smartphone,
                  },
                ].map((opt) => {
                  const Icon = opt.icon;
                  const selected = devicePreviewMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        onChangeDevicePreviewMode(
                          opt.id as 'responsive' | 'ios-mobile' | 'android-mobile' | 'tablet'
                        )
                      }
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                        selected
                          ? 'bg-amber-500/15 border-amber-500 text-slate-900 dark:text-white'
                          : 'bg-white/60 dark:bg-[#0B0F17]/80 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <Icon className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold">{opt.label}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {opt.sub}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-5 space-y-4">
              <div className="p-5 rounded-2xl bg-white/60 dark:bg-[#0B0F17]/80 border border-slate-200 dark:border-white/10 space-y-3">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Surface Theme Polarity
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Crafted for OLED Dark Mode by default with Glassmorphism depth, plus full high-contrast daylight mode support.
                </p>
                <button
                  type="button"
                  onClick={onToggleTheme}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  <span>
                    Switch to {isDark ? 'Daylight High-Contrast Theme' : 'OLED Dark Glass Theme'}
                  </span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LOW-RATING (1 OR 2 STARS) QUALITATIVE FEEDBACK MODAL (PORTALED TO VIEWPORT) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {feedbackModalState && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="low-rating-feedback-title"
                  initial={{ opacity: 0, scale: 0.96, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 12 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-amber-500/30 p-6 shadow-2xl space-y-4"
                >
                  <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 dark:border-white/10 pb-3.5">
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-500">
                        <MessageSquarePlus className="w-3.5 h-3.5" />
                        <span>Delivery Experience Care · Optional Feedback</span>
                      </div>
                      <h2
                        id="low-rating-feedback-title"
                        className="text-lg font-bold text-slate-900 dark:text-white"
                      >
                        Help Us Improve Future Deliveries
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        We noticed you rated{' '}
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                          Order #{feedbackModalState.order.orderId}
                        </span>{' '}
                        <span className="font-mono font-semibold text-amber-500">
                          ({feedbackModalState.submittedRating} out of 5 stars)
                        </span>
                        . Share optional qualitative feedback below to help improve future deliveries.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleDismissFeedbackModal}
                      aria-label="Close qualitative feedback modal"
                      className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveQualitativeFeedback} className="space-y-4">
                    {/* Order Context Summary */}
                    <div className="p-3.5 rounded-2xl bg-slate-100/80 dark:bg-[#0B0F17] border border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {feedbackModalState.order.itemsSummary}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Courier: {feedbackModalState.order.courierName} · Delivered{' '}
                          {feedbackModalState.order.deliveryDate}
                        </div>
                      </div>
                      <div className="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 dark:text-amber-400 font-mono text-xs font-bold shrink-0">
                        {feedbackModalState.submittedRating}/5 ★
                      </div>
                    </div>

                    {/* Optional Issue Category Chips */}
                    <div className="space-y-2">
                      <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        What area could we improve? (Optional)
                      </span>
                      <div
                        role="group"
                        aria-label="Delivery issue categories"
                        className="flex flex-wrap gap-2"
                      >
                        {FEEDBACK_ISSUE_TAGS.map((tag) => {
                          const selected = selectedFeedbackTags.includes(tag);
                          return (
                            <button
                              key={tag}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => handleToggleFeedbackTag(tag)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                                selected
                                  ? 'bg-amber-500 text-slate-950 border-amber-500 font-semibold'
                                  : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-amber-500/40'
                              }`}
                            >
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Optional Qualitative Textarea */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor="qualitative-feedback-textarea"
                        className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                      >
                        Optional Qualitative Feedback
                      </label>
                      <textarea
                        id="qualitative-feedback-textarea"
                        rows={3}
                        value={feedbackComment}
                        onChange={(e) => setFeedbackComment(e.target.value)}
                        placeholder="Share any details about food temperature, packaging condition, or courier handoff to help our kitchen and dispatch team improve..."
                        className="w-full rounded-2xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 p-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    {/* Modal Actions */}
                    <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200/80 dark:border-white/10">
                      <button
                        type="button"
                        onClick={handleDismissFeedbackModal}
                        className="min-h-[40px] px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                      >
                        Skip for Now
                      </button>
                      <button
                        type="submit"
                        className="min-h-[40px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-semibold text-slate-950 transition-colors cursor-pointer shadow-md shadow-amber-500/20"
                      >
                        Submit Feedback
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};
