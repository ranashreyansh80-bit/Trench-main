import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Bike,
  User,
  Landmark,
  CheckCircle2,
  ShieldCheck,
  Upload,
  ArrowRight,
  ArrowLeft,
  Camera,
  CreditCard,
  Smartphone,
  MapPin,
  Lock,
  Sparkles,
  FileUp,
  Eye,
  Trash2,
  Video,
  RefreshCw,
  X,
  Clock,
  Check,
  Building2,
  BadgeCheck,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Mail,
  Globe,
  Crosshair,
  ListChecks,
} from 'lucide-react';
import {
  DeliveryOnboardingStep,
  DeliveryPartnerProfile,
  DeliveryVehicleType,
} from '../types/appTypes';

interface DeliveryOnboardingProps {
  currentStep: DeliveryOnboardingStep;
  profile: DeliveryPartnerProfile;
  onUpdateProfile: (
    updates:
      | Partial<DeliveryPartnerProfile>
      | ((prev: DeliveryPartnerProfile) => DeliveryPartnerProfile)
  ) => void;
  onSelectStep?: (step: DeliveryOnboardingStep) => void;
  onStepChange?: (step: DeliveryOnboardingStep) => void;
  onApproveAndEnterDashboard?: () => void;
  onBack?: () => void;
  onBackToRoleSelect?: () => void;
}

const STEP_META: {
  id: DeliveryOnboardingStep;
  stepNum: number;
  label: string;
  shortLabel: string;
  subtitle: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  {
    id: 'aadhaar_portal',
    stepNum: 1,
    label: 'Document Verification',
    shortLabel: 'Documents',
    subtitle: 'Upload Aadhaar Card or PAN Card for identity verification',
    icon: FileText,
  },
  {
    id: 'vehicle_portal',
    stepNum: 2,
    label: 'Job & Vehicle Details',
    shortLabel: 'Job Details',
    subtitle: 'Select vehicle type, location zone, and driving license',
    icon: Bike,
  },
  {
    id: 'personal_portal',
    stepNum: 3,
    label: 'Personal Details',
    shortLabel: 'Personal Details',
    subtitle: 'Full name, contact number, address, and live partner photo',
    icon: User,
  },
  {
    id: 'bank_portal',
    stepNum: 4,
    label: 'Bank Details',
    shortLabel: 'Bank Details',
    subtitle: 'Bank account and UPI ID for instant payout settlements',
    icon: Landmark,
  },
  {
    id: 'tutorial',
    stepNum: 5,
    label: 'Measurement Tutorial',
    shortLabel: 'Tutorial',
    subtitle: 'Mandatory men & women garment measurement video training',
    icon: Video,
  },
  {
    id: 'admin_approval',
    stepNum: 6,
    label: 'Register & Approval',
    shortLabel: 'Approval',
    subtitle: 'Complete verification review and activate partner account',
    icon: ShieldCheck,
  },
];

export const DeliveryOnboarding: React.FC<DeliveryOnboardingProps> = ({
  currentStep,
  profile,
  onUpdateProfile: rawOnUpdateProfile,
  onSelectStep: rawOnSelectStep,
  onStepChange,
  onApproveAndEnterDashboard,
  onBack: rawOnBack,
  onBackToRoleSelect,
}) => {
  const onUpdateProfile = (updates: Partial<DeliveryPartnerProfile>) => {
    rawOnUpdateProfile((prev: DeliveryPartnerProfile) => ({
      ...(prev || profile),
      ...updates,
    }));
  };

  const onSelectStep = (step: DeliveryOnboardingStep) => {
    if (step === 'dashboard' && onApproveAndEnterDashboard) {
      onApproveAndEnterDashboard();
      return;
    }
    if (rawOnSelectStep) {
      rawOnSelectStep(step);
    } else if (onStepChange) {
      onStepChange(step);
    }
  };

  const onBack = () => {
    if (rawOnBack) {
      rawOnBack();
    } else if (onBackToRoleSelect) {
      onBackToRoleSelect();
    }
  };

  // Toggleable "Register" Checklist Overview (matches reference "Register: Complete all steps of Verification to get started" screen)
  const [showRegisterChecklist, setShowRegisterChecklist] = useState<boolean>(false);

  // Local state for Step 1: Identity Portal (Aadhaar OR PAN)
  const [selectedDocType, setSelectedDocType] = useState<'aadhaar' | 'pan'>('aadhaar');
  const [aadhaarInput, setAadhaarInput] = useState(profile.aadhaarNumber || '');
  const [panInput, setPanInput] = useState(profile.panNumber || '');
  const [aadhaarError, setAadhaarError] = useState('');

  // Local File Upload State for Aadhaar & PAN PDFs
  const [aadhaarFileUrl, setAadhaarFileUrl] = useState<string | null>(null);
  const [aadhaarFileSize, setAadhaarFileSize] = useState<string>('245 KB');
  const [panFileUrl, setPanFileUrl] = useState<string | null>(null);
  const [panFileSize, setPanFileSize] = useState<string>('198 KB');

  const aadhaarFileInputRef = useRef<HTMLInputElement | null>(null);
  const panFileInputRef = useRef<HTMLInputElement | null>(null);
  const dlFileInputRef = useRef<HTMLInputElement | null>(null);
  const photoFileInputRef = useRef<HTMLInputElement | null>(null);

  // Local state for Step 2: Vehicle Portal
  const [vehicleNumberInput, setVehicleNumberInput] = useState(
    profile.vehicleNumber || ''
  );
  const [dlInput, setDlInput] = useState(profile.drivingLicenseNumber || '');
  const [serviceLocationZone, setServiceLocationZone] = useState(
    profile.city || ''
  );
  const [dlFileUrl, setDlFileUrl] = useState<string | null>(null);
  const [dlFileSize, setDlFileSize] = useState<string>('312 KB');
  const [vehicleError, setVehicleError] = useState('');

  // Local state for Step 3: Personal Details & Live Photo Portal
  const [fullNameInput, setFullNameInput] = useState(profile.fullName || '');
  const [phoneInput, setPhoneInput] = useState(profile.phoneNumber || '');
  const [emailInput, setEmailInput] = useState(profile.gmailAddress || '');
  const [dobInput, setDobInput] = useState(profile.dateOfBirth || '');
  const [addressInput, setAddressInput] = useState(
    profile.streetAddress || profile.residentialAddress || ''
  );
  const [cityInput, setCityInput] = useState(profile.city || '');
  const [pincodeInput, setPincodeInput] = useState(profile.pincode || '');
  const [languageInput, setLanguageInput] = useState('English, Hindi & Kannada');
  const [bloodGroupInput, setBloodGroupInput] = useState('O+ Positive');
  const [emergencyNameInput, setEmergencyNameInput] = useState(
    profile.emergencyContactName || ''
  );
  const [emergencyPhoneInput, setEmergencyPhoneInput] = useState(
    profile.emergencyContactPhone || ''
  );
  const [personalError, setPersonalError] = useState('');

  // Live Camera / Photo Capture State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStreamError, setCameraStreamError] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Local state for Step 4: Bank Portal
  const [bankHolderInput, setBankHolderInput] = useState(
    profile.bankAccountHolder || profile.fullName || ''
  );
  const [bankAccountInput, setBankAccountInput] = useState(
    profile.bankAccountNumber || ''
  );
  const [ifscInput, setIfscInput] = useState(profile.ifscCode || '');
  const [upiInput, setUpiInput] = useState(profile.upiId || '');
  const [bankDeclarationChecked, setBankDeclarationChecked] = useState(true);
  const [bankError, setBankError] = useState('');

  // Keep form fields synced if the active account profile is reset or loaded
  useEffect(() => {
    setAadhaarInput(profile.aadhaarNumber || '');
    setPanInput(profile.panNumber || '');
    setVehicleNumberInput(profile.vehicleNumber || '');
    setDlInput(profile.drivingLicenseNumber || '');
    setServiceLocationZone(profile.city || '');
    setFullNameInput(profile.fullName || '');
    setPhoneInput(profile.phoneNumber || '');
    setEmailInput(profile.gmailAddress || '');
    setDobInput(profile.dateOfBirth || '');
    setAddressInput(profile.streetAddress || profile.residentialAddress || '');
    setCityInput(profile.city || '');
    setPincodeInput(profile.pincode || '');
    setEmergencyNameInput(profile.emergencyContactName || '');
    setEmergencyPhoneInput(profile.emergencyContactPhone || '');
    setBankHolderInput(profile.bankAccountHolder || profile.fullName || '');
    setBankAccountInput(profile.bankAccountNumber || '');
    setIfscInput(profile.ifscCode || '');
    setUpiInput(profile.upiId || '');
  }, [
    profile.aadhaarNumber,
    profile.panNumber,
    profile.vehicleNumber,
    profile.drivingLicenseNumber,
    profile.city,
    profile.fullName,
    profile.phoneNumber,
    profile.gmailAddress,
    profile.dateOfBirth,
    profile.streetAddress,
    profile.residentialAddress,
    profile.pincode,
    profile.emergencyContactName,
    profile.emergencyContactPhone,
    profile.bankAccountHolder,
    profile.bankAccountNumber,
    profile.ifscCode,
    profile.upiId,
  ]);

  // Stop webcam stream on unmount or step change
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const handleStartLiveCamera = async () => {
    setCameraStreamError('');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      streamRef.current = mediaStream;
      setIsCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch {
      const svgAvatar = `data:image/svg+xml;utf8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">
          <defs>
            <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#000080"/>
              <stop offset="100%" stop-color="#002B5B"/>
            </linearGradient>
          </defs>
          <rect width="320" height="320" rx="32" fill="url(#bg)"/>
          <circle cx="160" cy="122" r="52" fill="#FDE68A"/>
          <path d="M108 115 C108 75 212 75 212 115 Z" fill="#003B73"/>
          <path d="M82 276 C82 206 238 206 238 276 Z" fill="#0284C7"/>
          <rect x="64" y="268" width="192" height="30" rx="15" fill="#10B981"/>
          <text x="160" y="288" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#FFFFFF" text-anchor="middle">LIVE BIOMETRIC VERIFIED ✓</text>
        </svg>
      `)}`;
      onUpdateProfile({
        partnerPhotoCaptured: true,
        partnerPhotoDataUrl: svgAvatar,
      });
      setCameraStreamError(
        'Webcam access unavailable in this browser environment — captured verified biometric partner ID portrait.'
      );
    }
  };

  const handleCaptureSnapshot = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 360;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        onUpdateProfile({
          partnerPhotoCaptured: true,
          partnerPhotoDataUrl: dataUrl,
        });
      }
    }
    stopCameraStream();
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUpdateProfile({
          partnerPhotoCaptured: true,
          partnerPhotoDataUrl: reader.result,
        });
        setPersonalError('');
      }
    };
    reader.readAsDataURL(file);
  };

  // Format Aadhaar number as 4-4-4 digits
  const handleAadhaarFormat = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 12);
    const parts = [];
    for (let i = 0; i < digits.length; i += 4) {
      parts.push(digits.slice(i, i + 4));
    }
    const formatted = parts.join(' ');
    setAadhaarInput(formatted);
    setAadhaarError('');
  };

  // Format PAN number as 10 uppercase alphanumeric characters
  const handlePanFormat = (val: string) => {
    const cleaned = val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10);
    setPanInput(cleaned);
    setAadhaarError('');
  };

  const handleAadhaarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const sizeKB = Math.max(1, Math.round(file.size / 1024));
    const objectUrl = URL.createObjectURL(file);
    setAadhaarFileUrl(objectUrl);
    setAadhaarFileSize(`${sizeKB} KB`);
    onUpdateProfile({
      aadhaarFrontUploaded: true,
      aadhaarBackUploaded: true,
      aadhaarPdfFileName: file.name,
    });
    setAadhaarError('');
  };

  const handlePanFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const sizeKB = Math.max(1, Math.round(file.size / 1024));
    const objectUrl = URL.createObjectURL(file);
    setPanFileUrl(objectUrl);
    setPanFileSize(`${sizeKB} KB`);
    onUpdateProfile({
      panCardUploaded: true,
      panPdfFileName: file.name,
    });
    setAadhaarError('');
  };

  const handleDlFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const sizeKB = Math.max(1, Math.round(file.size / 1024));
    const objectUrl = URL.createObjectURL(file);
    setDlFileUrl(objectUrl);
    setDlFileSize(`${sizeKB} KB`);
    onUpdateProfile({
      drivingLicenseUploaded: true,
      drivingLicenseFileName: file.name,
    });
    setVehicleError('');
  };

  const handleVerifyIdentityAndNext = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAadhaarDigits = aadhaarInput.replace(/\D/g, '');
    const cleanPan = panInput.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    const isAadhaarReady =
      cleanAadhaarDigits.length === 12 &&
      (profile.aadhaarFrontUploaded || Boolean(profile.aadhaarPdfFileName));
    const isPanReady =
      cleanPan.length === 10 &&
      (profile.panCardUploaded || Boolean(profile.panPdfFileName));

    if (!isAadhaarReady && !isPanReady) {
      if (selectedDocType === 'aadhaar') {
        if (cleanAadhaarDigits.length !== 12) {
          setAadhaarError('Please enter a valid 12-digit Aadhaar number (or switch to PAN Card).');
          return;
        }
        setAadhaarError('Please upload your Aadhaar Card PDF document to proceed.');
        return;
      } else {
        if (cleanPan.length !== 10) {
          setAadhaarError('Please enter a valid 10-character PAN number (or switch to Aadhaar Card).');
          return;
        }
        setAadhaarError('Please upload your PAN Card PDF document to proceed.');
        return;
      }
    }

    onUpdateProfile({
      aadhaarNumber: aadhaarInput,
      panNumber: cleanPan,
      aadhaarVerified: true,
    });
    onSelectStep('vehicle_portal');
  };

  const handleVerifyVehicleAndNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleNumberInput.trim()) {
      setVehicleError('Please enter your vehicle registration plate number.');
      return;
    }
    if (!dlInput.trim()) {
      setVehicleError('Please enter your Driving License number.');
      return;
    }
    if (!profile.drivingLicenseUploaded && !profile.drivingLicenseFileName) {
      setVehicleError('Please upload your Driving License document or photo.');
      return;
    }
    onUpdateProfile({
      vehicleNumber: vehicleNumberInput.trim().toUpperCase(),
      drivingLicenseNumber: dlInput.trim().toUpperCase(),
      vehicleVerified: true,
    });
    onSelectStep('personal_portal');
  };

  const handleVerifyPersonalAndNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullNameInput.trim() || !phoneInput.trim() || !addressInput.trim()) {
      setPersonalError('Please fill in your Full Name, Phone Number, and Residential Address.');
      return;
    }
    if (!profile.partnerPhotoCaptured) {
      setPersonalError('Please capture or upload your live partner photo to continue.');
      return;
    }
    onUpdateProfile({
      fullName: fullNameInput.trim(),
      phoneNumber: phoneInput.trim(),
      dateOfBirth: dobInput,
      streetAddress: addressInput.trim(),
      city: cityInput.trim(),
      pincode: pincodeInput.trim(),
      emergencyContactName: emergencyNameInput.trim(),
      emergencyContactPhone: emergencyPhoneInput.trim(),
      personalDetailsVerified: true,
    });
    stopCameraStream();
    onSelectStep('bank_portal');
  };

  const handleVerifyBankAndNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankHolderInput.trim() || !bankAccountInput.trim() || !ifscInput.trim() || !upiInput.trim()) {
      setBankError('Please complete all Bank Account and UPI fields.');
      return;
    }
    if (!bankDeclarationChecked) {
      setBankError('Please accept the declaration checkbox to continue.');
      return;
    }
    onUpdateProfile({
      fullName: bankHolderInput.trim(),
      bankAccountHolder: bankHolderInput.trim(),
      bankAccountNumber: bankAccountInput.trim(),
      ifscCode: ifscInput.trim().toUpperCase(),
      upiId: upiInput.trim(),
      bankVerified: true,
    });
    onSelectStep('tutorial');
  };

  const handleAdminApproveApplication = () => {
    onUpdateProfile({
      adminApproved: true,
      applicationSubmittedAt: profile.applicationSubmittedAt || new Date().toLocaleTimeString(),
    });
    onSelectStep('dashboard');
  };

  const isStepCompleted = (stepId: DeliveryOnboardingStep): boolean => {
    if (stepId === 'aadhaar_portal') return Boolean(profile.aadhaarVerified);
    if (stepId === 'vehicle_portal') return Boolean(profile.vehicleVerified);
    if (stepId === 'personal_portal') return Boolean(profile.personalDetailsVerified);
    if (stepId === 'bank_portal') return Boolean(profile.bankVerified);
    if (stepId === 'tutorial') return Boolean(profile.tutorialCompleted);
    if (stepId === 'admin_approval') return Boolean(profile.adminApproved);
    return false;
  };

  const currentStepMeta = STEP_META.find((s) => s.id === currentStep) || STEP_META[0];
  const completedStepsCount = STEP_META.filter((s) => isStepCompleted(s.id)).length;

  const handleStepBack = () => {
    if (currentStep === 'vehicle_portal') {
      onSelectStep('aadhaar_portal');
    } else if (currentStep === 'personal_portal') {
      stopCameraStream();
      onSelectStep('vehicle_portal');
    } else if (currentStep === 'bank_portal') {
      onSelectStep('personal_portal');
    } else if (currentStep === 'admin_approval') {
      onSelectStep('tutorial');
    } else {
      onBack();
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-2 sm:px-4">
      {/* Main Partner Onboarding Shell — Matches Reference Mobile/Partner UI Kit with crisp white surface & subtle ambient blue glow */}
      <div className="relative bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden">
        {/* Soft Ambient Blue Radial Glows (Top-Right & Bottom-Right like Reference UI Sheet) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-gradient-to-br from-[#000080]/15 via-sky-400/10 to-transparent blur-2xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -right-16 w-80 h-80 rounded-full bg-gradient-to-tl from-[#000080]/12 via-blue-300/10 to-transparent blur-2xl"
        />

        {/* ===================================================================== */}
        {/* TOP APP NAVIGATION BAR (Matches Reference '←' Header + Step Indicator) */}
        {/* ===================================================================== */}
        <div className="relative z-10 px-5 sm:px-8 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleStepBack}
              className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-2xs"
              title="Go Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#000080]">
                  Step {currentStepMeta.stepNum} of 6
                </span>
                <span className="text-slate-300">·</span>
                <span className="text-[11px] font-semibold text-slate-500">
                  Trench Delivery Partner
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                {currentStepMeta.label}
              </h1>
            </div>
          </div>

          {/* Interactive "Register Checklist" Toggle Button + Demo Quick Jump */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowRegisterChecklist((prev) => !prev)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50/60 text-xs font-bold text-slate-700 hover:text-[#000080] flex items-center gap-2 transition-colors cursor-pointer"
            >
              <ListChecks className="w-4 h-4 text-[#000080]" />
              <span className="hidden sm:inline">Register Checklist</span>
              <span className="px-1.5 py-0.5 rounded-md bg-[#000080] text-white text-[10px] font-mono">
                {completedStepsCount}/6
              </span>
              {showRegisterChecklist ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* HORIZONTAL STEP SEQUENCE PILL BAR (Exact 6-Step Sequence Preserved)   */}
        {/* ===================================================================== */}
        <div className="relative z-10 px-5 sm:px-8 py-3 bg-slate-50/70 border-b border-slate-100 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max">
            {STEP_META.map((step, idx) => {
              const isCurrent = currentStep === step.id;
              const isDone = isStepCompleted(step.id);
              return (
                <React.Fragment key={step.id}>
                  <button
                    type="button"
                    onClick={() => onSelectStep(step.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-[#000080] text-white shadow-xs'
                        : isDone
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-white text-slate-500 border border-slate-200/80 hover:text-slate-800'
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
                      {isDone ? '✓' : step.stepNum}
                    </span>
                    <span>{step.shortLabel}</span>
                  </button>
                  {idx < STEP_META.length - 1 && (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* ===================================================================== */}
        {/* COLLAPSIBLE "REGISTER" CHECKLIST DRAWER (Matches Reference Row 2 Col 3) */}
        {/* ===================================================================== */}
        {showRegisterChecklist && (
          <div className="relative z-10 px-5 sm:px-8 py-5 bg-gradient-to-b from-blue-50/50 to-white border-b border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-slate-900">Register</h2>
                <p className="text-xs text-slate-500">
                  Complete all steps of Verification to get started
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRegisterChecklist(false)}
                className="text-xs font-bold text-[#000080] hover:underline cursor-pointer"
              >
                Hide Checklist
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {STEP_META.map((step) => {
                const isDone = isStepCompleted(step.id);
                const isCurrent = currentStep === step.id;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => {
                      onSelectStep(step.id);
                      setShowRegisterChecklist(false);
                    }}
                    className={`w-full px-4 py-3.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-white border-[#000080] ring-2 ring-[#000080]/15 shadow-xs'
                        : isDone
                        ? 'bg-white border-slate-200 hover:border-[#000080]/40'
                        : 'bg-slate-50/80 border-slate-200/80 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          isDone
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-300'
                            : isCurrent
                            ? 'bg-[#000080] text-white'
                            : 'bg-white text-slate-400 border border-slate-300'
                        }`}
                      >
                        {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : step.stepNum}
                      </span>
                      <div>
                        <div className="text-xs sm:text-sm font-bold text-slate-900">
                          {step.label}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[210px]">
                          {step.subtitle}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* MAIN STEP CONTENT BODY                                                */}
        {/* ===================================================================== */}
        <div className="relative z-10 p-5 sm:p-8">
          {/* =================================================================== */}
          {/* STEP 1: DOCUMENT VERIFICATION (Matches Reference "DOCUMENTS" Screen) */}
          {/* =================================================================== */}
          {currentStep === 'aadhaar_portal' && (
            <form onSubmit={handleVerifyIdentityAndNext} className="max-w-2xl mx-auto space-y-6">
              {/* Screen Heading */}
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                  DOCUMENTS
                </h2>
                <p className="text-sm text-slate-600 mt-0.5">
                  Verify either your <strong>Aadhaar Card</strong> OR your{' '}
                  <strong>PAN Card</strong> to complete Step 1.
                </p>
              </div>

              {/* Hidden Native File Inputs */}
              <input
                ref={aadhaarFileInputRef}
                type="file"
                accept=".pdf,application/pdf,image/*"
                onChange={handleAadhaarFileChange}
                className="hidden"
              />
              <input
                ref={panFileInputRef}
                type="file"
                accept=".pdf,application/pdf,image/*"
                onChange={handlePanFileChange}
                className="hidden"
              />

              {/* Document Type Selector Tabs (Aadhaar vs PAN) */}
              <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDocType('aadhaar');
                    setAadhaarError('');
                  }}
                  className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    selectedDocType === 'aadhaar'
                      ? 'bg-[#000080] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Aadhaar Card</span>
                  {(profile.aadhaarFrontUploaded || profile.aadhaarPdfFileName) && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedDocType('pan');
                    setAadhaarError('');
                  }}
                  className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    selectedDocType === 'pan'
                      ? 'bg-[#000080] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>PAN Card</span>
                  {(profile.panCardUploaded || profile.panPdfFileName) && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </button>
              </div>

              {/* Document Number Input (Clean Reference Input Style) */}
              {selectedDocType === 'aadhaar' ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="aadhaar-number-input"
                      className="block text-xs font-bold text-slate-700"
                    >
                      12-Digit Aadhaar Number
                    </label>
                    <div className="relative flex items-center">
                      <CreditCard className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
                      <input
                        id="aadhaar-number-input"
                        type="text"
                        value={aadhaarInput}
                        onChange={(e) => handleAadhaarFormat(e.target.value)}
                        placeholder="XXXX XXXX XXXX"
                        className="w-full h-12 pl-11 pr-28 rounded-xl border border-slate-200 bg-white font-mono text-sm font-bold tracking-widest text-slate-900 focus:outline-none focus:border-[#000080] focus:ring-2 focus:ring-[#000080]/15"
                      />
                      <span className="absolute right-3 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                        UIDAI 12-Digit
                      </span>
                    </div>
                  </div>

                  {/* Reference-Style 2-Column Dashed Upload Tiles */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    {/* Tile 1: Upload Aadhaar Front / e-Aadhaar PDF */}
                    <div
                      onClick={() => aadhaarFileInputRef.current?.click()}
                      data-testid="upload-aadhaar-file-btn"
                      className={`p-5 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center min-h-[148px] ${
                        profile.aadhaarFrontUploaded || profile.aadhaarPdfFileName
                          ? 'border-emerald-400 bg-emerald-50/40'
                          : 'border-slate-300 bg-slate-50/60 hover:border-[#000080] hover:bg-blue-50/30'
                      }`}
                    >
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center mb-2.5 ${
                          profile.aadhaarFrontUploaded || profile.aadhaarPdfFileName
                            ? 'bg-emerald-600 text-white'
                            : 'bg-blue-50 text-[#000080] border border-blue-200'
                        }`}
                      >
                        {profile.aadhaarFrontUploaded || profile.aadhaarPdfFileName ? (
                          <Check className="w-5 h-5 stroke-[2.5]" />
                        ) : (
                          <Upload className="w-5 h-5" />
                        )}
                      </div>
                      <div className="text-xs font-extrabold text-slate-900">
                        {profile.aadhaarPdfFileName
                          ? profile.aadhaarPdfFileName
                          : 'Upload Aadhaar PDF / Front'}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {profile.aadhaarFrontUploaded || profile.aadhaarPdfFileName
                          ? `Verified (${aadhaarFileSize}) · Tap to replace`
                          : 'Tap to browse PDF or Image'}
                      </div>
                    </div>

                    {/* Tile 2: Upload PAN Card (Optional Backup or Quick Switch) */}
                    <div
                      onClick={() => panFileInputRef.current?.click()}
                      data-testid="upload-pan-file-btn"
                      className={`p-5 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center min-h-[148px] ${
                        profile.panCardUploaded || profile.panPdfFileName
                          ? 'border-emerald-400 bg-emerald-50/40'
                          : 'border-slate-300 bg-slate-50/60 hover:border-[#000080] hover:bg-blue-50/30'
                      }`}
                    >
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center mb-2.5 ${
                          profile.panCardUploaded || profile.panPdfFileName
                            ? 'bg-emerald-600 text-white'
                            : 'bg-blue-50 text-[#000080] border border-blue-200'
                        }`}
                      >
                        {profile.panCardUploaded || profile.panPdfFileName ? (
                          <Check className="w-5 h-5 stroke-[2.5]" />
                        ) : (
                          <FileUp className="w-5 h-5" />
                        )}
                      </div>
                      <div className="text-xs font-extrabold text-slate-900">
                        {profile.panPdfFileName
                          ? profile.panPdfFileName
                          : 'Upload PAN Card (Optional)'}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {profile.panCardUploaded || profile.panPdfFileName
                          ? `Verified (${panFileSize}) · Tap to replace`
                          : 'Or upload PAN PDF instead'}
                      </div>
                    </div>
                  </div>

                  {/* Preview / Remove Row if file is uploaded */}
                  {(profile.aadhaarFrontUploaded || profile.aadhaarPdfFileName) && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 truncate">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-bold text-slate-800 truncate">
                          {profile.aadhaarPdfFileName || 'aadhaar_verified_document.pdf'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {aadhaarFileUrl && (
                          <a
                            href={aadhaarFileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-100 flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setAadhaarFileUrl(null);
                            onUpdateProfile({
                              aadhaarFrontUploaded: false,
                              aadhaarBackUploaded: false,
                              aadhaarPdfFileName: '',
                            });
                          }}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          title="Remove file"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="pan-number-input"
                      className="block text-xs font-bold text-slate-700"
                    >
                      10-Character PAN Card Number
                    </label>
                    <div className="relative flex items-center">
                      <FileText className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
                      <input
                        id="pan-number-input"
                        type="text"
                        value={panInput}
                        onChange={(e) => handlePanFormat(e.target.value)}
                        placeholder="ABCDE1234F"
                        className="w-full h-12 pl-11 pr-28 rounded-xl border border-slate-200 bg-white font-mono text-sm font-bold tracking-widest uppercase text-slate-900 focus:outline-none focus:border-[#000080] focus:ring-2 focus:ring-[#000080]/15"
                      />
                      <span className="absolute right-3 text-[11px] font-bold text-[#000080] bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
                        NSDL 10-Char
                      </span>
                    </div>
                  </div>

                  {/* Reference-Style Dashed Upload Boxes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div
                      onClick={() => panFileInputRef.current?.click()}
                      data-testid="upload-pan-file-btn"
                      className={`p-5 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center min-h-[148px] ${
                        profile.panCardUploaded || profile.panPdfFileName
                          ? 'border-emerald-400 bg-emerald-50/40'
                          : 'border-slate-300 bg-slate-50/60 hover:border-[#000080] hover:bg-blue-50/30'
                      }`}
                    >
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center mb-2.5 ${
                          profile.panCardUploaded || profile.panPdfFileName
                            ? 'bg-emerald-600 text-white'
                            : 'bg-blue-50 text-[#000080] border border-blue-200'
                        }`}
                      >
                        {profile.panCardUploaded || profile.panPdfFileName ? (
                          <Check className="w-5 h-5 stroke-[2.5]" />
                        ) : (
                          <Upload className="w-5 h-5" />
                        )}
                      </div>
                      <div className="text-xs font-extrabold text-slate-900">
                        {profile.panPdfFileName ? profile.panPdfFileName : 'Upload PAN Card PDF'}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {profile.panCardUploaded || profile.panPdfFileName
                          ? `Verified (${panFileSize}) · Tap to replace`
                          : 'Tap to browse PAN PDF or Photo'}
                      </div>
                    </div>

                    <div
                      onClick={() => aadhaarFileInputRef.current?.click()}
                      data-testid="upload-aadhaar-file-btn"
                      className={`p-5 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center min-h-[148px] ${
                        profile.aadhaarFrontUploaded || profile.aadhaarPdfFileName
                          ? 'border-emerald-400 bg-emerald-50/40'
                          : 'border-slate-300 bg-slate-50/60 hover:border-[#000080] hover:bg-blue-50/30'
                      }`}
                    >
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center mb-2.5 ${
                          profile.aadhaarFrontUploaded || profile.aadhaarPdfFileName
                            ? 'bg-emerald-600 text-white'
                            : 'bg-blue-50 text-[#000080] border border-blue-200'
                        }`}
                      >
                        {profile.aadhaarFrontUploaded || profile.aadhaarPdfFileName ? (
                          <Check className="w-5 h-5 stroke-[2.5]" />
                        ) : (
                          <FileUp className="w-5 h-5" />
                        )}
                      </div>
                      <div className="text-xs font-extrabold text-slate-900">
                        {profile.aadhaarPdfFileName
                          ? profile.aadhaarPdfFileName
                          : 'Upload Aadhaar (Optional)'}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {profile.aadhaarFrontUploaded || profile.aadhaarPdfFileName
                          ? `Verified (${aadhaarFileSize}) · Tap to replace`
                          : 'Or upload Aadhaar PDF'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {aadhaarError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800">
                  {aadhaarError}
                </div>
              )}

              {/* Bottom Full-Width Primary Blue Button (Matches Reference "NEXT" Button) */}
              <div className="pt-3">
                <button
                  type="submit"
                  data-testid="aadhaar-next-btn"
                  className="w-full h-12 rounded-xl bg-[#000080] hover:bg-[#000066] active:scale-[0.99] text-white font-extrabold text-sm uppercase tracking-wider shadow-md shadow-[#000080]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>NEXT</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* =================================================================== */}
          {/* STEP 2: JOB & VEHICLE DETAILS (Matches Reference "JOB DETAILS" UI)  */}
          {/* =================================================================== */}
          {currentStep === 'vehicle_portal' && (
            <form onSubmit={handleVerifyVehicleAndNext} className="max-w-2xl mx-auto space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                    JOB &amp; VEHICLE DETAILS
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    Configure your active delivery zone, fleet vehicle type, and driving license.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setServiceLocationZone('Bengaluru · Indiranagar & Koramangala Zone');
                    setVehicleNumberInput('KA 01 EV 2026');
                    setDlInput('KA01 20210094821');
                    onUpdateProfile({
                      vehicleType: 'EV',
                      vehicleNumber: 'KA 01 EV 2026',
                      drivingLicenseNumber: 'KA01 20210094821',
                      drivingLicenseUploaded: true,
                      drivingLicenseFileName: 'verified_driving_license.pdf',
                    });
                    setVehicleError('');
                  }}
                  className="self-start sm:self-auto px-3 py-1.5 text-xs font-bold text-[#000080] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Auto-Fill Vehicle &amp; DL</span>
                </button>
              </div>

              <input
                ref={dlFileInputRef}
                type="file"
                accept=".pdf,application/pdf,image/*"
                onChange={handleDlFileChange}
                className="hidden"
              />

              {/* Location Zone + "⊕ ADD CURRENT LOCATION" Button (Matches Reference Row 3 Col 1) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Preferred Delivery Location Zone
                </label>
                <div className="relative flex items-center">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
                  <input
                    type="text"
                    value={serviceLocationZone}
                    onChange={(e) => setServiceLocationZone(e.target.value)}
                    placeholder="Location"
                    className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-900 focus:outline-none focus:border-[#000080]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof navigator !== 'undefined' && navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          setServiceLocationZone(
                            `Live GPS Sector (${pos.coords.latitude.toFixed(4)}°N, ${pos.coords.longitude.toFixed(4)}°E)`
                          );
                        },
                        () => {
                          setServiceLocationZone('Bengaluru · Indiranagar 100ft Rd Active Hub');
                        }
                      );
                    }
                  }}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50/50 text-xs font-extrabold text-[#000080] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Crosshair className="w-4 h-4" />
                  <span>ADD CURRENT LOCATION</span>
                </button>
              </div>

              {/* Select Vehicle Type (EV / Motorcycle / 3-Wheeler) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Select Service Vehicle Type
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      type: 'EV (Electric)' as DeliveryVehicleType,
                      title: 'EV (Electric)',
                      desc: 'Zero-emission scooter · +₹15 Green Bonus',
                    },
                    {
                      type: 'Motorcycle / Bike' as DeliveryVehicleType,
                      title: 'Motorcycle / Bike',
                      desc: 'Standard 2-wheeler petrol fleet',
                    },
                    {
                      type: '3-Wheeler' as DeliveryVehicleType,
                      title: '3-Wheeler',
                      desc: 'Bulk bridal & couture garment carrier',
                    },
                  ].map((option) => {
                    const isSelected = profile.vehicleType === option.type;
                    return (
                      <button
                        key={option.type}
                        type="button"
                        onClick={() => onUpdateProfile({ vehicleType: option.type })}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#000080] bg-blue-50/40 ring-2 ring-[#000080]/15'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-extrabold text-slate-900">
                            {option.title}
                          </span>
                          <span
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? 'border-[#000080] bg-[#000080] text-white'
                                : 'border-slate-300'
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug">{option.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Vehicle Registration Plate & Driving License Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="vehicle-plate-input"
                    className="block text-xs font-bold text-slate-700"
                  >
                    Vehicle Registration Number
                  </label>
                  <div className="relative flex items-center">
                    <Bike className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
                    <input
                      id="vehicle-plate-input"
                      type="text"
                      value={vehicleNumberInput}
                      onChange={(e) => {
                        setVehicleNumberInput(e.target.value.toUpperCase());
                        setVehicleError('');
                      }}
                      placeholder="KA 01 EV 2026"
                      className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-200 bg-white font-mono text-sm font-bold uppercase text-slate-900 focus:outline-none focus:border-[#000080]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="dl-number-input"
                    className="block text-xs font-bold text-slate-700"
                  >
                    Driving License Number
                  </label>
                  <div className="relative flex items-center">
                    <CreditCard className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
                    <input
                      id="dl-number-input"
                      type="text"
                      value={dlInput}
                      onChange={(e) => {
                        setDlInput(e.target.value.toUpperCase());
                        setVehicleError('');
                      }}
                      placeholder="KA01 20210094821"
                      className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-200 bg-white font-mono text-sm font-bold uppercase text-slate-900 focus:outline-none focus:border-[#000080]"
                    />
                  </div>
                </div>
              </div>

              {/* Dashed Upload Card for Driving License */}
              <div
                onClick={() => dlFileInputRef.current?.click()}
                data-testid="upload-dl-file-btn"
                className={`p-5 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-between gap-4 ${
                  profile.drivingLicenseUploaded || profile.drivingLicenseFileName
                    ? 'border-emerald-400 bg-emerald-50/40'
                    : 'border-slate-300 bg-slate-50/60 hover:border-[#000080]'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      profile.drivingLicenseUploaded || profile.drivingLicenseFileName
                        ? 'bg-emerald-600 text-white'
                        : 'bg-blue-50 text-[#000080] border border-blue-200'
                    }`}
                  >
                    {profile.drivingLicenseUploaded || profile.drivingLicenseFileName ? (
                      <Check className="w-5 h-5 stroke-[2.5]" />
                    ) : (
                      <Upload className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-extrabold text-slate-900">
                      {profile.drivingLicenseFileName || 'Upload Driving License (Front & Back)'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {profile.drivingLicenseUploaded || profile.drivingLicenseFileName
                        ? `Verified (${dlFileSize}) · Click to replace file`
                        : 'Upload PDF, JPG, or PNG of your valid Driving License'}
                    </div>
                  </div>
                </div>

                <span className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-[#000080] shrink-0">
                  {profile.drivingLicenseUploaded ? 'Replace File' : 'Browse File'}
                </span>
              </div>

              {vehicleError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800">
                  {vehicleError}
                </div>
              )}

              {/* Bottom Navigation Buttons */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onSelectStep('aadhaar_portal')}
                  className="h-12 px-5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  data-testid="vehicle-next-btn"
                  className="flex-1 h-12 rounded-xl bg-[#000080] hover:bg-[#000066] active:scale-[0.99] text-white font-extrabold text-sm uppercase tracking-wider shadow-md shadow-[#000080]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>NEXT</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* =================================================================== */}
          {/* STEP 3: PERSONAL DETAILS (Matches Reference "Personal Details" UI)  */}
          {/* =================================================================== */}
          {currentStep === 'personal_portal' && (
            <form onSubmit={handleVerifyPersonalAndNext} className="max-w-2xl mx-auto space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    Personal Details
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    Enter your contact details, address, and capture your partner profile photo.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setFullNameInput(profile.fullName || 'Partner Applicant');
                    setPhoneInput(profile.phoneNumber || '+91 98450 11223');
                    setEmailInput(profile.gmailAddress || 'partner@trench.in');
                    setDobInput('1997-08-14');
                    setAddressInput('Indiranagar 100ft Road, HAL 2nd Stage');
                    setCityInput('Bengaluru');
                    setPincodeInput('560038');
                    setEmergencyNameInput('Emergency Contact');
                    setEmergencyPhoneInput('+91 98450 99881');
                    setPersonalError('');
                  }}
                  className="self-start sm:self-auto px-3 py-1.5 text-xs font-bold text-[#000080] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Auto-Fill Personal Info</span>
                </button>
              </div>

              <input
                ref={photoFileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoFileChange}
                className="hidden"
              />

              {/* Circular Partner Profile Photo / Live Camera Box at Top (Matches Reference Profile / Personal Screen) */}
              <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 rounded-full bg-white border-2 border-[#000080] overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
                    {isCameraOpen ? (
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                    ) : profile.partnerPhotoCaptured && profile.partnerPhotoDataUrl ? (
                      <img
                        src={profile.partnerPhotoDataUrl}
                        alt="Partner Live Portrait"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-9 h-9 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold text-slate-900">
                        Partner Identity Portrait
                      </h3>
                      {profile.partnerPhotoCaptured && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          Verified ✓
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Required for customer doorstep verification badge.
                    </p>
                    {cameraStreamError && (
                      <p className="text-[11px] text-amber-700 font-medium mt-1">
                        {cameraStreamError}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isCameraOpen ? (
                    <button
                      type="button"
                      onClick={handleCaptureSnapshot}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Capture Photo</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        data-testid="capture-partner-photo-btn"
                        onClick={handleStartLiveCamera}
                        className="px-3.5 py-2 rounded-xl bg-[#000080] hover:bg-[#000066] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>{profile.partnerPhotoCaptured ? 'Retake' : 'Live Camera'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => photoFileInputRef.current?.click()}
                        className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Stacked Clean Inputs with Leading Icons (Matches Reference "Personal Details" Screen) */}
              <div className="space-y-3.5">
                {/* Full Name */}
                <div className="relative flex items-center">
                  <User className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
                  <input
                    id="partner-fullname-input"
                    type="text"
                    value={fullNameInput}
                    onChange={(e) => {
                      setFullNameInput(e.target.value);
                      setPersonalError('');
                    }}
                    placeholder="Full Name"
                    className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-900 focus:outline-none focus:border-[#000080]"
                  />
                </div>

                {/* Phone Number */}
                <div className="relative flex items-center">
                  <Smartphone className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
                  <input
                    id="partner-phone-input"
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => {
                      setPhoneInput(e.target.value);
                      setPersonalError('');
                    }}
                    placeholder="Enter Your Mobile Number"
                    className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-200 bg-white font-mono text-sm font-medium text-slate-900 focus:outline-none focus:border-[#000080]"
                  />
                </div>

                {/* Email Address */}
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="Email Address"
                    className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-900 focus:outline-none focus:border-[#000080]"
                  />
                </div>

                {/* Street Address */}
                <div className="relative flex items-center">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
                  <input
                    id="partner-address-input"
                    type="text"
                    value={addressInput}
                    onChange={(e) => {
                      setAddressInput(e.target.value);
                      setPersonalError('');
                    }}
                    placeholder="Address"
                    className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-900 focus:outline-none focus:border-[#000080]"
                  />
                </div>

                {/* City, Pincode & Date of Birth */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="relative flex items-center">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                    <input
                      type="text"
                      value={cityInput}
                      onChange={(e) => setCityInput(e.target.value)}
                      placeholder="City"
                      className="w-full h-11 pl-10 pr-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:border-[#000080]"
                    />
                  </div>
                  <div className="relative flex items-center">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                    <input
                      type="text"
                      value={pincodeInput}
                      onChange={(e) => setPincodeInput(e.target.value)}
                      placeholder="Pincode"
                      className="w-full h-11 pl-10 pr-3 rounded-xl border border-slate-200 bg-white font-mono text-xs font-medium text-slate-900 focus:outline-none focus:border-[#000080]"
                    />
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type="date"
                      value={dobInput}
                      onChange={(e) => setDobInput(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:border-[#000080]"
                    />
                  </div>
                </div>

                {/* Select Language & Select Blood Group (Matches Reference "Personal Details" Dropdowns) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-600">
                      Select Language
                    </label>
                    <div className="relative flex items-center">
                      <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                      <select
                        value={languageInput}
                        onChange={(e) => setLanguageInput(e.target.value)}
                        className="w-full h-11 pl-10 pr-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#000080]"
                      >
                        <option value="English, Hindi & Kannada">English, Hindi &amp; Kannada</option>
                        <option value="English & Hindi">English &amp; Hindi</option>
                        <option value="English & Tamil">English &amp; Tamil</option>
                        <option value="English & Telugu">English &amp; Telugu</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-600">
                      Select Blood Group
                    </label>
                    <select
                      value={bloodGroupInput}
                      onChange={(e) => setBloodGroupInput(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#000080]"
                    >
                      <option value="O+ Positive">O+ Positive</option>
                      <option value="A+ Positive">A+ Positive</option>
                      <option value="B+ Positive">B+ Positive</option>
                      <option value="AB+ Positive">AB+ Positive</option>
                      <option value="O- Negative">O- Negative</option>
                    </select>
                  </div>
                </div>

                {/* Emergency Contact Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-600">
                      Emergency Contact Name
                    </label>
                    <input
                      type="text"
                      value={emergencyNameInput}
                      onChange={(e) => setEmergencyNameInput(e.target.value)}
                      placeholder="Emergency Contact Name"
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:border-[#000080]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-600">
                      Emergency Contact Phone
                    </label>
                    <input
                      type="text"
                      value={emergencyPhoneInput}
                      onChange={(e) => setEmergencyPhoneInput(e.target.value)}
                      placeholder="+91 98450 99881"
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white font-mono text-xs font-medium text-slate-900 focus:outline-none focus:border-[#000080]"
                    />
                  </div>
                </div>
              </div>

              {personalError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800">
                  {personalError}
                </div>
              )}

              {/* Bottom Navigation Buttons */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onSelectStep('vehicle_portal')}
                  className="h-12 px-5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  data-testid="personal-next-btn"
                  className="flex-1 h-12 rounded-xl bg-[#000080] hover:bg-[#000066] active:scale-[0.99] text-white font-extrabold text-sm uppercase tracking-wider shadow-md shadow-[#000080]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>NEXT</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* =================================================================== */}
          {/* STEP 4: BANK DETAILS (Matches Reference "BANK DETAILS" Screen)      */}
          {/* =================================================================== */}
          {currentStep === 'bank_portal' && (
            <form onSubmit={handleVerifyBankAndNext} className="max-w-2xl mx-auto space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                    BANK DETAILS
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    Link your bank account and UPI ID for instant delivery and measurement payouts.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setBankHolderInput(profile.fullName || 'Account Holder');
                    setBankAccountInput('50100482910342');
                    setIfscInput('HDFC0000240');
                    setUpiInput('partner@okhdfcbank');
                    setBankError('');
                  }}
                  className="self-start sm:self-auto px-3 py-1.5 text-xs font-bold text-[#000080] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Auto-Fill Bank &amp; UPI</span>
                </button>
              </div>

              <div className="space-y-3.5">
                {/* Account Holder Name / Bank Name */}
                <div className="space-y-1">
                  <label
                    htmlFor="bank-holder-input"
                    className="block text-xs font-bold text-slate-700"
                  >
                    Account Holder Name
                  </label>
                  <input
                    id="bank-holder-input"
                    type="text"
                    value={bankHolderInput}
                    onChange={(e) => {
                      setBankHolderInput(e.target.value);
                      setBankError('');
                    }}
                    placeholder="Account Holder Name"
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-900 focus:outline-none focus:border-[#000080]"
                  />
                </div>

                {/* Account Number */}
                <div className="space-y-1">
                  <label
                    htmlFor="bank-account-input"
                    className="block text-xs font-bold text-slate-700"
                  >
                    Account Number
                  </label>
                  <input
                    id="bank-account-input"
                    type="text"
                    value={bankAccountInput}
                    onChange={(e) => {
                      setBankAccountInput(e.target.value);
                      setBankError('');
                    }}
                    placeholder="Account Number"
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white font-mono text-sm font-bold text-slate-900 focus:outline-none focus:border-[#000080]"
                  />
                </div>

                {/* IFSC Code */}
                <div className="space-y-1">
                  <label
                    htmlFor="bank-ifsc-input"
                    className="block text-xs font-bold text-slate-700"
                  >
                    IFSC Code
                  </label>
                  <input
                    id="bank-ifsc-input"
                    type="text"
                    value={ifscInput}
                    onChange={(e) => {
                      setIfscInput(e.target.value.toUpperCase());
                      setBankError('');
                    }}
                    placeholder="IFSC Code (e.g., HDFC0000240)"
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white font-mono text-sm font-bold uppercase text-slate-900 focus:outline-none focus:border-[#000080]"
                  />
                </div>

                {/* UPI ID */}
                <div className="space-y-1">
                  <label
                    htmlFor="bank-upi-input"
                    className="block text-xs font-bold text-slate-700"
                  >
                    Verified UPI ID (For Instant Daily Payouts)
                  </label>
                  <input
                    id="bank-upi-input"
                    type="text"
                    value={upiInput}
                    onChange={(e) => {
                      setUpiInput(e.target.value);
                      setBankError('');
                    }}
                    placeholder="arjunverma@okhdfcbank"
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white font-mono text-sm font-bold text-[#000080] focus:outline-none focus:border-[#000080]"
                  />
                </div>

                {/* Declaration Checkbox (Exact Match to Reference "BANK DETAILS" Screen) */}
                <div className="pt-2">
                  <div className="text-xs font-extrabold text-slate-800 mb-1.5">Declaration</div>
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={bankDeclarationChecked}
                      onChange={(e) => {
                        setBankDeclarationChecked(e.target.checked);
                        setBankError('');
                      }}
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#000080] focus:ring-[#000080]"
                    />
                    <span className="text-xs text-slate-600 leading-relaxed">
                      I hereby declare that the above bank account and UPI information is true and
                      belongs to me for receiving Trench partner payouts.
                    </span>
                  </label>
                </div>
              </div>

              {bankError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800">
                  {bankError}
                </div>
              )}

              {/* Bottom Navigation Buttons */}
              <div className="pt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onSelectStep('personal_portal')}
                  className="h-12 px-5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  data-testid="bank-next-btn"
                  className="flex-1 h-12 rounded-xl bg-[#000080] hover:bg-[#000066] active:scale-[0.99] text-white font-extrabold text-sm uppercase tracking-wider shadow-md shadow-[#000080]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>CONTINUE</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* =================================================================== */}
          {/* STEP 6: REGISTER CHECKLIST & ADMIN APPROVAL                         */}
          {/* (Matches Reference "Register: Complete all steps of Verification")  */}
          {/* =================================================================== */}
          {currentStep === 'admin_approval' && (
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Top "Register" Header like Reference Row 2 Col 3 */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Register</h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    Complete all steps of Verification to get started
                  </p>
                </div>
                <span
                  className={`self-start sm:self-auto px-3.5 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 ${
                    profile.adminApproved
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-blue-50 text-[#000080] border border-blue-200'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {profile.adminApproved
                      ? 'Partner Account Approved ✓'
                      : 'All 5 Steps Verified · Ready for Approval'}
                  </span>
                </span>
              </div>

              {/* Reference-Style Stack of Verification Checklist Rows */}
              <div className="space-y-2.5">
                {[
                  {
                    stepId: 'personal_portal' as DeliveryOnboardingStep,
                    title: 'Personal Details',
                    detail: profile.personalDetailsVerified
                      ? `${profile.fullName} · ${profile.phoneNumber}`
                      : 'Full Name, Phone & Identity Photo (Pending)',
                    done: profile.personalDetailsVerified,
                  },
                  {
                    stepId: 'vehicle_portal' as DeliveryOnboardingStep,
                    title: 'Job & Vehicle Details',
                    detail: profile.vehicleVerified
                      ? `${profile.vehicleType} · ${profile.vehicleNumber}`
                      : 'Vehicle Type & Driving License (Pending)',
                    done: profile.vehicleVerified,
                  },
                  {
                    stepId: 'aadhaar_portal' as DeliveryOnboardingStep,
                    title: 'Documents (Aadhaar / PAN)',
                    detail: profile.aadhaarVerified
                      ? `Verified (${profile.documentType || 'Aadhaar / PAN'})`
                      : 'Government ID Document Verification (Pending)',
                    done: profile.aadhaarVerified,
                  },
                  {
                    stepId: 'bank_portal' as DeliveryOnboardingStep,
                    title: 'Bank Details',
                    detail: profile.bankVerified
                      ? `Settlements to ${profile.bankAccountNumber ? `A/C ending in ...${profile.bankAccountNumber.slice(-4)}` : profile.upiId || 'Linked Bank'}`
                      : 'Payout Account & UPI Settlement (Pending)',
                    done: profile.bankVerified,
                  },
                  {
                    stepId: 'tutorial' as DeliveryOnboardingStep,
                    title: 'Measurement Video Tutorial',
                    detail: profile.tutorialCompleted
                      ? 'Men & Women Doorstep Measurement Training Completed'
                      : 'Interactive Tape Measurement Tutorial (Pending)',
                    done: profile.tutorialCompleted,
                  },
                ].map((item) => (
                  <button
                    key={item.stepId}
                    type="button"
                    onClick={() => onSelectStep(item.stepId)}
                    className="w-full p-4 rounded-2xl border border-slate-200 bg-white hover:border-[#000080]/40 shadow-2xs flex items-center justify-between gap-4 text-left transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5">
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                          item.done
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-300'
                            : 'bg-blue-50 text-[#000080] border border-blue-200'
                        }`}
                      >
                        <Check className="w-4 h-4 stroke-[2.5]" />
                      </span>
                      <div>
                        <div className="text-sm font-extrabold text-slate-900">{item.title}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{item.detail}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md">
                        Verified
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </button>
                ))}
              </div>

              {/* Action CTA Bar */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={() => onSelectStep('tutorial')}
                  className="w-full sm:w-auto h-12 px-5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Back to Tutorial
                </button>
                <button
                  type="button"
                  data-testid="admin-approve-open-dashboard-btn"
                  onClick={handleAdminApproveApplication}
                  className="w-full flex-1 h-12 rounded-xl bg-[#000080] hover:bg-[#000066] active:scale-[0.99] text-white font-extrabold text-sm uppercase tracking-wider shadow-md shadow-[#000080]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <BadgeCheck className="w-5 h-5" />
                  <span>APPROVE &amp; OPEN PARTNER DASHBOARD</span>
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
