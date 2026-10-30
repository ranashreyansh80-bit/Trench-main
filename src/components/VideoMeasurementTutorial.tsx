import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  CheckCircle2,
  Ruler,
  ArrowRight,
  ArrowLeft,
  Volume2,
  VolumeX,
  RotateCcw,
  FastForward,
  Check,
  ShieldCheck,
  Video,
  ChevronRight,
} from 'lucide-react';
import { DeliveryOnboardingStep, DeliveryPartnerProfile } from '../types/appTypes';

interface VideoMeasurementTutorialProps {
  profile?: DeliveryPartnerProfile;
  partnerName?: string;
  tutorialCompleted?: boolean;
  onUpdateProfile?: (
    updates:
      | Partial<DeliveryPartnerProfile>
      | ((prev: DeliveryPartnerProfile) => DeliveryPartnerProfile)
  ) => void;
  onCompleteTutorial?: () => void;
  onCompleteTutorialAndEnterDashboard?: () => void;
  onSelectStep?: (step: DeliveryOnboardingStep) => void;
  onBackToOnboarding?: () => void;
}

interface MeasurementStepGuide {
  stepNumber: number;
  title: string;
  timeRange: string;
  description: string;
  tapeTip: string;
}

const MEN_STEPS: MeasurementStepGuide[] = [
  {
    stepNumber: 1,
    title: 'Shoulder Width (Acromion to Acromion)',
    timeRange: '00:00 - 00:03',
    description:
      'Ask the customer to stand straight with relaxed shoulders. Measure across the upper back from the outer edge of one shoulder bone to the other.',
    tapeTip: 'Keep the tape slightly curved along the natural upper back contour.',
  },
  {
    stepNumber: 2,
    title: 'Full Chest Circumference',
    timeRange: '00:03 - 00:06',
    description:
      'Wrap the measuring tape under the arms around the fullest part of the chest. Keep two fingers inside the tape for comfortable breathing ease.',
    tapeTip: 'Ensure the tape stays parallel to the floor across both back and front.',
  },
  {
    stepNumber: 3,
    title: 'Natural Waist & Trouser Waistline',
    timeRange: '00:06 - 00:09',
    description:
      'Measure around the natural waistline (just above the hip bone) for shirts/kurtas, and at the trouser belt line for formal pants.',
    tapeTip: 'Ask the customer not to hold their breath while taking the waist reading.',
  },
  {
    stepNumber: 4,
    title: 'Sleeve Length (Shoulder Seam to Wrist)',
    timeRange: '00:09 - 00:12',
    description:
      'With the arm slightly bent at the elbow, measure from the top shoulder bone down past the elbow to the wrist bone.',
    tapeTip: 'Always pass over the slight bend of the elbow so the sleeve does not pull short.',
  },
  {
    stepNumber: 5,
    title: 'Trouser Inseam & Outseam Length',
    timeRange: '00:12 - 00:15',
    description:
      'Measure from the top of the inner thigh down to the ankle break (Inseam) and from the waist belt line to the shoe sole (Outseam).',
    tapeTip: 'Customer should stand barefoot or in flat footwear with feet 6 inches apart.',
  },
];

const WOMEN_STEPS: MeasurementStepGuide[] = [
  {
    stepNumber: 1,
    title: 'Upper Shoulder & Neck Depth',
    timeRange: '00:00 - 00:03',
    description:
      'Measure shoulder tip to shoulder tip across the back, then record front and back neck depth diagonally from the shoulder seam.',
    tapeTip: 'Confirm blouse/kurti neck depth preference directly with the customer.',
  },
  {
    stepNumber: 2,
    title: 'Bust & Under-Bust Circumference',
    timeRange: '00:03 - 00:06',
    description:
      'Place the tape measure evenly around the fullest point of the bust, keeping the tape level across the back shoulder blades.',
    tapeTip: 'Tape should be snug but never compressing the garment fabric.',
  },
  {
    stepNumber: 3,
    title: 'Natural Waist & Blouse/Kurti Waist',
    timeRange: '00:06 - 00:09',
    description:
      'Measure at the narrowest part of the torso (typically 1.5 inches above the navel) where the blouse or fitted kurta tapers.',
    tapeTip: 'Verify side slit opening height from shoulder to waist for kurtis.',
  },
  {
    stepNumber: 4,
    title: 'Full Hip Circumference',
    timeRange: '00:09 - 00:12',
    description:
      'Wrap the tape around the widest part of the hips (approximately 7 to 9 inches below the natural waist) with feet together.',
    tapeTip: 'Essential for A-line kurtas, lehengas, and tailored palazzos.',
  },
  {
    stepNumber: 5,
    title: 'Sleeve Length, Armhole & Garment Length',
    timeRange: '00:12 - 00:15',
    description:
      'Measure armhole loop comfort, sleeve length (elbow/three-quarter/full), and total garment length from top shoulder to hemline.',
    tapeTip: 'Double-check all 6 recorded values in the Trench Partner app before leaving.',
  },
];

const STEP_PILLS: { id: DeliveryOnboardingStep; num: number; label: string }[] = [
  { id: 'aadhaar_portal', num: 1, label: 'Documents' },
  { id: 'vehicle_portal', num: 2, label: 'Job Details' },
  { id: 'personal_portal', num: 3, label: 'Personal Details' },
  { id: 'bank_portal', num: 4, label: 'Bank Details' },
  { id: 'tutorial', num: 5, label: 'Tutorial' },
  { id: 'admin_approval', num: 6, label: 'Approval' },
];

export const VideoMeasurementTutorial: React.FC<VideoMeasurementTutorialProps> = ({
  profile,
  tutorialCompleted = false,
  onUpdateProfile,
  onCompleteTutorial,
  onCompleteTutorialAndEnterDashboard,
  onSelectStep,
  onBackToOnboarding,
}) => {
  const [localMenPct, setLocalMenPct] = useState<number>(
    profile?.menTutorialWatchedPercent ?? (tutorialCompleted ? 100 : 0)
  );
  const [localWomenPct, setLocalWomenPct] = useState<number>(
    profile?.womenTutorialWatchedPercent ?? (tutorialCompleted ? 100 : 0)
  );
  const [localMenDone, setLocalMenDone] = useState<boolean>(
    Boolean(profile?.menTutorialCompleted || tutorialCompleted)
  );
  const [localWomenDone, setLocalWomenDone] = useState<boolean>(
    Boolean(profile?.womenTutorialCompleted || tutorialCompleted)
  );
  const [localConfirmed, setLocalConfirmed] = useState<boolean>(
    Boolean(profile?.tutorialConfirmationChecked || tutorialCompleted)
  );

  const menWatchedPercent = profile?.menTutorialWatchedPercent ?? localMenPct;
  const womenWatchedPercent = profile?.womenTutorialWatchedPercent ?? localWomenPct;
  const menCompleted = Boolean(profile?.menTutorialCompleted || localMenDone);
  const womenCompleted = Boolean(profile?.womenTutorialCompleted || localWomenDone);
  const confirmationChecked = Boolean(
    profile?.tutorialConfirmationChecked ?? localConfirmed
  );
  const isTutorialCompleted = Boolean(
    profile?.tutorialCompleted || tutorialCompleted || (menCompleted && womenCompleted && confirmationChecked)
  );

  const applyProfilePatch = React.useCallback(
    (patch: Partial<DeliveryPartnerProfile>) => {
      if (typeof patch.menTutorialWatchedPercent === 'number') {
        setLocalMenPct(patch.menTutorialWatchedPercent);
      }
      if (typeof patch.womenTutorialWatchedPercent === 'number') {
        setLocalWomenPct(patch.womenTutorialWatchedPercent);
      }
      if (typeof patch.menTutorialCompleted === 'boolean') {
        setLocalMenDone(patch.menTutorialCompleted);
      }
      if (typeof patch.womenTutorialCompleted === 'boolean') {
        setLocalWomenDone(patch.womenTutorialCompleted);
      }
      if (typeof patch.tutorialConfirmationChecked === 'boolean') {
        setLocalConfirmed(patch.tutorialConfirmationChecked);
      }
      if (onUpdateProfile) {
        onUpdateProfile((prev: any) => (prev ? { ...prev, ...patch } : patch));
      }
    },
    [onUpdateProfile]
  );

  const triggerStepSelect = (step: DeliveryOnboardingStep) => {
    if (onSelectStep) {
      onSelectStep(step);
    } else if (step === 'bank_portal' && onBackToOnboarding) {
      onBackToOnboarding();
    }
  };

  const triggerCompleteTutorial = () => {
    if (onCompleteTutorial) {
      onCompleteTutorial();
    } else if (onCompleteTutorialAndEnterDashboard) {
      onCompleteTutorialAndEnterDashboard();
    } else if (onSelectStep) {
      onSelectStep('admin_approval');
    }
  };

  const [activeTab, setActiveTab] = useState<'men' | 'women'>('men');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progressPercent, setProgressPercent] = useState<number>(
    activeTab === 'men' ? menWatchedPercent : womenWatchedPercent
  );
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [validationError, setValidationError] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const videoSources = {
    men: 'https://assets.mixkit.co/videos/preview/mixkit-tailor-measuring-a-man-for-a-suit-41720-large.mp4',
    women:
      'https://assets.mixkit.co/videos/preview/mixkit-fashion-designer-measuring-a-dress-on-a-mannequin-39878-large.mp4',
  };

  const currentSteps = activeTab === 'men' ? MEN_STEPS : WOMEN_STEPS;

  useEffect(() => {
    const savedProgress =
      activeTab === 'men' ? menWatchedPercent : womenWatchedPercent;
    setProgressPercent(savedProgress);
    setIsPlaying(false);
  }, [activeTab, menWatchedPercent, womenWatchedPercent]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setProgressPercent((prev) => Math.min(100, prev + 5));
    }, 450);

    return () => clearInterval(interval);
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) return;
    const stepIdx = Math.min(4, Math.floor((progressPercent / 100) * 5));
    setActiveStepIndex(stepIdx);

    if (progressPercent >= 100) {
      setIsPlaying(false);
      if (activeTab === 'men') {
        applyProfilePatch({
          menTutorialWatchedPercent: 100,
          menTutorialCompleted: true,
        });
      } else {
        applyProfilePatch({
          womenTutorialWatchedPercent: 100,
          womenTutorialCompleted: true,
        });
      }
    } else if (progressPercent > 0) {
      if (activeTab === 'men' && progressPercent > menWatchedPercent) {
        applyProfilePatch({
          menTutorialWatchedPercent: progressPercent,
        });
      } else if (activeTab === 'women' && progressPercent > womenWatchedPercent) {
        applyProfilePatch({
          womenTutorialWatchedPercent: progressPercent,
        });
      }
    }
  }, [
    progressPercent,
    isPlaying,
    activeTab,
    applyProfilePatch,
    menWatchedPercent,
    womenWatchedPercent,
  ]);

  const handleTogglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
    }
    setIsPlaying((prev) => !prev);
    setValidationError('');
  };

  const handleCompleteCurrentModuleInstant = () => {
    setProgressPercent(100);
    setActiveStepIndex(4);
    setIsPlaying(false);
    setValidationError('');
    if (activeTab === 'men') {
      applyProfilePatch({
        menTutorialWatchedPercent: 100,
        menTutorialCompleted: true,
      });
    } else {
      applyProfilePatch({
        womenTutorialWatchedPercent: 100,
        womenTutorialCompleted: true,
      });
    }
  };

  const handleRestartModule = () => {
    setProgressPercent(0);
    setActiveStepIndex(0);
    setIsPlaying(true);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleToggleConfirmation = () => {
    applyProfilePatch({
      tutorialConfirmationChecked: !confirmationChecked,
    });
    setValidationError('');
  };

  const handleProceedToAdminApproval = () => {
    if (!menCompleted) {
      setValidationError(
        'Please complete Module 1: Men Garment Measurement Video before proceeding.'
      );
      return;
    }
    if (!womenCompleted) {
      setValidationError(
        'Please complete Module 2: Women Garment Measurement Video before proceeding.'
      );
      return;
    }
    if (!confirmationChecked) {
      setValidationError(
        'Please check the mandatory confirmation box certifying that you have watched both measurement tutorials.'
      );
      return;
    }
    triggerCompleteTutorial();
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Main Partner Onboarding Shell — Matches Reference UI Kit */}
      <div className="relative bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden">
        {/* Soft Ambient Blue Radial Glows */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-gradient-to-br from-[#000080]/15 via-sky-400/10 to-transparent blur-2xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -right-16 w-80 h-80 rounded-full bg-gradient-to-tl from-[#000080]/12 via-blue-300/10 to-transparent blur-2xl"
        />

        {/* Top Navigation Bar (Matches Reference '←' Header) */}
        <div className="relative z-10 px-5 sm:px-8 pt-5 pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => triggerStepSelect('bank_portal')}
              className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-2xs"
              title="Back to Bank Details"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#000080]">
                  Step 5 of 6
                </span>
                <span className="text-slate-300">·</span>
                <span className="text-[11px] font-semibold text-slate-500">
                  Mandatory Video Training
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Measurement Tutorial
              </h1>
            </div>
          </div>
        </div>

        {/* Horizontal 6-Step Sequence Bar */}
        <div className="relative z-10 px-5 sm:px-8 py-3 bg-slate-50/70 border-b border-slate-100 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max">
            {STEP_PILLS.map((s, idx) => {
              const isCurrent = s.id === 'tutorial';
              const isDone =
                s.num < 5 || (s.id === 'tutorial' && isTutorialCompleted);
              return (
                <React.Fragment key={s.id}>
                  <button
                    type="button"
                    onClick={() => triggerStepSelect(s.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-[#000080] text-white shadow-xs'
                        : isDone
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-white text-slate-500 border border-slate-200/80'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full text-[10px] font-extrabold flex items-center justify-center ${
                        isCurrent
                          ? 'bg-white text-[#000080]'
                          : isDone
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {isDone ? '✓' : s.num}
                    </span>
                    <span>{s.label}</span>
                  </button>
                  {idx < STEP_PILLS.length - 1 && (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Main Content Body */}
        <div className="relative z-10 p-5 sm:p-8 space-y-6">
          {/* Segmented Module Tabs: Men vs Women Measurement */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('men')}
              className={`p-3 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                activeTab === 'men'
                  ? 'bg-[#000080] text-white shadow-xs'
                  : 'bg-transparent text-slate-700 hover:bg-white/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Video className="w-4 h-4 shrink-0" />
                <div className="text-left">
                  <div className="text-xs sm:text-sm font-extrabold">
                    1. Men Measurement Video
                  </div>
                  <div
                    className={`text-[11px] ${
                      activeTab === 'men' ? 'text-blue-100' : 'text-slate-500'
                    }`}
                  >
                    Shoulder, Chest, Waist, Sleeve &amp; Inseam
                  </div>
                </div>
              </div>
              <span
                className={`text-xs font-extrabold px-2.5 py-1 rounded-lg ${
                  menCompleted
                    ? 'bg-emerald-500 text-white'
                    : activeTab === 'men'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {menCompleted ? 'Done ✓' : `${menWatchedPercent}%`}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('women')}
              className={`p-3 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                activeTab === 'women'
                  ? 'bg-[#000080] text-white shadow-xs'
                  : 'bg-transparent text-slate-700 hover:bg-white/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Video className="w-4 h-4 shrink-0" />
                <div className="text-left">
                  <div className="text-xs sm:text-sm font-extrabold">
                    2. Women Measurement Video
                  </div>
                  <div
                    className={`text-[11px] ${
                      activeTab === 'women' ? 'text-blue-100' : 'text-slate-500'
                    }`}
                  >
                    Bust, Natural Waist, Hip, Armhole &amp; Length
                  </div>
                </div>
              </div>
              <span
                className={`text-xs font-extrabold px-2.5 py-1 rounded-lg ${
                  womenCompleted
                    ? 'bg-emerald-500 text-white'
                    : activeTab === 'women'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {womenCompleted ? 'Done ✓' : `${womenWatchedPercent}%`}
              </span>
            </button>
          </div>

          {/* Video Player + 5-Step Tape Guide Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 7 Columns: Video Player */}
            <div className="lg:col-span-7 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-md">
              <div className="relative aspect-video bg-slate-900 overflow-hidden">
                <video
                  ref={videoRef}
                  key={activeTab}
                  src={videoSources[activeTab]}
                  muted={isMuted}
                  loop
                  playsInline
                  className="w-full h-full object-cover opacity-80"
                />

                {/* Overlay Diagram Badge */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent flex flex-col justify-between p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-[#000080] text-white text-xs font-bold flex items-center gap-1.5">
                      <Ruler className="w-3.5 h-3.5" />
                      <span>
                        {activeTab === 'men'
                          ? 'Men Garment Protocol'
                          : 'Women Garment Protocol'}
                      </span>
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-900/90 text-white text-xs font-mono font-bold border border-slate-700">
                      Step {activeStepIndex + 1} / 5
                    </span>
                  </div>

                  {!isPlaying && (
                    <div className="my-auto flex flex-col items-center text-center">
                      <button
                        type="button"
                        onClick={handleTogglePlay}
                        className="w-14 h-14 rounded-full bg-[#000080] hover:bg-[#000066] text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 cursor-pointer"
                        aria-label="Play tutorial video"
                      >
                        <Play className="w-6 h-6 fill-current ml-0.5" />
                      </button>
                      <span className="mt-2 text-xs font-bold text-white bg-slate-900/80 px-3 py-1 rounded-full">
                        {progressPercent >= 100
                          ? 'Module Completed ✓'
                          : 'Tap to Play Training Video'}
                      </span>
                    </div>
                  )}

                  {/* Active Caption Bar */}
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-white">
                    <div className="text-[11px] font-bold text-sky-400">
                      {currentSteps[activeStepIndex]?.timeRange} · Step{' '}
                      {currentSteps[activeStepIndex]?.stepNumber}
                    </div>
                    <div className="text-xs sm:text-sm font-bold mt-0.5">
                      {currentSteps[activeStepIndex]?.title}
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      {currentSteps[activeStepIndex]?.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Player Controls */}
              <div className="p-3.5 bg-slate-900 border-t border-slate-800 space-y-2.5">
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#000080] to-emerald-400 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTogglePlay}
                      className="px-3 py-1.5 rounded-lg bg-[#000080] hover:bg-[#000066] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="w-3.5 h-3.5" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span>{progressPercent > 0 && progressPercent < 100 ? 'Resume' : 'Play'}</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleRestartModule}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                      title="Restart video"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsMuted((m) => !m)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                      title="Toggle audio"
                    >
                      {isMuted ? (
                        <VolumeX className="w-3.5 h-3.5" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleCompleteCurrentModuleInstant}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <FastForward className="w-3.5 h-3.5" />
                    <span>Mark {activeTab === 'men' ? 'Men' : 'Women'} Video 100% Watched</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right 5 Columns: 5-Point Measurement Checklist */}
            <div className="lg:col-span-5 bg-slate-50/70 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">
                  {activeTab === 'men'
                    ? 'Men 5-Point Tape Guide'
                    : 'Women 5-Point Tape Guide'}
                </h3>
                <span className="text-[11px] font-mono font-bold text-[#000080]">
                  {progressPercent}% Watched
                </span>
              </div>

              <div className="space-y-2">
                {currentSteps.map((step, index) => {
                  const isStepDone = progressPercent >= (index + 1) * 20;
                  const isStepCurrent = index === activeStepIndex;
                  return (
                    <div
                      key={step.stepNumber}
                      onClick={() => setActiveStepIndex(index)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isStepCurrent
                          ? 'border-[#000080] bg-white shadow-2xs'
                          : isStepDone
                          ? 'border-emerald-200 bg-emerald-50/40'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span
                          className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                            isStepDone
                              ? 'bg-emerald-600 text-white'
                              : isStepCurrent
                              ? 'bg-[#000080] text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isStepDone ? '✓' : step.stepNumber}
                        </span>
                        <div>
                          <div className="text-xs font-extrabold text-slate-900">
                            {step.title}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {step.tapeTip}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Mandatory Declaration & Confirmation Bar (Matches Reference Declaration Pattern) */}
          <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-4">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmationChecked}
                onChange={handleToggleConfirmation}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#000080] focus:ring-[#000080]"
              />
              <div className="text-xs text-slate-700 leading-relaxed">
                <span className="font-extrabold text-slate-900 block">
                  Mandatory Partner Certification Declaration
                </span>
                I confirm that I have watched both the <strong>Men</strong> and{' '}
                <strong>Women</strong> Garment Measurement Tutorial videos and will follow the
                Trench doorstep tape measurement protocol.
              </div>
            </label>

            {validationError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800">
                {validationError}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => triggerStepSelect('bank_portal')}
                className="w-full sm:w-auto h-12 px-5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                data-testid="complete-tutorial-to-admin-btn"
                onClick={handleProceedToAdminApproval}
                className="w-full flex-1 h-12 rounded-xl bg-[#000080] hover:bg-[#000066] active:scale-[0.99] text-white font-extrabold text-sm uppercase tracking-wider shadow-md shadow-[#000080]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>CONTINUE TO REGISTER APPROVAL</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
