import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  Play,
  Pause,
  Lock,
  Mail,
  User as UserIcon,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  Utensils,
  Flame,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import { FUDORA_VIDEO_URL } from '../data/vexmoData';
import {
  authenticateFudoraUser,
  type MenuItem,
  type CulinaryCategory,
  type FudoraUserSession,
} from '../utils/deliveryLogic';
import { PopUpSlateMenuBook } from './PopUpSlateMenuBook';

interface FudoraLoginViewProps {
  items: MenuItem[];
  currentSession: FudoraUserSession | null;
  onAuthenticated: (session: FudoraUserSession) => void;
  onSignOut: () => void;
  onExploreMenuBook: (dish?: MenuItem) => void;
  onTriggerPushAlert: (title: string, body: string) => void;
}

const FAVORITE_SECTIONS: CulinaryCategory[] = [
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
  'Koththu',
  'Rice',
];

const DEMO_MEMBER_PASSES: {
  id: string;
  name: string;
  email: string;
  tierLabel: string;
  favoriteSection: CulinaryCategory;
  subtitle: string;
}[] = [
  {
    id: 'fudora-vip-ananya',
    name: 'Ananya Senanayake',
    email: 'ananya.senanayake@fudora.app',
    tierLabel: 'FUDORA Gold Culinary Member · 496 Pts',
    favoriteSection: 'Pasta',
    subtitle: 'Instant VIP Diner Pass · Saved Allergen & Thermal Prefs',
  },
  {
    id: 'fudora-chef-chaminda',
    name: 'Chef Chaminda Bandara',
    email: 'chaminda.bandara@fudora.app',
    tierLabel: 'FUDORA Executive Culinary Studio · Colombo',
    favoriteSection: 'Full Roasted Chicken',
    subtitle: 'Culinary QA & 3D Menu Book Curator Pass',
  },
];

export const FudoraLoginView: React.FC<FudoraLoginViewProps> = ({
  items,
  currentSession,
  onAuthenticated,
  onSignOut,
  onExploreMenuBook,
  onTriggerPushAlert,
}) => {
  // Interactive 3D FUDORA Menu Book State
  const [isBookOpen, setIsBookOpen] = useState<boolean>(true);
  const [activeDish, setActiveDish] = useState<MenuItem>(items[0]);
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Auth Form State
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [fullName, setFullName] = useState<string>('Ananya Krishnan');
  const [email, setEmail] = useState<string>('ananya.krishnan@fudora.app');
  const [password, setPassword] = useState<string>('fudora2026');
  const [favoriteSection, setFavoriteSection] = useState<CulinaryCategory>('Pasta');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const featuredMenuBookDishes = items;

  const handleSelectMenuBookChapter = (dish: MenuItem) => {
    setActiveDish(dish);
    setIsBookOpen(true);
    if (videoRef.current) {
      const targetSrc = dish.videoUrl || FUDORA_VIDEO_URL;
      if (videoRef.current.src !== targetSrc && !videoRef.current.src.endsWith(targetSrc)) {
        videoRef.current.src = targetSrc;
        videoRef.current.load();
      }
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
      setIsVideoPlaying(true);
    }
  };

  const handleToggleVideo = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setIsVideoPlaying(true);
    } else {
      videoRef.current.pause();
      setIsVideoPlaying(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const result = authenticateFudoraUser({
      mode: authMode,
      email,
      password,
      name: fullName,
      favoriteSection,
    });

    if (!result.ok || !result.session) {
      setFormError(result.error ?? 'Unable to sign in. Please verify your credentials.');
      return;
    }

    onAuthenticated(result.session);
  };

  const handleOneTapPass = (pass: (typeof DEMO_MEMBER_PASSES)[number]) => {
    setFormError(null);
    onAuthenticated({
      id: pass.id,
      name: pass.name,
      email: pass.email,
      tierLabel: pass.tierLabel,
      favoriteSection: pass.favoriteSection,
      authMethod: 'demo-pass',
      signedInAt: 'Just now',
    });
  };

  const handleGoogleLogin = async () => {
    setFormError(null);
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const user = cred.user;
      onAuthenticated({
        id: user.uid,
        name: user.displayName || 'FUDORA Google Member',
        email: user.email || 'member@fudora.app',
        tierLabel: 'FUDORA Verified Google Member',
        favoriteSection,
        authMethod: 'google',
        signedInAt: 'Just now',
      });
    } catch {
      onTriggerPushAlert(
        'FUDORA Google Sign-In',
        'Google popup was closed or blocked in preview. Use the FUDORA Member Sign-In form or One-Tap VIP Pass.'
      );
    }
  };

  return (
    <section
      aria-label="FUDORA Creative 3D Menu Book Login & Member Portal"
      className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch bg-white dark:bg-[#111622] border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 lg:p-8 shadow-[0_24px_60px_rgba(0,0,0,0.4)]"
    >
      {/* LEFT 7 COLS: CREATIVE 3D "FUDORA" POP-UP MENU BOOK & ANIMATED VIDEO STAGE */}
      <div
        data-testid="fudora-login-menu-book-stage"
        className="lg:col-span-7 flex flex-col justify-between bg-[#080B12] border border-amber-500/30 rounded-2xl overflow-hidden relative min-h-[540px] p-5 sm:p-6 shadow-2xl"
      >
        {/* Top Menu Book Header & 3D Cover Flip Control */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div>
            <div className="text-xs font-mono tracking-widest text-amber-400 font-semibold">
              FUDORA · INTERACTIVE 3D MENU BOOK
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white mt-0.5">
              FUDORA Pop-Up Culinary Menu Book & Live HD Video Reel
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="toggle-fudora-book-cover-btn"
              onClick={() => setIsBookOpen((prev) => !prev)}
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{isBookOpen ? 'View FUDORA Book Cover' : 'Open FUDORA Menu Book'}</span>
            </button>
          </div>
        </div>

        {/* Center 3D Menu Book Presentation (Flips between Embossed FUDORA Cover & Open Video Menu Book) */}
        <div className="relative z-10 my-auto py-4">
          <AnimatePresence mode="wait">
            {!isBookOpen ? (
              /* CLOSED EMBOSSED 3D "FUDORA" MENU BOOK COVER */
              <motion.div
                key="fudora-closed-cover"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="max-w-md mx-auto rounded-2xl bg-gradient-to-br from-[#1C1613] via-[#121622] to-[#0B0E17] border-2 border-amber-500/50 p-7 shadow-[0_25px_60px_rgba(0,0,0,0.75)] relative overflow-hidden"
              >
                {/* Book Spine & Gold Foil Frame */}
                <div className="border border-amber-400/35 rounded-xl p-6 text-center space-y-5 relative">
                  <div className="text-[11px] font-mono tracking-[0.25em] text-amber-400/90">
                    EST. 2026 · SPATIAL CULINARY EDITION
                  </div>

                  <div className="space-y-1">
                    <div
                      data-testid="fudora-book-cover-title"
                      className="text-4xl sm:text-5xl font-bold tracking-tight text-amber-400 font-display"
                    >
                      FUDORA
                    </div>
                    <div className="text-xs font-mono tracking-[0.2em] text-slate-300">
                      THE 3D POP-UP MENU BOOK
                    </div>
                  </div>

                  <div className="aspect-[16/10] rounded-xl overflow-hidden border border-amber-500/40 relative bg-black">
                    <img
                      src={activeDish.thumbnailUrl}
                      alt={activeDish.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="text-xs text-slate-300 leading-relaxed">
                    Pasta · Chicken Wings · Full Roasted Chicken · Salads · Faluda & Ice Cream · Fresh Juices & Milkshakes · Oat Milks · Muesli & Chia · Desserts
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsBookOpen(true)}
                    className="w-full min-h-[42px] py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Open FUDORA Menu Book</span>
                  </button>
                </div>
              </motion.div>
            ) : (
              /* OPEN 3D "FUDORA" SLATE MENU BOOK SPREAD WITH 3D POPPING-UP DISHES */
              <motion.div
                key="fudora-open-book-spread"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="w-full"
              >
                <PopUpSlateMenuBook
                  items={featuredMenuBookDishes}
                  selectedDish={activeDish}
                  onSelectDish={handleSelectMenuBookChapter}
                  onInspect360={(dish) => onExploreMenuBook(dish)}
                  compact
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Footnote Strip */}
        <div className="relative z-10 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Utensils className="w-3.5 h-3.5 text-amber-400" />
            <span>FUDORA 3D Menu Book · {items.length} Interactive Pop-Up Dishes · 19 Sections</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-300">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Real-Time Thermal Pod Telemetry & Allergen Guardrails</span>
          </div>
        </div>
      </div>

      {/* RIGHT 5 COLS: CREATIVE MODERN FUDORA LOGIN & MEMBER ACCESS CARD */}
      <div className="lg:col-span-5 flex flex-col justify-between bg-white/85 dark:bg-[#0B0F17]/90 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 rounded-2xl p-6 space-y-6 shadow-xl">
        <div className="space-y-5">
          {/* Brand Header */}
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-500">
                FUDORA Culinary Club · Member Gateway
              </div>
              <h1
                data-testid="fudora-login-heading"
                className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-0.5 font-display"
              >
                Welcome to FUDORA
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Sign in to unlock your personalized FUDORA 3D Menu Book, live thermal courier tracking, and loyalty rewards.
              </p>
            </div>

            {currentSession && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-xs font-semibold shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Signed In</span>
              </span>
            )}
          </div>

          {/* Active Session Banner if already signed in */}
          {currentSession && (
            <div
              data-testid="fudora-active-session-card"
              className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-emerald-500">
                    {currentSession.tierLabel}
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    {currentSession.name} ({currentSession.email})
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onSignOut}
                  className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => onExploreMenuBook(activeDish)}
                className="w-full min-h-[42px] py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>Continue to FUDORA 3D Menu Book</span>
              </button>
            </div>
          )}

          {/* Segmented Mode Switcher: Sign In vs Create Account */}
          <div
            role="tablist"
            aria-label="FUDORA Authentication Mode"
            className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-[#111622] rounded-xl border border-slate-200 dark:border-white/10"
          >
            <button
              type="button"
              role="tab"
              aria-selected={authMode === 'signin'}
              onClick={() => {
                setAuthMode('signin');
                setFormError(null);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                authMode === 'signin'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Member Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={authMode === 'signup'}
              onClick={() => {
                setAuthMode('signup');
                setFormError(null);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                authMode === 'signup'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Create FUDORA Account
            </button>
          </div>

          {/* Email & Passcode Login Form */}
          <form onSubmit={handleFormSubmit} className="space-y-3.5" noValidate>
            {authMode === 'signup' && (
              <div>
                <label
                  htmlFor="fudora-login-name"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="fudora-login-name"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-white/10 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="fudora-login-email"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                FUDORA Member Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="fudora-login-email"
                  data-testid="fudora-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ananya.krishnan@fudora.app"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-white/10 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="fudora-login-password"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Passcode
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="fudora-login-password"
                  data-testid="fudora-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-white/10 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide passcode' : 'Show passcode'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Preferred Menu Book Section Selector */}
            <div>
              <span className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Preferred FUDORA Menu Book Section:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {FAVORITE_SECTIONS.map((sec) => {
                  const active = favoriteSection === sec;
                  return (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setFavoriteSection(sec)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        active
                          ? 'bg-amber-500 text-slate-950 font-semibold'
                          : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                      }`}
                    >
                      {sec}
                    </button>
                  );
                })}
              </div>
            </div>

            {formError && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-300 font-medium"
              >
                {formError}
              </div>
            )}

            <button
              type="submit"
              data-testid="fudora-submit-login-btn"
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-transform active:scale-[0.99] cursor-pointer whitespace-nowrap"
            >
              <span>
                {authMode === 'signin'
                  ? 'Sign In & Open FUDORA Menu Book'
                  : 'Create Account & Open FUDORA Menu Book'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Instant One-Tap Demo Passes & Google Auth */}
          <div className="pt-3 border-t border-slate-200 dark:border-white/10 space-y-2.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Instant One-Tap FUDORA Member Passes
            </div>

            <div className="grid grid-cols-1 gap-2">
              {DEMO_MEMBER_PASSES.map((pass) => (
                <button
                  key={pass.id}
                  type="button"
                  data-testid={`fudora-demo-pass-${pass.id}`}
                  onClick={() => handleOneTapPass(pass)}
                  className="w-full p-2.5 rounded-xl bg-slate-100/90 dark:bg-[#111622] hover:border-amber-500/50 border border-slate-200/80 dark:border-white/10 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {pass.name} · <span className="text-amber-500">{pass.favoriteSection}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {pass.subtitle}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-500 text-[11px] font-semibold shrink-0">
                    1-Tap Sign In
                  </span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full min-h-[40px] py-2 px-4 rounded-xl bg-slate-900 dark:bg-white/10 hover:bg-slate-800 dark:hover:bg-white/15 border border-slate-700 dark:border-white/15 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Continue with Google Account</span>
            </button>
          </div>
        </div>

        {/* Footer Action to Browse 3D Menu Book Directly */}
        <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400">
            Want to preview the 3D dishes first?
          </span>
          <button
            type="button"
            onClick={() => onExploreMenuBook(activeDish)}
            className="text-amber-500 hover:text-amber-400 font-semibold underline cursor-pointer"
          >
            Browse FUDORA Menu Book
          </button>
        </div>
      </div>
    </section>
  );
};
