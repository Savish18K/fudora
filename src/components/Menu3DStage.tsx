import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Flame,
  AlertTriangle,
  Plus,
  Play,
  Pause,
  Box,
  Search,
  ShieldAlert,
  Utensils,
  Film,
  Layers,
  Maximize2,
  X,
  Video,
  Share2,
  BookOpen,
  RotateCw,
} from 'lucide-react';
import {
  filterMenuItems,
  detectAllergenConflicts,
  type MenuItem,
  type AllergenType,
  type CulinaryCategory,
} from '../utils/deliveryLogic';
import { FUDORA_VIDEO_URL } from '../data/vexmoData';
import { ThreeDishTurntable } from './ThreeDishTurntable';
import { ShareDishModal } from './ShareDishModal';
import { PoppingUp3DMenuModal } from './PoppingUp3DMenuModal';
import { PopUpSlateMenuBook, PopUp3DCardStage } from './PopUpSlateMenuBook';

interface Menu3DStageProps {
  items: MenuItem[];
  userAllergens: AllergenType[];
  onToggleUserAllergen: (allergen: AllergenType) => void;
  dailyCalorieGoal: number;
  currentCartCalories: number;
  onAddToCart: (item: MenuItem) => void;
  onOpenCart: () => void;
  onOpenAiConcierge: () => void;
  onTriggerPushAlert?: (title: string, body: string) => void;
}

const CATEGORIES: ('All' | CulinaryCategory)[] = [
  'All',
  'Pasta',
  'Chicken Wings',
  'Full Roasted Chicken',
  'Salads',
  'Ice Cream & Faluda',
  'Fresh Juices & Shakes',
  'Oat Milks',
  'Healthy Muesli & Chia',
  'Desserts',
  'Burgers',
  'Buns',
  'Rice',
  'Koththu',
  'Parotas',
  'Chinese',
  'Italian',
  'Sandwiches',
  'Sides & Shares',
  'Beverages',
];

const SECTION_DESCRIPTIONS: Record<string, string> = {
  Pasta: 'Artisan bronze-die penne arrabbiata, creamy black truffle tagliatelle & roasted garlic basil pesto',
  'Chicken Wings': 'Double-crisped Korean Gochujang glazed wings & smoky Hickory BBQ peri-peri wing platters',
  'Full Roasted Chicken': 'Whole herb-butter rotisserie chicken & spiced tandoori peri-peri char-grilled whole bird',
  Salads: 'Crisp Mediterranean Greek feta salad, charred avocado quinoa bowls & cold-pressed lemon olive oil',
  'Ice Cream & Faluda': 'Royal rose & pistachio kulfi faluda with sweet basil seeds + 3-scoop Italian gelato trio',
  'Fresh Juices & Shakes': '100% cold-pressed watermelon, orange & green detox juices + thick Belgian chocolate & strawberry shakes',
  'Oat Milks': 'Creamy organic cold-brewed vanilla cinnamon, ceremonial matcha & golden turmeric barista oat milks',
  'Healthy Muesli & Chia': 'Swiss bircher overnight muesli with wild berries & tropical Alphonso mango coconut chia pudding',
  Desserts: 'Warm 70% dark chocolate molten lava cake, pistachio kunafa cheesecake & Liege Belgian waffles',
  Beverages: 'Chilled botanical mocktails, artisanal sparkling infusions & cold-pressed elixirs (2°C–6°C pod)',
  Burgers: 'Double A5 Wagyu smash burgers, cave-aged cheddar & toasted brioche buns',
  Buns: 'Pillow-soft steamed lotus leaf gua bao buns with savory glazes & pickled slaw',
  Rice: 'Fragrant Hom Mali jasmine rice bowls & slow-simmered aromatic curries',
  Koththu: 'Colombo street-style cast-iron chopped godhamba roti sizzled with spiced gravy & cheese',
  Parotas: 'Flaky multi-layered Malabar coin parotas paired with Tellicherry pepper roast',
  Chinese: 'Wok-hei hand-pulled dragon noodles, Szechuan chili oil prawns & crispy aromatics',
  Italian: 'Handmade bronze-die tagliatelle, creamy Pugliese burrata & shaved black truffle',
  Sandwiches: 'Triple-decker toasted brioche club sandwiches & herb-roasted fillings',
  'Sides & Shares': 'Molten smoked gouda loaded fries & char-grilled tiger prawn skewers',
};

const ALL_ALLERGENS: { id: AllergenType; label: string }[] = [
  { id: 'shellfish', label: 'Shellfish' },
  { id: 'gluten', label: 'Gluten' },
  { id: 'dairy', label: 'Dairy' },
  { id: 'nuts', label: 'Tree Nuts' },
  { id: 'eggs', label: 'Eggs' },
  { id: 'soy', label: 'Soy' },
  { id: 'spicy', label: 'Chili / Spicy' },
];

export const Menu3DStage: React.FC<Menu3DStageProps> = ({
  items,
  userAllergens,
  onToggleUserAllergen,
  dailyCalorieGoal,
  currentCartCalories,
  onAddToCart,
  onOpenAiConcierge,
  onTriggerPushAlert,
}) => {
  const [selectedDish, setSelectedDish] = useState<MenuItem>(items[0]);
  const [is3DPopped, setIs3DPopped] = useState<boolean>(true);
  const [stageMode, setStageMode] = useState<'animated-hero-split' | 'threejs-3d' | 'interactive-card'>(
    'interactive-card'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [onlyVegetarian, setOnlyVegetarian] = useState<boolean>(false);
  const [maxCaloriesFilter, setMaxCaloriesFilter] = useState<number | null>(null);
  const [hideConflictingDishes, setHideConflictingDishes] = useState<boolean>(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(true);
  const [imageFallbackMap, setImageFallbackMap] = useState<Record<string, boolean>>({});
  const [cardFlipCounts, setCardFlipCounts] = useState<Record<string, number>>({});
  const [cardPoppedOverrides, setCardPoppedOverrides] = useState<Record<string, boolean>>({});
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const isCard3DPopped = (dishId: string): boolean => {
    if (cardPoppedOverrides[dishId] !== undefined) {
      return cardPoppedOverrides[dishId];
    }
    return true;
  };

  const toggleCard3DPopped = (dishId: string) => {
    setCardPoppedOverrides((prev) => {
      const current = prev[dishId] !== undefined ? prev[dishId] : true;
      return { ...prev, [dishId]: !current };
    });
  };

  const handleInspect360 = (dish: MenuItem) => {
    setSelectedDish(dish);
    setStageMode('threejs-3d');
    setIs3DPopped(true);
    const stageEl = document.getElementById('fudora-3d-stage');
    if (stageEl) {
      stageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleFlipCardInGrid = (dish: MenuItem) => {
    setCardFlipCounts((prev) => ({
      ...prev,
      [dish.id]: (prev[dish.id] || 0) + 1,
    }));
    setCardPoppedOverrides((prev) => ({ ...prev, [dish.id]: true }));
    setSelectedDish(dish);
  };

  const [videoSourceMode, setVideoSourceMode] = useState<'individual' | 'reel'>('individual');
  const [show3DVideosInGrid, setShow3DVideosInGrid] = useState<boolean>(true);
  const [individualCardVideoOverrides, setIndividualCardVideoOverrides] = useState<Record<string, boolean>>({});
  const [cinemaModalDish, setCinemaModalDish] = useState<MenuItem | null>(null);
  const [selectedShareDish, setSelectedShareDish] = useState<MenuItem | null>(null);
  const [poppingUpDish, setPoppingUpDish] = useState<MenuItem | null>(null);

  const isDishVideoActive = (dish: MenuItem): boolean => {
    if (individualCardVideoOverrides[dish.id] !== undefined) {
      return individualCardVideoOverrides[dish.id];
    }
    return show3DVideosInGrid;
  };

  const toggleCardVideo = (dishId: string) => {
    setIndividualCardVideoOverrides((prev) => {
      const current = prev[dishId] !== undefined ? prev[dishId] : show3DVideosInGrid;
      return { ...prev, [dishId]: !current };
    });
  };

  const filteredItems = filterMenuItems(items, {
    searchQuery,
    category: selectedCategory,
    onlyVegetarian,
    maxCalories: maxCaloriesFilter,
    excludedAllergens: hideConflictingDishes ? userAllergens : [],
  });

  const handleSelectDishFor3D = (dish: MenuItem) => {
    setSelectedDish(dish);
    setIs3DPopped(true);
    if (videoRef.current) {
      if (videoSourceMode === 'individual') {
        const targetSrc = dish.videoUrl || FUDORA_VIDEO_URL;
        if (videoRef.current.src !== targetSrc && !videoRef.current.src.endsWith(targetSrc)) {
          videoRef.current.src = targetSrc;
          videoRef.current.load();
        }
        videoRef.current.currentTime = 0;
      } else {
        if (videoRef.current.src !== FUDORA_VIDEO_URL && !videoRef.current.src.endsWith(FUDORA_VIDEO_URL)) {
          videoRef.current.src = FUDORA_VIDEO_URL;
          videoRef.current.load();
        }
        videoRef.current.currentTime = dish.videoTimestampSec;
      }
      videoRef.current.play().catch(() => {});
      setIsVideoPlaying(true);
    }
  };

  const handleSwitchVideoMode = (mode: 'individual' | 'reel') => {
    setVideoSourceMode(mode);
    if (videoRef.current) {
      if (mode === 'individual') {
        const targetSrc = selectedDish.videoUrl || FUDORA_VIDEO_URL;
        videoRef.current.src = targetSrc;
        videoRef.current.load();
        videoRef.current.currentTime = 0;
      } else {
        videoRef.current.src = FUDORA_VIDEO_URL;
        videoRef.current.load();
        videoRef.current.currentTime = selectedDish.videoTimestampSec;
      }
      videoRef.current.play().catch(() => {});
      setIsVideoPlaying(true);
    }
  };

  const toggleVideoPlayback = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setIsVideoPlaying(true);
    } else {
      videoRef.current.pause();
      setIsVideoPlaying(false);
    }
  };

  const selectedConflicts = detectAllergenConflicts(selectedDish.allergens, userAllergens);
  const caloriePct = Math.min(100, Math.round((currentCartCalories / dailyCalorieGoal) * 100));

  return (
    <div className="space-y-10">
      {/* HERO SECTION WITH HIGH-CLARITY HD 3D VIDEO & INTERACTIVE 3D MENU STAGE */}
      <section
        id="fudora-3d-stage"
        aria-label="3D Popping Up Menu Showcase & Animated Hero Video"
        className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch bg-white dark:bg-[#111622] border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 lg:p-8 shadow-[0_24px_60px_rgba(0,0,0,0.35)]"
      >
        {/* Left Column: Editorial Context, Dish Telemetry Card & Dish Selector */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-500">
                FUDORA Spatial Culinary Studio · HD 3D Menu Book
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPoppingUpDish(selectedDish)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-sm"
                  title="Open 3D Pop-Up Menu Book"
                >
                  <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                  <span>3D Pop-Up Menu</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenAiConcierge}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Concierge</span>
                </button>
              </div>
            </div>

            <h1
              className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight"
              style={{ textWrap: 'balance' }}
            >
              FUDORA 3D Pop-Up Menu Book & Crystal-Clear 3D Meal Showcase.
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Explore {items.length} studio-grade 3D dishes across Pasta, Chicken Wings, Full Roasted Chicken,
              Salads, Royal Faluda & Ice Cream, Cold-Pressed Fresh Juices & Milkshakes, Barista Oat Milks,
              Healthy Muesli & Chia Puddings, Gourmet Desserts, Burgers, Koththu, and Parotas.
            </p>
          </div>

          {/* Selected Dish Telemetry Card */}
          <div className="bg-slate-50 dark:bg-[#0B0F17] border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs text-amber-500 font-medium">
                  {selectedDish.category} · {selectedDish.popUpElevationLabel}
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedDish.name}
                </h2>
              </div>
              <div className="text-xl font-bold font-mono tabular-nums text-amber-500 shrink-0">
                LKR {selectedDish.priceInr}
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              {selectedDish.subtitle}
            </p>

            {/* Unboxed Metadata Line */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200/70 dark:border-white/10">
              <span className="text-slate-800 dark:text-slate-200 font-semibold">
                {selectedDish.calories} kcal
              </span>
              <span aria-hidden="true">·</span>
              <span>{selectedDish.proteinGrams}g Protein</span>
              <span aria-hidden="true">·</span>
              <span>{selectedDish.carbsGrams}g Carbs</span>
              <span aria-hidden="true">·</span>
              <span>{selectedDish.fatGrams}g Fat</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-600 dark:text-emerald-400">
                Hold {selectedDish.idealTempRangeC[0]}°C–{selectedDish.idealTempRangeC[1]}°C
              </span>
            </div>

            {/* Allergen Warning Banner if conflicts exist */}
            {selectedConflicts.length > 0 && (
              <div
                role="alert"
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-300 text-xs"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                <span>
                  <strong>Allergen Alert:</strong> Contains{' '}
                  <span className="underline font-semibold">{selectedConflicts.join(', ')}</span>{' '}
                  (matches your allergen guardrail profile).
                </span>
              </div>
            )}

            {/* Quick Dish Switcher Buttons for 3D Stage */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Jump HD 3D Video & 360° Turntable to Dish ({items.length} 3D Meals):
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                {items.map((dish) => {
                  const active = dish.id === selectedDish.id;
                  return (
                    <button
                      key={dish.id}
                      type="button"
                      onClick={() => handleSelectDishFor3D(dish)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                          : 'bg-slate-200/70 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-white/10 border border-transparent dark:border-white/5'
                      }`}
                    >
                      {dish.category}: {dish.name.split(' ').slice(0, 2).join(' ')}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => onAddToCart(selectedDish)}
                className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-transform active:scale-[0.98] cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add · LKR {selectedDish.priceInr}</span>
              </button>
              <button
                type="button"
                onClick={() => setPoppingUpDish(selectedDish)}
                className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 hover:text-slate-950 text-amber-300 border border-amber-500/50 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer whitespace-nowrap shrink-0"
                title={`Open 3D Pop-Up Menu for ${selectedDish.name}`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>✨ 3D Pop-Up Menu</span>
              </button>
              <button
                type="button"
                onClick={() => setIs3DPopped((prev) => !prev)}
                className="min-h-[44px] px-3 py-2.5 rounded-xl border border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {is3DPopped ? 'Flatten Platter' : 'Pop Platter'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedShareDish(selectedDish)}
                className="min-h-[44px] px-3 py-2.5 rounded-xl border border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-amber-400 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                title={`Share ${selectedDish.name} 3D Preview`}
                aria-label={`Share ${selectedDish.name} 3D Preview`}
              >
                <Share2 className="w-3.5 h-3.5 text-amber-500" />
                <span>Share</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Crystal-Clear HD 3D Video Showcase + Interactive Three.js 3D & Pop-Up Stage */}
        <div className="lg:col-span-7 flex flex-col justify-between bg-[#080B11] border border-white/15 rounded-2xl overflow-visible relative min-h-[480px] shadow-2xl">
          {/* Stage Mode Switcher Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-[#0D121C] border-b border-white/10 rounded-t-2xl z-20">
            <div className="flex items-center gap-2 text-xs text-slate-200">
              <Film className="w-4 h-4 text-amber-400" />
              <span className="font-semibold tracking-wide">
                FUDORA MENU BOOK · 3D HD VIDEO & MEAL STAGE
              </span>
            </div>

            <div
              role="tablist"
              aria-label="3D Stage Mode"
              className="flex items-center gap-1 p-1 bg-slate-900 rounded-xl border border-white/10"
            >
              <button
                type="button"
                role="tab"
                aria-selected={stageMode === 'interactive-card'}
                onClick={() => setStageMode('interactive-card')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  stageMode === 'interactive-card'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>3D Pop-Up Menu Book</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={stageMode === 'threejs-3d'}
                onClick={() => setStageMode('threejs-3d')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  stageMode === 'threejs-3d'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                360° 3D WebGL Motion Studio
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={stageMode === 'animated-hero-split'}
                onClick={() => setStageMode('animated-hero-split')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  stageMode === 'animated-hero-split'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                HD 3D Video + 3D Book
              </button>
            </div>
          </div>

          {/* Stage Viewport */}
          <div className="flex-1 relative flex flex-col justify-center p-4 sm:p-6 overflow-visible">
            {stageMode === 'threejs-3d' ? (
              <div className="relative z-10 w-full rounded-xl overflow-hidden border border-white/10">
                <ThreeDishTurntable
                  dish={selectedDish}
                  isPopped={is3DPopped}
                  onTogglePopped={() => setIs3DPopped((prev) => !prev)}
                  onAddToCart={onAddToCart}
                  onOpenCinema={setCinemaModalDish}
                  onPopUpClick={(dish) => setPoppingUpDish(dish)}
                />
              </div>
            ) : stageMode === 'animated-hero-split' ? (
              /* Dual Hero Showcase: Crystal-Clear HD 3D Video Reel + Sharp Pop-Up 3D Dish Card */
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch w-full">
                {/* Unobstructed HD 3D Video Player (No blur or middle overlays covering food) */}
                <div className="md:col-span-7 rounded-2xl overflow-hidden border border-amber-500/40 bg-black flex flex-col justify-between shadow-2xl">
                  <div className="flex-1 min-h-[250px] w-full bg-black relative overflow-hidden group">
                    <video
                      key={videoSourceMode === 'individual' ? (selectedDish.videoUrl || FUDORA_VIDEO_URL) : FUDORA_VIDEO_URL}
                      ref={videoRef}
                      src={videoSourceMode === 'individual' ? (selectedDish.videoUrl || FUDORA_VIDEO_URL) : FUDORA_VIDEO_URL}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover object-center"
                    />
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
                      <span className="px-2.5 py-1 rounded-md bg-black/85 backdrop-blur-md border border-amber-500/30 text-[10px] font-mono font-bold text-amber-300">
                        {videoSourceMode === 'individual' ? '3D DISH VIDEO' : '3D MENU BOOK REEL'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 bg-[#0D121C] border-t border-white/15 text-xs text-white">
                    <div className="truncate">
                      <span className="text-amber-400 font-semibold mr-1.5">
                        {videoSourceMode === 'individual' ? '3D Video:' : '3D Reel:'}
                      </span>
                      <span className="text-slate-200 text-[11px]">
                        {selectedDish.name} ({selectedDish.category})
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleSwitchVideoMode(videoSourceMode === 'individual' ? 'reel' : 'individual')}
                        className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-[11px] font-medium transition-colors cursor-pointer"
                        title={videoSourceMode === 'individual' ? 'Switch to Full 3D Menu Reel' : 'Switch to Individual 3D Dish Video'}
                      >
                        {videoSourceMode === 'individual' ? 'Full Reel' : 'Dish Video'}
                      </button>
                      <button
                        type="button"
                        onClick={toggleVideoPlayback}
                        aria-label={isVideoPlaying ? 'Pause hero video' : 'Play hero video'}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-semibold text-[11px] cursor-pointer"
                      >
                        {isVideoPlaying ? (
                          <Pause className="w-3 h-3" />
                        ) : (
                          <Play className="w-3 h-3" />
                        )}
                        <span>{isVideoPlaying ? 'Pause' : 'Play'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sharp 3D Pop-Up FUDORA Menu Book Page Preview (Zero blur over the meal photo) */}
                <motion.div
                  animate={{
                    y: is3DPopped ? -6 : 0,
                    scale: is3DPopped ? 1.01 : 0.99,
                  }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="md:col-span-5 bg-[#121826] border border-amber-500/45 rounded-2xl p-3.5 flex flex-col justify-between space-y-3 shadow-2xl"
                >
                  <div className="flex items-center justify-between border-b border-white/15 pb-2">
                    <span className="text-[11px] font-mono font-bold tracking-widest text-amber-400">
                      FUDORA 3D MEAL CARD
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">
                      8K STUDIO CLARITY
                    </span>
                  </div>

                  {/* Pure Unblurred 3D Meal Image */}
                  <div className="aspect-[4/3] w-full rounded-xl overflow-hidden bg-slate-950 border border-amber-500/35">
                    {!imageFallbackMap[selectedDish.id] ? (
                      <img
                        src={selectedDish.thumbnailUrl}
                        alt={selectedDish.name}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setImageFallbackMap((prev) => ({ ...prev, [selectedDish.id]: true }))
                        }
                        className="w-full h-full object-cover object-center"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-amber-400">
                        <Utensils className="w-8 h-8" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400">
                      {selectedDish.category} · {selectedDish.popUpElevationLabel}
                    </div>
                    <div className="text-sm font-bold text-white leading-snug">
                      {selectedDish.name}
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-300 font-mono tabular-nums pt-1">
                      <span>★ {selectedDish.rating} ({selectedDish.reviewCount})</span>
                      <span className="text-amber-400 font-bold">LKR {selectedDish.priceInr}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStageMode('threejs-3d')}
                    className="w-full py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500 hover:text-slate-950 text-amber-300 border border-amber-500/35 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Inspect in 360° 3D WebGL</span>
                  </button>
                </motion.div>
              </div>
            ) : (
              /* Full Interactive 2-Page 3D Popping-Up Slate Cafe Menu Book (All 30 Dishes) */
              <div className="w-full relative z-10">
                <PopUpSlateMenuBook
                  items={items}
                  selectedDish={selectedDish}
                  onSelectDish={handleSelectDishFor3D}
                  onAddToCart={onAddToCart}
                  onInspect360={handleInspect360}
                  onOpenPopUpModal={(dish) => setPoppingUpDish(dish)}
                  onShareDish={(dish) => setSelectedShareDish(dish)}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SEARCH, SECTION BAR & CALORIE / ALLERGEN GUARDRAILS */}
      <section
        aria-label="Menu Filters, Culinary Sections, Allergen Alerts and Calorie Tracker"
        className="bg-white dark:bg-[#111622] border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 space-y-5 shadow-[0_16px_40px_rgba(0,0,0,0.25)]"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          {/* Search Input */}
          <div className="lg:col-span-4 relative">
            <label htmlFor="menu-search-input" className="sr-only">
              Search dishes, sections, or ingredients
            </label>
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="menu-search-input"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search pasta, wings, roasted chicken, salad, faluda, oat milk, muesli..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Culinary Section Tabs */}
          <div
            role="tablist"
            aria-label="Culinary Food Sections"
            className="lg:col-span-8 flex items-center gap-1.5 overflow-x-auto pb-1.5 sm:pb-0"
          >
            {CATEGORIES.map((category) => {
              const active = selectedCategory === category;
              const count =
                category === 'All'
                  ? items.length
                  : items.filter((i) => i.category === category).length;
              return (
                <button
                  key={category}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    active
                      ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20'
                      : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200/60 dark:border-white/10'
                  }`}
                >
                  <span>{category}</span>
                  <span
                    className={`text-[10px] font-mono tabular-nums ${
                      active ? 'text-slate-950/80' : 'text-slate-400'
                    }`}
                  >
                    ({count})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Second Row: Allergen Guardrail Toggles + Live Calorie Goal Meter */}
        <div className="pt-4 border-t border-slate-200/70 dark:border-white/10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-8 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                <span>Personal Allergen Alert Profile (Tap to flag or exclude):</span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <label className="inline-flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={hideConflictingDishes}
                    onChange={(e) => setHideConflictingDishes(e.target.checked)}
                    className="rounded border-slate-600 text-amber-500 focus:ring-amber-500"
                  />
                  <span>Hide dishes matching my allergens</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={onlyVegetarian}
                    onChange={(e) => setOnlyVegetarian(e.target.checked)}
                    className="rounded border-slate-600 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span>Vegetarian Only</span>
                </label>
                <button
                  type="button"
                  onClick={() => setMaxCaloriesFilter((prev) => (prev === 580 ? null : 580))}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    maxCaloriesFilter === 580
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                      : 'border-slate-300 dark:border-white/15 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  ≤ 580 kcal Balanced Meal
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {ALL_ALLERGENS.map((alg) => {
                const isFlagged = userAllergens.includes(alg.id);
                return (
                  <button
                    key={alg.id}
                    type="button"
                    onClick={() => onToggleUserAllergen(alg.id)}
                    aria-pressed={isFlagged}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isFlagged
                        ? 'bg-red-500/15 border-red-500/50 text-red-600 dark:text-red-300 font-semibold'
                        : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-400'
                    }`}
                  >
                    {isFlagged && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                    <span>{alg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Calorie Tracking Progress Bar */}
          <div className="lg:col-span-4 bg-slate-50 dark:bg-[#0B0F17] border border-slate-200/80 dark:border-white/10 rounded-2xl p-4">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-500" />
                <span>Meal Calorie Tracker</span>
              </span>
              <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
                {currentCartCalories} / {dailyCalorieGoal} kcal ({caloriePct}%)
              </span>
            </div>
            <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  caloriePct > 100
                    ? 'bg-red-500'
                    : caloriePct >= 80
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, caloriePct)}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
              {caloriePct <= 100
                ? `${dailyCalorieGoal - currentCartCalories} kcal remaining within your daily nutrition goal.`
                : `${currentCartCalories - dailyCalorieGoal} kcal above your configured daily goal.`}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION-BASED 3D CULINARY SHOWCASE (ALL 19 SECTIONS WITH HIGH-CLARITY THUMBNAILS) */}
      <section aria-label="FUDORA Section-Based Culinary Catalog" className="space-y-6">
        {/* Culinary Section Explorer Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          {(
            [
              'Pasta',
              'Chicken Wings',
              'Full Roasted Chicken',
              'Salads',
              'Ice Cream & Faluda',
              'Fresh Juices & Shakes',
              'Oat Milks',
              'Healthy Muesli & Chia',
              'Desserts',
              'Burgers',
              'Buns',
              'Rice',
              'Koththu',
              'Parotas',
              'Chinese',
              'Italian',
              'Sandwiches',
              'Sides & Shares',
              'Beverages',
            ] as CulinaryCategory[]
          ).map((cat) => {
            const active = selectedCategory === cat;
            const dishSample = items.find((i) => i.category === cat);
            const count = items.filter((i) => i.category === cat).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(active ? 'All' : cat)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                  active
                    ? 'bg-amber-500/20 border-amber-500 shadow-lg shadow-amber-500/10'
                    : 'bg-white dark:bg-[#111622] border-slate-200/80 dark:border-white/10 hover:border-amber-500/40'
                }`}
              >
                {dishSample && (
                  <img
                    src={dishSample.thumbnailUrl}
                    alt={cat}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-xl object-cover shrink-0 border border-amber-500/30"
                  />
                )}
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {cat}
                  </div>
                  <div className="text-[10px] font-mono text-amber-500">
                    {count} {count === 1 ? 'Variety' : 'Varieties'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Section Header Banner + 3D Video Mode Controller */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/10">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-amber-500">
              {selectedCategory === 'All'
                ? `All Culinary Sections · 19 Categories · ${items.length} 3D Dishes`
                : `Culinary Section · ${selectedCategory}`}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
              {selectedCategory === 'All'
                ? `Signature 3D Culinary Collection (${filteredItems.length} Dishes)`
                : `${selectedCategory} (${filteredItems.length})`}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl mt-1 leading-relaxed">
              {selectedCategory === 'All'
                ? 'Featuring live 3D motion videos for Pasta, Chicken Wings, Full Roasted Chicken, Salads, Ice Cream & Faluda, Fresh Juices, Oat Milks, Healthy Muesli, Desserts, Burgers, Koththu & Parotas.'
                : SECTION_DESCRIPTIONS[selectedCategory] ||
                  'Prepared fresh to order and sealed in NFC-monitored thermal pods.'}
            </p>
          </div>

          {/* Global 3D Motion Video Mode Switcher */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="text-[11px] font-mono text-slate-400 mr-1">Section Display:</span>
            <button
              type="button"
              onClick={() => setShow3DVideosInGrid(true)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                show3DVideosInGrid
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:text-white border border-slate-200 dark:border-white/10'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>3D Videos (All Dishes)</span>
            </button>
            <button
              type="button"
              onClick={() => setShow3DVideosInGrid(false)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                !show3DVideosInGrid
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:text-white border border-slate-200 dark:border-white/10'
              }`}
            >
              <span>Photo Mode</span>
            </button>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="bg-white dark:bg-[#111622] border border-slate-200 dark:border-white/10 rounded-3xl p-12 text-center space-y-3">
            <p className="text-base font-semibold text-slate-800 dark:text-slate-200">
              No dishes match your active allergen or calorie filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
                setOnlyVegetarian(false);
                setMaxCaloriesFilter(null);
                setHideConflictingDishes(false);
              }}
              className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-semibold text-xs cursor-pointer"
            >
              Show All {items.length} Culinary Dishes
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => {
              const conflicts = detectAllergenConflicts(item.allergens, userAllergens);
              const isSelectedIn3D = selectedDish.id === item.id;
              const hasVideo = Boolean(item.videoUrl || FUDORA_VIDEO_URL);
              const isVideoPlaying = hasVideo && isDishVideoActive(item);

              const cardFlipKey = cardFlipCounts[item.id] || 0;
              const isCardPopped = isCard3DPopped(item.id);

              return (
                <article
                  key={item.id}
                  className={`group bg-gradient-to-b from-[#1A202C] to-[#111622] border-2 rounded-2xl overflow-visible flex flex-col justify-between transition-all duration-300 ${
                    isSelectedIn3D
                      ? 'border-amber-500 shadow-[0_22px_50px_rgba(245,158,11,0.2)]'
                      : 'border-slate-700/80 dark:border-white/15 hover:border-amber-500/60 shadow-[0_18px_40px_rgba(0,0,0,0.45)]'
                  }`}
                >
                  <div>
                    {/* 3D Slate Menu Page Header Strip on Every Card */}
                    <div className="px-3.5 py-2.5 bg-[#1F2635] border-b border-slate-600/40 rounded-t-2xl flex flex-wrap items-center justify-between gap-1.5 text-[10px] font-mono">
                      <span className="text-amber-300 font-bold tracking-widest uppercase flex items-center gap-1.5">
                        <BookOpen className="w-3 h-3 text-amber-400" />
                        3D POP-UP · {item.category.toUpperCase()}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => toggleCard3DPopped(item.id)}
                          className={`px-2 py-0.5 rounded font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                            isCardPopped
                              ? 'bg-amber-500 text-slate-950 shadow-sm'
                              : 'bg-slate-800 text-slate-300 hover:text-white border border-white/15'
                          }`}
                          title={isCardPopped ? 'Fold 3D Food Plate Flat onto Menu Page' : 'Pop Up 3D Food Plate'}
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>{isCardPopped ? '3D Popped ↑' : 'Folded Flat'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFlipCardInGrid(item)}
                          className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-400/40 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          title={`Flip 3D Slate Menu Page for ${item.name}`}
                        >
                          <RotateCw className="w-2.5 h-2.5" />
                          <span>Flip Page</span>
                        </button>
                        {hasVideo && (
                          <button
                            type="button"
                            onClick={() => toggleCardVideo(item.id)}
                            className={`px-2 py-0.5 rounded border font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                              isVideoPlaying
                                ? 'bg-amber-500/25 text-amber-300 border-amber-400/50'
                                : 'bg-slate-900 text-slate-300 border-white/15'
                            }`}
                            title={isVideoPlaying ? 'Switch to Still Photo' : 'Switch to 3D Motion Video'}
                          >
                            <Film className="w-2.5 h-2.5" />
                            <span>{isVideoPlaying ? 'Video' : 'Photo'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* True 3D Page-Flipping & Popping-Up Slate Dish Stage on Every Card */}
                    <div className="px-3 pt-4 pb-2 bg-gradient-to-b from-[#232B3A] via-[#181F2C] to-[#111622] relative overflow-visible">
                      <PopUp3DCardStage
                        dish={item}
                        isPopped={isCardPopped}
                        flipTriggerKey={cardFlipKey}
                        showVideo={isVideoPlaying}
                        compact
                        onClickStage={() => setPoppingUpDish(item)}
                      />
                    </div>

                    {/* Card Body */}
                    <div className="p-5 space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                        <span className="uppercase tracking-wider text-amber-400 font-semibold font-sans">
                          {item.category} · {item.prepTimeMinutes}m
                        </span>
                        <span className="text-slate-300">
                          {item.calories} kcal · {item.proteinGrams}g P · ★ {item.rating}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {item.name}
                        </h3>
                        <span className="text-[15px] font-bold font-mono tabular-nums text-amber-500 shrink-0">
                          LKR {item.priceInr}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                        {item.subtitle}
                      </p>

                      {/* Unboxed Allergen Metadata */}
                      <div className="pt-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          Allergens:{' '}
                        </span>
                        {item.allergens.length === 0 ? (
                          <span className="text-emerald-500">Allergen-Free Formula</span>
                        ) : (
                          <span>{item.allergens.join(' · ')}</span>
                        )}
                      </div>

                      {conflicts.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/25 rounded-xl px-3 py-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>Alert: Contains {conflicts.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="px-5 pb-5 pt-2 flex flex-wrap sm:flex-nowrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onAddToCart(item)}
                      className="flex-1 min-h-[44px] py-2 px-3 rounded-xl bg-slate-900 dark:bg-amber-500 hover:bg-slate-800 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add · LKR {item.priceInr}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPoppingUpDish(item)}
                      className="min-h-[44px] px-2.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500 hover:text-slate-950 text-amber-300 border border-amber-500/50 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-sm"
                      title={`Open 3D Pop-Up Menu for ${item.name}`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>3D Pop-Up</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInspect360(item)}
                      className="min-h-[44px] px-2.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500 hover:text-slate-950 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      title={`Inspect ${item.name} in 360° 3D WebGL Studio`}
                    >
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      <span>360° 3D</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCinemaModalDish(item)}
                      className="min-h-[44px] px-2.5 py-2 rounded-xl border border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-300 hover:text-white hover:border-amber-500/50 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      title="Watch HD 3D Video"
                    >
                      <Film className="w-3.5 h-3.5 text-amber-500" />
                      <span>3D Video</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedShareDish(item)}
                      className="min-h-[44px] px-2.5 py-2 rounded-xl border border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-300 hover:text-amber-400 hover:border-amber-500/50 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      title={`Share ${item.name} 3D Preview on Social Media`}
                      aria-label={`Share ${item.name} 3D Preview on Social Media`}
                    >
                      <Share2 className="w-3.5 h-3.5 text-amber-500" />
                      <span>Share</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* EXPANDED 3D CULINARY CINEMA MODAL */}
      <AnimatePresence>
        {cinemaModalDish && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
            onClick={() => setCinemaModalDish(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0D121D] border-2 border-amber-500/40 rounded-3xl max-w-3xl w-full overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,0.85)] flex flex-col"
            >
              {/* Modal Top Bar */}
              <div className="flex items-center justify-between px-5 py-3.5 bg-[#121826] border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-mono font-bold tracking-wider text-amber-300">
                    FUDORA 3D CULINARY CINEMA · {cinemaModalDish.category.toUpperCase()}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCinemaModalDish(null)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* HD 3D Video Viewport */}
              <div className="aspect-[16/9] w-full bg-black relative overflow-hidden">
                <video
                  src={cinemaModalDish.videoUrl || FUDORA_VIDEO_URL}
                  autoPlay
                  loop
                  muted
                  controls
                  playsInline
                  className="w-full h-full object-cover object-center"
                />
                <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
                  <span className="px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-md border border-amber-500/40 text-[10px] font-mono font-bold text-amber-300">
                    3D DISH VIDEO · {cinemaModalDish.popUpElevationLabel}
                  </span>
                </div>
              </div>

              {/* Modal Dish Telemetry & Quick Add */}
              <div className="p-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-mono text-amber-400">
                      {cinemaModalDish.category} · {cinemaModalDish.popUpElevationLabel}
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-white mt-0.5">
                      {cinemaModalDish.name}
                    </h3>
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-amber-400">
                    LKR {cinemaModalDish.priceInr}
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {cinemaModalDish.subtitle}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-white/5 rounded-2xl border border-white/10 text-xs font-mono tabular-nums">
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase">Calories</div>
                    <div className="font-bold text-white text-sm">{cinemaModalDish.calories} kcal</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase">Protein</div>
                    <div className="font-bold text-white text-sm">{cinemaModalDish.proteinGrams}g</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase">Thermal Hold</div>
                    <div className="font-bold text-emerald-400 text-sm">
                      {cinemaModalDish.idealTempRangeC[0]}°C–{cinemaModalDish.idealTempRangeC[1]}°C
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase">Prep Time</div>
                    <div className="font-bold text-amber-400 text-sm">{cinemaModalDish.prepTimeMinutes} mins</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onAddToCart(cinemaModalDish);
                      setCinemaModalDish(null);
                    }}
                    className="flex-1 min-h-[46px] py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-transform active:scale-[0.98] cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add to Order · LKR {cinemaModalDish.priceInr}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleSelectDishFor3D(cinemaModalDish);
                      setCinemaModalDish(null);
                    }}
                    className="min-h-[46px] px-4 py-2.5 rounded-xl border border-white/20 hover:bg-white/10 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Load into 3D Stage
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedShareDish(cinemaModalDish);
                    }}
                    className="min-h-[46px] px-3.5 py-2.5 rounded-xl border border-amber-500/40 hover:bg-amber-500/15 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Share 3D Dish on Social Media"
                  >
                    <Share2 className="w-4 h-4 text-amber-400" />
                    <span>Share 3D</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Social Media 3D Dish Share Modal */}
      <ShareDishModal
        isOpen={selectedShareDish !== null}
        onClose={() => setSelectedShareDish(null)}
        dish={selectedShareDish}
        onTriggerPushAlert={onTriggerPushAlert}
      />

      {/* 3D Popping Up Menu Folio Modal for all food items */}
      <PoppingUp3DMenuModal
        dish={poppingUpDish}
        allItems={items}
        userAllergens={userAllergens}
        isOpen={Boolean(poppingUpDish)}
        onClose={() => setPoppingUpDish(null)}
        onSelectDish={(dish) => {
          setPoppingUpDish(dish);
          setSelectedDish(dish);
        }}
        onAddToCart={(dish, quantity = 1) => {
          for (let i = 0; i < quantity; i++) {
            onAddToCart(dish);
          }
        }}
        onInspect360={(dish) => {
          handleInspect360(dish);
          setPoppingUpDish(null);
        }}
        onShareDish={(dish) => {
          setSelectedShareDish(dish);
        }}
      />
    </div>
  );
};
