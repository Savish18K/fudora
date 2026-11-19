import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  RotateCcw,
  Layers,
  Eye,
  Compass,
  Sparkles,
  Play,
  Pause,
  Maximize2,
  X,
  Plus,
  ChevronDown,
  ChevronUp,
  Film,
  BookOpen,
} from 'lucide-react';
import type { MenuItem } from '../utils/deliveryLogic';
import { FUDORA_VIDEO_URL } from '../data/vexmoData';

interface ThreeDishTurntableProps {
  dish: MenuItem;
  isPopped: boolean;
  onTogglePopped: () => void;
  onAddToCart?: (dish: MenuItem) => void;
  onOpenCinema?: (dish: MenuItem) => void;
  onPopUpClick?: (dish: MenuItem) => void;
}

function get360VideoUrl(dish: MenuItem): string {
  const baseVideo = dish.videoUrl || '/assets/videos/wagyu_burger.mp4';
  if (baseVideo.includes('/assets/videos/')) {
    return baseVideo.replace('/assets/videos/', '/assets/videos/360/');
  }
  return '/assets/videos/360/wagyu_burger.mp4';
}

export const ThreeDishTurntable: React.FC<ThreeDishTurntableProps> = ({
  dish,
  isPopped,
  onTogglePopped,
  onAddToCart,
  onOpenCinema,
  onPopUpClick,
}) => {
  const video360Ref = useRef<HTMLVideoElement | null>(null);
  const videoPopUpRef = useRef<HTMLVideoElement | null>(null);
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);

  const [studioMode, setStudioMode] = useState<'360-video' | 'popup-video' | '3d-layer-stack'>(
    '360-video'
  );
  const [spinSpeed, setSpinSpeed] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [degreeAngle, setDegreeAngle] = useState<number>(0);
  const [explodeAmount, setExplodeAmount] = useState<number>(isPopped ? 0.85 : 0.0);
  const [activePreset, setActivePreset] = useState<'hero' | 'top' | 'front'>('hero');
  const [showPip, setShowPip] = useState<boolean>(true);
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragOffsetDeg, setDragOffsetDeg] = useState<number>(0);
  const [tiltOffset, setTiltOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStartRef = useRef<{ x: number; y: number; startDeg: number }>({
    x: 0,
    y: 0,
    startDeg: 0,
  });

  const video360Url = get360VideoUrl(dish);
  const popUpVideoUrl = dish.videoUrl || FUDORA_VIDEO_URL;
  const isHotDish = dish.thermalZone === 'HOT_HOLD';

  useEffect(() => {
    setExplodeAmount(isPopped ? 0.85 : 0.0);
  }, [isPopped]);

  // Reload and play videos whenever dish or studioMode changes
  useEffect(() => {
    setDegreeAngle(0);
    setDragOffsetDeg(0);
    if (video360Ref.current) {
      video360Ref.current.src = video360Url;
      video360Ref.current.load();
      video360Ref.current.playbackRate = spinSpeed > 0 ? spinSpeed : 1;
      if (spinSpeed > 0 && isPlaying) {
        video360Ref.current.play().catch(() => {});
      }
    }
    if (videoPopUpRef.current) {
      videoPopUpRef.current.src = popUpVideoUrl;
      videoPopUpRef.current.load();
      videoPopUpRef.current.playbackRate = spinSpeed > 0 ? spinSpeed : 1;
      if (spinSpeed > 0 && isPlaying) {
        videoPopUpRef.current.play().catch(() => {});
      }
    }
    if (pipVideoRef.current) {
      const pipSrc = studioMode === '360-video' ? popUpVideoUrl : video360Url;
      pipVideoRef.current.src = pipSrc;
      pipVideoRef.current.load();
      pipVideoRef.current.play().catch(() => {});
    }
  }, [dish.id, video360Url, popUpVideoUrl, studioMode]);

  // Update playback speed on active video elements
  useEffect(() => {
    const activeVideo =
      studioMode === 'popup-video' ? videoPopUpRef.current : video360Ref.current;
    if (!activeVideo) return;
    if (spinSpeed === 0 || !isPlaying) {
      activeVideo.pause();
    } else {
      activeVideo.playbackRate = spinSpeed;
      activeVideo.play().catch(() => {});
    }
  }, [spinSpeed, isPlaying, studioMode]);

  // Track live 360° degree angle from video currentTime/duration or continuous orbit
  useEffect(() => {
    let rafId = 0;
    const updateAngle = () => {
      const v = video360Ref.current;
      if (v && v.duration && !Number.isNaN(v.duration) && !isDragging) {
        const pct = (v.currentTime % v.duration) / v.duration;
        setDegreeAngle(Math.round((pct * 360 + dragOffsetDeg + 360) % 360));
      }
      rafId = requestAnimationFrame(updateAngle);
    };
    rafId = requestAnimationFrame(updateAngle);
    return () => cancelAnimationFrame(rafId);
  }, [isDragging, dragOffsetDeg]);

  // Interactive 360° drag-to-scrub & 3D perspective orbit
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startDeg: degreeAngle,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setTiltOffset({ x: nx * 12, y: -ny * 8 });

    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const nextDeg = Math.round((dragStartRef.current.startDeg + dx * 0.85 + 3600) % 360);
    setDegreeAngle(nextDeg);
    setDragOffsetDeg(dx * 0.85);

    // Scrub the 360° video directly to match the user's 360° drag angle!
    const v = studioMode === 'popup-video' ? videoPopUpRef.current : video360Ref.current;
    if (v && v.duration && !Number.isNaN(v.duration)) {
      v.currentTime = ((nextDeg % 360) / 360) * v.duration;
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handlePointerLeave = () => {
    setIsDragging(false);
    setTiltOffset({ x: 0, y: 0 });
  };

  const handleResetView = () => {
    setActivePreset('hero');
    setSpinSpeed(1);
    setIsPlaying(true);
    setDragOffsetDeg(0);
    setTiltOffset({ x: 0, y: 0 });
    if (video360Ref.current) {
      video360Ref.current.currentTime = 0;
      video360Ref.current.play().catch(() => {});
    }
  };

  // Compute 3D camera preset tilt angles
  const baseRotateX =
    activePreset === 'top' ? 28 : activePreset === 'front' ? 0 : 12;
  const baseScale =
    activePreset === 'top' ? 0.96 : activePreset === 'front' ? 1.03 : 1.0;

  return (
    <div className="relative w-full min-h-[480px] sm:min-h-[540px] rounded-2xl overflow-hidden bg-[#060911] border border-white/15 select-none flex flex-col justify-between shadow-[0_25px_70px_rgba(0,0,0,0.85)]">
      {/* ===================================================================== */}
      {/* TOP BAR: DISH TELEMETRY + 360° 3D VIDEO / POP-UP VIDEO MODE SWITCHER */}
      {/* ===================================================================== */}
      <div className="relative z-30 flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-[#0B101C]/95 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <span className="px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 text-[10px] font-mono font-extrabold tracking-wider uppercase flex items-center gap-1 shrink-0 shadow-sm">
            <Sparkles className="w-3 h-3" />
            <span>360° 3D VIDEO · {degreeAngle}°</span>
          </span>
          <span className="text-xs font-bold text-white truncate">
            {dish.name}
          </span>
          {onPopUpClick && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPopUpClick(dish);
              }}
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer shrink-0"
            >
              <Sparkles className="w-3 h-3" />
              <span>Pop Up in 3D Book</span>
            </button>
          )}
        </div>

        {/* Studio Sub-Mode Switcher: 3D 360° Video | 3D Pop-Up Video | 3D Layer Stack */}
        <div className="flex items-center gap-1 bg-slate-950/90 p-1 rounded-xl border border-white/15">
          <button
            type="button"
            onClick={() => setStudioMode('360-video')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
              studioMode === '360-video'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Compass className="w-3 h-3" />
            <span>3D 360° Video</span>
          </button>
          <button
            type="button"
            onClick={() => setStudioMode('popup-video')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
              studioMode === 'popup-video'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <BookOpen className="w-3 h-3" />
            <span>3D Pop-Up Video</span>
          </button>
          <button
            type="button"
            onClick={() => setStudioMode('3d-layer-stack')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
              studioMode === '3d-layer-stack'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>3D Layer Stack</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* CENTER 360° 3D VIDEO & INTERACTIVE 3D TURNTABLE VIEWPORT              */}
      {/* ===================================================================== */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        style={{ perspective: '1300px' }}
        className="relative flex-1 w-full py-4 px-3 flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
      >
        {/* Ambient Studio Spotlight & 360° Orbital Compass Ring */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(245,158,11,0.16),rgba(6,9,17,0.95)_72%)] pointer-events-none"
        />

        {/* MODE 1 & 2: 3D 360° TURNTABLE VIDEO OR 3D POPPING-UP SLATE MENU VIDEO */}
        {studioMode !== '3d-layer-stack' ? (
          <motion.div
            animate={{
              rotateX: baseRotateX + tiltOffset.y,
              rotateY: tiltOffset.x + (isDragging ? (dragOffsetDeg % 25) * 0.4 : 0),
              scale: baseScale,
            }}
            transition={{ type: 'spring', stiffness: 180, damping: 20 }}
            style={{ transformStyle: 'preserve-3d' }}
            className="relative w-[94%] sm:w-[88%] max-w-[650px] aspect-[16/9] rounded-2xl overflow-visible"
          >
            {/* 3D Extruded Golden Turntable Pedestal Shadow Underneath */}
            <div
              aria-hidden="true"
              style={{ transform: 'translateZ(-24px) translateY(18px)' }}
              className="absolute inset-x-8 -bottom-4 h-12 rounded-full bg-black/90 blur-xl pointer-events-none"
            />

            {/* Main 3D Video Stage Frame with Multi-Layer Extruded 3D Rim */}
            <div
              style={{
                transform: `translateZ(${Math.round(explodeAmount * 22)}px)`,
                boxShadow:
                  '0 4px 0 #d97706, 0 8px 0 #92400e, 0 13px 0 #451a03, 0 28px 55px rgba(0,0,0,0.95), 0 0 35px rgba(245,158,11,0.28)',
              }}
              className="relative w-full h-full rounded-2xl overflow-hidden border-2 border-amber-400 bg-slate-950"
            >
              {/* 3D 360° Turntable Video Element */}
              <video
                ref={video360Ref}
                src={video360Url}
                poster={dish.thumbnailUrl}
                autoPlay
                loop
                muted
                playsInline
                className={`w-full h-full object-cover object-center transition-opacity duration-300 ${
                  studioMode === '360-video' ? 'opacity-100' : 'opacity-0 hidden'
                }`}
              />

              {/* 3D Popping-Up Slate Menu Video Element */}
              <video
                ref={videoPopUpRef}
                src={popUpVideoUrl}
                poster={dish.thumbnailUrl}
                autoPlay
                loop
                muted
                playsInline
                className={`w-full h-full object-cover object-center transition-opacity duration-300 ${
                  studioMode === 'popup-video' ? 'opacity-100' : 'opacity-0 hidden'
                }`}
              />

              {/* Subtle 360° Degree Compass Overlay Bar at Top of Video */}
              <div className="absolute top-2.5 left-3 right-3 flex items-center justify-between pointer-events-none z-20">
                <span className="px-2.5 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-amber-500/40 text-[10px] font-mono font-bold text-amber-300">
                  {studioMode === '360-video'
                    ? `3D 360° TURNTABLE VIDEO · ${degreeAngle}° ORBIT`
                    : `3D POP-UP MENU BOOK VIDEO · ${dish.popUpElevationLabel}`}
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-emerald-500/40 text-[10px] font-mono font-bold text-emerald-400">
                  {dish.idealTempRangeC[0]}°C–{dish.idealTempRangeC[1]}°C Hold
                </span>
              </div>

              {/* Non-obstructing 3D Layer Stack Pills at Bottom-Left of Video Frame (Clear of Center Food & Right PiP) */}
              {explodeAmount > 0.2 && (
                <div className="absolute bottom-9 left-3 flex flex-wrap items-center gap-1.5 max-w-[62%] pointer-events-none z-20">
                  {dish.ingredients.slice(0, 2).map((ing, idx) => (
                    <span
                      key={ing}
                      className="px-2 py-0.5 rounded-lg bg-[#0A0F1D]/90 border border-amber-400/50 text-[10px] font-mono font-bold text-amber-200 shadow-md truncate"
                    >
                      L0{idx + 1}: + {ing}
                    </span>
                  ))}
                </div>
              )}

              {/* Bottom 360° Degree Compass Tick Strip */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3.5 py-1.5 flex items-center justify-between text-[10px] font-mono text-amber-300/90 pointer-events-none">
                <span>Drag horizontally to scrub 360° ({degreeAngle}°)</span>
                <span className="text-white font-bold">
                  {dish.name} — LKR {dish.priceInr}
                </span>
              </div>
            </div>
          </motion.div>
        ) : (
          /* MODE 3: INTERACTIVE 360° 3D MULTI-TIERED LAYER STACK */
          <motion.div
            animate={{
              rotateX: 24 + baseRotateX + tiltOffset.y,
              rotateY: tiltOffset.x,
              scale: baseScale,
            }}
            style={{ transformStyle: 'preserve-3d' }}
            className="relative w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center"
          >
            {/* Rotating 360° Obsidian & Gold Turntable Platter Base */}
            <div
              style={{
                transform: `translateZ(-35px) rotateZ(${degreeAngle}deg)`,
              }}
              className="absolute inset-2 rounded-full bg-gradient-to-b from-slate-800 to-slate-950 border-4 border-amber-500 shadow-[0_25px_60px_rgba(0,0,0,0.95)]"
            />

            {/* 3 Stacked 3D Volumetric Dish Tiers that Lift Apart with explodeAmount */}
            {[0, 1, 2].map((tierIdx) => {
              const zLift = tierIdx * (18 + explodeAmount * 42);
              const scaleTier = 1 - tierIdx * 0.12;
              return (
                <div
                  key={tierIdx}
                  style={{
                    transform: `translateZ(${Math.round(zLift)}px) scale(${scaleTier}) rotateZ(${
                      degreeAngle * (tierIdx % 2 === 0 ? 1 : -0.5)
                    }deg)`,
                    boxShadow:
                      '0 5px 0 #d97706, 0 10px 0 #78350f, 0 22px 40px rgba(0,0,0,0.9)',
                  }}
                  className="absolute inset-8 rounded-full overflow-hidden border-2 border-amber-400 bg-slate-900 transition-transform duration-150"
                >
                  <img
                    src={dish.thumbnailUrl}
                    alt={`${dish.name} 3D Tier ${tierIdx + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-center"
                  />
                </div>
              );
            })}

            {/* Rising Steam on Hot Dishes */}
            {isHotDish && (
              <div
                style={{ transform: 'translateZ(120px)' }}
                className="absolute -top-6 inset-x-0 flex justify-center gap-6 pointer-events-none"
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ y: [-4, -28], opacity: [0, 0.65, 0], scale: [0.8, 1.3] }}
                    transition={{ duration: 2 + i * 0.3, repeat: Infinity }}
                    className="w-6 h-12 rounded-full bg-gradient-to-t from-white/10 via-white/40 to-transparent blur-sm"
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Picture-in-Picture (PiP) Companion 3D Video Window (Bottom-Right) */}
        {showPip && (
          <div className="hidden sm:block absolute bottom-16 right-4 z-30 w-48 rounded-xl overflow-hidden border-2 border-amber-500/60 bg-slate-950 shadow-[0_16px_38px_rgba(0,0,0,0.95)]">
            <div className="relative aspect-[16/9] w-full bg-black">
              <video
                ref={pipVideoRef}
                src={studioMode === '360-video' ? popUpVideoUrl : video360Url}
                poster={dish.thumbnailUrl}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/85 border border-amber-500/40 text-[9px] font-mono font-bold text-amber-300 flex items-center gap-1">
                <Film className="w-2.5 h-2.5" />
                <span>{studioMode === '360-video' ? '3D POP-UP VIDEO' : '3D 360° VIDEO'}</span>
              </div>
              <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1">
                {onOpenCinema && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenCinema(dish);
                    }}
                    className="p-1 rounded bg-black/80 hover:bg-amber-500 text-white hover:text-slate-950 transition-colors cursor-pointer"
                    title="Expand Fullscreen 3D Video"
                  >
                    <Maximize2 className="w-2.5 h-2.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPip(false);
                  }}
                  className="p-1 rounded bg-black/80 hover:bg-red-500/80 text-white transition-colors cursor-pointer"
                  title="Hide PiP Window"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* COLLAPSIBLE BOTTOM STUDIO CONTROL DOCK                                */}
      {/* ===================================================================== */}
      <div className="relative z-30 px-3.5 pb-3 pt-1 flex flex-col items-center">
        <button
          type="button"
          onClick={() => setIsDockCollapsed((prev) => !prev)}
          className="mb-1 px-3 py-0.5 rounded-t-lg bg-[#0D1322]/90 border border-b-0 border-white/15 text-[10px] font-mono text-slate-300 hover:text-amber-400 flex items-center gap-1 cursor-pointer"
        >
          {isDockCollapsed ? (
            <>
              <ChevronUp className="w-3 h-3" />
              <span>Show 360° Studio Controls</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" />
              <span>Hide Controls</span>
            </>
          )}
        </button>

        {!isDockCollapsed && (
          <div className="w-full bg-[#0B101D]/95 backdrop-blur-md border border-white/15 rounded-2xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs">
            {/* 3D Pop Layers Slider & Toggle */}
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-[11px] font-semibold text-slate-200 whitespace-nowrap">
                3D Pop Layers:
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(explodeAmount * 100)}
                onChange={(e) => setExplodeAmount(Number(e.target.value) / 100)}
                aria-label="3D Pop Layers Elevation"
                className="w-20 sm:w-24 accent-amber-500 cursor-pointer"
              />
              <button
                type="button"
                onClick={() => {
                  const next = explodeAmount > 0.4 ? 0.0 : 0.9;
                  setExplodeAmount(next);
                  onTogglePopped();
                }}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 text-[11px] font-bold transition-colors cursor-pointer"
              >
                {explodeAmount > 0.4 ? 'Assemble' : 'Pop 3D Layers'}
              </button>
            </div>

            {/* Camera Angle Presets */}
            <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setActivePreset('hero')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                  activePreset === 'hero'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Compass className="w-3 h-3" />
                <span>45° Hero</span>
              </button>
              <button
                type="button"
                onClick={() => setActivePreset('top')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                  activePreset === 'top'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>Top Scan</span>
              </button>
              <button
                type="button"
                onClick={() => setActivePreset('front')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                  activePreset === 'front'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>Front Eye</span>
              </button>
            </div>

            {/* 360° Spin Speed & Quick Add */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-white/10 font-mono text-[11px]">
                {[
                  { label: 'Stop', val: 0 },
                  { label: '0.5x', val: 0.5 },
                  { label: '1x', val: 1 },
                  { label: '2x', val: 2 },
                ].map((spd) => (
                  <button
                    key={spd.label}
                    type="button"
                    onClick={() => {
                      setSpinSpeed(spd.val);
                      setIsPlaying(spd.val > 0);
                    }}
                    className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                      spinSpeed === spd.val
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {spd.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleResetView}
                title="Reset 360° Camera & Turntable"
                className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/10 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              {onAddToCart && (
                <button
                  type="button"
                  onClick={() => onAddToCart(dish)}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add · LKR {dish.priceInr}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
