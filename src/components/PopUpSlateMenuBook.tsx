import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Sparkles,
  Plus,
  Layers,
  Film,
  Share2,
  RotateCw,
} from 'lucide-react';
import type { MenuItem } from '../utils/deliveryLogic';
import { FUDORA_VIDEO_URL } from '../data/vexmoData';

export interface PopUp3DCardStageProps {
  dish: MenuItem;
  isPopped: boolean;
  flipTriggerKey?: number;
  showVideo?: boolean;
  compact?: boolean;
  onClickStage?: (dish: MenuItem) => void;
}

/**
 * Reusable True-3D Pop-Up Slate Menu Page Stage for any of the 30 Food Items.
 * Renders a tilted 3D dark slate menu page (`rotateX(36deg)`) on a table surface,
 * while the 3D multi-layered food plate unfolds upright (`rotateX(-32deg) translateZ(52px)`)
 * out of the slate page with interactive 3D pointer parallax, 3D rim thickness, steam, and glaze pour.
 */
export const PopUp3DCardStage: React.FC<PopUp3DCardStageProps> = ({
  dish,
  isPopped,
  flipTriggerKey = 0,
  showVideo = true,
  compact = false,
  onClickStage,
}) => {
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imgError, setImgError] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    setImgError(false);
    if (videoRef.current && showVideo) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, [dish.id, showVideo]);

  const handlePointerMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2; // -1 to 1
    const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2; // -1 to 1
    setTilt({ x: nx * 10, y: -ny * 7 });
  };

  const handlePointerLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  const isHotDish = dish.thermalZone === 'HOT_HOLD';
  const hasPourEffect =
    dish.category === 'Desserts' ||
    dish.category === 'Chicken Wings' ||
    dish.category === 'Ice Cream & Faluda' ||
    dish.category === 'Sides & Shares';

  return (
    <div
      onMouseMove={handlePointerMove}
      onMouseLeave={handlePointerLeave}
      onClick={() => onClickStage?.(dish)}
      style={{ perspective: '1200px' }}
      className={`relative w-full ${
        compact ? 'pt-6 pb-3 px-3' : 'pt-8 pb-4 px-4'
      } select-none cursor-pointer group overflow-visible`}
    >
      {/* Warm Café Tabletop Ambient Glow */}
      <div
        aria-hidden="true"
        className="absolute inset-x-4 top-2 bottom-2 rounded-2xl bg-gradient-to-b from-amber-500/15 via-orange-500/5 to-black/60 blur-xl pointer-events-none"
      />

      {/* 3D PAGE-FLIPPING + TILTED SLATE MENU SHEET */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${dish.id}-${flipTriggerKey}`}
          initial={{
            rotateX: -95,
            opacity: 0.25,
            scale: 0.92,
          }}
          animate={{
            rotateX: isPopped ? 28 + tilt.y : 6,
            rotateY: tilt.x,
            opacity: 1,
            scale: 1,
          }}
          exit={{
            rotateX: 70,
            opacity: 0,
            scale: 0.94,
          }}
          transition={{
            type: 'spring',
            stiffness: 180,
            damping: 19,
            mass: 0.85,
          }}
          style={{
            transformOrigin: 'top center',
            transformStyle: 'preserve-3d',
          }}
          className="relative w-full rounded-2xl bg-gradient-to-b from-[#262F40] via-[#1B2230] to-[#131822] border-2 border-slate-500/70 shadow-[0_22px_45px_rgba(0,0,0,0.92),0_7px_0_#0E121B,0_11px_0_#080A10] p-3.5 overflow-visible"
        >
          {/* PLANE 0: FLAT SLATE MENU SURFACE DETAILS (Gold Inlay Frame + Pop-Up Socket Ring + Contact Shadow) */}
          <div
            aria-hidden="true"
            className="absolute inset-2 rounded-xl border border-amber-400/25 pointer-events-none"
          />

          {/* Glowing Golden Pop-Up Socket Ring Printed on the Flat Slate Page */}
          <div
            aria-hidden="true"
            style={{ transform: 'translateZ(2px)' }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 h-3/5 rounded-full border-2 border-dashed border-amber-400/40 bg-amber-500/5 pointer-events-none"
          />

          {/* Deep Elliptical 3D Drop Shadow Cast by the Upright Food onto the Flat Slate Page */}
          <motion.div
            animate={{
              scale: isPopped ? 1.05 : 0.85,
              opacity: isPopped ? 0.85 : 0.3,
            }}
            style={{ transform: 'translateZ(4px)' }}
            className="absolute left-12 right-12 bottom-9 h-8 rounded-full bg-black/90 blur-md pointer-events-none"
          />

          {/* PLANE 1: THE 3D POPPING-UP FOOD STANDING UPRIGHT OUT OF THE TILTED SLATE PAGE */}
          <motion.div
            initial={{
              rotateX: 78,
              y: 28,
              z: 0,
              scaleY: 0.25,
              opacity: 0,
            }}
            animate={{
              rotateX: isPopped ? -30 : 0,
              y: isPopped ? (compact ? -14 : -18) : 0,
              z: isPopped ? (compact ? 38 : 48) : 2,
              scaleY: 1,
              scale: isPopped ? 1.03 : 0.96,
              opacity: 1,
            }}
            transition={{
              type: 'spring',
              stiffness: 210,
              damping: 17,
              delay: 0.06,
            }}
            style={{
              transformOrigin: 'bottom center',
              transformStyle: 'preserve-3d',
            }}
            className="relative z-20 mx-auto w-full aspect-[16/10] flex items-center justify-center overflow-visible"
          >
            {/* Rising 3D Steam Plumes Above the Upright Dish (Hot Dishes) */}
            {isHotDish && isPopped && (
              <div
                aria-hidden="true"
                style={{ transform: 'translateZ(20px)' }}
                className="absolute -top-6 inset-x-0 flex justify-center gap-7 pointer-events-none z-30"
              >
                {[0, 1, 2].map((idx) => (
                  <motion.div
                    key={idx}
                    animate={{
                      y: [-2, -26],
                      opacity: [0, 0.65, 0],
                      scale: [0.8, 1.35],
                    }}
                    transition={{
                      duration: 2.0 + idx * 0.35,
                      repeat: Infinity,
                      delay: idx * 0.45,
                      ease: 'easeOut',
                    }}
                    className="w-6 h-12 rounded-full bg-gradient-to-t from-amber-100/10 via-white/35 to-transparent blur-sm"
                  />
                ))}
              </div>
            )}

            {/* Animated Pouring Syrup / Glaze Stream from Above (Desserts / Wings / Fries) */}
            {hasPourEffect && isPopped && (
              <motion.div
                aria-hidden="true"
                style={{ transform: 'translateZ(28px)' }}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: [8, 42, 32], opacity: [0.4, 0.95, 0.75] }}
                transition={{ duration: 1.35, repeat: Infinity, repeatType: 'reverse' }}
                className="absolute -top-5 left-1/2 -translate-x-1/2 w-1.5 bg-gradient-to-b from-amber-200 via-amber-500 to-amber-900 rounded-full shadow-[0_0_12px_rgba(245,158,11,0.9)] z-30 pointer-events-none"
              />
            )}

            {/* 3D Volumetric Extruded Dish Plate with Multi-Layer Rim Shadow */}
            <div
              style={{
                transformStyle: 'preserve-3d',
                boxShadow: isPopped
                  ? '0 4px 0 #d97706, 0 8px 0 #92400e, 0 12px 0 #451a03, 0 26px 44px rgba(0,0,0,0.92), 0 0 28px rgba(245,158,11,0.28)'
                  : '0 4px 12px rgba(0,0,0,0.6)',
              }}
              className="relative w-full h-full rounded-2xl overflow-hidden border-2 border-amber-400 bg-slate-950 transition-shadow duration-300"
            >
              {showVideo ? (
                <video
                  ref={videoRef}
                  key={dish.videoUrl || FUDORA_VIDEO_URL}
                  src={dish.videoUrl || FUDORA_VIDEO_URL}
                  poster={dish.thumbnailUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
              ) : !imgError ? (
                <img
                  src={dish.thumbnailUrl}
                  alt={dish.name}
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-900 text-amber-400 text-xs font-bold">
                  {dish.name}
                </div>
              )}

              {/* Subtle Top Specular Rim Highlight */}
              <div
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-white/20 to-transparent pointer-events-none"
              />
            </div>

            {/* PLANE 2: FOREGROUND 3D FLOATING PARALLAX CALLOUT BADGES */}
            {isPopped && (
              <div
                style={{
                  transform: `translateZ(${compact ? 16 : 22}px)`,
                }}
                className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1.5 pointer-events-none z-30"
              >
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[9px] font-mono font-extrabold tracking-wide shadow-[0_6px_14px_rgba(0,0,0,0.85)] flex items-center gap-1 whitespace-nowrap">
                  <Sparkles className="w-2.5 h-2.5 shrink-0" />
                  <span>3D POP-UP</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#0B101B]/90 text-emerald-400 border border-emerald-500/40 text-[9px] font-mono font-bold shadow-[0_6px_14px_rgba(0,0,0,0.85)] whitespace-nowrap">
                  {dish.idealTempRangeC[0]}°C–{dish.idealTempRangeC[1]}°C
                </span>
              </div>
            )}
          </motion.div>

          {/* PRINTED SLATE MENU CAPTION STRIP & INGREDIENT CALLOUTS ON THE FRONT LIP OF THE SLATE PAGE */}
          <div
            style={{ transform: 'translateZ(12px)' }}
            className="mt-2.5 pt-2 border-t border-slate-500/40 flex flex-col gap-1.5 px-2"
          >
            {isPopped && !compact && (
              <div className="flex flex-wrap items-center gap-1.5 pointer-events-none">
                {dish.ingredients.slice(0, 3).map((ing) => (
                  <span
                    key={ing}
                    className="px-2 py-0.5 rounded-md bg-[#0B101B] border border-amber-400/40 text-[10px] font-mono font-semibold text-amber-200 shadow-sm"
                  >
                    + {ing}
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs sm:text-sm font-extrabold tracking-wide text-slate-100 font-display truncate">
                FUDORA {dish.name}
              </span>
              <span className="text-xs sm:text-sm font-mono font-extrabold text-amber-400 whitespace-nowrap shrink-0">
                — LKR {dish.priceInr}
              </span>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

interface PopUpSlateMenuBookProps {
  items: MenuItem[];
  selectedDish: MenuItem;
  onSelectDish: (dish: MenuItem) => void;
  onAddToCart?: (dish: MenuItem) => void;
  onInspect360?: (dish: MenuItem) => void;
  onOpenPopUpModal?: (dish: MenuItem) => void;
  onShareDish?: (dish: MenuItem) => void;
  compact?: boolean;
}

export const PopUpSlateMenuBook: React.FC<PopUpSlateMenuBookProps> = ({
  items,
  selectedDish,
  onSelectDish,
  onAddToCart,
  onInspect360,
  onOpenPopUpModal,
  onShareDish,
  compact = false,
}) => {
  const [isAutoFlipping, setIsAutoFlipping] = useState<boolean>(false);
  const [isPoppedUp, setIsPoppedUp] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'interactive-book' | 'split-book-reel'>('interactive-book');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('All');
  const [flipCount, setFlipCount] = useState<number>(0);

  const currentIndex = Math.max(
    0,
    items.findIndex((i) => i.id === selectedDish.id)
  );

  const categories = ['All', ...Array.from(new Set(items.map((i) => i.category)))];
  const leftPageItems =
    activeCategoryFilter === 'All'
      ? items
      : items.filter((i) => i.category === activeCategoryFilter);

  const triggerPageFlip = (nextDish: MenuItem) => {
    setFlipCount((c) => c + 1);
    setIsPoppedUp(true);
    onSelectDish(nextDish);
  };

  const handleNextPage = () => {
    const nextIdx = (currentIndex + 1) % items.length;
    triggerPageFlip(items[nextIdx]);
  };

  const handlePrevPage = () => {
    const prevIdx = (currentIndex - 1 + items.length) % items.length;
    triggerPageFlip(items[prevIdx]);
  };

  // Auto-flip timer through all 30 dishes
  useEffect(() => {
    if (!isAutoFlipping) return;
    const timer = setInterval(() => {
      const nextIdx = (currentIndex + 1) % items.length;
      setFlipCount((c) => c + 1);
      setIsPoppedUp(true);
      onSelectDish(items[nextIdx]);
    }, 3400);
    return () => clearInterval(timer);
  }, [isAutoFlipping, currentIndex, items, onSelectDish]);

  return (
    <div className="w-full flex flex-col justify-between bg-[#090C12] rounded-2xl border border-amber-500/35 shadow-[0_24px_70px_rgba(0,0,0,0.85)] relative overflow-visible">
      {/* Top Studio Controls Bar */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[#0D111A] rounded-t-2xl border-b border-white/10">
        <div className="flex items-center gap-2">
          <BookOpen className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-300">
            FUDORA 3D POPPING-UP SLATE MENU BOOK · PAGE {currentIndex + 1} OF {items.length}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsAutoFlipping((prev) => !prev)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isAutoFlipping
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40'
            }`}
            title="Auto-flip pages through all 30 3D popping-up dishes"
          >
            {isAutoFlipping ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            <span>{isAutoFlipping ? 'Auto-Flipping (30 Dishes)' : 'Auto-Flip 3D Book'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPoppedUp((prev) => !prev)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
              isPoppedUp
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                : 'bg-white/5 text-slate-300 border-white/15 hover:text-white'
            }`}
          >
            {isPoppedUp ? '3D Popped Up ↑' : 'Fold Flat'}
          </button>

          <button
            type="button"
            onClick={() => setFlipCount((c) => c + 1)}
            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white/5 hover:bg-amber-500 hover:text-slate-950 text-slate-200 border border-white/15 transition-colors cursor-pointer flex items-center gap-1"
            title="Re-trigger 3D Page Flip & Pop-Up Animation"
          >
            <RotateCw className="w-3 h-3" />
            <span>Replay Pop-Up</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setViewMode((prev) =>
                prev === 'interactive-book' ? 'split-book-reel' : 'interactive-book'
              )
            }
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
              viewMode === 'split-book-reel'
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                : 'bg-white/5 text-slate-300 border-white/15 hover:text-white'
            }`}
          >
            <Film className="w-3 h-3" />
            <span>{viewMode === 'split-book-reel' ? 'Hide Reel' : '+ Pop-Up Reel'}</span>
          </button>
        </div>
      </div>

      {/* Main 3D Perspective Tabletop Stage */}
      <div
        className={`relative z-10 px-3 sm:px-5 ${
          compact ? 'py-3' : 'py-5'
        } flex flex-col items-center justify-center overflow-visible`}
      >
        {/* Optional Synchronized Studio 3D Pop-Up Menu Video Reel Banner */}
        <AnimatePresence>
          {viewMode === 'split-book-reel' && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="w-full max-w-4xl rounded-2xl overflow-hidden border border-amber-500/40 bg-black shadow-2xl"
            >
              <div className="flex items-center justify-between px-3.5 py-2 bg-[#101624] border-b border-white/10 text-xs">
                <span className="font-mono font-bold text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  FUDORA STUDIO 3D POP-UP MENU BOOK REEL (LIVE SHOWCASE)
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Page-Flipping 3D Café Menu · LKR Pricing
                </span>
              </div>
              <div className="relative w-full h-48 sm:h-56 overflow-hidden bg-black">
                <video
                  src={FUDORA_VIDEO_URL}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-[122%] -mt-[9%] object-cover object-center"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* THE PHYSICAL 2-PAGE OPEN SLATE MENU BOOK ON CAFE TABLE */}
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 rounded-2xl bg-[#181E29] border-2 border-slate-600/80 shadow-[0_32px_64px_rgba(0,0,0,0.9),0_8px_0_#0F131A,0_12px_0_#090C10] relative overflow-visible">
          {/* LEFT SLATE PAGE: Embossed FUDORA Cafe Header + Interactive Printed Menu List */}
          <div className="md:col-span-5 bg-gradient-to-br from-[#232A38] via-[#1C222E] to-[#161B25] p-4 rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none border-b md:border-b-0 md:border-r border-black/60 flex flex-col justify-between relative">
            <div className="space-y-2.5">
              {/* Embossed Cafe Crest */}
              <div className="text-center border-b border-slate-500/30 pb-2.5">
                <div className="inline-flex items-center justify-center w-6 h-6 rounded-md border border-amber-400/50 bg-amber-500/10 rotate-45 mb-1">
                  <BookOpen className="w-3 h-3 text-amber-300 -rotate-45" />
                </div>
                <div className="text-sm font-bold tracking-[0.25em] text-slate-100 uppercase font-display">
                  FUDORA
                </div>
                <div className="text-[9px] font-mono tracking-[0.22em] text-amber-400/90 uppercase">
                  PREMIUM CAFE · SRI LANKA
                </div>
                <div className="mt-1 text-base font-extrabold tracking-[0.18em] text-slate-200/95 uppercase font-display">
                  MENU
                </div>
              </div>

              {/* Compact Section Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {categories.map((cat) => {
                  const active = activeCategoryFilter === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategoryFilter(cat)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap transition-colors cursor-pointer ${
                        active
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'bg-black/30 text-slate-300 hover:text-white border border-white/10'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              {/* Printed Slate Menu Lines — Clicking any dish flips the right page & pops up its 3D food */}
              <div
                aria-label="Interactive Slate Menu Items"
                className={`${
                  compact ? 'max-h-40' : 'max-h-52'
                } overflow-y-auto pr-1 space-y-1`}
              >
                {leftPageItems.map((item, idx) => {
                  const isCurrent = item.id === selectedDish.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => triggerPageFlip(item)}
                      className={`w-full text-left px-2 py-1.5 rounded-lg transition-all flex items-baseline justify-between gap-1.5 cursor-pointer group ${
                        isCurrent
                          ? 'bg-amber-500/20 border border-amber-400/60 text-amber-200 shadow-sm'
                          : 'hover:bg-white/5 text-slate-300 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`text-[10px] font-mono ${
                            isCurrent ? 'text-amber-400 font-bold' : 'text-slate-500'
                          }`}
                        >
                          {String(idx + 1).padStart(2, '0')}.
                        </span>
                        <span
                          className={`text-xs truncate ${
                            isCurrent
                              ? 'font-bold text-white'
                              : 'font-medium text-slate-200 group-hover:text-white'
                          }`}
                        >
                          {item.name}
                        </span>
                      </div>
                      <span className="flex-1 border-b border-dotted border-slate-600/60 mx-1 min-w-[10px]" />
                      <span
                        className={`text-[11px] font-mono tabular-nums shrink-0 ${
                          isCurrent ? 'text-amber-300 font-bold' : 'text-slate-400'
                        }`}
                      >
                        LKR {item.priceInr}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom of Left Slate Page: Page Turn Controls */}
            <div className="pt-2.5 mt-2 border-t border-slate-600/40 flex items-center justify-between gap-1.5 text-[11px] font-mono text-slate-300">
              <button
                type="button"
                onClick={handlePrevPage}
                className="px-2.5 py-1 rounded-lg bg-black/40 hover:bg-amber-500 hover:text-slate-950 border border-white/15 flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
              <span className="text-[10px] text-amber-400/90 font-semibold text-center truncate">
                Tap dish to flip
              </span>
              <button
                type="button"
                onClick={handleNextPage}
                className="px-2.5 py-1 rounded-lg bg-black/40 hover:bg-amber-500 hover:text-slate-950 border border-white/15 flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>Flip Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* CENTER BOOK SPINE CREASE */}
          <div
            aria-hidden="true"
            className="hidden md:block absolute top-0 bottom-0 left-[41.666%] w-3 -ml-1.5 bg-gradient-to-r from-black/80 via-slate-700/40 to-black/80 z-20 pointer-events-none"
          />

          {/* RIGHT SLATE PAGE: True 3D Page Flip + Upright Pop-Up Dish Stage */}
          <div className="md:col-span-7 bg-gradient-to-bl from-[#222938] via-[#181E2B] to-[#11151E] p-3 sm:p-4 rounded-b-2xl md:rounded-r-2xl md:rounded-bl-none flex flex-col justify-between relative overflow-visible">
            <PopUp3DCardStage
              dish={selectedDish}
              isPopped={isPoppedUp}
              flipTriggerKey={flipCount}
              showVideo={true}
              compact={compact}
              onClickStage={(d) => onOpenPopUpModal?.(d)}
            />

            {/* Bottom Action Strip on Right Slate Page */}
            <div className="mt-1 pt-2 border-t border-slate-600/40 flex flex-wrap items-center justify-between gap-2 px-2">
              <div className="text-[11px] font-mono text-slate-300 truncate">
                {selectedDish.calories} kcal · {selectedDish.proteinGrams}g P · ★{' '}
                {selectedDish.rating} ({selectedDish.reviewCount})
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {onAddToCart && (
                  <button
                    type="button"
                    onClick={() => onAddToCart(selectedDish)}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition-transform active:scale-95 cursor-pointer shadow-md whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add · LKR {selectedDish.priceInr}</span>
                  </button>
                )}
                {onInspect360 && (
                  <button
                    type="button"
                    onClick={() => onInspect360(selectedDish)}
                    className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-amber-500 hover:text-slate-950 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                    title="Inspect in 360° 3D WebGL Turntable"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>360° 3D</span>
                  </button>
                )}
                {onShareDish && (
                  <button
                    type="button"
                    onClick={() => onShareDish(selectedDish)}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 hover:text-amber-400 border border-white/15 transition-colors cursor-pointer"
                    title={`Share ${selectedDish.name} 3D Pop-Up`}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
