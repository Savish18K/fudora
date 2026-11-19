import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Plus,
  Minus,
  Trash2,
  ShieldCheck,
  Flame,
  AlertTriangle,
  CheckCircle2,
  Share2,
  Navigation,
  Award,
} from 'lucide-react';
import {
  calculateCartNutrition,
  calculateOrderTotals,
  detectAllergenConflicts,
  type CartItem,
  type AllergenType,
} from '../utils/deliveryLogic';
import { ShareMealModal } from './ShareMealModal';

interface CartCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (dishId: string, delta: number) => void;
  onClearCart: () => void;
  userAllergens: AllergenType[];
  dailyCalorieGoal: number;
  onCompleteCheckout: (orderDetails: {
    orderId: string;
    customerName: string;
    phone: string;
    address: string;
    paymentMethod: string;
    promoCode: string;
    grandTotalInr: number;
  }) => void;
  onTriggerPushAlert?: (title: string, body: string) => void;
}

export const CartCheckoutModal: React.FC<CartCheckoutModalProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onClearCart,
  userAllergens,
  dailyCalorieGoal,
  onCompleteCheckout,
  onTriggerPushAlert,
}) => {
  const [promoInput, setPromoInput] = useState<string>('FUDORA3D');
  const [appliedPromo, setAppliedPromo] = useState<string>('FUDORA3D');
  const [customerName, setCustomerName] = useState<string>('Ananya Senanayake');
  const [phone, setPhone] = useState<string>('+94 77 984 5088');
  const [address, setAddress] = useState<string>(
    'Altair Residences, Sir James Pieris Mawatha, Colombo 00200, Sri Lanka'
  );
  const [paymentMethod, setPaymentMethod] = useState<string>('Digital Card / LankaPay / Cash on Delivery');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<{
    orderId: string;
    itemsSummary: string;
    totalCalories: number;
    grandTotalInr: number;
    loyaltyPointsEarned: number;
    paymentMethod: string;
    address: string;
  } | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);

  const nutrition = calculateCartNutrition(cart, dailyCalorieGoal);
  const totals = calculateOrderTotals(cart, appliedPromo);

  // Collect all allergens in cart that conflict with user's allergen profile
  const cartAllergenSet = new Set<AllergenType>();
  for (const entry of cart) {
    for (const alg of entry.item.allergens) {
      cartAllergenSet.add(alg);
    }
  }
  const activeConflicts = detectAllergenConflicts(Array.from(cartAllergenSet), userAllergens);

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedPromo(promoInput.trim().toUpperCase());
  };

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      setValidationError('Your order bag is empty. Add at least one dish to checkout.');
      return;
    }
    if (!customerName.trim() || !phone.trim() || !address.trim()) {
      setValidationError('Please enter your full name, phone number, and delivery address.');
      return;
    }
    setValidationError(null);
    const newOrderId = `VX-${Math.floor(9100 + Math.random() * 800)}`;
    const summaryText = cart.map((c) => `${c.quantity}x ${c.item.name}`).join(', ');
    const pointsEarned = Math.floor(totals.grandTotalInr / 10);

    setConfirmedOrder({
      orderId: newOrderId,
      itemsSummary: summaryText,
      totalCalories: nutrition.totalCalories,
      grandTotalInr: totals.grandTotalInr,
      loyaltyPointsEarned: pointsEarned,
      paymentMethod,
      address: address.trim(),
    });

    onCompleteCheckout({
      orderId: newOrderId,
      customerName: customerName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      paymentMethod,
      promoCode: appliedPromo,
      grandTotalInr: totals.grandTotalInr,
    });
  };

  const handleCloseModal = () => {
    setConfirmedOrder(null);
    setIsShareModalOpen(false);
    onClose();
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div
            className="fixed inset-0 z-50 flex justify-end bg-black/65 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Order Bag and Secure Checkout"
          >
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-lg bg-white dark:bg-[#111622] border-l border-slate-200 dark:border-slate-800 h-full flex flex-col justify-between overflow-hidden"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {confirmedOrder ? 'Order Confirmation' : 'Thermal Pod Bag & Checkout'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {confirmedOrder
                      ? `Order #${confirmedOrder.orderId} confirmed & dispatched to thermal pod`
                      : 'NFC tamper-evident seal + real-time transit temperature telemetry'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  aria-label="Close checkout drawer"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {confirmedOrder ? (
                  <div
                    data-testid="order-confirmation-screen"
                    className="space-y-6 py-2"
                  >
                    <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-500">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div className="text-xs font-mono uppercase tracking-wider font-semibold text-emerald-500">
                        Order Confirmed · Thermal Pod Sealed
                      </div>
                      <h3 className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                        Order #{confirmedOrder.orderId}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto">
                        Your meal is sealed in a dual-zone NFC thermal pod and assigned to live courier routing.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        Confirmed Meal Summary
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 font-medium">
                        {confirmedOrder.itemsSummary}
                      </p>
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 font-mono">
                        <div>
                          <div className="text-[10px] text-slate-400">TOTAL PAID</div>
                          <div className="text-sm font-bold text-amber-500">
                            LKR {confirmedOrder.grandTotalInr}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400">NUTRITION</div>
                          <div className="text-sm font-bold text-slate-900 dark:text-white">
                            {confirmedOrder.totalCalories} kcal
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400">LOYALTY EARNED</div>
                          <div className="text-sm font-bold text-emerald-500 flex items-center gap-1">
                            <Award className="w-3.5 h-3.5" />
                            <span>+{confirmedOrder.loyaltyPointsEarned} pts</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Prominent 'Share Your Meal' Social Media Card */}
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/15 via-slate-900/90 to-slate-950 border border-amber-500/30 text-white space-y-3">
                      <div className="space-y-1">
                        <div className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                          Social Culinary Showcase
                        </div>
                        <div className="text-sm font-bold">
                          Excited about your 3D meal order?
                        </div>
                        <p className="text-xs text-slate-300">
                          Share your confirmed order details, calorie breakdown, and thermal pod status with friends on X, WhatsApp, Facebook, Telegram, or LinkedIn.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsShareModalOpen(true)}
                        aria-label="Share Your Meal"
                        className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer border border-white/10"
                      >
                        <Share2 className="w-4 h-4 text-amber-400" />
                        <span>Share Your Meal</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      data-testid="track-live-order-btn"
                      onClick={handleCloseModal}
                      className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-amber-500 hover:from-emerald-400 hover:to-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-transform active:scale-[0.98] cursor-pointer shadow-lg shadow-emerald-500/20"
                    >
                      <Navigation className="w-4 h-4 text-slate-950" />
                      <span>Track Courier Live on Map</span>
                    </button>
                  </div>
                ) : cart.length === 0 ? (
                  <div className="py-16 text-center space-y-3">
                    <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
                      Your thermal pod bag is empty.
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Explore the 3D Pop-Up Menu to add freshly prepared dishes.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Allergen Alert if Cart has Conflicts */}
                    {activeConflicts.length > 0 && (
                      <div
                        role="alert"
                        className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-300 text-xs flex items-start gap-2.5"
                      >
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                        <div>
                          <strong>Allergen Guardrail Notice:</strong> Items in your bag contain{' '}
                          <span className="underline font-semibold">
                            {activeConflicts.join(', ')}
                          </span>
                          . Separate isolated prep utensils will be assigned automatically.
                        </div>
                      </div>
                    )}

                    {/* Cart Items List */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>Selected Dishes ({cart.reduce((s, c) => s + c.quantity, 0)})</span>
                        <button
                          type="button"
                          onClick={onClearCart}
                          className="text-red-500 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Clear Bag</span>
                        </button>
                      </div>

                      {cart.map(({ item, quantity }) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                              {item.name}
                            </div>
                            <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 mt-0.5">
                              LKR {item.priceInr} · {item.calories * quantity} kcal ·{' '}
                              {item.idealTempRangeC[0]}°C–{item.idealTempRangeC[1]}°C
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(item.id, -1)}
                              aria-label={`Decrease quantity of ${item.name}`}
                              className="w-8 h-8 rounded-lg border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-6 text-center text-sm font-mono tabular-nums font-semibold">
                              {quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(item.id, 1)}
                              aria-label={`Increase quantity of ${item.name}`}
                              className="w-8 h-8 rounded-lg border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Meal Nutrition & Calorie Summary */}
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Flame className="w-4 h-4 text-amber-500" />
                          <span>Total Meal Nutrition</span>
                        </span>
                        <span className="font-mono tabular-nums text-amber-500 font-semibold">
                          {nutrition.totalCalories} kcal ({nutrition.goalPercentage}% of {dailyCalorieGoal} kcal)
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        <span>Protein: {nutrition.totalProtein}g</span>
                        <span aria-hidden="true">·</span>
                        <span>Carbs: {nutrition.totalCarbs}g</span>
                        <span aria-hidden="true">·</span>
                        <span>Fat: {nutrition.totalFat}g</span>
                      </div>
                    </div>

                    {/* Promo Code Form */}
                    <form onSubmit={handleApplyPromo} className="flex items-center gap-2">
                      <label htmlFor="promo-code-input" className="sr-only">
                        Promo Code
                      </label>
                      <input
                        id="promo-code-input"
                        type="text"
                        value={promoInput}
                        onChange={(e) => setPromoInput(e.target.value)}
                        placeholder="Promo code (e.g. FUDORA3D or FIRSTBITE)"
                        className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 text-xs font-mono uppercase text-slate-900 dark:text-white"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        Apply Code
                      </button>
                    </form>

                    {/* Delivery & Payment Form */}
                    <form id="checkout-form" onSubmit={handlePlaceOrder} className="space-y-3.5">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Delivery Verification & Secure Payment
                      </h3>

                      {validationError && (
                        <div
                          role="alert"
                          className="p-3 rounded-lg bg-red-500/15 border border-red-500/40 text-xs text-red-500"
                        >
                          {validationError}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label
                            htmlFor="checkout-name"
                            className="block text-xs text-slate-500 dark:text-slate-400 mb-1"
                          >
                            Recipient Name
                          </label>
                          <input
                            id="checkout-name"
                            type="text"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="checkout-phone"
                            className="block text-xs text-slate-500 dark:text-slate-400 mb-1"
                          >
                            Mobile for Live Alerts
                          </label>
                          <input
                            id="checkout-phone"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="checkout-address"
                          className="block text-xs text-slate-500 dark:text-slate-400 mb-1"
                        >
                          Drop-off Address (Synced with Google Maps Routing)
                        </label>
                        <input
                          id="checkout-address"
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="checkout-payment"
                          className="block text-xs text-slate-500 dark:text-slate-400 mb-1"
                        >
                          Encrypted Payment Method
                        </label>
                        <select
                          id="checkout-payment"
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                        >
                          <option value="UPI Instant Pay (GPay / PhonePe)">
                            UPI Instant Pay (GPay / PhonePe)
                          </option>
                          <option value="Visa Infinite ···· 4829">
                            Visa Infinite ···· 4829 (Tokenized)
                          </option>
                          <option value="Apple Pay / Google Pay Biometric">
                            Apple Pay / Google Pay Biometric
                          </option>
                          <option value="Cash / Contactless QR on Delivery">
                            Cash / Contactless QR on Delivery
                          </option>
                        </select>
                      </div>
                    </form>

                    {/* Bill Breakdown */}
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 space-y-2 text-xs font-mono tabular-nums">
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>Item Subtotal</span>
                        <span>LKR {totals.subtotalInr}</span>
                      </div>
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>Dual-Zone NFC Thermal Pod Fee</span>
                        <span>LKR {totals.thermalPodFeeInr}</span>
                      </div>
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>Delivery Fee (Free ≥ LKR 799)</span>
                        <span>{totals.deliveryFeeInr === 0 ? 'FREE' : `LKR ${totals.deliveryFeeInr}`}</span>
                      </div>
                      {totals.discountInr > 0 && (
                        <div className="flex justify-between text-emerald-500 font-semibold">
                           <span>Promo Discount ({appliedPromo})</span>
                          <span>-LKR {totals.discountInr}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>GST & Culinary Taxes (5%)</span>
                        <span>LKR {totals.taxInr}</span>
                      </div>
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between text-sm font-bold text-slate-900 dark:text-white">
                        <span>Total Payable</span>
                        <span className="text-amber-500">LKR {totals.grandTotalInr}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Footer CTA */}
              <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111622]">
                {confirmedOrder ? (
                  <button
                    type="button"
                    data-testid="view-live-tracking-footer-btn"
                    onClick={handleCloseModal}
                    className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-emerald-500 to-amber-500 hover:from-emerald-400 hover:to-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-transform active:scale-[0.98] cursor-pointer shadow-lg shadow-emerald-500/20"
                  >
                    <Navigation className="w-4 h-4 text-slate-950" />
                    <span>View Live Courier Tracking Map</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    form="checkout-form"
                    disabled={cart.length === 0}
                    className="w-full min-h-[48px] rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-transform active:scale-[0.98] cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>
                      Confirm & Track Live Order · LKR {totals.grandTotalInr}
                    </span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {confirmedOrder && (
        <ShareMealModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          orderId={confirmedOrder.orderId}
          itemsSummary={confirmedOrder.itemsSummary}
          totalCalories={confirmedOrder.totalCalories}
          totalCostInr={confirmedOrder.grandTotalInr}
          onTriggerPushAlert={onTriggerPushAlert}
        />
      )}
    </>
  );
};

