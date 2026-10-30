import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Sparkles,
  Loader2,
} from 'lucide-react';
import {
  SignedIn,
  SignedOut,
  SignIn,
  SignUp,
  SignInButton,
  SignUpButton,
  SignOutButton,
  UserButton,
  useUser,
  useClerk,
  useSignIn,
} from '@clerk/clerk-react';
import { AppRole, EntryStage, LiveGeoState } from '../types/appTypes';

interface OtpAuthBannerModalProps {
  entryStage: EntryStage;
  verifiedPhone: string;
  liveGeo: LiveGeoState;
  onPhoneVerified: (phone: string, email?: string) => void;
  onSelectRole: (role: AppRole) => void;
  onChangePhone: () => void;
}

interface LoginSlide {
  id: string;
  alt: string;
  imageUrl: string;
}

const TRENCH_LOGIN_SLIDES: LoginSlide[] = [
  {
    id: 'slide-1',
    alt: 'At your doorstep.',
    imageUrl: '/assets/aistudio/slide_doorstep.png',
  },
  {
    id: 'slide-2',
    alt: 'On time. Always.',
    imageUrl: '/assets/aistudio/slide_ontime.svg',
  },
  {
    id: 'slide-3',
    alt: 'Looks good on you.',
    imageUrl: '/assets/aistudio/slide_suit.png',
  },
  {
    id: 'slide-4',
    alt: 'Tailoring, made simple.',
    imageUrl: '/assets/aistudio/slide_tailoring.png',
  },
  {
    id: 'slide-5',
    alt: 'Choose Your Fit',
    imageUrl: '/assets/aistudio/slide_choose_fit.svg',
  },
  {
    id: 'slide-6',
    alt: 'Premium fabrics.',
    imageUrl: '/assets/aistudio/slide_fabrics.svg',
  },
];

export const OtpAuthScreen: React.FC<OtpAuthBannerModalProps> = ({
  entryStage,
  verifiedPhone,
  onPhoneVerified,
  onSelectRole,
  onChangePhone,
}) => {
  const { isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const { isLoaded: isSignInLoaded, signIn, setActive } = useSignIn();

  const [clerkAuthMode, setClerkAuthMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [isInstantSigningIn, setIsInstantSigningIn] = useState(false);
  const [copiedField, setCopiedField] = useState<'email' | 'password' | null>(null);
  const [ticketError, setTicketError] = useState<string | null>(null);

  const [activeSlide, setActiveSlide] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // Sliding Login Sheet state
  const [isSheetCollapsed, setIsSheetCollapsed] = useState(false);
  const [sheetTouchStartY, setSheetTouchStartY] = useState<number | null>(null);
  const [sheetDragY, setSheetDragY] = useState(0);

  // Image Controls
  const [imageFit] = useState<'contain' | 'fill' | 'cover'>('contain');
  const [imageZoom, setImageZoom] = useState<number>(1);
  const [imagePan, setImagePan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [dragOrigin, setDragOrigin] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Sync Clerk hash mode switches so clicking "Sign up" or "Sign in" inside Clerk stays embedded
  useEffect(() => {
    const onSwitchMode = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === 'sign-up' || detail === 'sign-in') {
        setClerkAuthMode(detail);
      }
    };
    const onHashChange = () => {
      if (window.location.hash.includes('sign-up')) {
        setClerkAuthMode('sign-up');
      } else if (window.location.hash.includes('sign-in')) {
        setClerkAuthMode('sign-in');
      }
    };
    window.addEventListener('clerk-switch-mode', onSwitchMode);
    window.addEventListener('hashchange', onHashChange);
    return () => {
      window.removeEventListener('clerk-switch-mode', onSwitchMode);
      window.removeEventListener('hashchange', onHashChange);
    };
  }, []);

  // Automatically sync Clerk authenticated user into Trench session & move to Role Selection
  useEffect(() => {
    if (isSignedIn && user && entryStage === 'phone_otp') {
      const primaryEmail = user.primaryEmailAddress?.emailAddress;
      const primaryPhone = user.primaryPhoneNumber?.phoneNumber;
      const identity =
        primaryPhone ||
        primaryEmail ||
        user.username ||
        user.fullName ||
        user.id;
      onPhoneVerified(identity, primaryEmail);
    }
  }, [isSignedIn, user, entryStage, onPhoneVerified]);

  // Auto-advance carousel slides every 4 seconds
  useEffect(() => {
    if (entryStage !== 'phone_otp' || imageZoom !== 1 || isDraggingImage) return;
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % TRENCH_LOGIN_SLIDES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [entryStage, imageZoom, isDraggingImage]);

  // 1-Click Demo Sign-In on First Sign-In Screen
  const handleInstantClerkSignIn = async () => {
    setTicketError(null);
    setIsInstantSigningIn(true);
    try {
      const resp = await fetch('/api/auth/clerk-demo-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await resp.json();
      if (resp.ok && data?.ticket && isSignInLoaded && signIn && setActive) {
        const signInAttempt = await signIn.create({
          strategy: 'ticket',
          ticket: data.ticket,
        });
        if (signInAttempt.status === 'complete' && signInAttempt.createdSessionId) {
          await setActive({ session: signInAttempt.createdSessionId });
          onPhoneVerified(data.email || '+91 98765 43210', data.email);
          setIsInstantSigningIn(false);
          return;
        }
      }
      onPhoneVerified(
        data?.email || '+91 98765 43210',
        data?.email || 'partner@trench.in'
      );
    } catch {
      onPhoneVerified('+91 98765 43210', 'partner@trench.in');
    } finally {
      setIsInstantSigningIn(false);
    }
  };

  const handleCopyText = (text: string, field: 'email' | 'password') => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    } catch {}
  };

  const handleResetImageAdjust = () => {
    setImageZoom(1);
    setImagePan({ x: 0, y: 0 });
  };

  const handlePrevSlide = () => {
    handleResetImageAdjust();
    setActiveSlide((prev) =>
      prev === 0 ? TRENCH_LOGIN_SLIDES.length - 1 : prev - 1
    );
  };

  const handleNextSlide = () => {
    handleResetImageAdjust();
    setActiveSlide((prev) => (prev + 1) % TRENCH_LOGIN_SLIDES.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (imageZoom > 1) {
      setIsDraggingImage(true);
      setDragOrigin({
        x: e.touches[0].clientX - imagePan.x,
        y: e.touches[0].clientY - imagePan.y,
      });
      return;
    }
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDraggingImage && imageZoom > 1) {
      setImagePan({
        x: e.touches[0].clientX - dragOrigin.x,
        y: e.touches[0].clientY - dragOrigin.y,
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isDraggingImage) {
      setIsDraggingImage(false);
      return;
    }
    if (touchStartX === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    if (deltaX > 40) {
      handlePrevSlide();
    } else if (deltaX < -40) {
      handleNextSlide();
    }
    setTouchStartX(null);
  };

  const handleMouseDownImage = (e: React.MouseEvent) => {
    if (imageZoom <= 1 && imageFit !== 'cover') return;
    setIsDraggingImage(true);
    setDragOrigin({
      x: e.clientX - imagePan.x,
      y: e.clientY - imagePan.y,
    });
  };

  const handleMouseMoveImage = (e: React.MouseEvent) => {
    if (!isDraggingImage) return;
    setImagePan({
      x: e.clientX - dragOrigin.x,
      y: e.clientY - dragOrigin.y,
    });
  };

  const handleMouseUpImage = () => {
    setIsDraggingImage(false);
  };

  const handleSheetTouchStart = (e: React.TouchEvent) => {
    setSheetTouchStartY(e.touches[0].clientY);
  };

  const handleSheetTouchMove = (e: React.TouchEvent) => {
    if (sheetTouchStartY === null) return;
    const deltaY = e.touches[0].clientY - sheetTouchStartY;
    if (!isSheetCollapsed && deltaY > 0) {
      setSheetDragY(deltaY);
    } else if (isSheetCollapsed && deltaY < 0) {
      setSheetDragY(deltaY);
    }
  };

  const handleSheetTouchEnd = (e: React.TouchEvent) => {
    if (sheetTouchStartY === null) return;
    const deltaY = e.changedTouches[0].clientY - sheetTouchStartY;
    if (!isSheetCollapsed && deltaY > 45) {
      setIsSheetCollapsed(true);
    } else if (isSheetCollapsed && deltaY < -45) {
      setIsSheetCollapsed(false);
    }
    setSheetTouchStartY(null);
    setSheetDragY(0);
  };

  const handleClerkSignOutAndBack = async () => {
    try {
      await signOut();
    } catch {}
    onChangePhone();
  };

  // PORTAL 2: Role Selection Portal (Original Old Theme + Clerk UserButton & SignOut)
  if (entryStage === 'choose_role') {
    return (
      <div className="max-w-3xl mx-auto my-auto w-full">
        <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-xs">
          <div className="relative flex items-center justify-between gap-3 pb-2.5 sm:pb-3 border-b border-slate-100">
            <button
              type="button"
              onClick={onChangePhone}
              className="min-h-[34px] sm:min-h-[36px] px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-white bg-slate-100 hover:bg-[#000080] rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
              <span>Back</span>
            </button>

            <h1 className="text-base sm:text-xl md:text-2xl font-black text-slate-900 text-center tracking-tight leading-tight truncate px-1">
              Choose Your trench Partner Portal
            </h1>

            <div className="flex items-center gap-2 shrink-0">
              <SignedIn>
                <UserButton />
              </SignedIn>
              <button
                type="button"
                onClick={handleClerkSignOutAndBack}
                className="min-h-[34px] sm:min-h-[36px] px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-white bg-slate-100 hover:bg-[#000080] rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Sign Out
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-stretch">
            {/* Option 1: Delivery & Measurement Partner */}
            <div className="relative h-[225px] sm:h-[370px] md:h-[400px] max-h-[calc(100dvh-165px)] rounded-2xl border-2 border-slate-200 hover:border-[#000080] bg-[#FAF6EE] bg-[url('/assets/aistudio/image_0ef4790a.png')] bg-contain bg-top bg-no-repeat overflow-hidden p-3.5 sm:p-4 flex flex-col justify-end transition-all">
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/45 to-transparent pointer-events-none" />

              <div className="relative z-10 mt-auto">
                <h2 className="text-base sm:text-xl font-extrabold text-white leading-tight tracking-tight drop-shadow-md">
                  Delivery &amp; Measurement Partner
                </h2>

                <button
                  type="button"
                  data-testid="choose-role-delivery"
                  onClick={() => onSelectRole('delivery')}
                  className="mt-2 sm:mt-2.5 w-full min-h-[38px] sm:min-h-[42px] py-2 px-4 text-xs sm:text-sm font-bold text-white bg-[#000080] hover:bg-[#000066] active:scale-[0.99] rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <span>Choose Delivery Partner</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>
              </div>
            </div>

            {/* Option 2: Tailor Partner */}
            <div className="relative h-[225px] sm:h-[370px] md:h-[400px] max-h-[calc(100dvh-165px)] rounded-2xl border-2 border-slate-200 hover:border-[#000080] bg-[#FAF6EE] bg-[url('/assets/aistudio/image_a8ea31ca.png')] bg-contain bg-top bg-no-repeat overflow-hidden p-3.5 sm:p-4 flex flex-col justify-end transition-all">
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/45 to-transparent pointer-events-none" />

              <div className="relative z-10 mt-auto">
                <h2 className="text-base sm:text-xl font-extrabold text-white leading-tight tracking-tight drop-shadow-md">
                  Tailor Partner
                </h2>

                <button
                  type="button"
                  data-testid="choose-role-tailor"
                  onClick={() => onSelectRole('tailor')}
                  className="mt-2 sm:mt-2.5 w-full min-h-[38px] sm:min-h-[42px] py-2 px-4 text-xs sm:text-sm font-bold text-white bg-[#000080] hover:bg-[#000066] active:scale-[0.99] rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <span>Choose Tailor Partner</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PORTAL 1: trench Starting Login Page — Old Theme Hero Carousel + Embedded Inline Clerk <SignIn routing="hash" />
  return (
    <div className="relative w-full min-h-[calc(100dvh-2rem)] max-w-full sm:max-w-[460px] mx-auto bg-[#041126] sm:rounded-[28px] overflow-hidden sm:shadow-xl sm:border sm:border-slate-200/80 flex flex-col justify-between">
      {/* Dynamic Adjustable Hero Section */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDownImage}
        onMouseMove={handleMouseMoveImage}
        onMouseUp={handleMouseUpImage}
        onMouseLeave={handleMouseUpImage}
        className={`relative w-full bg-[#041126] overflow-hidden select-none z-10 transition-all duration-300 ${
          isSheetCollapsed ? 'flex-1 min-h-[420px]' : 'h-[195px] sm:h-[215px] shrink-0'
        }`}
      >
        <div className="relative w-full h-full overflow-hidden">
          <div
            className="flex w-full h-full transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${activeSlide * 100}%)` }}
          >
            {TRENCH_LOGIN_SLIDES.map((slide) => (
              <div
                key={slide.id}
                className="w-full h-full min-h-0 shrink-0 relative overflow-hidden flex items-center justify-center bg-[#041126]"
              >
                <img
                  src={slide.imageUrl}
                  alt={slide.alt}
                  draggable={false}
                  style={{
                    transform: `translate(${imagePan.x}px, ${imagePan.y}px) scale(${imageZoom})`,
                  }}
                  className={`w-full h-full transition-transform ${
                    isDraggingImage ? 'duration-0 cursor-grabbing' : 'duration-300'
                  } ${
                    imageZoom > 1 ? 'cursor-grab' : ''
                  } ${
                    imageFit === 'contain'
                      ? 'object-contain object-center'
                      : imageFit === 'fill'
                      ? 'object-fill object-center'
                      : 'object-cover object-top'
                  }`}
                />
              </div>
            ))}
          </div>

          {/* Left / Right Slide Arrow Controls */}
          <button
            type="button"
            aria-label="Previous slide"
            onClick={handlePrevSlide}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/45 hover:bg-black/70 text-white flex items-center justify-center border border-white/20 transition-all duration-300 cursor-pointer z-20"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={handleNextSlide}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/45 hover:bg-black/70 text-white flex items-center justify-center border border-white/20 transition-all duration-300 cursor-pointer z-20"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Carousel Pagination Dots */}
          <div className="absolute left-0 right-0 bottom-3 flex items-center justify-center gap-2 z-20 transition-all duration-300">
            {TRENCH_LOGIN_SLIDES.map((slide, dotIdx) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`Go to slide ${dotIdx + 1}`}
                onClick={() => {
                  handleResetImageAdjust();
                  setActiveSlide(dotIdx);
                }}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  activeSlide === dotIdx
                    ? 'w-5 bg-[#000080] ring-1 ring-white/70'
                    : 'w-1.5 bg-white/60 hover:bg-white/90'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Sliding Bottom White Sheet — Embedded Clerk Authentication Only */}
      <div
        style={{
          transform:
            sheetDragY !== 0
              ? `translateY(${isSheetCollapsed ? Math.min(0, sheetDragY) : Math.max(0, sheetDragY)}px)`
              : undefined,
        }}
        className={`relative z-30 flex-1 bg-white rounded-t-[24px] shadow-[0_-10px_35px_rgba(0,0,0,0.35)] px-3 sm:px-5 pt-2 ${
          isSheetCollapsed ? 'pb-2 flex-initial' : 'pb-4'
        } flex flex-col justify-between transition-all duration-300 ease-out`}
      >
        <div className="w-full">
          {/* Interactive Slide Handle + Header Bar */}
          <div
            role="button"
            tabIndex={0}
            aria-expanded={!isSheetCollapsed}
            aria-label={
              isSheetCollapsed
                ? 'Slide up to sign in with Clerk'
                : 'Slide down to view full screen'
            }
            onTouchStart={handleSheetTouchStart}
            onTouchMove={handleSheetTouchMove}
            onTouchEnd={handleSheetTouchEnd}
            onClick={() => setIsSheetCollapsed((prev) => !prev)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsSheetCollapsed((prev) => !prev);
              }
            }}
            className="w-full pt-0.5 pb-2 cursor-grab active:cursor-grabbing select-none"
          >
            <div className="w-10 h-1 rounded-full bg-slate-300 mx-auto mb-2" />
            <div className="flex items-center gap-3">
              <div className="h-px bg-slate-200 flex-1" />
              <div className="flex items-center gap-1.5">
                <h2 className="text-center text-[14px] sm:text-[15px] font-semibold text-[#545863] whitespace-nowrap">
                  Clerk Authentication
                </h2>
                {isSheetCollapsed ? (
                  <ChevronUp className="w-4 h-4 text-[#000080] animate-bounce" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
              <div className="h-px bg-slate-200 flex-1" />
            </div>
          </div>

          {/* Collapsible Direct Clerk Auth Body */}
          <div
            className={`transition-all duration-300 ease-out overflow-y-auto ${
              isSheetCollapsed
                ? 'max-h-0 opacity-0 pointer-events-none'
                : 'max-h-[680px] opacity-100'
            }`}
          >
            <SignedOut>
              <div className="w-full flex flex-col items-center justify-center py-2 space-y-3">
                <button
                  type="button"
                  data-testid="demo-signin-btn"
                  onClick={handleInstantClerkSignIn}
                  disabled={isInstantSigningIn}
                  className="w-full max-w-[380px] min-h-[44px] py-2.5 px-4 rounded-xl bg-[#000080] hover:bg-[#000066] active:scale-[0.99] text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                >
                  {isInstantSigningIn ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>1-Click Demo Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                <SignIn routing="hash" />
              </div>
            </SignedOut>

            <SignedIn>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3 my-2">
                <div className="flex items-center justify-center gap-2.5">
                  <UserButton />
                  <div className="text-left">
                    <div className="text-sm font-bold text-slate-900">
                      {user?.fullName ||
                        user?.primaryEmailAddress?.emailAddress ||
                        user?.primaryPhoneNumber?.phoneNumber ||
                        verifiedPhone ||
                        'Signed in with Clerk'}
                    </div>
                    <div className="text-xs text-emerald-700 font-semibold">
                      Clerk Session Verified ✓
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const primaryEmail = user?.primaryEmailAddress?.emailAddress;
                    const primaryPhone = user?.primaryPhoneNumber?.phoneNumber;
                    const identity =
                      primaryPhone ||
                      primaryEmail ||
                      user?.username ||
                      user?.fullName ||
                      user?.id ||
                      'clerk_user';
                    onPhoneVerified(identity, primaryEmail);
                  }}
                  className="w-full h-11 rounded-xl bg-[#000080] hover:bg-[#000066] text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <span>Continue to Partner Portals</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <SignOutButton>
                  <button
                    type="button"
                    className="text-xs font-semibold text-slate-500 hover:text-red-600 cursor-pointer"
                  >
                    Sign out of Clerk
                  </button>
                </SignOutButton>
              </div>
            </SignedIn>
          </div>
        </div>
      </div>
    </div>
  );
};
