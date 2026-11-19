import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  Share2,
  X,
  Thermometer,
  ShieldCheck,
  Clock,
  Sparkles,
} from 'lucide-react';
import type { OrderSuccessBannerDetails } from '../utils/deliveryLogic';

interface OrderSuccessAnimationProps {
  details: OrderSuccessBannerDetails;
  onDismiss: () => void;
  onShareMeal?: () => void;
  autoDismissMs?: number;
}

/**
 * Subtle 'Order Success' animation using framer-motion.
 * Features an animated drawing SVG checkmark, radiating thermal pulse,
 * floating particle embers, and live dispatch telemetry.
 */
export const OrderSuccessAnimation: React.FC<OrderSuccessAnimationProps> = ({
  details,
  onDismiss,
  onShareMeal,
  autoDismissMs = 12000,
}) => {
  const [isPaused, setIsPaused] = useState<boolean>(false);

  useEffect(() => {
    if (isPaused || autoDismissMs <= 0) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, autoDismissMs);
    return () => clearTimeout(timer);
  }, [isPaused, autoDismissMs, onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.96 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="status"
      aria-live="polite"
      className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900/90 to-amber-950/50 border border-emerald-500/40 p-4 sm:p-5 shadow-2xl backdrop-blur-xl text-white"
    >
      {/* Ambient background glow burst */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: [0, 0.25, 0.15], scale: [0.8, 1.2, 1] }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        className="pointer-events-none absolute -top-12 -left-12 w-48 h-48 rounded-full bg-emerald-500/20 blur-3xl"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: [0, 0.2, 0.1], scale: [0.8, 1.2, 1] }}
        transition={{ duration: 1.2, delay: 0.2, ease: 'easeOut' }}
        className="pointer-events-none absolute -bottom-12 -right-12 w-48 h-48 rounded-full bg-amber-500/20 blur-3xl"
      />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Animated Checkmark + Title & Subtitle */}
        <div className="flex items-start sm:items-center gap-3.5">
          {/* Subtle animated checkmark circle with radiating pulse */}
          <div className="relative shrink-0 w-12 h-12 flex items-center justify-center">
            {/* Soft radiating ripple ring */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0.8 }}
              animate={{ scale: [0.85, 1.35, 1.5], opacity: [0.7, 0.2, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
              className="absolute inset-0 rounded-2xl bg-emerald-500/25 blur-sm"
            />
            {/* Secondary warm pulse */}
            <motion.div
              initial={{ scale: 0.7, opacity: 0.5 }}
              animate={{ scale: [0.7, 1.2, 1.35], opacity: [0.5, 0.15, 0] }}
              transition={{ duration: 2.2, delay: 0.5, repeat: Infinity, ease: 'easeOut' }}
              className="absolute inset-0 rounded-2xl bg-amber-500/20 blur-sm"
            />

            {/* Checkmark container */}
            <div className="relative w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              {/* SVG drawing animated checkmark */}
              <svg
                className="w-7 h-7 text-emerald-400"
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <motion.circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, rotate: -90 }}
                  animate={{ pathLength: 1, rotate: 0 }}
                  transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                />
                <motion.path
                  d="M14 24.5L21 31.5L34 17.5"
                  stroke="currentColor"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.3, duration: 0.4, ease: 'easeInOut' }}
                />
              </svg>
            </div>

            {/* 3 gentle floating particles for thermal seal aura */}
            <motion.span
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: [0, 0.8, 0], y: [-2, -14, -20], x: [-1, 2, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
              className="absolute top-1 left-2 w-1.5 h-1.5 rounded-full bg-emerald-300 pointer-events-none"
            />
            <motion.span
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: [0, 0.9, 0], y: [-2, -16, -22], x: [1, -2, 1] }}
              transition={{ duration: 2.2, repeat: Infinity, delay: 0.6 }}
              className="absolute top-0 right-1 w-1.5 h-1.5 rounded-full bg-amber-300 pointer-events-none"
            />
            <motion.span
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: [0, 0.7, 0], y: [-1, -12, -18], x: [0, 3, -1] }}
              transition={{ duration: 1.8, repeat: Infinity, delay: 1 }}
              className="absolute -top-1 left-5 w-1 h-1 rounded-full bg-emerald-200 pointer-events-none"
            />
          </div>

          {/* Heading and details */}
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[10px] sm:text-[11px] font-mono font-bold tracking-wider uppercase text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>Order Placed Successfully</span>
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Placed at {details.placedAt}
              </span>
            </div>

            <motion.h2
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15, duration: 0.35 }}
              className="text-base sm:text-lg font-bold text-white flex items-center gap-2"
            >
              <span>Order #{details.orderId} Confirmed</span>
              <span className="text-amber-400 font-mono text-sm font-semibold">
                · LKR {details.grandTotalInr}
              </span>
            </motion.h2>

            <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
              {details.itemsSummary} · Dual-zone induction thermal pod sealed and assigned to courier{' '}
              <strong className="text-amber-300">{details.courierName}</strong>.
            </p>
          </div>
        </div>

        {/* Right: Live Telemetry Badges & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 pt-2 md:pt-0 border-t md:border-t-0 border-white/10">
          {/* Micro telemetry pills */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono tabular-nums">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Thermometer className="w-3 h-3 text-emerald-400" />
              <span>{details.thermalHoldTemp}</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>~{details.etaMinutes} Mins ETA</span>
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>{details.tamperSealCode}</span>
            </span>
          </div>

          {/* Action: Share Meal */}
          {onShareMeal && (
            <button
              type="button"
              onClick={onShareMeal}
              className="min-h-[34px] px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm shadow-amber-500/20"
              title="Share confirmed order on social media"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
          )}

          {/* Dismiss button */}
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss order success animation"
            className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Auto-dismiss progress bar at the bottom */}
      {autoDismissMs > 0 && !isPaused && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10 overflow-hidden">
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: autoDismissMs / 1000, ease: 'linear' }}
            className="h-full bg-gradient-to-r from-emerald-400 to-amber-400"
          />
        </div>
      )}
    </motion.div>
  );
};
