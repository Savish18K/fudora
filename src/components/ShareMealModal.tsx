import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Share2,
  X,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Flame,
  ShieldCheck,
} from 'lucide-react';
import {
  buildMealSharePayload,
  type SocialSharePlatform,
} from '../utils/deliveryLogic';

interface ShareMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  itemsSummary: string;
  totalCalories?: number;
  totalCostInr?: number;
  courierName?: string;
  onTriggerPushAlert?: (title: string, body: string) => void;
}

export const ShareMealModal: React.FC<ShareMealModalProps> = ({
  isOpen,
  onClose,
  orderId,
  itemsSummary,
  totalCalories = 1320,
  totalCostInr = 1052,
  courierName = 'Rohan Deshmukh',
  onTriggerPushAlert,
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<SocialSharePlatform | null>(null);
  const [copiedCaption, setCopiedCaption] = useState<boolean>(false);

  const sharePayload = buildMealSharePayload({
    orderId,
    itemsSummary,
    totalCalories,
    totalCostInr,
    shareUrl:
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'https://fudora.app/orders',
  });

  const handleSelectPlatform = (platform: SocialSharePlatform) => {
    setSelectedPlatform(platform);
    if (onTriggerPushAlert) {
      onTriggerPushAlert(
        `Shared Order #${sharePayload.orderId} to ${platform.name}`,
        `Your FUDORA 3D meal card (${itemsSummary}) is ready to post on ${platform.name}.`
      );
    }
  };

  const handleCopyCaption = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(
          `${sharePayload.shareText} ${sharePayload.shareUrl}`
        );
      }
    } catch {
      // Fallback handled via state
    }
    setCopiedCaption(true);
    if (onTriggerPushAlert) {
      onTriggerPushAlert(
        `Meal Caption Copied · #${sharePayload.orderId}`,
        'Order details and social hashtags copied to your clipboard.'
      );
    }
    setTimeout(() => setCopiedCaption(false), 3000);
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-your-meal-title"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-amber-500/30 p-5 shadow-2xl space-y-3.5"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 dark:border-white/10 pb-3">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-500">
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Social Culinary Showcase · Order #{sharePayload.orderId}</span>
                </div>
                <h2
                  id="share-your-meal-title"
                  className="text-lg font-bold text-slate-900 dark:text-white"
                >
                  Share Your Meal to Social Media
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Share your confirmed FUDORA 3D meal order details, nutrition profile, and live thermal pod status with friends.
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close Share Your Meal modal"
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Visual Social Meal Card Preview */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 via-slate-900 to-slate-950 text-white border border-amber-500/30 space-y-3 shadow-inner">
              <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>CONFIRMED ORDER #{sharePayload.orderId}</span>
                </span>
                <span className="text-amber-400 font-semibold">
                  FUDORA 3D CULINARY STUDIO
                </span>
              </div>

              <div className="space-y-1">
                <div className="text-sm sm:text-base font-bold text-white leading-snug">
                  {itemsSummary}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-300 pt-1">
                  <span className="inline-flex items-center gap-1 text-amber-400">
                    <Flame className="w-3.5 h-3.5" />
                    <span>{totalCalories} kcal</span>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>67.4°C Thermal Pod</span>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>LKR {totalCostInr.toLocaleString('en-US')}</span>
                  {courierName && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-slate-400">Courier: {courierName}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {sharePayload.hashtags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-md bg-white/10 text-amber-300 font-mono text-[10px]"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Social Media Platform Buttons */}
            <div className="space-y-2.5">
              <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Choose a Social Media Platform
              </span>
              <div
                role="group"
                aria-label="Social media sharing platforms"
                className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
              >
                {sharePayload.platforms.map((platform) => {
                  const isSelected = selectedPlatform?.id === platform.id;
                  return (
                    <button
                      key={platform.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => handleSelectPlatform(platform)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 border-amber-500 font-semibold shadow-sm'
                          : 'bg-slate-50 dark:bg-[#0B0F17] border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 hover:border-amber-500/40'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate">
                          Share on {platform.name}
                        </div>
                        <div
                          className={`text-[11px] truncate ${
                            isSelected
                              ? 'text-slate-900'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {platform.handleHint}
                        </div>
                      </div>
                      <Share2 className="w-4 h-4 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Social Share Confirmation Banner */}
            {selectedPlatform && (
              <div
                role="status"
                className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-emerald-500 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Ready to Post on {selectedPlatform.name}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    Order #{sharePayload.orderId} meal card formatted for {selectedPlatform.name}.
                  </p>
                </div>
                <a
                  href={selectedPlatform.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap"
                >
                  <span>Open {selectedPlatform.name}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {/* Shareable Caption & Copy Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Formatted Social Share Caption
                </span>
                <button
                  type="button"
                  onClick={handleCopyCaption}
                  className="inline-flex items-center gap-1 text-amber-500 hover:text-amber-400 font-semibold cursor-pointer"
                >
                  {copiedCaption ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-500">Copied Meal Details!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Caption</span>
                    </>
                  )}
                </button>
              </div>
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-700 dark:text-slate-300 leading-relaxed">
                {sharePayload.shareText}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200/80 dark:border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
