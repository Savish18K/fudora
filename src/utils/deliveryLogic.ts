export type AllergenType =
  | 'gluten'
  | 'dairy'
  | 'shellfish'
  | 'nuts'
  | 'eggs'
  | 'soy'
  | 'spicy';

export type ThermalZone = 'HOT_HOLD' | 'CHILLED' | 'AMBIENT';

export type CulinaryCategory =
  | 'Pasta'
  | 'Chicken Wings'
  | 'Full Roasted Chicken'
  | 'Salads'
  | 'Ice Cream & Faluda'
  | 'Fresh Juices & Shakes'
  | 'Oat Milks'
  | 'Healthy Muesli & Chia'
  | 'Desserts'
  | 'Burgers'
  | 'Buns'
  | 'Rice'
  | 'Koththu'
  | 'Parotas'
  | 'Chinese'
  | 'Italian'
  | 'Sandwiches'
  | 'Sides & Shares'
  | 'Beverages';

export interface MenuItem {
  id: string;
  name: string;
  subtitle: string;
  category: CulinaryCategory;
  priceInr: number;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  prepTimeMinutes: number;
  rating: number;
  reviewCount: number;
  allergens: AllergenType[];
  ingredients: string[];
  thermalZone: ThermalZone;
  idealTempRangeC: [number, number];
  videoTimestampSec: number;
  videoEndSec: number;
  thumbnailUrl: string;
  popUpElevationLabel: string;
  isSignature3D: boolean;
  dietaryFlags: ('vegetarian' | 'high-protein' | 'chef-special')[];
  videoUrl?: string;
}

export interface OrderHistoryRecord {
  orderId: string;
  deliveryDate: string;
  itemsSummary: string;
  itemIds: string[];
  totalCostInr: number;
  status: 'DELIVERED' | 'IN_TRANSIT' | 'REFUNDED';
  thermalComplianceScore: number;
  paymentMethod: string;
  courierName: string;
  userRating?: number | null;
  feedbackComment?: string;
  feedbackTags?: string[];
}

export interface CartItem {
  item: MenuItem;
  quantity: number;
  notes?: string;
}

export interface TemperatureReading {
  timestamp: string;
  tempC: number;
  humidityPct: number;
  stage: 'Kitchen Seal' | 'Thermal Bag Lock' | 'In-Transit Telemetry' | 'Doorstep Handoff';
}

export interface TransitQualityReport {
  isCompliant: boolean;
  status: 'OPTIMAL' | 'WARNING' | 'CRITICAL';
  averageTempC: number;
  minTempC: number;
  maxTempC: number;
  excursionCount: number;
  qualityScore: number;
  summary: string;
}

export interface DeliveryStop {
  id: string;
  label: string;
  lat: number;
  lng: number;
  priority: 'HIGH' | 'STANDARD';
  thermalSensitive: boolean;
}

export interface CustomerReview {
  id: string;
  customerName: string;
  orderId: string;
  dishName: string;
  rating: number;
  tempAccuracyRating: number;
  packagingRating: number;
  comment: string;
  createdAt: string;
  verifiedScan: boolean;
}

/**
 * Determines whether a submitted order star rating (1 or 2 stars) should trigger
 * the qualitative feedback modal.
 */
export function shouldTriggerFeedbackModal(rating: number): boolean {
  const clampedRating = Math.max(1, Math.min(5, Math.round(rating)));
  return clampedRating <= 2;
}

/**
 * Updates the 1-5 star rating for a completed ('DELIVERED') order in the order history state.
 */
export function rateCompletedOrder(
  orders: OrderHistoryRecord[],
  orderId: string,
  rating: number
): OrderHistoryRecord[] {
  const clampedRating = Math.max(1, Math.min(5, Math.round(rating)));
  return orders.map((ord) => {
    if (ord.orderId === orderId && ord.status === 'DELIVERED') {
      return {
        ...ord,
        userRating: clampedRating,
      };
    }
    return ord;
  });
}

/**
 * Saves optional qualitative feedback (comment and/or issue tags) for a completed order.
 */
export function submitOrderFeedback(
  orders: OrderHistoryRecord[],
  orderId: string,
  feedback: { comment?: string; tags?: string[] }
): OrderHistoryRecord[] {
  const trimmedComment = (feedback.comment ?? '').trim();
  const cleanTags = (feedback.tags ?? []).map((t) => t.trim()).filter(Boolean);

  return orders.map((ord) => {
    if (ord.orderId === orderId && ord.status === 'DELIVERED') {
      return {
        ...ord,
        feedbackComment: trimmedComment.length > 0 ? trimmedComment : ord.feedbackComment,
        feedbackTags: cleanTags.length > 0 ? cleanTags : ord.feedbackTags,
      };
    }
    return ord;
  });
}

export interface OrderStatusEvent {
  orderId: string;
  status: OrderHistoryRecord['status'];
  updatedAt?: string;
}

export interface OrderStatusUpdateResult {
  updatedOrders: OrderHistoryRecord[];
  changedOrder: OrderHistoryRecord | null;
  previousStatus: OrderHistoryRecord['status'] | null;
  notification: {
    title: string;
    body: string;
  } | null;
}

/**
 * Idempotently applies a real-time WebSocket or polling status update to the order history state
 * and builds a push notification toast payload only when the status actually transitions.
 */
export function applyOrderStatusUpdate(
  orders: OrderHistoryRecord[],
  event: OrderStatusEvent
): OrderStatusUpdateResult {
  const targetId = event.orderId.trim();
  const existing = orders.find((o) => o.orderId === targetId);

  if (!existing || existing.status === event.status) {
    return {
      updatedOrders: orders,
      changedOrder: null,
      previousStatus: existing?.status ?? null,
      notification: null,
    };
  }

  const previousStatus = existing.status;
  const changedOrder: OrderHistoryRecord = {
    ...existing,
    status: event.status,
  };

  const updatedOrders = orders.map((ord) =>
    ord.orderId === targetId ? changedOrder : ord
  );

  let notification: { title: string; body: string };
  if (event.status === 'DELIVERED') {
    notification = {
      title: `Order #${changedOrder.orderId} Status: DELIVERED`,
      body: `Status changed from ${previousStatus} to DELIVERED · Courier ${changedOrder.courierName} completed doorstep handoff (${changedOrder.itemsSummary}).`,
    };
  } else if (event.status === 'IN_TRANSIT') {
    notification = {
      title: `Order #${changedOrder.orderId} Status: IN_TRANSIT`,
      body: `Status changed from ${previousStatus} to IN_TRANSIT · Courier ${changedOrder.courierName} is en route with your thermal pod (${changedOrder.itemsSummary}).`,
    };
  } else {
    notification = {
      title: `Order #${changedOrder.orderId} Status: REFUNDED`,
      body: `Status changed from ${previousStatus} to REFUNDED · LKR ${changedOrder.totalCostInr} credited for ${changedOrder.itemsSummary}.`,
    };
  }

  return {
    updatedOrders,
    changedOrder,
    previousStatus,
    notification,
  };
}


/**
 * Filters previous orders by status badge or search text and computes lifetime summary stats.
 */
export function filterOrderHistory(
  orders: OrderHistoryRecord[],
  statusFilter: 'ALL' | 'DELIVERED' | 'IN_TRANSIT' | 'REFUNDED' = 'ALL',
  searchQuery: string = ''
): {
  filteredOrders: OrderHistoryRecord[];
  totalSpentInr: number;
  deliveredCount: number;
  averageRating: number | null;
} {
  const q = searchQuery.trim().toLowerCase();
  const filteredOrders = orders.filter((ord) => {
    if (statusFilter !== 'ALL' && ord.status !== statusFilter) {
      return false;
    }
    if (q.length > 0) {
      return (
        ord.orderId.toLowerCase().includes(q) ||
        ord.itemsSummary.toLowerCase().includes(q) ||
        ord.deliveryDate.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalSpentInr = filteredOrders.reduce(
    (sum, o) => (o.status !== 'REFUNDED' ? sum + o.totalCostInr : sum),
    0
  );
  const deliveredCount = filteredOrders.filter((o) => o.status === 'DELIVERED').length;
  const ratedOrders = filteredOrders.filter(
    (o) => o.status === 'DELIVERED' && typeof o.userRating === 'number' && o.userRating >= 1
  );
  const averageRating =
    ratedOrders.length > 0
      ? Number(
          (
            ratedOrders.reduce((sum, o) => sum + (o.userRating ?? 0), 0) / ratedOrders.length
          ).toFixed(1)
        )
      : null;

  return {
    filteredOrders,
    totalSpentInr,
    deliveredCount,
    averageRating,
  };
}

export interface LoyaltyRewardTier {
  id: string;
  pointsRequired: number;
  title: string;
  discountLabel: string;
  promoCode: string;
  unlocked: boolean;
}

export interface FudoraRewardPerk {
  id: string;
  pointsRequired: number;
  title: string;
  category: 'Logistics' | 'Savings' | 'Beverage' | 'Signature 3D' | 'VIP Access';
  description: string;
  discountLabel: string;
  promoCode: string;
  unlocked: boolean;
  pointsNeeded: number;
}

export interface LoyaltyProgressSummary {
  orderPoints: number;
  bonusPoints: number;
  totalPoints: number;
  eligibleSpendInr: number;
  pointsPerRupeeRatio: string;
  currentTierName: 'Member' | 'Silver Gourmet' | 'Gold Culinary' | 'Platinum Reserve';
  nextTierName: 'Silver Gourmet' | 'Gold Culinary' | 'Platinum Reserve' | 'Max Tier Reached';
  nextTierThreshold: number;
  pointsToNextTier: number;
  tierProgressPct: number;
  tiers: LoyaltyRewardTier[];
  unlockablePerks: FudoraRewardPerk[];
  unlockedPerksCount: number;
  nextReward: LoyaltyRewardTier | null;
  pointsToNextReward: number;
  progressPct: number;
}

const BASE_LOYALTY_TIERS: Omit<LoyaltyRewardTier, 'unlocked'>[] = [
  {
    id: 'tier-250',
    pointsRequired: 250,
    title: 'LKR 75 Instant Meal Discount',
    discountLabel: 'LKR 75 OFF orders LKR 300+',
    promoCode: 'FIRSTBITE',
  },
  {
    id: 'tier-500',
    pointsRequired: 500,
    title: '15% Off 3D Signature Feast',
    discountLabel: '15% OFF orders LKR 400+',
    promoCode: 'FUDORA3D',
  },
  {
    id: 'tier-750',
    pointsRequired: 750,
    title: 'LKR 350 Chef Tasting Credit + Free Pod',
    discountLabel: 'LKR 350 OFF + Priority Thermal Pod',
    promoCode: 'FUDORAVIP',
  },
];

const BASE_UNLOCKABLE_PERKS: Omit<FudoraRewardPerk, 'unlocked' | 'pointsNeeded'>[] = [
  {
    id: 'perk-100-thermal-pod',
    pointsRequired: 100,
    title: 'Priority NFC Thermal Pod Lock',
    category: 'Logistics',
    description:
      'Complimentary dual-zone 68°C induction thermal pod seal and priority electric courier assignment.',
    discountLabel: 'LKR 25 Thermal Pod Fee Waived',
    promoCode: 'THERMALVIP',
  },
  {
    id: 'perk-250-instant-discount',
    pointsRequired: 250,
    title: 'LKR 75 Instant Meal Discount',
    category: 'Savings',
    description:
      'Instant LKR 75 deduction on any qualifying order across all FUDORA 3D Menu Book sections in Sri Lanka.',
    discountLabel: 'LKR 75 OFF orders LKR 300+',
    promoCode: 'FIRSTBITE',
  },
  {
    id: 'perk-350-botanical-mocktail',
    pointsRequired: 350,
    title: 'Complimentary Blue Lagoon Mocktail',
    category: 'Beverage',
    description:
      'Free chilled 6°C Blue Lagoon Botanical Mocktail (LKR 249 value) paired with any main course.',
    discountLabel: 'LKR 120 Beverage Credit',
    promoCode: 'LAGOONFREE',
  },
  {
    id: 'perk-500-signature-3d',
    pointsRequired: 500,
    title: '15% Off 3D Signature Feast',
    category: 'Signature 3D',
    description:
      '15% discount on 3D Pop-Up Menu specialties including Double Wagyu Truffle Burger & Colombo Fire Koththu.',
    discountLabel: '15% OFF orders LKR 400+',
    promoCode: 'FUDORA3D',
  },
  {
    id: 'perk-650-zero-surge',
    pointsRequired: 650,
    title: 'Zero Peak-Dinner Surge & Express Route',
    category: 'Logistics',
    description:
      'Waived peak-dinner delivery fees plus direct non-batched courier routing from FUDORA Flagship Kitchen.',
    discountLabel: 'LKR 150 Express & Surge Credit',
    promoCode: 'NOSURGE3D',
  },
  {
    id: 'perk-750-platinum-reserve',
    pointsRequired: 750,
    title: 'LKR 350 Chef Tasting Credit + Platinum Concierge',
    category: 'VIP Access',
    description:
      'LKR 350 chef tasting credit, dedicated Kitchen QA inspection scan, and early access to seasonal 3D dishes.',
    discountLabel: 'LKR 350 OFF + Priority Thermal Pod',
    promoCode: 'FUDORAVIP',
  },
];

/**
 * Calculates loyalty points earned for a single order (1 point per LKR 10 on non-refunded orders).
 */
export function calculateOrderLoyaltyPoints(order: OrderHistoryRecord): number {
  if (order.status === 'REFUNDED' || order.totalCostInr <= 0) {
    return 0;
  }
  return Math.floor(order.totalCostInr / 10);
}

/**
 * Calculates total FUDORA Loyalty Points from order history, optional bonus points,
 * progress toward the next reward tier, and unlockable perks status.
 */
export function calculateLoyaltyProgress(
  orders: OrderHistoryRecord[],
  bonusPoints: number = 0
): LoyaltyProgressSummary {
  let orderPoints = 0;
  let eligibleSpendInr = 0;

  for (const ord of orders) {
    if (ord.status !== 'REFUNDED' && ord.totalCostInr > 0) {
      eligibleSpendInr += ord.totalCostInr;
      orderPoints += calculateOrderLoyaltyPoints(ord);
    }
  }

  const safeBonusPoints = Math.max(0, Math.floor(bonusPoints));
  const totalPoints = orderPoints + safeBonusPoints;

  const tiers: LoyaltyRewardTier[] = BASE_LOYALTY_TIERS.map((t) => ({
    ...t,
    unlocked: totalPoints >= t.pointsRequired,
  }));

  const unlockablePerks: FudoraRewardPerk[] = BASE_UNLOCKABLE_PERKS.map((p) => {
    const unlocked = totalPoints >= p.pointsRequired;
    return {
      ...p,
      unlocked,
      pointsNeeded: unlocked ? 0 : Math.max(0, p.pointsRequired - totalPoints),
    };
  });

  const unlockedPerksCount = unlockablePerks.filter((p) => p.unlocked).length;

  const nextReward = tiers.find((t) => !t.unlocked) ?? null;
  const pointsToNextReward = nextReward
    ? Math.max(0, nextReward.pointsRequired - totalPoints)
    : 0;

  const maxTierPoints = BASE_LOYALTY_TIERS[BASE_LOYALTY_TIERS.length - 1].pointsRequired;
  const targetPoints = nextReward ? nextReward.pointsRequired : maxTierPoints;
  const prevTierPoints = nextReward
    ? BASE_LOYALTY_TIERS[
        Math.max(0, BASE_LOYALTY_TIERS.findIndex((t) => t.id === nextReward.id) - 1)
      ]?.pointsRequired ?? 0
    : 0;

  let progressPct = 100;
  if (nextReward) {
    const span = Math.max(1, targetPoints - prevTierPoints);
    const gainedInSpan = Math.max(0, totalPoints - prevTierPoints);
    progressPct = Math.min(99, Math.max(4, Math.round((gainedInSpan / span) * 100)));
  }

  let currentTierName: LoyaltyProgressSummary['currentTierName'] = 'Member';
  let nextTierName: LoyaltyProgressSummary['nextTierName'] = 'Silver Gourmet';
  let nextTierThreshold = 100;
  let prevRankPoints = 0;

  if (totalPoints >= 750) {
    currentTierName = 'Platinum Reserve';
    nextTierName = 'Max Tier Reached';
    nextTierThreshold = 750;
    prevRankPoints = 750;
  } else if (totalPoints >= 250) {
    currentTierName = 'Gold Culinary';
    nextTierName = 'Platinum Reserve';
    nextTierThreshold = 750;
    prevRankPoints = 250;
  } else if (totalPoints >= 100) {
    currentTierName = 'Silver Gourmet';
    nextTierName = 'Gold Culinary';
    nextTierThreshold = 250;
    prevRankPoints = 100;
  }

  const pointsToNextTier =
    nextTierName === 'Max Tier Reached'
      ? 0
      : Math.max(0, nextTierThreshold - totalPoints);

  const tierProgressPct =
    nextTierName === 'Max Tier Reached'
      ? 100
      : Math.min(
          99,
          Math.max(
            4,
            Math.round(
              ((totalPoints - prevRankPoints) /
                Math.max(1, nextTierThreshold - prevRankPoints)) *
                100
            )
          )
        );

  return {
    orderPoints,
    bonusPoints: safeBonusPoints,
    totalPoints,
    eligibleSpendInr,
    pointsPerRupeeRatio: '1 pt per LKR 10 spent',
    currentTierName,
    nextTierName,
    nextTierThreshold,
    pointsToNextTier,
    tierProgressPct,
    tiers,
    unlockablePerks,
    unlockedPerksCount,
    nextReward,
    pointsToNextReward,
    progressPct,
  };
}

/**
 * Filters menu items by search query, category, max calories, excluded allergens, and dietary preference.
 */
export function filterMenuItems(
  items: MenuItem[],
  options: {
    searchQuery?: string;
    category?: string;
    excludedAllergens?: AllergenType[];
    maxCalories?: number | null;
    onlyVegetarian?: boolean;
  }
): MenuItem[] {
  const query = (options.searchQuery ?? '').trim().toLowerCase();
  const category = options.category ?? 'All';
  const excluded = new Set(options.excludedAllergens ?? []);

  return items.filter((item) => {
    if (category !== 'All' && item.category !== category) {
      return false;
    }
    if (options.onlyVegetarian && !item.dietaryFlags.includes('vegetarian')) {
      return false;
    }
    if (options.maxCalories && options.maxCalories > 0 && item.calories > options.maxCalories) {
      return false;
    }
    if (excluded.size > 0 && item.allergens.some((a) => excluded.has(a))) {
      return false;
    }
    if (query.length > 0) {
      const matchesName = item.name.toLowerCase().includes(query);
      const matchesSub = item.subtitle.toLowerCase().includes(query);
      const matchesIng = item.ingredients.some((ing) => ing.toLowerCase().includes(query));
      const matchesCat = item.category.toLowerCase().includes(query);
      return matchesName || matchesSub || matchesIng || matchesCat;
    }
    return true;
  });
}

/**
 * Detects whether a menu item or cart contains any of the user's configured allergen alerts.
 */
export function detectAllergenConflicts(
  itemAllergens: AllergenType[],
  userAllergenProfile: AllergenType[]
): AllergenType[] {
  const profileSet = new Set(userAllergenProfile);
  return itemAllergens.filter((allergen) => profileSet.has(allergen));
}

/**
 * Calculates total nutrition (calories, protein, carbs, fat) and daily target percentage for the cart.
 */
export function calculateCartNutrition(
  cart: CartItem[],
  dailyCalorieGoal: number = 2000
): {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  goalPercentage: number;
  status: 'WITHIN_GOAL' | 'NEAR_GOAL' | 'OVER_GOAL';
} {
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  for (const entry of cart) {
    if (entry.quantity <= 0) continue;
    totalCalories += entry.item.calories * entry.quantity;
    totalProtein += entry.item.proteinGrams * entry.quantity;
    totalCarbs += entry.item.carbsGrams * entry.quantity;
    totalFat += entry.item.fatGrams * entry.quantity;
  }

  const safeGoal = Math.max(500, dailyCalorieGoal);
  const goalPercentage = Math.round((totalCalories / safeGoal) * 100);

  let status: 'WITHIN_GOAL' | 'NEAR_GOAL' | 'OVER_GOAL' = 'WITHIN_GOAL';
  if (goalPercentage > 100) {
    status = 'OVER_GOAL';
  } else if (goalPercentage >= 85) {
    status = 'NEAR_GOAL';
  }

  return {
    totalCalories,
    totalProtein,
    totalCarbs,
    totalFat,
    goalPercentage,
    status,
  };
}

/**
 * Calculates itemized subtotal, packaging & thermal pod fee, GST, discount, and grand total.
 */
export function calculateOrderTotals(
  cart: CartItem[],
  promoCode?: string
): {
  subtotalInr: number;
  thermalPodFeeInr: number;
  deliveryFeeInr: number;
  taxInr: number;
  discountInr: number;
  grandTotalInr: number;
} {
  const subtotalInr = cart.reduce(
    (sum, entry) => sum + entry.item.priceInr * Math.max(0, entry.quantity),
    0
  );

  if (subtotalInr === 0) {
    return {
      subtotalInr: 0,
      thermalPodFeeInr: 0,
      deliveryFeeInr: 0,
      taxInr: 0,
      discountInr: 0,
      grandTotalInr: 0,
    };
  }

  const thermalPodFeeInr = 25;
  const deliveryFeeInr = subtotalInr >= 799 ? 0 : 49;
  const normalizedPromo = (promoCode ?? '').trim().toUpperCase();

  let discountInr = 0;
  if ((normalizedPromo === 'FUDORA3D' || normalizedPromo === 'VEXMO3D') && subtotalInr >= 400) {
    discountInr = Math.round(subtotalInr * 0.15);
  } else if (normalizedPromo === 'FIRSTBITE' && subtotalInr >= 300) {
    discountInr = 75;
  } else if ((normalizedPromo === 'FUDORAVIP' || normalizedPromo === 'VEXMOVIP') && subtotalInr >= 500) {
    discountInr = 350;
  } else if (normalizedPromo === 'THERMALVIP' && subtotalInr >= 200) {
    discountInr = 25;
  } else if (normalizedPromo === 'LAGOONFREE' && subtotalInr >= 350) {
    discountInr = 120;
  } else if (normalizedPromo === 'NOSURGE3D' && subtotalInr >= 450) {
    discountInr = 150;
  }

  const taxableAmount = Math.max(0, subtotalInr - discountInr);
  const taxInr = Math.round(taxableAmount * 0.05);
  const grandTotalInr = taxableAmount + thermalPodFeeInr + deliveryFeeInr + taxInr;

  return {
    subtotalInr,
    thermalPodFeeInr,
    deliveryFeeInr,
    taxInr,
    discountInr,
    grandTotalInr,
  };
}

/**
 * Evaluates continuous storage temperature logs against the dish's ideal thermal range.
 */
export function evaluateTransitTemperature(
  readings: TemperatureReading[],
  idealRangeC: [number, number]
): TransitQualityReport {
  if (readings.length === 0) {
    return {
      isCompliant: false,
      status: 'WARNING',
      averageTempC: 0,
      minTempC: 0,
      maxTempC: 0,
      excursionCount: 0,
      qualityScore: 0,
      summary: 'No telemetry readings recorded.',
    };
  }

  const [minIdeal, maxIdeal] = idealRangeC;
  let sum = 0;
  let minTempC = readings[0].tempC;
  let maxTempC = readings[0].tempC;
  let excursionCount = 0;

  for (const r of readings) {
    sum += r.tempC;
    if (r.tempC < minTempC) minTempC = r.tempC;
    if (r.tempC > maxTempC) maxTempC = r.tempC;
    if (r.tempC < minIdeal || r.tempC > maxIdeal) {
      excursionCount += 1;
    }
  }

  const averageTempC = Number((sum / readings.length).toFixed(1));
  const penalty = excursionCount * 14;
  const qualityScore = Math.max(0, Math.min(100, 100 - penalty));

  let status: 'OPTIMAL' | 'WARNING' | 'CRITICAL' = 'OPTIMAL';
  if (excursionCount >= 2 || qualityScore < 75) {
    status = 'CRITICAL';
  } else if (excursionCount === 1) {
    status = 'WARNING';
  }

  const isCompliant = status === 'OPTIMAL';
  const summary = isCompliant
    ? `All ${readings.length} transit checkpoints held within ${minIdeal}°C–${maxIdeal}°C (${averageTempC}°C avg).`
    : `${excursionCount} thermal excursion(s) detected outside ${minIdeal}°C–${maxIdeal}°C window.`;

  return {
    isCompliant,
    status,
    averageTempC,
    minTempC,
    maxTempC,
    excursionCount,
    qualityScore,
    summary,
  };
}

/**
 * Haversine distance in kilometers between two geographic coordinates.
 */
export function haversineDistanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const c =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  const d = 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c));
  return Number((R * d).toFixed(2));
}

/**
 * Optimizes delivery stop ordering prioritizing high-priority / thermal-sensitive stops and minimal distance.
 */
export function optimizeDeliveryRoute(
  origin: { lat: number; lng: number },
  stops: DeliveryStop[]
): {
  orderedStops: DeliveryStop[];
  totalDistanceKm: number;
  estimatedSavedMinutes: number;
} {
  if (stops.length === 0) {
    return { orderedStops: [], totalDistanceKm: 0, estimatedSavedMinutes: 0 };
  }

  const remaining = [...stops];
  const orderedStops: DeliveryStop[] = [];
  let currentPos = origin;
  let totalDistanceKm = 0;

  // Compute unoptimized baseline distance
  let unoptimizedDistanceKm = 0;
  let cursor = origin;
  for (const s of stops) {
    unoptimizedDistanceKm += haversineDistanceKm(cursor, s);
    cursor = s;
  }

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestScore = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      const dist = haversineDistanceKm(currentPos, candidate);
      // Weight priority and thermal sensitivity to protect food quality
      const priorityWeight = candidate.priority === 'HIGH' ? 0.65 : 1.0;
      const thermalWeight = candidate.thermalSensitive ? 0.8 : 1.0;
      const score = dist * priorityWeight * thermalWeight;

      if (score < bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    const chosen = remaining.splice(bestIndex, 1)[0];
    totalDistanceKm += haversineDistanceKm(currentPos, chosen);
    currentPos = { lat: chosen.lat, lng: chosen.lng };
    orderedStops.push(chosen);
  }

  totalDistanceKm = Number(totalDistanceKm.toFixed(2));
  const savedKm = Math.max(0.4, unoptimizedDistanceKm - totalDistanceKm + 0.8);
  const estimatedSavedMinutes = Math.max(2, Math.round(savedKm * 3.2));

  return {
    orderedStops,
    totalDistanceKm,
    estimatedSavedMinutes,
  };
}

/**
 * Aggregates customer ratings and computes overall satisfaction metrics.
 */
export function aggregateRatings(reviews: CustomerReview[]): {
  averageOverall: number;
  averageTempAccuracy: number;
  averagePackaging: number;
  totalReviews: number;
  verifiedScanRatioPct: number;
} {
  if (reviews.length === 0) {
    return {
      averageOverall: 0,
      averageTempAccuracy: 0,
      averagePackaging: 0,
      totalReviews: 0,
      verifiedScanRatioPct: 0,
    };
  }

  let sumOverall = 0;
  let sumTemp = 0;
  let sumPack = 0;
  let verifiedCount = 0;

  for (const r of reviews) {
    sumOverall += r.rating;
    sumTemp += r.tempAccuracyRating;
    sumPack += r.packagingRating;
    if (r.verifiedScan) verifiedCount += 1;
  }

  const count = reviews.length;
  return {
    averageOverall: Number((sumOverall / count).toFixed(2)),
    averageTempAccuracy: Number((sumTemp / count).toFixed(2)),
    averagePackaging: Number((sumPack / count).toFixed(2)),
    totalReviews: count,
    verifiedScanRatioPct: Math.round((verifiedCount / count) * 100),
  };
}

export interface SocialSharePlatform {
  id: 'x' | 'whatsapp' | 'facebook' | 'telegram' | 'linkedin';
  name: string;
  handleHint: string;
  href: string;
}

export interface MealSharePayload {
  orderId: string;
  shareTitle: string;
  shareText: string;
  shareUrl: string;
  hashtags: string[];
  platforms: SocialSharePlatform[];
}

/**
 * Builds a structured social media share payload and encoded platform links for a confirmed order.
 */
export function buildMealSharePayload(params: {
  orderId: string;
  itemsSummary: string;
  totalCalories?: number;
  totalCostInr?: number;
  shareUrl?: string;
}): MealSharePayload {
  const cleanOrderId = params.orderId.trim() || 'VX-9042';
  const cleanSummary = params.itemsSummary.trim() || 'Signature 3D Culinary Feast';
  const url = (params.shareUrl ?? 'https://fudora.app/orders').trim();
  const hashtags = ['Fudora3D', 'ThermalDelivery', 'CulinaryTech'];

  const calPart =
    typeof params.totalCalories === 'number' && params.totalCalories > 0
      ? ` · ${params.totalCalories} kcal`
      : '';
  const costPart =
    typeof params.totalCostInr === 'number' && params.totalCostInr > 0
      ? ` · LKR ${params.totalCostInr}`
      : '';

  const shareTitle = `My FUDORA 3D Meal · Order #${cleanOrderId}`;
  const shareText = `Just ordered ${cleanSummary} on FUDORA (Order #${cleanOrderId}${calPart}${costPart} · Dual-Zone Thermal Pod Delivery)! #Fudora3D #ThermalDelivery`;

  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(url);

  const platforms: SocialSharePlatform[] = [
    {
      id: 'x',
      name: 'X (Twitter)',
      handleHint: 'Post meal card to timeline',
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      handleHint: 'Share order with friends & group',
      href: `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`,
    },
    {
      id: 'facebook',
      name: 'Facebook',
      handleHint: 'Share to news feed',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
    },
    {
      id: 'telegram',
      name: 'Telegram',
      handleHint: 'Send to channel or chat',
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      handleHint: 'Share culinary tech experience',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
  ];

  return {
    orderId: cleanOrderId,
    shareTitle,
    shareText,
    shareUrl: url,
    hashtags,
    platforms,
  };
}

export interface DishSharePayload {
  dishId: string;
  dishName: string;
  category: string;
  shareTitle: string;
  shareText: string;
  shareUrl: string;
  hashtags: string[];
  platforms: SocialSharePlatform[];
}

/**
 * Builds a structured social media share payload for a 3D food item preview.
 */
export function buildDishSharePayload(params: {
  item: MenuItem;
  shareUrl?: string;
}): DishSharePayload {
  const { item } = params;
  const baseUrl = (params.shareUrl ?? 'https://fudora.app').trim();
  const shareUrl = `${baseUrl}#dish-${item.id}`;
  const elevation = item.popUpElevationLabel || 'Spatial 3D Pop-Up';
  const cleanCategoryTag = item.category.replace(/[^a-zA-Z0-9]/g, '');
  const hashtags = ['FUDORA3D', '3DFood', cleanCategoryTag, 'CulinaryArt'];

  const shareTitle = `Explore ${item.name} in 3D on FUDORA`;
  const shareText = `Check out this 3D dish on FUDORA Sri Lanka: ${item.name} (${elevation} · ${item.calories} kcal · LKR ${item.priceInr})! Watch the steaming 3D culinary preview:`;

  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(shareUrl);

  const platforms: SocialSharePlatform[] = [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      handleHint: 'Share 3D dish preview with friends & food groups',
      href: `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`,
    },
    {
      id: 'x',
      name: 'X (Twitter)',
      handleHint: 'Post 3D food preview & elevation stats to timeline',
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    },
    {
      id: 'facebook',
      name: 'Facebook',
      handleHint: 'Share 3D culinary card to news feed',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
    },
    {
      id: 'telegram',
      name: 'Telegram',
      handleHint: 'Send 3D dish preview to channel or chat',
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      handleHint: 'Share spatial 3D culinary innovation',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
  ];

  return {
    dishId: item.id,
    dishName: item.name,
    category: item.category,
    shareTitle,
    shareText,
    shareUrl,
    hashtags,
    platforms,
  };
}

export interface FudoraUserSession {
  id: string;
  name: string;
  email: string;
  tierLabel: string;
  favoriteSection: CulinaryCategory;
  authMethod: 'email' | 'demo-pass' | 'google';
  signedInAt: string;
}

/**
 * Validates FUDORA login or registration fields and returns a structured session or validation error.
 */
export function authenticateFudoraUser(params: {
  mode: 'signin' | 'signup';
  email: string;
  password: string;
  name?: string;
  favoriteSection?: CulinaryCategory;
}): {
  ok: boolean;
  error: string | null;
  session: FudoraUserSession | null;
} {
  const cleanEmail = params.email.trim();
  const cleanPassword = params.password.trim();
  const cleanName = (params.name ?? '').trim();

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return {
      ok: false,
      error: 'Please enter a valid email address (e.g. ananya@fudora.app).',
      session: null,
    };
  }

  if (cleanPassword.length < 4) {
    return {
      ok: false,
      error: 'Please enter a passcode with at least 4 characters.',
      session: null,
    };
  }

  if (params.mode === 'signup' && cleanName.length < 2) {
    return {
      ok: false,
      error: 'Please enter your full name to personalize your FUDORA Menu Book.',
      session: null,
    };
  }

  const derivedName =
    cleanName.length >= 2
      ? cleanName
      : cleanEmail
          .split('@')[0]
          .replace(/[._-]+/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase());

  return {
    ok: true,
    error: null,
    session: {
      id: `fudora-${ cleanEmail.toLowerCase().replace(/[^a-z0-9]/g, '') }`,
      name: derivedName,
      email: cleanEmail.toLowerCase(),
      tierLabel: params.mode === 'signup' ? 'FUDORA Welcome Member' : 'FUDORA Gold Culinary Member',
      favoriteSection: params.favoriteSection ?? 'Burgers',
      authMethod: 'email',
      signedInAt: 'Just now',
    },
  };
}

export interface BreadcrumbTrailPoint {
  lat: number;
  lng: number;
  label: string;
  isInterpolated: boolean;
  stepIndex: number;
}

export interface VisitedBreadcrumbCheckpoint {
  index: number;
  lat: number;
  lng: number;
  label: string;
  cumulativeDistanceKm: number;
  isCurrent: boolean;
}

export interface DriverBreadcrumbTrail {
  traveledPath: BreadcrumbTrailPoint[];
  remainingPath: Array<{ lat: number; lng: number; label: string; stepIndex: number }>;
  visitedCheckpoints: VisitedBreadcrumbCheckpoint[];
  traveledDistanceKm: number;
  remainingDistanceKm: number;
  totalRouteDistanceKm: number;
  completionPct: number;
}

/**
 * Computes the delivery driver's traveled breadcrumb path (with intermediate interpolated
 * breadcrumb vertices for smooth polyline drawing), remaining path, visited checkpoints,
 * cumulative distance, and route completion percentage.
 */
export function buildDriverBreadcrumbTrail(
  waypoints: Array<{ lat: number; lng: number; label: string }>,
  currentWaypointIndex: number
): DriverBreadcrumbTrail {
  if (waypoints.length === 0) {
    return {
      traveledPath: [],
      remainingPath: [],
      visitedCheckpoints: [],
      traveledDistanceKm: 0,
      remainingDistanceKm: 0,
      totalRouteDistanceKm: 0,
      completionPct: 0,
    };
  }

  const maxIdx = waypoints.length - 1;
  const clampedIdx = Math.max(0, Math.min(maxIdx, Math.round(currentWaypointIndex)));

  const traveledPath: BreadcrumbTrailPoint[] = [];
  const visitedCheckpoints: VisitedBreadcrumbCheckpoint[] = [];
  let traveledDistanceKm = 0;

  for (let i = 0; i <= clampedIdx; i++) {
    const wp = waypoints[i];
    if (i > 0) {
      const prev = waypoints[i - 1];
      traveledDistanceKm += haversineDistanceKm(prev, wp);

      // Insert two intermediate breadcrumb points (1/3 and 2/3 along segment) for dense polyline animation
      for (const frac of [0.33, 0.67]) {
        traveledPath.push({
          lat: Number((prev.lat + (wp.lat - prev.lat) * frac).toFixed(5)),
          lng: Number((prev.lng + (wp.lng - prev.lng) * frac).toFixed(5)),
          label: `${prev.label} → ${wp.label}`,
          isInterpolated: true,
          stepIndex: i - 1 + frac,
        });
      }
    }

    const cumulativeKm = Number(traveledDistanceKm.toFixed(2));
    traveledPath.push({
      lat: wp.lat,
      lng: wp.lng,
      label: wp.label,
      isInterpolated: false,
      stepIndex: i,
    });

    visitedCheckpoints.push({
      index: i,
      lat: wp.lat,
      lng: wp.lng,
      label: wp.label,
      cumulativeDistanceKm: cumulativeKm,
      isCurrent: i === clampedIdx,
    });
  }

  const remainingPath: Array<{ lat: number; lng: number; label: string; stepIndex: number }> = [];
  let remainingDistanceKm = 0;

  for (let i = clampedIdx; i <= maxIdx; i++) {
    const wp = waypoints[i];
    if (i > clampedIdx) {
      remainingDistanceKm += haversineDistanceKm(waypoints[i - 1], wp);
    }
    remainingPath.push({
      lat: wp.lat,
      lng: wp.lng,
      label: wp.label,
      stepIndex: i,
    });
  }

  traveledDistanceKm = Number(traveledDistanceKm.toFixed(2));
  remainingDistanceKm = Number(remainingDistanceKm.toFixed(2));
  const totalRouteDistanceKm = Number((traveledDistanceKm + remainingDistanceKm).toFixed(2));
  const completionPct =
    maxIdx > 0 ? Math.round((clampedIdx / maxIdx) * 100) : 100;

  return {
    traveledPath,
    remainingPath,
    visitedCheckpoints,
    traveledDistanceKm,
    remainingDistanceKm,
    totalRouteDistanceKm,
    completionPct,
  };
}

export interface OrderSuccessBannerDetails {
  orderId: string;
  placedAt: string;
  grandTotalInr: number;
  itemsSummary: string;
  courierName: string;
  thermalHoldTemp: string;
  tamperSealCode: string;
  etaMinutes: number;
}

/**
 * Builds structured metadata for the subtle Framer Motion Order Success animation in the Live Tracking tab.
 */
export function buildOrderSuccessSummary(params: {
  orderId: string;
  grandTotalInr: number;
  itemsSummary: string;
  courierName?: string;
  placedAt?: string;
  etaMinutes?: number;
}): OrderSuccessBannerDetails {
  const placedAt =
    params.placedAt ||
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const courierName = params.courierName || 'Kavitha Murthy';
  const cleanId = params.orderId.replace(/[^a-zA-Z0-9]/g, '');
  return {
    orderId: params.orderId,
    placedAt,
    grandTotalInr: params.grandTotalInr,
    itemsSummary: params.itemsSummary || 'FUDORA Artisan Meal Selection',
    courierName,
    thermalHoldTemp: '67.4°C Induction Sealed',
    tamperSealCode: `NFC-${cleanId}`,
    etaMinutes: params.etaMinutes ?? 9,
  };
}

export type HeatmapTimeWindow = 'live' | 'lunch' | 'afternoon' | 'dinner' | 'latenight';
export type HeatmapMetricType = 'density' | 'orders' | 'couriers' | 'thermal_risk';

export interface CityDeliveryZoneDensity {
  id: string;
  name: string;
  shortLabel: string;
  lat: number;
  lng: number;
  xNormalized: number; // 0 to 1 relative grid position for D3 spatial SVG
  yNormalized: number; // 0 to 1 relative grid position for D3 spatial SVG
  ordersPerKm2: number;
  activeOrders: number;
  activeCouriers: number;
  avgDeliveryMins: number;
  topDish: string;
  surgeMultiplier: number;
  thermalCompliancePct: number;
  densityTier: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL_SURGE';
}

export interface HourlyZoneDensityCell {
  zoneId: string;
  zoneName: string;
  hour: number; // 11 to 23
  hourLabel: string; // "11 AM", "12 PM", etc.
  densityValue: number;
  orderVolume: number;
  surgeMultiplier: number;
}

export interface CityDensitySummary {
  peakZoneName: string;
  peakDensity: number;
  totalActiveDeliveries: number;
  totalActiveCouriers: number;
  cityAvgWaitMins: number;
  highSurgeZoneCount: number;
}

export const APP_CURRENCY = 'LKR';

export function formatLKR(amount: number): string {
  return `LKR ${Number(amount).toLocaleString('en-US')}`;
}

export type DeliveryMilestoneStage =
  | 'Kitchen Prep'
  | 'Courier Assigned'
  | 'En Route'
  | 'Delivered';

export interface DeliveryMilestoneInfo {
  stage: DeliveryMilestoneStage;
  label: string;
  sublabel: string;
  status: 'COMPLETED' | 'ACTIVE' | 'UPCOMING';
  timestamp?: string;
  stepNumber: number;
}

export interface DeliveryMilestoneProgress {
  currentStage: DeliveryMilestoneStage;
  stageIndex: number;
  progressPct: number;
  isDelivered: boolean;
  statusLabel: string;
  stages: DeliveryMilestoneInfo[];
}

/**
 * Calculates current delivery milestone progress across:
 * 'Kitchen Prep', 'Courier Assigned', 'En Route', and 'Delivered'.
 */
export function calculateDeliveryMilestoneProgress(
  orderStatus: string,
  waypointIndex: number,
  totalWaypoints: number = 5,
  placedAt: string = '12:14 PM',
  driverName: string = 'Roshan Silva'
): DeliveryMilestoneProgress {
  const isDelivered =
    orderStatus === 'DELIVERED' || waypointIndex >= totalWaypoints - 1;

  let currentStage: DeliveryMilestoneStage = 'Kitchen Prep';
  let stageIndex = 0;
  let progressPct = 15;

  if (isDelivered) {
    currentStage = 'Delivered';
    stageIndex = 3;
    progressPct = 100;
  } else if (orderStatus === 'IN_TRANSIT') {
    currentStage = 'En Route';
    stageIndex = 2;
    const fraction = totalWaypoints > 1 ? waypointIndex / (totalWaypoints - 1) : 0.5;
    progressPct = Math.min(92, Math.max(55, Math.round(55 + fraction * 37)));
  } else if (orderStatus === 'READY_FOR_PICKUP' || orderStatus === 'COURIER_ASSIGNED') {
    currentStage = 'Courier Assigned';
    stageIndex = 1;
    progressPct = 42;
  } else {
    currentStage = 'Kitchen Prep';
    stageIndex = 0;
    progressPct = 15;
  }

  const stages: DeliveryMilestoneInfo[] = [
    {
      stage: 'Kitchen Prep',
      label: 'Kitchen Prep',
      sublabel: 'Induction prep & thermal seal at 71°C',
      status: stageIndex > 0 ? 'COMPLETED' : stageIndex === 0 ? 'ACTIVE' : 'UPCOMING',
      timestamp: placedAt,
      stepNumber: 1,
    },
    {
      stage: 'Courier Assigned',
      label: 'Courier Assigned',
      sublabel: `${driverName} · NFC pod locked`,
      status: stageIndex > 1 ? 'COMPLETED' : stageIndex === 1 ? 'ACTIVE' : 'UPCOMING',
      timestamp: '12:19 PM',
      stepNumber: 2,
    },
    {
      stage: 'En Route',
      label: 'En Route',
      sublabel: 'Navigating Colombo corridor',
      status: stageIndex > 2 ? 'COMPLETED' : stageIndex === 2 ? 'ACTIVE' : 'UPCOMING',
      timestamp: '12:24 PM',
      stepNumber: 3,
    },
    {
      stage: 'Delivered',
      label: 'Delivered',
      sublabel: 'Doorstep handoff · NFC seal intact',
      status: isDelivered ? 'COMPLETED' : 'UPCOMING',
      timestamp: isDelivered ? '12:29 PM' : 'Est 12:29 PM',
      stepNumber: 4,
    },
  ];

  return {
    currentStage,
    stageIndex,
    progressPct,
    isDelivered,
    statusLabel: stages[stageIndex]?.sublabel || '',
    stages,
  };
}

const CITY_BASE_ZONES: Array<Omit<CityDeliveryZoneDensity, 'ordersPerKm2' | 'activeOrders' | 'activeCouriers' | 'avgDeliveryMins' | 'surgeMultiplier' | 'densityTier'>> = [
  {
    id: 'cinnamon-gardens',
    name: 'Colombo 07 · Cinnamon Gardens',
    shortLabel: 'Cinnamon Gardens',
    lat: 6.9147,
    lng: 79.8653,
    xNormalized: 0.50,
    yNormalized: 0.45,
    topDish: 'Double Wagyu Truffle Burger',
    thermalCompliancePct: 99.4,
  },
  {
    id: 'kollupitiya',
    name: 'Colombo 03 · Kollupitiya & Galle Face CBD',
    shortLabel: 'Kollupitiya',
    lat: 6.9220,
    lng: 79.8480,
    xNormalized: 0.35,
    yNormalized: 0.40,
    topDish: 'Artisanal Black Truffle & Burrata Tagliatelle',
    thermalCompliancePct: 98.8,
  },
  {
    id: 'bambalapitiya',
    name: 'Colombo 04 · Bambalapitiya & Havelock City',
    shortLabel: 'Bambalapitiya',
    lat: 6.8920,
    lng: 79.8610,
    xNormalized: 0.45,
    yNormalized: 0.65,
    topDish: 'Colombo Fire Chicken & Cheese Koththu',
    thermalCompliancePct: 99.1,
  },
  {
    id: 'union-place',
    name: 'Colombo 02 · Union Place & Slave Island Hub',
    shortLabel: 'Union Place',
    lat: 6.9195,
    lng: 79.8550,
    xNormalized: 0.40,
    yNormalized: 0.42,
    topDish: 'Lobster & Saffron Bisque Linguine',
    thermalCompliancePct: 99.0,
  },
  {
    id: 'rajagiriya',
    name: 'Rajagiriya & Sri Jayawardenepura Corridor',
    shortLabel: 'Rajagiriya',
    lat: 6.9080,
    lng: 79.8950,
    xNormalized: 0.72,
    yNormalized: 0.50,
    topDish: 'Korean Gochujang Crisp Wings',
    thermalCompliancePct: 99.6,
  },
  {
    id: 'mount-lavinia',
    name: 'Dehiwala & Mount Lavinia Coastal Promenade',
    shortLabel: 'Mount Lavinia',
    lat: 6.8450,
    lng: 79.8650,
    xNormalized: 0.48,
    yNormalized: 0.88,
    topDish: 'Mediterranean Avocado Salad',
    thermalCompliancePct: 99.5,
  },
  {
    id: 'fort-port-city',
    name: 'Colombo 01 · Fort & Port City Financial Hub',
    shortLabel: 'Fort / Port City',
    lat: 6.9340,
    lng: 79.8430,
    xNormalized: 0.30,
    yNormalized: 0.25,
    topDish: 'Thai Green Curry & Jasmine Rice',
    thermalCompliancePct: 97.9,
  },
  {
    id: 'nawala-nugegoda',
    name: 'Nawala & Nugegoda Express Hub',
    shortLabel: 'Nawala / Nugegoda',
    lat: 6.8850,
    lng: 79.8920,
    xNormalized: 0.68,
    yNormalized: 0.70,
    topDish: 'Whole Rotisserie Spiced Chicken',
    thermalCompliancePct: 98.4,
  },
  {
    id: 'battaramulla',
    name: 'Battaramulla & Pelawatte Diplomatic Corridor',
    shortLabel: 'Battaramulla',
    lat: 6.8980,
    lng: 79.9210,
    xNormalized: 0.88,
    yNormalized: 0.55,
    topDish: 'Flaky Malabar Coin Parotas',
    thermalCompliancePct: 99.2,
  },
  {
    id: 'negombo-express',
    name: 'Negombo Lagoon & Airport Express Sector',
    shortLabel: 'Negombo Express',
    lat: 7.1850,
    lng: 79.8650,
    xNormalized: 0.50,
    yNormalized: 0.08,
    topDish: 'Royal Rose Faluda & Kulfi',
    thermalCompliancePct: 98.7,
  },
];

/**
 * Returns city delivery zone density data tailored to the selected time window and metric.
 */
export function getCityZoneDensityData(
  timeWindow: HeatmapTimeWindow = 'live',
  metric: HeatmapMetricType = 'density'
): CityDeliveryZoneDensity[] {
  // Scaling factors based on time of day
  const multipliers: Record<HeatmapTimeWindow, number> = {
    live: 1.0,
    lunch: 0.88,
    afternoon: 0.42,
    dinner: 1.25,
    latenight: 0.75,
  };

  const windowFactor = multipliers[timeWindow] ?? 1.0;

  // Base density profiles per zone
  const baseDensities: Record<string, { density: number; orders: number; couriers: number; wait: number; surge: number }> = {
    indiranagar: { density: 88, orders: 136, couriers: 14, wait: 14, surge: 1.35 },
    'lavelle-road': { density: 82, orders: 114, couriers: 12, wait: 16, surge: 1.25 },
    koramangala: { density: 94, orders: 152, couriers: 16, wait: 15, surge: 1.45 },
    'hsr-layout': { density: 74, orders: 98, couriers: 10, wait: 18, surge: 1.15 },
    'trinity-mg': { density: 68, orders: 84, couriers: 9, wait: 13, surge: 1.10 },
    ulsoor: { density: 56, orders: 62, couriers: 7, wait: 14, surge: 1.0 },
    whitefield: { density: 78, orders: 104, couriers: 11, wait: 24, surge: 1.30 },
    bellandur: { density: 84, orders: 118, couriers: 12, wait: 21, surge: 1.35 },
    malleshwaram: { density: 62, orders: 70, couriers: 8, wait: 19, surge: 1.05 },
    'jp-nagar': { density: 52, orders: 56, couriers: 6, wait: 20, surge: 1.0 },
  };

  return CITY_BASE_ZONES.map((zone) => {
    const base = baseDensities[zone.id] ?? { density: 60, orders: 70, couriers: 8, wait: 16, surge: 1.0 };
    const ordersPerKm2 = Math.round(base.density * windowFactor);
    const activeOrders = Math.round(base.orders * windowFactor);
    const activeCouriers = Math.max(3, Math.round(base.couriers * (windowFactor * 0.95)));
    const avgDeliveryMins = Math.round(base.wait * (timeWindow === 'dinner' ? 1.2 : 1.0));
    const surgeMultiplier = Number((base.surge * (timeWindow === 'dinner' ? 1.15 : timeWindow === 'afternoon' ? 0.9 : 1.0)).toFixed(2));

    let densityTier: CityDeliveryZoneDensity['densityTier'] = 'LOW';
    if (ordersPerKm2 >= 90) densityTier = 'CRITICAL_SURGE';
    else if (ordersPerKm2 >= 70) densityTier = 'HIGH';
    else if (ordersPerKm2 >= 45) densityTier = 'MODERATE';

    return {
      ...zone,
      ordersPerKm2,
      activeOrders,
      activeCouriers,
      avgDeliveryMins,
      surgeMultiplier,
      densityTier,
    };
  });
}

/**
 * Returns an hourly delivery density matrix (Zones × Hours from 11:00 to 23:00) for D3 heatmap grids.
 */
export function getHourlyZoneDensityMatrix(): HourlyZoneDensityCell[] {
  const hours = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
  const matrix: HourlyZoneDensityCell[] = [];

  // Distinct diurnal curve profiles
  for (const zone of CITY_BASE_ZONES) {
    for (const hr of hours) {
      let curveWeight = 0.4;
      // Lunch peak: 12:00 - 14:00
      if (hr === 12 || hr === 13) curveWeight = zone.id === 'lavelle-road' || zone.id === 'whitefield' ? 0.92 : 0.78;
      // Afternoon lull: 15:00 - 17:00
      else if (hr >= 14 && hr <= 17) curveWeight = 0.35;
      // Evening/Dinner peak: 19:00 - 22:00
      else if (hr >= 19 && hr <= 21) curveWeight = zone.id === 'koramangala' || zone.id === 'indiranagar' ? 1.0 : 0.86;
      // Late night: 22:00 - 23:00
      else if (hr >= 22) curveWeight = zone.id === 'koramangala' || zone.id === 'indiranagar' ? 0.72 : 0.38;

      const baseDensity = zone.id === 'koramangala' ? 96 : zone.id === 'indiranagar' ? 90 : 75;
      const densityValue = Math.round(baseDensity * curveWeight);
      const orderVolume = Math.round(densityValue * 1.45);
      const surgeMultiplier = Number((1.0 + Math.max(0, (densityValue - 50) / 100)).toFixed(2));

      const hourLabel = hr === 12 ? '12 PM' : hr > 12 ? `${hr - 12} PM` : `${hr} AM`;

      matrix.push({
        zoneId: zone.id,
        zoneName: zone.shortLabel,
        hour: hr,
        hourLabel,
        densityValue,
        orderVolume,
        surgeMultiplier,
      });
    }
  }

  return matrix;
}

/**
 * Computes citywide density summaries (peak sector, total deliveries, active courier count).
 */
export function calculateCityDensitySummary(zones: CityDeliveryZoneDensity[]): CityDensitySummary {
  if (zones.length === 0) {
    return {
      peakZoneName: 'N/A',
      peakDensity: 0,
      totalActiveDeliveries: 0,
      totalActiveCouriers: 0,
      cityAvgWaitMins: 0,
      highSurgeZoneCount: 0,
    };
  }

  let peak = zones[0];
  let totalOrders = 0;
  let totalCouriers = 0;
  let sumWait = 0;
  let surgeCount = 0;

  for (const z of zones) {
    if (z.ordersPerKm2 > peak.ordersPerKm2) {
      peak = z;
    }
    totalOrders += z.activeOrders;
    totalCouriers += z.activeCouriers;
    sumWait += z.avgDeliveryMins;
    if (z.densityTier === 'HIGH' || z.densityTier === 'CRITICAL_SURGE') {
      surgeCount++;
    }
  }

  return {
    peakZoneName: peak.name,
    peakDensity: peak.ordersPerKm2,
    totalActiveDeliveries: totalOrders,
    totalActiveCouriers: totalCouriers,
    cityAvgWaitMins: Math.round(sumWait / zones.length),
    highSurgeZoneCount: surgeCount,
  };
}



