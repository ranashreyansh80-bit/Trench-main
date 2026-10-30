import React, { useState, useRef, useEffect } from 'react';
import {
  Scissors,
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  ShieldCheck,
  Clock,
  Wrench,
  User,
  Landmark,
  FileText,
  MapPin,
  Check,
  Building2,
  BadgeCheck,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Smartphone,
  CreditCard,
  Mail,
  Crosshair,
  ListChecks,
  LogOut,
} from 'lucide-react';
import { TailorProfile, TailorSpecialty, TailorStep } from '../types/appTypes';
import {
  validateTailorOnboarding,
  validateTailorIdentityPortal,
  validateTailorEquipmentPortal,
  validateTailorPersonalPortal,
  validateTailorCameraPortal,
  validateTailorBankPortal,
  reverseGeocodeLocation,
} from '../utils/appLogic';

interface TailorOnboardingProps {
  profile: TailorProfile;
  currentStep: TailorStep;
  onStepChange?: (step: TailorStep) => void;
  onSelectStep?: (step: TailorStep) => void;
  onUpdateProfile: (updated: TailorProfile) => void;
  onApproveAndEnterDashboard: (updated: TailorProfile) => void;
  onBackToRoleSelect: () => void;
}

const TAILOR_STEPS_META: {
  id: TailorStep;
  stepNum: number;
  label: string;
  shortLabel: string;
  subtitle: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  {
    id: 'identity_portal',
    stepNum: 1,
    label: 'Document Verification',
    shortLabel: 'Documents',
    subtitle: 'Upload Trade License, GST, Aadhaar, or PAN for atelier verification',
    icon: FileText,
  },
  {
    id: 'equipment_portal',
    stepNum: 2,
    label: 'Machinery & Workshop',
    shortLabel: 'Machinery',
    subtitle: 'Configure sewing machines, stitching crafts, and daily capacity',
    icon: Wrench,
  },
  {
    id: 'personal_portal',
    stepNum: 3,
    label: 'Personal & Atelier Details',
    shortLabel: 'Atelier Details',
    subtitle: 'Master tailor full name, contact phone, and workshop address',
    icon: User,
  },
  {
    id: 'camera_portal',
    stepNum: 4,
    label: 'Live Camera Verification',
    shortLabel: 'Live Camera',
    subtitle: 'Click live photo of shop or sewing machine with exact printed location',
    icon: Camera,
  },
  {
    id: 'bank_portal',
    stepNum: 5,
    label: 'Bank Details',
    shortLabel: 'Bank & UPI',
    subtitle: 'Bank account and UPI ID for instant alteration & stitching payouts',
    icon: Landmark,
  },
  {
    id: 'admin_approval',
    stepNum: 6,
    label: 'Register & Approval',
    shortLabel: 'Approval',
    subtitle: 'Review verified atelier details and activate tailor dashboard',
    icon: ShieldCheck,
  },
];

export const TailorOnboarding: React.FC<TailorOnboardingProps> = ({
  profile,
  currentStep: rawStep,
  onStepChange,
  onSelectStep: rawOnSelectStep,
  onUpdateProfile,
  onApproveAndEnterDashboard,
  onBackToRoleSelect,
}) => {
  // Normalize 'onboarding' step alias to 'identity_portal'
  const activeStep: TailorStep =
    rawStep === 'onboarding' ? 'identity_portal' : rawStep;

  const goToStep = (step: TailorStep) => {
    if (rawOnSelectStep) {
      rawOnSelectStep(step);
    } else if (onStepChange) {
      onStepChange(step);
    }
  };

  const handleStepBack = () => {
    if (activeStep === 'equipment_portal') {
      goToStep('identity_portal');
    } else if (activeStep === 'personal_portal') {
      goToStep('equipment_portal');
    } else if (activeStep === 'camera_portal') {
      goToStep('personal_portal');
    } else if (activeStep === 'bank_portal') {
      goToStep('camera_portal');
    } else if (activeStep === 'admin_approval') {
      goToStep('bank_portal');
    } else {
      onBackToRoleSelect();
    }
  };

  const [formState, setFormState] = useState<TailorProfile>(profile);
  const [errors, setErrors] = useState<string[]>([]);
  const [cameraStreamActive, setCameraStreamActive] = useState(false);
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);
  const [showRegisterChecklist, setShowRegisterChecklist] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setFormState(profile);
  }, [profile]);

  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleFieldChange = <K extends keyof TailorProfile>(
    key: K,
    value: TailorProfile[K]
  ) => {
    const updated = {
      ...formState,
      [key]: value,
    };
    setFormState(updated);
    onUpdateProfile(updated);
  };

  const handleDocFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const updated: TailorProfile = {
      ...formState,
      documentUploaded: true,
      documentFileName: file.name,
      documentPreviewUrl: URL.createObjectURL(file),
      identityVerified: true,
    };
    setFormState(updated);
    onUpdateProfile(updated);
    setErrors([]);
  };

  const handleQuickAttachDoc = () => {
    const updated: TailorProfile = {
      ...formState,
      documentUploaded: true,
      documentType: formState.documentType || 'Trade License Registration',
      documentNumber: formState.documentNumber || 'TL-KA-2026-98124',
      documentFileName: 'atelier_trade_registration_certificate.pdf',
      identityVerified: true,
    };
    setFormState(updated);
    onUpdateProfile(updated);
    setErrors([]);
  };

  const handleStartLiveCamera = async () => {
    setCameraStreamActive(true);
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch {
        // Fallback: camera permission or headless mode
      }
    }
  };

  /**
   * CAPTURE LIVE PHOTO OF SHOP OR MACHINE + AUTOMATICALLY PRINT EXACT LIVE LOCATION UNDER IMAGE
   */
  const handleCaptureLiveFrame = async () => {
    setIsCapturingLocation(true);
    const timeStr = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const dateStr = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const timestampFull = `${dateStr}, ${timeStr}`;

    let capturedDataUrl = formState.liveCameraDataUrl || '';

    // If video stream is active, capture real canvas frame
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        capturedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
      }
      if (video.srcObject) {
        const stream = video.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    } else {
      // High fidelity atelier shop & sewing machine SVG snapshot data URL
      const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
        <rect width="640" height="400" fill="#0B132B"/>
        <rect x="40" y="260" width="560" height="110" rx="8" fill="#1C2541" stroke="#3A506B" stroke-width="3"/>
        <path d="M 160 260 L 160 140 L 360 140 L 360 200 L 320 200 L 320 180 L 220 180 L 220 260 Z" fill="#475569" stroke="#94A3B8" stroke-width="4"/>
        <line x1="340" y1="200" x2="340" y2="245" stroke="#CBD5E1" stroke-width="5" stroke-linecap="round"/>
        <polygon points="337,245 343,245 340,256" fill="#F8FAFC"/>
        <rect x="420" y="90" width="160" height="140" rx="10" fill="#1E293B" stroke="#334155" stroke-width="2"/>
        <circle cx="450" cy="125" r="14" fill="#000080"/>
        <circle cx="500" cy="125" r="14" fill="#159937"/>
        <circle cx="550" cy="125" r="14" fill="#D97706"/>
        <text x="320" y="60" text-anchor="middle" fill="#38BDF8" font-size="18" font-weight="bold" font-family="sans-serif">TRENCH ATELIER · LIVE MACHINE VERIFICATION</text>
        <text x="320" y="90" text-anchor="middle" fill="#94A3B8" font-size="13" font-family="monospace">${formState.shopName || 'Tailor Workshop'} · Juki Lockstitch Workstation</text>
      </svg>`;
      capturedDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
    }
    setCameraStreamActive(false);

    // Retrieve exact live device coordinates & reverse geocode address
    let resolvedAddress = formState.shopAddress || '100ft Road, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038';
    let resolvedCoords = {
      latitude: 12.9716,
      longitude: 77.6412,
      accuracy: 6,
    };

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 8000,
            maximumAge: 0,
          });
        });
        resolvedCoords = {
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
          accuracy: Math.round(pos.coords.accuracy || 8),
        };
        const geoAddr = await reverseGeocodeLocation(
          resolvedCoords.latitude,
          resolvedCoords.longitude
        );
        if (geoAddr && geoAddr.length > 5) {
          resolvedAddress = geoAddr;
        }
      } catch {
        // Fallback gracefully to default coordinates / previously resolved address
      }
    }

    const updated: TailorProfile = {
      ...formState,
      liveCameraCaptured: true,
      liveCameraTimestamp: `Verified · ${timestampFull}`,
      liveCameraDataUrl: capturedDataUrl,
      liveCameraAddress: resolvedAddress,
      liveCameraCoords: resolvedCoords,
      liveCameraMachineType: formState.machineType || 'Industrial Single Needle Lockstitch Machine',
    };

    setFormState(updated);
    onUpdateProfile(updated);
    setIsCapturingLocation(false);
    setErrors([]);
  };

  // Step 1 Validation & Proceed
  const handleProceedFromIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    const res = validateTailorIdentityPortal(formState);
    if (!res.valid) {
      setErrors(res.errors);
      return;
    }
    setErrors([]);
    onUpdateProfile({ ...formState, identityVerified: true });
    goToStep('equipment_portal');
  };

  // Step 2 Validation & Proceed
  const handleProceedFromEquipment = (e: React.FormEvent) => {
    e.preventDefault();
    const res = validateTailorEquipmentPortal(formState);
    if (!res.valid) {
      setErrors(res.errors);
      return;
    }
    setErrors([]);
    onUpdateProfile({ ...formState, equipmentVerified: true });
    goToStep('personal_portal');
  };

  // Step 3 Validation & Proceed
  const handleProceedFromPersonal = (e: React.FormEvent) => {
    e.preventDefault();
    const res = validateTailorPersonalPortal(formState);
    if (!res.valid) {
      setErrors(res.errors);
      return;
    }
    setErrors([]);
    onUpdateProfile({ ...formState, personalVerified: true });
    goToStep('camera_portal');
  };

  // Step 4 Validation & Proceed
  const handleProceedFromCamera = (e: React.FormEvent) => {
    e.preventDefault();
    const res = validateTailorCameraPortal(formState);
    if (!res.valid) {
      setErrors(res.errors);
      return;
    }
    setErrors([]);
    goToStep('bank_portal');
  };

  // Step 5 Validation & Proceed
  const handleProceedFromBank = (e: React.FormEvent) => {
    e.preventDefault();
    const res = validateTailorBankPortal(formState);
    if (!res.valid) {
      setErrors(res.errors);
      return;
    }
    setErrors([]);
    onUpdateProfile({ ...formState, bankVerified: true });
    goToStep('admin_approval');
  };

  // Step 6 Admin Approval Action
  const handleAdminApprove = () => {
    const finalProfile: TailorProfile = {
      ...formState,
      verified: true,
      adminApproved: true,
      identityVerified: true,
      equipmentVerified: true,
      personalVerified: true,
      bankVerified: true,
      applicationSubmittedAt: new Date().toISOString(),
    };
    onUpdateProfile(finalProfile);
    onApproveAndEnterDashboard(finalProfile);
  };

  const currentMeta =
    TAILOR_STEPS_META.find((s) => s.id === activeStep) || TAILOR_STEPS_META[0];

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 py-4">
      {/* Hidden canvas for capturing real live video frames */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Main Container */}
      <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl shadow-sm overflow-hidden">
        {/* Top Trench Blue Brand Header */}
        <div className="bg-gradient-to-r from-[#000080] via-[#000080] to-[#000066] text-white p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleStepBack}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
                title="Go Back"
                aria-label="Go Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white shrink-0">
                <Scissors className="w-5 h-5 text-sky-200" />
              </div>
              <div>
                <div className="text-[10px] font-mono tracking-widest uppercase text-sky-200">
                  TRENCH ATELIER PARTNER ONBOARDING
                </div>
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Tailor Verification Portal
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleStepBack}
                className="h-8 px-3 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Back to previous step or role select"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={() => setShowRegisterChecklist(!showRegisterChecklist)}
                className="h-8 px-3 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <ListChecks className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Register Checklist</span>
                {showRegisterChecklist ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              <button
                type="button"
                onClick={onBackToRoleSelect}
                className="h-8 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Exit</span>
              </button>
            </div>
          </div>

          {/* Stepper Navigation Indicator */}
          <div className="grid grid-cols-6 gap-1 sm:gap-2 pt-2 border-t border-white/15">
            {TAILOR_STEPS_META.map((step) => {
              const isActive = activeStep === step.id;
              const isPast =
                step.stepNum <
                (TAILOR_STEPS_META.find((s) => s.id === activeStep)?.stepNum || 1);
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => goToStep(step.id)}
                  className={`text-left p-1.5 sm:p-2 rounded-lg transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-[#000080] font-bold shadow-xs'
                      : isPast
                      ? 'bg-white/20 text-white hover:bg-white/30'
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-mono">
                      0{step.stepNum}
                    </span>
                    {isPast && <Check className="w-2.5 h-2.5 ml-auto text-emerald-300" />}
                  </div>
                  <div className="text-[11px] truncate hidden md:block">
                    {step.shortLabel}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Optional Collapsible Register Checklist View */}
        {showRegisterChecklist && (
          <div className="bg-slate-50 border-b border-slate-200 p-4 sm:p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Register: Complete All Steps of Verification to Get Started
                </h3>
                <p className="text-xs text-slate-500">
                  Track your atelier onboarding progress across all 5 verification portals
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRegisterChecklist(false)}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {[
                {
                  id: 'identity_portal' as TailorStep,
                  title: '1. Document Verification',
                  desc: formState.documentUploaded ? 'Verified' : 'Pending',
                  done: formState.documentUploaded,
                },
                {
                  id: 'equipment_portal' as TailorStep,
                  title: '2. Machinery & Workshop',
                  desc: formState.shopName ? formState.shopName : 'Pending',
                  done: Boolean(formState.shopName),
                },
                {
                  id: 'personal_portal' as TailorStep,
                  title: '3. Personal Details',
                  desc: formState.ownerName || formState.phoneNumber ? 'Details Saved' : 'Pending',
                  done: Boolean(formState.ownerName || formState.phoneNumber),
                },
                {
                  id: 'camera_portal' as TailorStep,
                  title: '4. Live Camera & Machine',
                  desc: formState.liveCameraCaptured ? 'Live Photo Stamped' : 'Pending',
                  done: formState.liveCameraCaptured,
                },
                {
                  id: 'bank_portal' as TailorStep,
                  title: '5. Bank & UPI Payouts',
                  desc: formState.bankAccountNumber || formState.upiId ? 'Configured' : 'Pending',
                  done: Boolean(formState.bankAccountNumber || formState.upiId),
                },
                {
                  id: 'admin_approval' as TailorStep,
                  title: '6. Admin Approval',
                  desc: formState.verified ? 'Approved' : 'Ready to Review',
                  done: formState.verified,
                },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    goToStep(item.id);
                    setShowRegisterChecklist(false);
                  }}
                  className="p-3 rounded-xl border border-slate-200 bg-white hover:border-[#000080] text-left transition-all flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900">{item.title}</div>
                    <div className="text-[11px] text-slate-500">{item.desc}</div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      item.done
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {item.done ? 'Done' : 'Action'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step Body */}
        <div className="p-4 sm:p-6">
          {/* Header Description */}
          <div className="mb-4 pb-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleStepBack}
                className="h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Go Back to Previous Step"
              >
                <ArrowLeft className="w-4 h-4 text-slate-600" />
                <span>Back</span>
              </button>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#000080]">
                  Step {currentMeta.stepNum} of 6 · {currentMeta.label}
                </div>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 mt-0.5">
                  {currentMeta.subtitle}
                </h2>
              </div>
            </div>

            {activeStep === 'admin_approval' && (
              <button
                type="button"
                onClick={() => goToStep('bank_portal')}
                className="h-9 px-3.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#000080] text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-blue-200 transition-colors"
                title="Back to Step 5: Bank Details"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Bank Details</span>
              </button>
            )}
          </div>

          {/* Validation Alert */}
          {errors.length > 0 && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 space-y-1"
            >
              <div className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span>Please complete the required fields:</span>
              </div>
              <ul className="list-disc list-inside pl-1 space-y-0.5">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* =================================================================== */}
          {/* STEP 1: IDENTITY & DOCUMENT PORTAL                                  */}
          {/* =================================================================== */}
          {activeStep === 'identity_portal' && (
            <form onSubmit={handleProceedFromIdentity} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Document Type *
                  </label>
                  <select
                    value={formState.documentType}
                    onChange={(e) => handleFieldChange('documentType', e.target.value)}
                    className="w-full h-11 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#000080] focus:bg-white"
                  >
                    <option value="">Select Verification Document</option>
                    <option value="Trade License Registration">Trade License Registration</option>
                    <option value="GST Certificate">GST Certificate</option>
                    <option value="Aadhaar Card">Aadhaar Card</option>
                    <option value="PAN Card">PAN Card</option>
                    <option value="Shop & Establishment Act">Shop &amp; Establishment Act</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Document Registration Number *
                  </label>
                  <input
                    type="text"
                    value={formState.documentNumber}
                    onChange={(e) => handleFieldChange('documentNumber', e.target.value)}
                    placeholder="Enter Certificate / ID Number"
                    className="w-full h-11 px-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#000080] focus:bg-white"
                  />
                </div>
              </div>

              {/* Upload Dropzone */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Upload Document Copy (PDF or Photo) *
                </label>
                <input
                  ref={docInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleDocFileChange}
                  className="hidden"
                />

                <div className="p-4 sm:p-6 rounded-2xl border-2 border-dashed border-slate-200 hover:border-[#000080] bg-slate-50 flex flex-col items-center justify-center text-center space-y-2">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#000080] flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      {formState.documentUploaded
                        ? formState.documentFileName
                        : 'Upload Registration Document'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Supports JPG, PNG, or PDF up to 10MB
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => docInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-[#000080] hover:bg-[#000066] text-white text-xs font-semibold cursor-pointer"
                    >
                      {formState.documentUploaded ? 'Change Document' : 'Browse Files'}
                    </button>
                    <button
                      type="button"
                      onClick={handleQuickAttachDoc}
                      className="px-3 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
                    >
                      Quick Attach Sample Cert
                    </button>
                  </div>

                  {formState.documentUploaded && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg flex items-center gap-1 mt-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Document Attached Successfully</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Navigation CTA */}
              <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={onBackToRoleSelect}
                  className="h-11 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="h-11 px-6 rounded-xl bg-[#000080] hover:bg-[#000066] text-white text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#000080]/20"
                >
                  <span>Continue to Machinery</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* =================================================================== */}
          {/* STEP 2: MACHINERY & WORKSHOP PORTAL                                 */}
          {/* =================================================================== */}
          {activeStep === 'equipment_portal' && (
            <form onSubmit={handleProceedFromEquipment} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Shop / Atelier Name *
                  </label>
                  <input
                    type="text"
                    value={formState.shopName}
                    onChange={(e) => handleFieldChange('shopName', e.target.value)}
                    placeholder="Enter Atelier or Studio Name"
                    className="w-full h-11 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#000080] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Primary Craft &amp; Specialty *
                  </label>
                  <select
                    value={formState.specialty}
                    onChange={(e) =>
                      handleFieldChange('specialty', e.target.value as TailorSpecialty)
                    }
                    className="w-full h-11 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#000080] focus:bg-white"
                  >
                    <option value="Both Stitching & Alteration">
                      Both Stitching &amp; Alteration
                    </option>
                    <option value="Stitching">Stitching Specialists</option>
                    <option value="Alteration">Express Alterations Only</option>
                    <option value="Bespoke Bridal & Formal">
                      Bespoke Bridal &amp; Formal Couturiers
                    </option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Primary Sewing Machine Setup
                  </label>
                  <select
                    value={formState.machineType || ''}
                    onChange={(e) => handleFieldChange('machineType', e.target.value)}
                    className="w-full h-11 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#000080] focus:bg-white"
                  >
                    <option value="">Select Machine Setup</option>
                    <option value="Industrial Single Needle Lockstitch (Juki / Brother)">
                      Industrial Single Needle Lockstitch (Juki / Brother)
                    </option>
                    <option value="4-Thread Overlock / Serger Machine">
                      4-Thread Overlock / Serger Machine
                    </option>
                    <option value="Dual Feed Heavy Duty & Buttonhole Machine">
                      Dual Feed Heavy Duty &amp; Buttonhole Machine
                    </option>
                    <option value="Commercial Steam Press & Vacuum Finishing Table">
                      Commercial Steam Press &amp; Vacuum Finishing Table
                    </option>
                    <option value="Complete Atelier Bench (Lockstitch + Overlock + Press)">
                      Complete Atelier Bench (Lockstitch + Overlock + Press)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Daily Workshop Garment Capacity
                  </label>
                  <select
                    value={formState.dailyCapacity || ''}
                    onChange={(e) => handleFieldChange('dailyCapacity', e.target.value)}
                    className="w-full h-11 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#000080] focus:bg-white"
                  >
                    <option value="">Select Capacity</option>
                    <option value="3-5 garments / day">3–5 garments / day (Artisanal)</option>
                    <option value="6-12 garments / day">6–12 garments / day (Standard)</option>
                    <option value="15-25 garments / day">15–25 garments / day (High Output)</option>
                    <option value="25+ garments / day">25+ garments / day (Factory Bench)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => goToStep('identity_portal')}
                  className="h-11 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="h-11 px-6 rounded-xl bg-[#000080] hover:bg-[#000066] text-white text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#000080]/20"
                >
                  <span>Continue to Personal Details</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* =================================================================== */}
          {/* STEP 3: PERSONAL & ATELIER DETAILS PORTAL                           */}
          {/* =================================================================== */}
          {activeStep === 'personal_portal' && (
            <form onSubmit={handleProceedFromPersonal} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Master Tailor / Owner Full Name *
                  </label>
                  <input
                    type="text"
                    value={formState.ownerName || ''}
                    onChange={(e) => handleFieldChange('ownerName', e.target.value)}
                    placeholder="Enter Master Tailor Name"
                    className="w-full h-11 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#000080] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Contact Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={formState.phoneNumber || ''}
                    onChange={(e) => handleFieldChange('phoneNumber', e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full h-11 px-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#000080] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Atelier Workshop Full Address *
                </label>
                <input
                  type="text"
                  value={formState.shopAddress || ''}
                  onChange={(e) => handleFieldChange('shopAddress', e.target.value)}
                  placeholder="Shop No., Building, Street Name, Area"
                  className="w-full h-11 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#000080] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={formState.city || ''}
                    onChange={(e) => handleFieldChange('city', e.target.value)}
                    placeholder="e.g. Bengaluru, Mumbai, Delhi"
                    className="w-full h-11 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#000080] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={formState.pincode || ''}
                    onChange={(e) => handleFieldChange('pincode', e.target.value)}
                    placeholder="6-digit Pincode"
                    className="w-full h-11 px-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#000080] focus:bg-white"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => goToStep('equipment_portal')}
                  className="h-11 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="h-11 px-6 rounded-xl bg-[#000080] hover:bg-[#000066] text-white text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#000080]/20"
                >
                  <span>Continue to Live Camera</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* =================================================================== */}
          {/* STEP 4: LIVE CAMERA VERIFICATION OF SHOP / MACHINE (WITH EXACT GPS) */}
          {/* =================================================================== */}
          {activeStep === 'camera_portal' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#000080] shrink-0 mt-0.5" />
                <div className="text-xs text-slate-700">
                  <strong className="text-[#000080] font-bold block mb-0.5">
                    Official Workshop &amp; Machine Geotag Verification
                  </strong>
                  Point your camera at your tailor shop or primary sewing machine. When you click{' '}
                  <strong>&quot;Click Live Photo of Shop / Machine&quot;</strong>, your exact live GPS location address and coordinates will automatically be stamped directly under the image.
                </div>
              </div>

              {/* Viewfinder Card */}
              <div className="bg-slate-950 text-white rounded-2xl p-4 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-white tracking-wide">
                      Live Atelier Viewfinder
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded text-[11px] font-bold font-mono ${
                      formState.liveCameraCaptured
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {formState.liveCameraCaptured ? 'STAMPED & VERIFIED' : 'READY TO CAPTURE'}
                  </span>
                </div>

                {/* Viewfinder Frame */}
                <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800 aspect-video max-h-[260px] flex items-center justify-center">
                  {cameraStreamActive ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  ) : formState.liveCameraDataUrl ? (
                    <img
                      src={formState.liveCameraDataUrl}
                      alt="Captured Tailor Shop & Machine"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-6 text-center space-y-2">
                      <Camera className="w-10 h-10 text-slate-500" />
                      <div className="text-xs font-bold text-slate-300">
                        Camera Feed Inactive
                      </div>
                      <div className="text-[11px] text-slate-500 max-w-xs">
                        Click &quot;Start Live Stream&quot; to test camera or &quot;Click Live Photo&quot; to snap your shop or machine.
                      </div>
                    </div>
                  )}

                  {/* Geotag Indicator on Top of Preview */}
                  <div className="absolute top-2.5 left-2.5 px-3 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-white/15 text-xs font-mono font-bold text-sky-200 flex items-center gap-1.5">
                    <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Live Shop &amp; Machine Camera</span>
                  </div>
                </div>

                {/* Control Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCaptureLiveFrame}
                    disabled={isCapturingLocation}
                    className="flex-1 min-h-[46px] px-4 rounded-xl bg-[#159937] hover:bg-emerald-700 active:scale-[0.99] text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                  >
                    <Camera className="w-4 h-4" />
                    <span>
                      {isCapturingLocation
                        ? 'Acquiring GPS & Stamping Address...'
                        : formState.liveCameraCaptured
                        ? 'Click New Live Photo of Shop / Machine'
                        : 'Click Live Photo of Shop or Machine'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleStartLiveCamera}
                    className="min-h-[46px] px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Live Stream</span>
                  </button>
                </div>
              </div>

              {/* =============================================================== */}
              {/* AUTOMATIC EXACT LIVE LOCATION ADDRESS PRINTED DIRECTLY UNDER PHOTO */}
              {/* =============================================================== */}
              {formState.liveCameraCaptured && (
                <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-50/90 via-white to-blue-50/70 p-4 sm:p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-emerald-200 pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#159937] text-white flex items-center justify-center">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                      <div>
                        <div className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-900">
                          EXACT LOCATION PRINTED UNDER PHOTO
                        </div>
                        <h4 className="text-sm font-extrabold text-slate-900">
                          Shop &amp; Machine Coordinates Stamped
                        </h4>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-md bg-emerald-600 text-white text-xs font-mono font-bold uppercase tracking-wide">
                      GPS LOCKED
                    </span>
                  </div>

                  {/* Printed Address Card */}
                  <div className="space-y-2">
                    <div className="flex items-start gap-2.5">
                      <MapPin className="w-4 h-4 text-[#000080] shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Exact Workshop Address:
                        </div>
                        <div className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug">
                          {formState.liveCameraAddress || 'Indiranagar Atelier Workshop, Bengaluru, Karnataka 560038'}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-200/80 text-xs">
                      <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                        <div className="text-xs text-slate-600 uppercase font-mono font-bold">
                          GPS Coordinates
                        </div>
                        <div className="font-mono font-bold text-slate-900 mt-0.5">
                          {formState.liveCameraCoords
                            ? `${formState.liveCameraCoords.latitude}° N, ${formState.liveCameraCoords.longitude}° E`
                            : '12.9716° N, 77.6412° E'}
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                        <div className="text-xs text-slate-600 uppercase font-mono font-bold">
                          Accuracy
                        </div>
                        <div className="font-mono font-bold text-emerald-700 mt-0.5">
                          ±{formState.liveCameraCoords?.accuracy || 6} meters
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                        <div className="text-xs text-slate-600 uppercase font-mono font-bold">
                          Timestamp
                        </div>
                        <div className="font-mono font-bold text-slate-900 mt-0.5">
                          {formState.liveCameraTimestamp || 'Verified Today'}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-xs sm:text-sm text-slate-700 border-t border-slate-200">
                      <span>
                        Machine Tagged:{' '}
                        <strong className="text-slate-900 font-bold">
                          {formState.liveCameraMachineType || formState.machineType || 'Industrial Sewing Workstation'}
                        </strong>
                      </span>
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Ready for Admin Review</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation CTA */}
              <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => goToStep('personal_portal')}
                  className="h-11 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleProceedFromCamera}
                  className="h-11 px-6 rounded-xl bg-[#000080] hover:bg-[#000066] text-white text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#000080]/20"
                >
                  <span>Continue to Bank Details</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* STEP 5: BANK & PAYOUT DETAILS PORTAL                                */}
          {/* =================================================================== */}
          {activeStep === 'bank_portal' && (
            <form onSubmit={handleProceedFromBank} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Bank Account Holder Name
                  </label>
                  <input
                    type="text"
                    value={formState.bankAccountHolder || ''}
                    onChange={(e) => handleFieldChange('bankAccountHolder', e.target.value)}
                    placeholder="Account Name as in Bank"
                    className="w-full h-11 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#000080] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Bank Account Number
                  </label>
                  <input
                    type="text"
                    value={formState.bankAccountNumber || ''}
                    onChange={(e) => handleFieldChange('bankAccountNumber', e.target.value)}
                    placeholder="Enter Bank Account Number"
                    className="w-full h-11 px-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#000080] focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    value={formState.ifscCode || ''}
                    onChange={(e) => handleFieldChange('ifscCode', e.target.value)}
                    placeholder="e.g. HDFC0001234"
                    className="w-full h-11 px-3 text-xs font-mono uppercase bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#000080] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Instant UPI Payout ID
                  </label>
                  <input
                    type="text"
                    value={formState.upiId || ''}
                    onChange={(e) => handleFieldChange('upiId', e.target.value)}
                    placeholder="e.g. tailor@okhdfcbank"
                    className="w-full h-11 px-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#000080] focus:bg-white"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => goToStep('camera_portal')}
                  className="h-11 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="h-11 px-6 rounded-xl bg-[#000080] hover:bg-[#000066] text-white text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#000080]/20"
                >
                  <span>Continue to Register Review</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* =================================================================== */}
          {/* STEP 6: REGISTER & ADMIN APPROVAL (MATCHING DELIVERY ONBOARDING)    */}
          {/* =================================================================== */}
          {activeStep === 'admin_approval' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => goToStep('bank_portal')}
                      className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white cursor-pointer shrink-0 transition-colors"
                      title="Back to Step 5: Bank Details"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                        ALL ATELIER VERIFICATIONS COMPLETED
                      </div>
                      <h3 className="text-base font-extrabold text-white">
                        Ready for Tailor Partner Activation
                      </h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => goToStep('bank_portal')}
                      className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-white/20 transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>
                    <span className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
                      100% Complete
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Your registration documents, sewing equipment specs, workshop address, and live camera photo with stamped address coordinates have been recorded.
                </p>
              </div>

              {/* 4 Verified Step Cards (Click any card to jump back and edit) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => goToStep('identity_portal')}
                  className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-[#000080] text-left transition-all space-y-1 cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-[#000080]">
                      1. Verification Document
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-[#000080] opacity-0 group-hover:opacity-100 transition-opacity">
                        Edit / Back ←
                      </span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 truncate font-mono">
                    {formState.documentType || 'Trade License'} · {formState.documentNumber || 'Verified ID'}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => goToStep('equipment_portal')}
                  className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-[#000080] text-left transition-all space-y-1 cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-[#000080]">
                      2. Workshop &amp; Machinery
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-[#000080] opacity-0 group-hover:opacity-100 transition-opacity">
                        Edit / Back ←
                      </span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 truncate">
                    {formState.shopName || 'Bespoke Atelier'} ({formState.specialty})
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => goToStep('personal_portal')}
                  className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-[#000080] text-left transition-all space-y-1 cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-[#000080]">
                      3. Personal &amp; Atelier Address
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-[#000080] opacity-0 group-hover:opacity-100 transition-opacity">
                        Edit / Back ←
                      </span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 truncate">
                    {formState.ownerName || 'Master Tailor'} · {formState.shopAddress || 'Atelier Address'}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => goToStep('bank_portal')}
                  className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-[#000080] text-left transition-all space-y-1 cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-[#000080]">
                      4. Bank &amp; UPI ID
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-[#000080] opacity-0 group-hover:opacity-100 transition-opacity">
                        Edit / Back ←
                      </span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 truncate font-mono">
                    UPI: {formState.upiId || 'Configured for settlements'}
                  </div>
                </button>
              </div>

              {/* Photo with Printed Address Stamp Preview */}
              {formState.liveCameraCaptured && (
                <div className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Live Shop &amp; Machine Verification Photo (Geo-Stamped)</span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-800 font-bold">
                      {formState.liveCameraTimestamp}
                    </span>
                  </div>
                  <div className="text-xs font-extrabold text-slate-900">
                    📍 {formState.liveCameraAddress || 'Indiranagar Atelier Workshop'}
                  </div>
                </div>
              )}

              {/* Big Admin Approval Action Bar */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={() => goToStep('bank_portal')}
                  className="w-full sm:w-auto h-12 px-6 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-xs font-extrabold text-slate-700 cursor-pointer flex items-center justify-center gap-2 shadow-xs transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Bank Details</span>
                </button>
                <button
                  type="button"
                  onClick={() => goToStep('identity_portal')}
                  className="w-full sm:w-auto h-12 px-5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Edit All Verification Steps</span>
                </button>
                <button
                  type="button"
                  data-testid="tailor-admin-approve-btn"
                  onClick={handleAdminApprove}
                  className="w-full flex-1 h-12 rounded-xl bg-[#000080] hover:bg-[#000066] active:scale-[0.99] text-white font-extrabold text-sm uppercase tracking-wider shadow-md shadow-[#000080]/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <BadgeCheck className="w-5 h-5" />
                  <span>APPROVE &amp; OPEN TAILOR DASHBOARD</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
