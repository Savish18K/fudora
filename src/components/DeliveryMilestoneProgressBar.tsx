import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Utensils,
  ShieldCheck,
  Truck,
  CheckCircle2,
  Clock,
  Sparkles,
  MapPin,
  ChevronRight,
  Flame,
} from 'lucide-react';
import {
  calculateDeliveryMilestoneProgress,
  type DeliveryMilestoneStage,
  type DeliveryMilestoneProgress,
} from '../utils/deliveryLogic';

interface DeliveryMilestoneProgressBarProps {
  orderStatus: string;
  waypointIndex: number;
  totalWaypoints?: number;
  placedAt?: string;
  driverName?: string;
  destinationName?: string;
  onSimulateStage?: (stage: DeliveryMilestoneStage) => void;
}

export const DeliveryMilestoneProgressBar: React.FC<DeliveryMilestoneProgressBarProps> = ({
  orderStatus,
  waypointIndex,
  totalWaypoints = 5,
  placedAt = '12:14 PM',
  driverName = 'Roshan Silva',
  destinationName = 'Altair Residences · Colombo 02',
  onSimulateStage,
}) => {
  // Allow manual interactive stage preview or fallback to calculated progress
  const [manualStage, setManualStage] = useState<DeliveryMilestoneStage | null>(null);

  const effectiveStatus = manualStage
    ? manualStage === 'Delivered'
      ? 'DELIVERED'
      : manualStage === 'En Route'
      ? 'IN_TRANSIT'
      : manualStage === 'Courier Assigned'
      ? 'READY_FOR_PICKUP'
      : 'PREPARING'
    : orderStatus;

  const effectiveWaypointIdx = manualStage
    ? manualStage === 'Delivered'
      ? totalWaypoints - 1
      : manualStage === 'En Route'
      ? 2
      : 0
    : waypointIndex;

  const progress: DeliveryMilestoneProgress = calculateDeliveryMilestoneProgress(
    effectiveStatus,
    effectiveWaypointIdx,
    totalWaypoints,
    placedAt,
    driverName
  );

  const getStageIcon = (stage: DeliveryMilestoneStage, isCompleted: boolean) => {
    if (isCompleted && stage !== 'Delivered') {
      return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
    }
    switch (stage) {
      case 'Kitchen Prep':
        return <Utensils className="w-5 h-5 text-amber-400" />;
      case 'Courier Assigned':
        return <ShieldCheck className="w-5 h-5 text-amber-400" />;
      case 'En Route':
        return <Truck className="w-5 h-5 text-amber-400" />;
      case 'Delivered':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
    }
  };

  const handleStageClick = (stage: DeliveryMilestoneStage) => {
    setManualStage(stage);
    if (onSimulateStage) {
      onSimulateStage(stage);
    }
  };

  return (
    <section
      aria-label="Delivery Milestone Progress Tracker"
      data-testid="delivery-milestone-progress-bar"
      className="bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-6 shadow-sm overflow-hidden"
    >
      {/* HEADER WITH STAGE TELEMETRY & SRI LANKA CONTEXT */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono font-bold tracking-wider text-amber-500 uppercase">
              Live Delivery Milestones
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[11px] font-mono text-emerald-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Sri Lanka · Colombo Fleet</span>
            </span>
            {manualStage && (
              <button
                type="button"
                onClick={() => setManualStage(null)}
                className="text-[11px] text-slate-400 hover:text-amber-400 underline cursor-pointer"
              >
                Reset to live sync
              </button>
            )}
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2">
            <span>Stage {progress.stageIndex + 1} of 4:</span>
            <span className="text-amber-500">{progress.currentStage}</span>
          </h2>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 text-right font-mono">
            <div className="text-[10px] text-slate-400">ROUTE COMPLETION</div>
            <div className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
              {progress.progressPct}%
            </div>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-right font-mono">
            <div className="text-[10px] text-amber-400/80">DESTINATION</div>
            <div className="text-xs font-bold text-amber-400 truncate max-w-[150px]">
              {destinationName}
            </div>
          </div>
        </div>
      </div>

      {/* HORIZONTAL FRAMER-MOTION PROGRESS BAR & MILESTONE NODES */}
      <div className="relative pt-4 pb-2 px-2 sm:px-6">
        {/* Background Track */}
        <div className="absolute top-10 left-6 right-6 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden" />

        {/* Animated Active Progress Fill (Framer Motion) */}
        <div className="absolute top-10 left-6 right-6 h-1.5 overflow-hidden rounded-full pointer-events-none">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 rounded-full"
            initial={false}
            animate={{ width: `${progress.progressPct}%` }}
            transition={{
              type: 'spring',
              stiffness: 90,
              damping: 18,
              mass: 0.8,
            }}
          />
        </div>

        {/* Milestone Steps Grid */}
        <div className="relative grid grid-cols-4 gap-2">
          {progress.stages.map((milestone, idx) => {
            const isCompleted = milestone.status === 'COMPLETED';
            const isActive = milestone.status === 'ACTIVE';
            const isUpcoming = milestone.status === 'UPCOMING';

            return (
              <div
                key={milestone.stage}
                onClick={() => handleStageClick(milestone.stage)}
                data-testid={`milestone-stage-${idx}`}
                className="flex flex-col items-center text-center group cursor-pointer"
                title={`Click to simulate ${milestone.stage}`}
              >
                {/* Node Circle with Framer Motion Scale & Beacon */}
                <div className="relative mb-3">
                  {/* Pulsing Beacon Ring on Active Stage */}
                  {isActive && (
                    <motion.span
                      animate={{
                        scale: [1, 1.45, 1],
                        opacity: [0.8, 0.1, 0.8],
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 1.8,
                        ease: 'easeInOut',
                      }}
                      className="absolute -inset-1 rounded-full border-2 border-amber-400 pointer-events-none"
                    />
                  )}

                  <motion.div
                    animate={{
                      scale: isActive ? 1.15 : 1,
                    }}
                    transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors shadow-md ${
                      isCompleted
                        ? 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400'
                        : isActive
                        ? 'bg-amber-500 text-slate-950 border-2 border-amber-300 ring-4 ring-amber-500/20'
                        : 'bg-slate-100 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-800 text-slate-400'
                    }`}
                  >
                    {isActive ? (
                      <span className="text-slate-950 font-bold">{getStageIcon(milestone.stage, false)}</span>
                    ) : (
                      getStageIcon(milestone.stage, isCompleted)
                    )}
                  </motion.div>

                  {/* Step Number Tag */}
                  <span
                    className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full text-[9px] font-mono font-bold flex items-center justify-center ${
                      isCompleted
                        ? 'bg-emerald-500 text-slate-950'
                        : isActive
                        ? 'bg-white text-slate-950'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {milestone.stepNumber}
                  </span>
                </div>

                {/* Milestone Details */}
                <div className="space-y-0.5 max-w-[130px]">
                  <div
                    className={`text-xs sm:text-sm font-bold transition-colors ${
                      isActive
                        ? 'text-amber-400 font-extrabold'
                        : isCompleted
                        ? 'text-slate-900 dark:text-white'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {milestone.label}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 hidden sm:block">
                    {milestone.sublabel}
                  </div>
                  {milestone.timestamp && (
                    <div className="text-[10px] font-mono tabular-nums text-slate-400 dark:text-slate-500 pt-0.5">
                      {milestone.timestamp}
                    </div>
                  )}
                </div>

                {/* Status Indicator Pill */}
                <div className="mt-1.5">
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold uppercase ${
                      isCompleted
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : isActive
                        ? 'bg-amber-500/20 text-amber-400 font-bold'
                        : 'bg-slate-100 dark:bg-slate-800/60 text-slate-500'
                    }`}
                  >
                    {milestone.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* INTERACTIVE STAGE SIMULATION PILLS */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-mono text-[11px]">Interactive Stage Simulation:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(['Kitchen Prep', 'Courier Assigned', 'En Route', 'Delivered'] as DeliveryMilestoneStage[]).map(
            (st) => {
              const isCurrent = progress.currentStage === st;
              return (
                <button
                  key={st}
                  type="button"
                  data-testid={`simulate-stage-btn-${st.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => handleStageClick(st)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm shadow-amber-500/20'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {st}
                </button>
              );
            }
          )}
        </div>
      </div>
    </section>
  );
};
