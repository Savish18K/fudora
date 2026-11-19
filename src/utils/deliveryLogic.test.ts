import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterMenuItems,
  filterOrderHistory,
  rateCompletedOrder,
  shouldTriggerFeedbackModal,
  submitOrderFeedback,
  calculateOrderLoyaltyPoints,
  calculateLoyaltyProgress,
  detectAllergenConflicts,
  calculateCartNutrition,
  calculateOrderTotals,
  evaluateTransitTemperature,
  optimizeDeliveryRoute,
  aggregateRatings,
  buildMealSharePayload,
  buildDishSharePayload,
  applyOrderStatusUpdate,
  authenticateFudoraUser,
  buildDriverBreadcrumbTrail,
  buildOrderSuccessSummary,
  getCityZoneDensityData,
  getHourlyZoneDensityMatrix,
  calculateCityDensitySummary,
  calculateDeliveryMilestoneProgress,
  formatLKR,
  type MenuItem,
  type TemperatureReading,
  type DeliveryStop,
  type CustomerReview,
  type OrderHistoryRecord,
} from './deliveryLogic';

const sampleItems: MenuItem[] = [
  {
    id: 'club-sandwich',
    name: 'FUDORA Club Sandwich',
    subtitle: 'Triple-decker toasted brioche with smoked chicken, cheddar & herb aioli',
    category: 'Sandwiches',
    priceInr: 379,
    calories: 540,
    proteinGrams: 34,
    carbsGrams: 42,
    fatGrams: 24,
    prepTimeMinutes: 12,
    rating: 4.9,
    reviewCount: 218,
    allergens: ['gluten', 'dairy', 'eggs'],
    ingredients: ['Toasted Brioche', 'Smoked Chicken Breast', 'Aged Cheddar', 'Romaine Lettuce', 'Vine Tomato', 'Herb Aioli'],
    thermalZone: 'HOT_HOLD',
    idealTempRangeC: [58, 68],
    videoTimestampSec: 1.2,
    videoEndSec: 2.1,
    thumbnailUrl: '/assets/dishes/club_sandwich.jpg',
    popUpElevationLabel: '3D Layer Stack · 48mm Lift',
    isSignature3D: true,
    dietaryFlags: ['high-protein', 'chef-special'],
  },
  {
    id: 'thai-green-curry',
    name: 'Thai Green Curry & Jasmine Rice',
    subtitle: 'Aromatic lemongrass coconut curry with jasmine rice & sweet basil',
    category: 'Rice',
    priceInr: 599,
    calories: 620,
    proteinGrams: 22,
    carbsGrams: 68,
    fatGrams: 28,
    prepTimeMinutes: 16,
    rating: 4.8,
    reviewCount: 184,
    allergens: ['soy', 'spicy'],
    ingredients: ['Coconut Cream', 'Thai Sweet Basil', 'Galangal', 'Jasmine Rice', 'Crisp Zucchini', 'Kaffir Lime'],
    thermalZone: 'HOT_HOLD',
    idealTempRangeC: [65, 76],
    videoTimestampSec: 2.4,
    videoEndSec: 3.3,
    thumbnailUrl: '/assets/dishes/thai_curry.jpg',
    popUpElevationLabel: '3D Steam Plume · 52mm Lift',
    isSignature3D: true,
    dietaryFlags: ['vegetarian', 'chef-special'],
  },
  {
    id: 'prawn-skewers',
    name: 'Grilled Prawn Skewers',
    subtitle: 'Char-grilled tiger prawns glazed in garlic herb butter & charred lemon',
    category: 'Sides & Shares',
    priceInr: 699,
    calories: 410,
    proteinGrams: 42,
    carbsGrams: 8,
    fatGrams: 22,
    prepTimeMinutes: 14,
    rating: 4.9,
    reviewCount: 164,
    allergens: ['shellfish', 'dairy'],
    ingredients: ['Tiger Prawns', 'Clarified Garlic Butter', 'Fresh Parsley', 'Smoked Paprika', 'Bamboo Skewers'],
    thermalZone: 'HOT_HOLD',
    idealTempRangeC: [62, 72],
    videoTimestampSec: 5.8,
    videoEndSec: 6.7,
    thumbnailUrl: '/assets/dishes/prawn_skewers.jpg',
    popUpElevationLabel: '3D Twin Skewer · 44mm Lift',
    isSignature3D: true,
    dietaryFlags: ['high-protein'],
  },
];

test('filterMenuItems filters by search query, allergen exclusion, and vegetarian flag', () => {
  const byQuery = filterMenuItems(sampleItems, { searchQuery: 'jasmine' });
  assert.equal(byQuery.length, 1);
  assert.equal(byQuery[0].id, 'thai-green-curry');

  const noShellfishOrDairy = filterMenuItems(sampleItems, {
    excludedAllergens: ['shellfish', 'dairy'],
  });
  assert.equal(noShellfishOrDairy.length, 1);
  assert.equal(noShellfishOrDairy[0].id, 'thai-green-curry');

  const vegOnly = filterMenuItems(sampleItems, { onlyVegetarian: true });
  assert.equal(vegOnly.length, 1);
  assert.equal(vegOnly[0].id, 'thai-green-curry');
});

test('filterOrderHistory filters previous orders by status badge and search query and sums net spend', () => {
  const sampleOrders: OrderHistoryRecord[] = [
    {
      orderId: 'VX-9042',
      deliveryDate: 'Today · 12:29 PM',
      itemsSummary: '1x Thai Green Curry & Jasmine Rice',
      itemIds: ['thai-green-curry'],
      totalCostInr: 1052,
      status: 'IN_TRANSIT',
      thermalComplianceScore: 99,
      paymentMethod: 'UPI',
      courierName: 'Rohan Deshmukh',
    },
    {
      orderId: 'VX-8984',
      deliveryDate: 'Nov 09, 2026',
      itemsSummary: '1x Double Wagyu Truffle Burger, 1x Colombo Fire Koththu',
      itemIds: ['wagyu-smash-burger', 'sri-lankan-cheese-koththu'],
      totalCostInr: 1545,
      status: 'DELIVERED',
      thermalComplianceScore: 100,
      paymentMethod: 'Apple Pay',
      courierName: 'Karthik Nair',
    },
    {
      orderId: 'VX-8792',
      deliveryDate: 'Oct 28, 2026',
      itemsSummary: '1x Belgian Waffles',
      itemIds: ['belgian-waffles'],
      totalCostInr: 984,
      status: 'REFUNDED',
      thermalComplianceScore: 92,
      paymentMethod: 'Wallet',
      courierName: 'Arjun Menon',
    },
  ];

  const allResult = filterOrderHistory(sampleOrders, 'ALL', '');
  assert.equal(allResult.filteredOrders.length, 3);
  assert.equal(allResult.deliveredCount, 1);
  assert.equal(allResult.totalSpentInr, 2597); // Excludes refunded order VX-8792

  const deliveredOnly = filterOrderHistory(sampleOrders, 'DELIVERED', 'koththu');
  assert.equal(deliveredOnly.filteredOrders.length, 1);
  assert.equal(deliveredOnly.filteredOrders[0].orderId, 'VX-8984');
  assert.equal(deliveredOnly.averageRating, null);

  // Rate completed order VX-8984 with 5 stars; non-delivered orders should not be modified
  const afterRatingDelivered = rateCompletedOrder(sampleOrders, 'VX-8984', 5);
  assert.equal(afterRatingDelivered.find((o) => o.orderId === 'VX-8984')?.userRating, 5);

  const afterAttemptRatingInTransit = rateCompletedOrder(afterRatingDelivered, 'VX-9042', 4);
  assert.equal(afterAttemptRatingInTransit.find((o) => o.orderId === 'VX-9042')?.userRating, undefined);

  const ratedSummary = filterOrderHistory(afterAttemptRatingInTransit, 'ALL', '');
  assert.equal(ratedSummary.averageRating, 5);

  // Low rating (1 or 2 stars) triggers qualitative feedback modal; 3-5 stars do not
  assert.equal(shouldTriggerFeedbackModal(1), true);
  assert.equal(shouldTriggerFeedbackModal(2), true);
  assert.equal(shouldTriggerFeedbackModal(3), false);
  assert.equal(shouldTriggerFeedbackModal(5), false);

  // Submitting optional qualitative feedback updates the delivered order record
  const withFeedback = submitOrderFeedback(afterRatingDelivered, 'VX-8984', {
    comment: '  Packaging seal was slightly loose upon arrival.  ',
    tags: ['Packaging / Thermal Seal', 'Temperature Excursion'],
  });
  const updatedOrder = withFeedback.find((o) => o.orderId === 'VX-8984');
  assert.equal(updatedOrder?.feedbackComment, 'Packaging seal was slightly loose upon arrival.');
  assert.deepEqual(updatedOrder?.feedbackTags, ['Packaging / Thermal Seal', 'Temperature Excursion']);

  // Loyalty points calculation (1 pt per 10 INR on non-refunded orders)
  assert.equal(calculateOrderLoyaltyPoints(sampleOrders[0]), 105); // 1052 INR IN_TRANSIT
  assert.equal(calculateOrderLoyaltyPoints(sampleOrders[1]), 154); // 1545 INR DELIVERED
  assert.equal(calculateOrderLoyaltyPoints(sampleOrders[2]), 0);   // 984 INR REFUNDED

  const loyalty = calculateLoyaltyProgress(sampleOrders);
  assert.equal(loyalty.totalPoints, 259);
  assert.equal(loyalty.orderPoints, 259);
  assert.equal(loyalty.bonusPoints, 0);
  assert.equal(loyalty.eligibleSpendInr, 2597);
  assert.equal(loyalty.currentTierName, 'Gold Culinary');
  assert.equal(loyalty.nextTierName, 'Platinum Reserve');
  assert.equal(loyalty.tiers[0].unlocked, true); // 250 pts tier unlocked
  assert.equal(loyalty.tiers[1].unlocked, false); // 500 pts tier locked
  assert.equal(loyalty.nextReward?.promoCode, 'FUDORA3D');
  assert.equal(loyalty.pointsToNextReward, 241);
  assert.equal(loyalty.unlockablePerks.length, 6);
  assert.equal(loyalty.unlockedPerksCount, 2); // 100 pts (THERMALVIP) & 250 pts (FIRSTBITE) unlocked

  // Adding +250 bonus points unlocks 350 pts (LAGOONFREE) & 500 pts (FUDORA3D) perks
  const boostedLoyalty = calculateLoyaltyProgress(sampleOrders, 250);
  assert.equal(boostedLoyalty.totalPoints, 509);
  assert.equal(boostedLoyalty.unlockedPerksCount, 4);
  assert.equal(boostedLoyalty.nextReward?.promoCode, 'FUDORAVIP');
});

test('detectAllergenConflicts identifies overlapping allergens accurately', () => {
  const conflicts = detectAllergenConflicts(
    ['shellfish', 'dairy'],
    ['gluten', 'shellfish']
  );
  assert.deepEqual(conflicts, ['shellfish']);

  const noConflicts = detectAllergenConflicts(['soy'], ['gluten', 'nuts']);
  assert.deepEqual(noConflicts, []);
});

test('calculateCartNutrition sums macros and computes goal status', () => {
  const nutrition = calculateCartNutrition(
    [
      { item: sampleItems[0], quantity: 2 }, // 1080 kcal, 68g protein
      { item: sampleItems[2], quantity: 1 }, // 410 kcal, 42g protein
    ],
    1800
  );
  assert.equal(nutrition.totalCalories, 1490);
  assert.equal(nutrition.totalProtein, 110);
  assert.equal(nutrition.goalPercentage, 83);
  assert.equal(nutrition.status, 'WITHIN_GOAL');

  const overGoal = calculateCartNutrition(
    [{ item: sampleItems[1], quantity: 3 }],
    1500
  );
  assert.equal(overGoal.totalCalories, 1860);
  assert.equal(overGoal.status, 'OVER_GOAL');
});

test('calculateOrderTotals applies promo discounts, free delivery threshold, and GST', () => {
  const standardOrder = calculateOrderTotals(
    [{ item: sampleItems[0], quantity: 1 }], // 379 INR
    ''
  );
  assert.equal(standardOrder.subtotalInr, 379);
  assert.equal(standardOrder.deliveryFeeInr, 49);
  assert.equal(standardOrder.thermalPodFeeInr, 25);
  assert.equal(standardOrder.discountInr, 0);
  assert.equal(standardOrder.taxInr, 19);
  assert.equal(standardOrder.grandTotalInr, 472);

  const promoOrder = calculateOrderTotals(
    [{ item: sampleItems[1], quantity: 2 }], // 1198 INR (>= 799 free delivery)
    'FUDORA3D'
  );
  assert.equal(promoOrder.subtotalInr, 1198);
  assert.equal(promoOrder.deliveryFeeInr, 0);
  assert.equal(promoOrder.discountInr, 180); // 15% of 1198 rounded
  assert.equal(promoOrder.taxInr, 51); // 5% of (1198 - 180 = 1018)
  assert.equal(promoOrder.grandTotalInr, 1094);
});

test('evaluateTransitTemperature validates cold/hot chain telemetry compliance', () => {
  const compliantReadings: TemperatureReading[] = [
    { timestamp: '12:05', tempC: 68.2, humidityPct: 54, stage: 'Kitchen Seal' },
    { timestamp: '12:12', tempC: 67.1, humidityPct: 52, stage: 'Thermal Bag Lock' },
    { timestamp: '12:20', tempC: 66.0, humidityPct: 50, stage: 'In-Transit Telemetry' },
  ];
  const report = evaluateTransitTemperature(compliantReadings, [65, 76]);
  assert.equal(report.isCompliant, true);
  assert.equal(report.status, 'OPTIMAL');
  assert.equal(report.excursionCount, 0);
  assert.equal(report.qualityScore, 100);

  const excursionReadings: TemperatureReading[] = [
    { timestamp: '12:05', tempC: 68.0, humidityPct: 54, stage: 'Kitchen Seal' },
    { timestamp: '12:15', tempC: 55.0, humidityPct: 58, stage: 'In-Transit Telemetry' },
    { timestamp: '12:25', tempC: 52.4, humidityPct: 60, stage: 'Doorstep Handoff' },
  ];
  const failedReport = evaluateTransitTemperature(excursionReadings, [65, 76]);
  assert.equal(failedReport.isCompliant, false);
  assert.equal(failedReport.status, 'CRITICAL');
  assert.equal(failedReport.excursionCount, 2);
  assert.equal(failedReport.qualityScore, 72);
});

test('optimizeDeliveryRoute prioritizes high-priority thermal stops and calculates route distance', () => {
  const origin = { lat: 12.9716, lng: 77.5946 };
  const stops: DeliveryStop[] = [
    {
      id: 'stop-far-standard',
      label: 'Indiranagar Sector 2',
      lat: 12.9784,
      lng: 77.6408,
      priority: 'STANDARD',
      thermalSensitive: false,
    },
    {
      id: 'stop-near-high',
      label: 'MG Road Pavilion',
      lat: 12.9756,
      lng: 77.6066,
      priority: 'HIGH',
      thermalSensitive: true,
    },
  ];
  const result = optimizeDeliveryRoute(origin, stops);
  assert.equal(result.orderedStops.length, 2);
  assert.equal(result.orderedStops[0].id, 'stop-near-high');
  assert.ok(result.totalDistanceKm > 0);
  assert.ok(result.estimatedSavedMinutes >= 2);
});

test('aggregateRatings computes accurate averages and verified scan ratio', () => {
  const reviews: CustomerReview[] = [
    {
      id: 'r1',
      customerName: 'Aarav Mehta',
      orderId: 'VX-8821',
      dishName: 'Thai Green Curry & Jasmine Rice',
      rating: 5,
      tempAccuracyRating: 5,
      packagingRating: 5,
      comment: 'Arrived piping hot at 67°C.',
      createdAt: '2026-11-11',
      verifiedScan: true,
    },
    {
      id: 'r2',
      customerName: 'Priya Nair',
      orderId: 'VX-8819',
      dishName: 'FUDORA Club Sandwich',
      rating: 4,
      tempAccuracyRating: 5,
      packagingRating: 4,
      comment: 'Crisp toast and accurate allergen labels.',
      createdAt: '2026-11-11',
      verifiedScan: true,
    },
  ];
  const summary = aggregateRatings(reviews);
  assert.equal(summary.averageOverall, 4.5);
  assert.equal(summary.averageTempAccuracy, 5);
  assert.equal(summary.averagePackaging, 4.5);
  assert.equal(summary.verifiedScanRatioPct, 100);
});

test('buildMealSharePayload builds social media share links and formatted caption for confirmed orders', () => {
  const payload = buildMealSharePayload({
    orderId: 'VX-9042',
    itemsSummary: '1x Double Wagyu Truffle Burger, 1x Colombo Fire Koththu',
    totalCalories: 1320,
    totalCostInr: 1094,
    shareUrl: 'https://fudora.app/orders/VX-9042',
  });

  assert.equal(payload.orderId, 'VX-9042');
  assert.ok(payload.shareText.includes('1x Double Wagyu Truffle Burger'));
  assert.ok(payload.shareText.includes('1320 kcal'));
  assert.equal(payload.platforms.length, 5);
  assert.ok(payload.platforms.some((p) => p.id === 'x' && p.href.includes('twitter.com/intent/tweet')));
  assert.ok(payload.platforms.some((p) => p.id === 'whatsapp' && p.href.includes('api.whatsapp.com/send')));
});

test('applyOrderStatusUpdate transitions order status idempotently and builds push notification payload', () => {
  const sampleOrders: OrderHistoryRecord[] = [
    {
      orderId: 'VX-9042',
      deliveryDate: 'Today · 12:29 PM',
      itemsSummary: '1x Thai Green Curry & Jasmine Rice, 1x FUDORA Club Sandwich',
      itemIds: ['thai-green-curry', 'club-sandwich'],
      totalCostInr: 1052,
      status: 'IN_TRANSIT',
      thermalComplianceScore: 99,
      paymentMethod: 'UPI',
      courierName: 'Rohan Deshmukh',
    },
    {
      orderId: 'VX-8984',
      deliveryDate: 'Nov 09, 2026',
      itemsSummary: '1x Double Wagyu Truffle Burger',
      itemIds: ['wagyu-smash-burger'],
      totalCostInr: 1545,
      status: 'DELIVERED',
      thermalComplianceScore: 100,
      paymentMethod: 'Apple Pay',
      courierName: 'Karthik Nair',
    },
  ];

  // Transition VX-9042 from IN_TRANSIT to DELIVERED
  const transition = applyOrderStatusUpdate(sampleOrders, {
    orderId: 'VX-9042',
    status: 'DELIVERED',
  });
  assert.ok(transition.changedOrder);
  assert.equal(transition.previousStatus, 'IN_TRANSIT');
  assert.equal(transition.changedOrder?.status, 'DELIVERED');
  assert.equal(
    transition.updatedOrders.find((o) => o.orderId === 'VX-9042')?.status,
    'DELIVERED'
  );
  assert.ok(transition.notification);
  assert.equal(transition.notification?.title, 'Order #VX-9042 Status: DELIVERED');
  assert.ok(transition.notification?.body.includes('Status changed from IN_TRANSIT to DELIVERED'));

  // Applying the same DELIVERED status again is idempotent (no duplicate toast)
  const duplicate = applyOrderStatusUpdate(transition.updatedOrders, {
    orderId: 'VX-9042',
    status: 'DELIVERED',
  });
  assert.equal(duplicate.changedOrder, null);
  assert.equal(duplicate.notification, null);

  // Unknown orderId is ignored cleanly
  const unknown = applyOrderStatusUpdate(transition.updatedOrders, {
    orderId: 'VX-0000',
    status: 'DELIVERED',
  });
  assert.equal(unknown.changedOrder, null);
  assert.equal(unknown.notification, null);
});

test('authenticateFudoraUser validates email and passcode and builds a FUDORA user session', () => {
  const invalidEmail = authenticateFudoraUser({
    mode: 'signin',
    email: 'invalid-email',
    password: 'password123',
  });
  assert.equal(invalidEmail.ok, false);
  assert.ok(invalidEmail.error?.includes('valid email'));

  const validSignIn = authenticateFudoraUser({
    mode: 'signin',
    email: 'ananya.krishnan@fudora.app',
    password: 'fudora2026',
    favoriteSection: 'Koththu',
  });
  assert.equal(validSignIn.ok, true);
  assert.equal(validSignIn.session?.name, 'Ananya Krishnan');
  assert.equal(validSignIn.session?.tierLabel, 'FUDORA Gold Culinary Member');
  assert.equal(validSignIn.session?.favoriteSection, 'Koththu');

  const missingSignupName = authenticateFudoraUser({
    mode: 'signup',
    email: 'newchef@fudora.app',
    password: 'fudora2026',
    name: '',
  });
  assert.equal(missingSignupName.ok, false);

  const validSignup = authenticateFudoraUser({
    mode: 'signup',
    email: 'newchef@fudora.app',
    password: 'fudora2026',
    name: 'Rohan Deshmukh',
    favoriteSection: 'Burgers',
  });
  assert.equal(validSignup.ok, true);
  assert.equal(validSignup.session?.name, 'Rohan Deshmukh');
  assert.equal(validSignup.session?.tierLabel, 'FUDORA Welcome Member');
});

test('buildDriverBreadcrumbTrail computes traveled polyline vertices, remaining path, and route progress', () => {
  const waypoints = [
    { lat: 12.9716, lng: 77.5946, label: 'FUDORA Flagship Kitchen (Origin)' },
    { lat: 12.9742, lng: 77.6068, label: 'MG Road Metro Corridor' },
    { lat: 12.9759, lng: 77.6192, label: 'Trinity Circle Flyover' },
    { lat: 12.9773, lng: 77.6311, label: '100ft Road Indiranagar' },
    { lat: 12.9784, lng: 77.6408, label: 'Skyline Residences (Destination)' },
  ];

  // At origin (index 0)
  const atOrigin = buildDriverBreadcrumbTrail(waypoints, 0);
  assert.equal(atOrigin.completionPct, 0);
  assert.equal(atOrigin.visitedCheckpoints.length, 1);
  assert.equal(atOrigin.traveledPath.length, 1);
  assert.equal(atOrigin.remainingPath.length, 5);
  assert.equal(atOrigin.traveledDistanceKm, 0);
  assert.ok(atOrigin.remainingDistanceKm > 4);

  // Mid-route at Trinity Circle (index 2)
  const midRoute = buildDriverBreadcrumbTrail(waypoints, 2);
  assert.equal(midRoute.completionPct, 50);
  assert.equal(midRoute.visitedCheckpoints.length, 3);
  assert.equal(midRoute.visitedCheckpoints[2].isCurrent, true);
  // 3 checkpoints + 2*2 interpolated breadcrumbs = 7 vertices on traveled polyline
  assert.equal(midRoute.traveledPath.length, 7);
  assert.equal(midRoute.remainingPath.length, 3);
  assert.ok(midRoute.traveledDistanceKm > 2);
  assert.ok(midRoute.remainingDistanceKm > 2);

  // At destination (index 4)
  const atDest = buildDriverBreadcrumbTrail(waypoints, 4);
  assert.equal(atDest.completionPct, 100);
  assert.equal(atDest.visitedCheckpoints.length, 5);
  assert.equal(atDest.traveledPath.length, 13);
  assert.equal(atDest.remainingPath.length, 1);
  assert.equal(atDest.remainingDistanceKm, 0);
  assert.equal(atDest.traveledDistanceKm, atDest.totalRouteDistanceKm);
});

test('VEXMO_MENU_ITEMS includes all newly requested culinary sections and filters accurately', async () => {
  const { VEXMO_MENU_ITEMS } = await import('../data/vexmoData');
  const requiredCategories = [
    'Pasta',
    'Chicken Wings',
    'Full Roasted Chicken',
    'Salads',
    'Ice Cream & Faluda',
    'Fresh Juices & Shakes',
    'Oat Milks',
    'Healthy Muesli & Chia',
    'Desserts',
  ];

  for (const cat of requiredCategories) {
    const matches = filterMenuItems(VEXMO_MENU_ITEMS, { category: cat });
    assert.ok(matches.length >= 2, `Expected at least 2 varieties in section ${cat}, got ${matches.length}`);
    for (const dish of matches) {
      assert.ok(dish.thumbnailUrl.startsWith('/assets/dishes/'), `Dish ${dish.id} must have local HD thumbnail`);
    }
  }
});

test('buildDishSharePayload generates formatted 3D preview links and social media endpoints for menu items', async () => {
  const { VEXMO_MENU_ITEMS } = await import('../data/vexmoData');
  const dish = VEXMO_MENU_ITEMS[0]; // Double Wagyu Truffle Burger

  const payload = buildDishSharePayload({
    item: dish,
    shareUrl: 'https://fudora.app',
  });

  assert.equal(payload.dishId, dish.id);
  assert.equal(payload.dishName, dish.name);
  assert.equal(payload.category, dish.category);
  assert.equal(payload.shareUrl, `https://fudora.app#dish-${dish.id}`);
  assert.ok(payload.shareTitle.includes(dish.name));
  assert.ok(payload.shareText.includes(dish.name));
  assert.ok(payload.shareText.includes(`${dish.calories} kcal`));
  assert.ok(payload.shareText.includes(`LKR ${dish.priceInr}`));
  assert.ok(payload.hashtags.includes('FUDORA3D'));

  // Ensure major platforms are supported
  const platformIds = payload.platforms.map((p) => p.id);
  assert.ok(platformIds.includes('whatsapp'));
  assert.ok(platformIds.includes('x'));
  assert.ok(platformIds.includes('facebook'));
  assert.ok(platformIds.includes('telegram'));
  assert.ok(platformIds.includes('linkedin'));

  // Verify URL encoding in links
  const whatsappLink = payload.platforms.find((p) => p.id === 'whatsapp')!;
  assert.ok(whatsappLink.href.includes('api.whatsapp.com'));
  assert.ok(whatsappLink.href.includes(encodeURIComponent(`https://fudora.app#dish-${dish.id}`)));

  const twitterLink = payload.platforms.find((p) => p.id === 'x')!;
  assert.ok(twitterLink.href.includes('twitter.com/intent/tweet'));
});

test('buildOrderSuccessSummary generates formatted order success metadata for Framer Motion animation', () => {
  const summary = buildOrderSuccessSummary({
    orderId: 'VX-9421',
    grandTotalInr: 1120,
    itemsSummary: '2x Double Wagyu Truffle Burger, 1x Korean Gochujang Wings',
    courierName: 'Kavitha Murthy',
    placedAt: '12:45 PM',
    etaMinutes: 9,
  });

  assert.equal(summary.orderId, 'VX-9421');
  assert.equal(summary.grandTotalInr, 1120);
  assert.equal(summary.itemsSummary, '2x Double Wagyu Truffle Burger, 1x Korean Gochujang Wings');
  assert.equal(summary.courierName, 'Kavitha Murthy');
  assert.equal(summary.placedAt, '12:45 PM');
  assert.equal(summary.etaMinutes, 9);
  assert.equal(summary.thermalHoldTemp, '67.4°C Induction Sealed');
  assert.equal(summary.tamperSealCode, 'NFC-VX9421');
});

test('getCityZoneDensityData and calculateCityDensitySummary compute accurate density and surge metrics', () => {
  const liveZones = getCityZoneDensityData('live');
  assert.ok(liveZones.length >= 10, 'Expected at least 10 city zones');

  // Verify fields in zone record
  const zone = liveZones.find((z) => z.id === 'cinnamon-gardens')!;
  assert.ok(zone, 'Cinnamon Gardens zone exists');
  assert.equal(zone.shortLabel, 'Cinnamon Gardens');
  assert.ok(zone.ordersPerKm2 > 0);
  assert.ok(zone.activeOrders > 0);
  assert.ok(zone.activeCouriers > 0);
  assert.ok(zone.xNormalized >= 0 && zone.xNormalized <= 1);
  assert.ok(zone.yNormalized >= 0 && zone.yNormalized <= 1);

  // Dinner surge scaling factor
  const dinnerZones = getCityZoneDensityData('dinner');
  const dinnerZone = dinnerZones.find((z) => z.id === 'cinnamon-gardens')!;
  assert.ok(
    dinnerZone.ordersPerKm2 >= zone.ordersPerKm2,
    'Dinner surge density should be greater than or equal to standard live density'
  );

  // Summary calculation
  const summary = calculateCityDensitySummary(liveZones);
  assert.ok(summary.peakDensity > 0);
  assert.ok(summary.totalActiveDeliveries > 0);
  assert.ok(summary.totalActiveCouriers > 0);
  assert.ok(summary.cityAvgWaitMins > 0);
});

test('getHourlyZoneDensityMatrix generates complete hourly cross-tabulation', () => {
  const matrix = getHourlyZoneDensityMatrix();
  assert.ok(matrix.length > 50, 'Expected full matrix for all zones across 13 hourly intervals');

  const sampleCell = matrix[0];
  assert.ok(sampleCell.zoneId);
  assert.ok(sampleCell.hourLabel);
  assert.ok(sampleCell.densityValue >= 0);
  assert.ok(sampleCell.orderVolume >= 0);
  assert.ok(sampleCell.surgeMultiplier >= 1.0);
});

test('calculateDeliveryMilestoneProgress computes correct stages, percentages, and labels', () => {
  // 1. Stage 0: Kitchen Prep
  const prepProgress = calculateDeliveryMilestoneProgress('PREPARING', 0, 5, '12:14 PM', 'Roshan Silva');
  assert.equal(prepProgress.currentStage, 'Kitchen Prep');
  assert.equal(prepProgress.stageIndex, 0);
  assert.ok(prepProgress.progressPct <= 20);
  assert.equal(prepProgress.isDelivered, false);
  assert.equal(prepProgress.stages[0].status, 'ACTIVE');
  assert.equal(prepProgress.stages[1].status, 'UPCOMING');

  // 2. Stage 1: Courier Assigned
  const assignedProgress = calculateDeliveryMilestoneProgress('COURIER_ASSIGNED', 0, 5, '12:14 PM', 'Roshan Silva');
  assert.equal(assignedProgress.currentStage, 'Courier Assigned');
  assert.equal(assignedProgress.stageIndex, 1);
  assert.equal(assignedProgress.stages[0].status, 'COMPLETED');
  assert.equal(assignedProgress.stages[1].status, 'ACTIVE');

  // 3. Stage 2: En Route
  const transitProgress = calculateDeliveryMilestoneProgress('IN_TRANSIT', 2, 5, '12:14 PM', 'Roshan Silva');
  assert.equal(transitProgress.currentStage, 'En Route');
  assert.equal(transitProgress.stageIndex, 2);
  assert.ok(transitProgress.progressPct > 50 && transitProgress.progressPct < 100);
  assert.equal(transitProgress.stages[0].status, 'COMPLETED');
  assert.equal(transitProgress.stages[1].status, 'COMPLETED');
  assert.equal(transitProgress.stages[2].status, 'ACTIVE');
  assert.equal(transitProgress.stages[3].status, 'UPCOMING');

  // 4. Stage 3: Delivered
  const deliveredProgress = calculateDeliveryMilestoneProgress('DELIVERED', 4, 5, '12:14 PM', 'Roshan Silva');
  assert.equal(deliveredProgress.currentStage, 'Delivered');
  assert.equal(deliveredProgress.stageIndex, 3);
  assert.equal(deliveredProgress.progressPct, 100);
  assert.equal(deliveredProgress.isDelivered, true);
  assert.equal(deliveredProgress.stages[3].status, 'COMPLETED');

  // Format currency helper
  assert.equal(formatLKR(1500), 'LKR 1,500');
});
