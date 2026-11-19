import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Play,
  Pause,
  Layers,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Share2,
  AlertTriangle,
  Check,
  BookOpen,
  RotateCw,
} from 'lucide-react';
import type { MenuItem, AllergenType } from '../utils/deliveryLogic';
import { detectAllergenConflicts } from '../utils/deliveryLogic';
import { PopUp3DCardStage } from './PopUpSlateMenuBook';

interface PoppingUp3DMenuModalProps {
  dish: MenuItem | null;
  allItems: MenuItem[];
  userAllergens: AllergenType[];
  isOpen: boolean;
  onClose: () => void;
  onSelectDish: (dish: MenuItem) => void;
  onAddToCart: (dish: MenuItem, quantity?: number) => void;
  onInspect360: (dish: MenuItem) => void;
  onShareDish: (dish: MenuItem) => void;
}

export const PoppingUp3DMenuModal: React.FC<PoppingUp3DMenuModalProps> = ({
  dish,
  allItems,
  userAllergens,
  isOpen,
  onClose,
  onSelectDish,
  onAddToCart,
  onInspect360,
  onShareDish,
}) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [addedFeedback, setAddedFeedback] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'layers' | 'nutrition' | 'chef-notes'>('layers');
  const [isAutoFlipping, setIsAutoFlipping] = useState<boolean>(false);
  const [isPoppedUp, setIsPoppedUp] = useState<boolean>(true);
  const [flipCount, setFlipCount] = useState<number>(0);

  useEffect(() => {
    setQuantity(1);
    setAddedFeedback(false);
    setIsPoppedUp(true);
    setFlipCount((c) => c + 1);
  }, [dish?.id]);

  // Auto-flip timer in modal if enabled
  useEffect(() => {
    if (!isOpen || !isAutoFlipping || !dish) return;
    const currentIndex = allItems.findIndex((item) => item.id === dish.id);
    const timer = setInterval(() => {
      const nextIdx = (currentIndex + 1) % allItems.length;
      onSelectDish(allItems[nextIdx]);
    }, 3400);
    return () => clearInterval(timer);
  }, [isOpen, isAutoFlipping, dish, allItems, onSelectDish]);

  // Handle ESC and Arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || !dish) return;
      const currentIndex = allItems.findIndex((item) => item.id === dish.id);
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') {
        const nextIdx = (currentIndex + 1) % allItems.length;
        onSelectDish(allItems[nextIdx]);
      }
      if (e.key === 'ArrowLeft') {
        const prevIdx = (currentIndex - 1 + allItems.length) % allItems.length;
        onSelectDish(allItems[prevIdx]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, dish, allItems, onClose, onSelectDish]);

  if (!isOpen || !dish) return null;

  const currentIndex = allItems.findIndex((item) => item.id === dish.id);
  const conflicts = detectAllergenConflicts(dish.allergens, userAllergens);

  const handleNext = () => {
    const nextIdx = (currentIndex + 1) % allItems.length;
    onSelectDish(allItems[nextIdx]);
  };

  const handlePrev = () => {
    const prevIdx = (currentIndex - 1 + allItems.length) % allItems.length;
    onSelectDish(allItems[prevIdx]);
  };

  const handleAdd = () => {
    onAddToCart(dish, quantity);
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1800);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 bg-black/85"
          onClick={onClose}
        />

        {/* 3D Pop-Up Slate Menu Book Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 28 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{
            type: 'spring',
            stiffness: 240,
            damping: 24,
            mass: 0.9,
          }}
          className="relative w-full max-w-5xl bg-[#0B0F17] border-2 border-amber-500/50 rounded-3xl overflow-hidden shadow-[0_30px_90px_rgba(0,0,0,0.95)] z-10 flex flex-col my-auto max-h-[92vh]"
        >
          {/* Top Folio Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 bg-[#0F1422] border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase">
                  FUDORA 3D POPPING-UP SLATE MENU BOOK · PAGE {currentIndex + 1} OF {allItems.length}
                </div>
                <div className="text-xs font-semibold text-white">
                  {dish.category} · {dish.popUpElevationLabel}
                </div>
              </div>
            </div>

            {/* Auto-Flip & Page Flip Navigation */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsPoppedUp((p) => !p)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                  isPoppedUp
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-white/5 text-slate-300 border-white/15 hover:text-white'
                }`}
              >
                {isPoppedUp ? '3D Popped Up ↑' : 'Fold Flat'}
              </button>
              <button
                type="button"
                onClick={() => setFlipCount((c) => c + 1)}
                className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-amber-500 hover:text-slate-950 border border-white/10 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                title="Replay 3D Page Flip & Pop-Up"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Replay Pop</span>
              </button>
              <button
                type="button"
                onClick={() => setIsAutoFlipping((prev) => !prev)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isAutoFlipping
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40'
                }`}
              >
                {isAutoFlipping ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isAutoFlipping ? 'Auto-Flipping' : 'Auto-Flip All 30'}</span>
              </button>
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous 3D dish page"
                className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                title="Flip Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Prev</span>
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next 3D dish page"
                className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                title="Flip Next Page"
              >
                <span className="hidden sm:inline">Flip Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close 3D pop-up"
                className="ml-1 p-1.5 rounded-xl bg-white/10 hover:bg-red-500/80 border border-white/15 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Modal Body: Left 3D Tilted Slate Page with Upright Pop-Up Dish + Right Layer Folio */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-y-auto">
            {/* Left Column: True 3D Page-Flipping Dark Slate Menu Page with Upright 3D Food */}
            <div className="lg:col-span-7 bg-gradient-to-b from-[#161B26] via-[#10141D] to-[#1A130D] p-4 sm:p-6 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/10 relative overflow-visible">
              <PopUp3DCardStage
                dish={dish}
                isPopped={isPoppedUp}
                flipTriggerKey={flipCount}
                showVideo={true}
              />

              {/* Bottom Controls under the 3D Slate Page */}
              <div className="mt-2 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-mono text-slate-300">
                  Move cursor over page to tilt 3D · Click <strong className="text-amber-400">Replay Pop</strong> to flip
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onInspect360(dish);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Inspect in 360° 3D WebGL</span>
                </button>
              </div>
            </div>

            {/* Right Column: 3D Popping Culinary Layer Folio */}
            <div className="lg:col-span-5 p-5 sm:p-6 flex flex-col justify-between space-y-5 bg-[#0B0F17]">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
                      {dish.category}
                    </span>
                    <span className="text-xl sm:text-2xl font-bold font-mono text-amber-400 tabular-nums">
                      LKR {dish.priceInr}
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 leading-snug">
                    {dish.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                    {dish.subtitle}
                  </p>
                </div>

                {conflicts.length > 0 && (
                  <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>
                      <strong>Allergen Alert:</strong> Contains {conflicts.join(', ')} matching your guardrail profile.
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => setActiveTab('layers')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      activeTab === 'layers'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    3D Layers
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('nutrition')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      activeTab === 'nutrition'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Nutrition
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('chef-notes')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      activeTab === 'chef-notes'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Thermal & Pod
                  </button>
                </div>

                {activeTab === 'layers' && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
                      <span>POP-UP INGREDIENT BREAKDOWN:</span>
                      <span className="text-amber-400 font-bold">{dish.ingredients.length} Fresh Layers</span>
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {dish.ingredients.map((ing, i) => (
                        <motion.div
                          key={ing}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-amber-500/40 text-xs text-slate-200 flex items-center justify-between transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-400 text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                              0{i + 1}
                            </span>
                            <span className="font-medium">{ing}</span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 uppercase">
                            Layer {i + 1}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'nutrition' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                        <div className="text-[10px] uppercase font-mono text-slate-400">Calories</div>
                        <div className="text-base font-bold font-mono text-white mt-0.5">{dish.calories}</div>
                        <div className="text-[9px] text-slate-500">kcal</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                        <div className="text-[10px] uppercase font-mono text-slate-400">Protein</div>
                        <div className="text-base font-bold font-mono text-amber-400 mt-0.5">{dish.proteinGrams}g</div>
                        <div className="text-[9px] text-slate-500">macro</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                        <div className="text-[10px] uppercase font-mono text-slate-400">Carbs</div>
                        <div className="text-base font-bold font-mono text-white mt-0.5">{dish.carbsGrams}g</div>
                        <div className="text-[9px] text-slate-500">macro</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                        <div className="text-[10px] uppercase font-mono text-slate-400">Fat</div>
                        <div className="text-base font-bold font-mono text-white mt-0.5">{dish.fatGrams}g</div>
                        <div className="text-[9px] text-slate-500">macro</div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1 text-xs">
                      <div className="text-slate-400 text-[11px] font-mono">ALLERGEN FORMULA:</div>
                      <div className="text-slate-200">
                        {dish.allergens.length === 0 ? (
                          <span className="text-emerald-400 font-semibold">100% Allergen-Free Formula</span>
                        ) : (
                          <span>{dish.allergens.join(' · ')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'chef-notes' && (
                  <div className="space-y-3 text-xs">
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                      <div className="flex items-center justify-between font-mono">
                        <span className="text-amber-400 font-bold uppercase">NFC Thermal Zone</span>
                        <span className="text-white font-bold">
                          {dish.idealTempRangeC[0]}°C – {dish.idealTempRangeC[1]}°C
                        </span>
                      </div>
                      <p className="text-slate-300 text-xs leading-relaxed">
                        Sealed in smart thermal container monitored continuously via transit sensor telemetry to ensure peak kitchen freshness upon delivery.
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between font-mono text-xs text-slate-300">
                      <span>Kitchen Prep Time:</span>
                      <span className="text-white font-bold">{dish.prepTimeMinutes} Minutes</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-3 border-t border-white/10">
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-white/5 border border-white/15 rounded-xl p-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-3 font-mono font-bold text-sm text-white">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => q + 1)}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleAdd}
                    className={`flex-1 min-h-[44px] py-2.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      addedFeedback
                        ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25'
                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/25 active:scale-[0.98]'
                    }`}
                  >
                    {addedFeedback ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Added to Order!</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Add · LKR {dish.priceInr * quantity}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => onShareDish(dish)}
                    className="min-h-[44px] p-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/15 text-slate-200 hover:text-amber-400 transition-colors cursor-pointer shrink-0"
                    title={`Share ${dish.name} 3D Preview`}
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Fast-Chapter Picker: Flip to any of the 30 dishes */}
          <div className="px-5 py-2.5 bg-[#0F1422] border-t border-white/10 flex items-center gap-2 overflow-x-auto shrink-0">
            <span className="text-[10px] font-mono text-amber-400 font-bold uppercase shrink-0 mr-1">
              Flip Slate Page ({allItems.length} Dishes):
            </span>
            {allItems.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectDish(item)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  item.id === dish.id
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
                }`}
              >
                {idx + 1}. {item.name.split(' ').slice(0, 2).join(' ')}
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
