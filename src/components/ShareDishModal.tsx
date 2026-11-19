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
  Flame,
  Thermometer,
  Layers,
  Smartphone,
  Film,
} from 'lucide-react';
import {
  buildDishSharePayload,
  type MenuItem,
  type SocialSharePlatform,
} from '../utils/deliveryLogic';

interface ShareDishModalProps {
  isOpen: boolean;
  onClose: () => void;
  dish: MenuItem | null;
  onTriggerPushAlert?: (title: string, body: string) => void;
}

export const ShareDishModal: React.FC<ShareDishModalProps> = ({
  isOpen,
  onClose,
  dish,
  onTriggerPushAlert,
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<SocialSharePlatform | null>(null);
  const [copiedCaption, setCopiedCaption] = useState<boolean>(false);

  if (!dish || typeof document === 'undefined') return null;

  const sharePayload = buildDishSharePayload({
    item: dish,
    shareUrl:
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'https://fudora.app',
  });

  const handleSelectPlatform = (platform: SocialSharePlatform) => {
    setSelectedPlatform(platform);
    if (onTriggerPushAlert) {
      onTriggerPushAlert(
        `Shared 3D Dish · ${dish.name}`,
        `Formatted 3D culinary preview ready to publish on ${platform.name}.`
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
        `3D Dish Preview Copied · ${dish.name}`,
        '3D elevation telemetry and link copied to clipboard.'
      );
    }
    setTimeout(() => setCopiedCaption(false), 3000);
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: sharePayload.shareTitle,
          text: sharePayload.shareText,
          url: sharePayload.shareUrl,
        });
        if (onTriggerPushAlert) {
          onTriggerPushAlert(
            `Shared 3D Dish · ${dish.name}`,
            '3D culinary item shared successfully via device.'
          );
        }
      } catch {
        // User cancelled or share dismissed
      }
    } else {
      handleCopyCaption();
    }
  };

  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-3d-dish-title"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-amber-500/30 p-5 sm:p-6 shadow-[0_25px_60px_rgba(0,0,0,0.7)] space-y-4"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 dark:border-white/10 pb-3">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-500">
                  <Share2 className="w-3.5 h-3.5" />
                  <span>3D Food Preview · Social Media Share</span>
                </div>
                <h2
                  id="share-3d-dish-title"
                  className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white"
                >
                  Share {dish.name}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Broadcast this 3D culinary preview with live steam telemetry, 3D elevation stats, and nutrition facts.
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close Share 3D Dish modal"
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Visual 3D Dish Preview Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#1A1F2C] via-[#0E131E] to-[#080B11] text-white border border-amber-500/35 space-y-3 shadow-xl">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold">
                  <Layers className="w-3 h-3" />
                  <span>{dish.popUpElevationLabel || 'Spatial 3D Pop-Up'}</span>
                </span>
                <span className="text-slate-400">FUDORA SPATIAL KITCHEN</span>
              </div>

              {/* 3D Motion Video or Photo in 16:9 */}
              <div className="aspect-[16/9] w-full rounded-xl overflow-hidden bg-black border border-white/15 relative">
                {dish.videoUrl ? (
                  <video
                    src={dish.videoUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover object-center"
                  />
                ) : (
                  <img
                    src={dish.thumbnailUrl}
                    alt={dish.name}
                    className="w-full h-full object-cover object-center"
                  />
                )}
                <div className="absolute top-2 left-2 flex items-center gap-1.5 pointer-events-none">
                  <span className="px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-amber-500/40 text-[10px] font-mono font-bold text-amber-300 flex items-center gap-1">
                    <Film className="w-3 h-3 text-amber-400" />
                    3D CULINARY PREVIEW
                  </span>
                </div>
              </div>

              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <div className="text-sm sm:text-base font-bold text-white leading-snug">
                    {dish.name}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                    {dish.subtitle}
                  </div>
                </div>
                <div className="text-sm sm:text-base font-bold font-mono text-amber-400 shrink-0">
                  LKR {dish.priceInr}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-300 pt-1 border-t border-white/10">
                <span className="inline-flex items-center gap-1 text-amber-400">
                  <Flame className="w-3.5 h-3.5" />
                  <span>{dish.calories} kcal</span>
                </span>
                <span aria-hidden="true">·</span>
                <span>{dish.proteinGrams}g Protein</span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 text-emerald-400">
                  <Thermometer className="w-3.5 h-3.5" />
                  <span>{dish.idealTempRangeC[0]}°C–{dish.idealTempRangeC[1]}°C</span>
                </span>
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

            {/* Social Media Sharing Platforms */}
            <div className="space-y-2.5">
              <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Choose a Platform to Share 3D Preview:
              </span>
              <div
                role="group"
                aria-label="Social media sharing platforms for 3D dish"
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

            {/* Active Platform Confirmation & Outbound Link */}
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
                    3D preview & elevation telemetry formatted for {selectedPlatform.name}.
                  </p>
                </div>
                <a
                  href={selectedPlatform.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap"
                >
                  <span>Open {selectedPlatform.name}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {/* Formatted Share Text & Copy Button */}
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
                      <span className="text-emerald-500">Copied 3D Dish Link!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Caption & Link</span>
                    </>
                  )}
                </button>
              </div>
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-700 dark:text-slate-300 leading-relaxed">
                {sharePayload.shareText} {sharePayload.shareUrl}
              </div>
            </div>

            {/* Footer with Native Device Share and Close */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-200/80 dark:border-white/10">
              {canNativeShare ? (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-400 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Share via Device</span>
                </button>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={onClose}
                className="min-h-[40px] px-5 py-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
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
