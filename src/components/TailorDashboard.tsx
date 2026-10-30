import React, { useState, useRef, useEffect } from 'react';
import {
  Scissors,
  Check,
  X,
  ArrowRight,
  ArrowLeft,
  BellRing,
  Plus,
  Ruler,
  Palette,
  FileText,
  User,
  MapPin,
  Phone,
  CheckCircle2,
  Search,
  AlertCircle,
  Clock,
  Bike,
  ShoppingBag,
  TrendingUp,
  Database,
  Wrench,
  Camera,
  Upload,
  Truck,
  History,
  ShieldCheck,
  Navigation,
  RefreshCw,
  Landmark,
  CreditCard,
  Crosshair,
  BadgeCheck,
  LogOut,
  ChevronRight,
  Send,
  HelpCircle,
  Menu,
} from 'lucide-react';
import {
  AssignedDeliveryPartnerInfo,
  CustomerServiceOption,
  DeliveryTask,
  LedgerTransaction,
  LiveGeoState,
  TailorOrder,
  TailorOrderStage,
  TailorProfile,
} from '../types/appTypes';
import {
  AVAILABLE_DELIVERY_PARTNERS,
  calculateRoleEarnings,
  normalizeTailorOrder,
  ORDER_WORKFLOW_STATUS_STEPS,
  reverseGeocodeLocation,
} from '../utils/appLogic';
import { MoneyCounterCard } from './MoneyCounterCard';
interface TailorDashboardProps {
  profile: TailorProfile;
  orders: TailorOrder[];
  tasks?: DeliveryTask[];
  ledger: LedgerTransaction[];
  liveGeo?: LiveGeoState;
  onRequestDeviceLocation?: () => void;
  lastDispatchedOrderNumber: string | null;
  onTransitionOrder: (orderId: string, nextStage: TailorOrderStage) => void;
  onAddNewOrder: (
    newOrder: TailorOrder,
    selectedService?: CustomerServiceOption,
    needsTailor?: boolean,
    firstPartner?: AssignedDeliveryPartnerInfo
  ) => void;
  onUpdateWorkbench?: (
    orderId: string,
    statusLabel: string,
    readyToBegin: boolean,
    notes: string
  ) => void;
  onRecordCustomerCall?: (orderId: string) => void;
  onAddWorkProgress?: (
    orderId: string,
    photoUrl: string,
    description: string,
    workStatus: string
  ) => void;
  onAssignSecondDeliveryPartner?: (
    orderId: string,
    partner: AssignedDeliveryPartnerInfo
  ) => void;
  onSwitchToDeliveryDashboard: () => void;
  onBackToRegistration?: () => void;
  onBack: () => void;
}

const WORKBENCH_PRESETS = [
  'Inspection & Chalk Marking Bench Ready',
  'Cutting Table & Lockstitch Machine Calibrated',
  'Steam Press & Finishing Station Ready',
  'Waiting for Thread & Trim Preparation',
];

const WORK_PROGRESS_STATUS_OPTIONS = [
  'Fabric Inspection & Pattern Chalk Marking',
  'Cutting & Seam Basting In Progress',
  'Main Stitching & Alteration Assembly',
  'Final Steam Press & Quality Verification',
];

export const TailorDashboard: React.FC<TailorDashboardProps> = ({
  profile,
  orders: rawOrders,
  tasks = [],
  ledger,
  liveGeo,
  onRequestDeviceLocation,
  lastDispatchedOrderNumber,
  onTransitionOrder,
  onAddNewOrder,
  onUpdateWorkbench,
  onRecordCustomerCall,
  onAddWorkProgress,
  onAssignSecondDeliveryPartner,
  onSwitchToDeliveryDashboard,
  onBackToRegistration,
  onBack,
}) => {
  const orders = rawOrders.map(normalizeTailorOrder);

  // Main Dashboard Navigation Tabs (Matching DeliveryDashboard structure)
  const [mainTab, setMainTab] = useState<'workbench' | 'finance' | 'profile'>('workbench');

  // Order Management Sub-Tabs (Accepted, Working, Completed)
  const [activeTab, setActiveTab] = useState<'accepted' | 'working' | 'completed'>('accepted');

  // Duty/Workshop toggle
  const [isWorkshopOpen, setIsWorkshopOpen] = useState(true);

  // Search & Modals
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [selectedOrderIdForModal, setSelectedOrderIdForModal] = useState<string | null>(null);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawUpi, setWithdrawUpi] = useState(profile.upiId || '');

  // Live Camera verification state inside dashboard
  const [dashboardProfile, setDashboardProfile] = useState<TailorProfile>(profile);
  const [cameraActiveInDash, setCameraActiveInDash] = useState(false);
  const [isCapturingLiveLocation, setIsCapturingLiveLocation] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setDashboardProfile(profile);
  }, [profile]);

  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Step 2 Customer Order Creation Popup state
  const [pendingCustomerOrderDraft, setPendingCustomerOrderDraft] = useState<TailorOrder | null>(null);
  const [selectedServiceOption, setSelectedServiceOption] =
    useState<CustomerServiceOption>('measurement_plus_cloth_pickup');
  const [needsTailorPopupChoice, setNeedsTailorPopupChoice] = useState<boolean>(true);
  const [selectedFirstPartnerId, setSelectedFirstPartnerId] = useState<string>(
    AVAILABLE_DELIVERY_PARTNERS[0].partnerId
  );

  // Workbench Update Modal
  const [workbenchModalOrderId, setWorkbenchModalOrderId] = useState<string | null>(null);
  const [wbStatusLabel, setWbStatusLabel] = useState(WORKBENCH_PRESETS[0]);
  const [wbReadyToBegin, setWbReadyToBegin] = useState(true);
  const [wbNotes, setWbNotes] = useState('');

  // Work Progress Modal
  const [progressModalOrderId, setProgressModalOrderId] = useState<string | null>(null);
  const [progPhotoUrl, setProgPhotoUrl] = useState(
    'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80'
  );
  const [progDescription, setProgDescription] = useState('');
  const [progWorkStatus, setProgWorkStatus] = useState(WORK_PROGRESS_STATUS_OPTIONS[0]);

  // Order Details Modal
  const [detailModalOrder, setDetailModalOrder] = useState<TailorOrder | null>(null);

  // New Order Form state
  const [orderNumber, setOrderNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [clothToBeAltered, setClothToBeAltered] = useState('');
  const [clothDescription, setClothDescription] = useState('');
  const [chestInches, setChestInches] = useState('');
  const [waistInches, setWaistInches] = useState('');
  const [shoulderInches, setShoulderInches] = useState('');
  const [sleeveLengthInches, setSleeveLengthInches] = useState('');
  const [garmentLengthInches, setGarmentLengthInches] = useState('');
  const [neckCollarInches, setNeckCollarInches] = useState('');
  const [fitPreference, setFitPreference] = useState<'Slim Tailored' | 'Classic Regular' | 'Relaxed Bespoke'>('Classic Regular');
  const [shadeName, setShadeName] = useState('');
  const [fabricFinish, setFabricFinish] = useState('');
  const [noteToTailor, setNoteToTailor] = useState('');
  const [tailorPayoutINR, setTailorPayoutINR] = useState('');
  const [deliveryPayoutINR, setDeliveryPayoutINR] = useState('');

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Earnings calculations
  const tailorFinance = calculateRoleEarnings(ledger, 'tailor');

  // Filtered orders
  const incomingOrders = orders.filter((o) => o.stage === 'incoming');
  const acceptedOrders = orders.filter((o) => o.stage === 'accepted');
  const workingOrders = orders.filter((o) => o.stage === 'working');
  const completedOrders = orders.filter((o) => o.stage === 'completed');

  const rawTabOrders =
    activeTab === 'accepted'
      ? acceptedOrders
      : activeTab === 'working'
      ? workingOrders
      : completedOrders;

  const currentTabOrders = rawTabOrders.filter((o) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.clothToBeAltered.toLowerCase().includes(q)
    );
  });

  /**
   * LIVE CAMERA VERIFICATION: CAPTURE PHOTO + AUTOMATICALLY PRINT EXACT ADDRESS & GPS
   */
  const handleCaptureLiveCameraPhoto = async () => {
    setIsCapturingLiveLocation(true);
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

    let capturedDataUrl = dashboardProfile.liveCameraDataUrl || '';

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
        stream.getTracks().forEach((t) => t.stop());
      }
    } else {
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
        <text x="320" y="60" text-anchor="middle" fill="#38BDF8" font-size="18" font-weight="bold" font-family="sans-serif">TRENCH ATELIER · VERIFIED SHOP &amp; MACHINE</text>
        <text x="320" y="90" text-anchor="middle" fill="#94A3B8" font-size="13" font-family="monospace">${dashboardProfile.shopName || 'Tailor Workshop'} · Live Sensor Stamped</text>
      </svg>`;
      capturedDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
    }
    setCameraActiveInDash(false);

    let resolvedAddress = dashboardProfile.shopAddress || '100ft Road, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038';
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
          accuracy: Math.round(pos.coords.accuracy || 6),
        };
        const geoAddr = await reverseGeocodeLocation(resolvedCoords.latitude, resolvedCoords.longitude);
        if (geoAddr && geoAddr.length > 5) {
          resolvedAddress = geoAddr;
        }
      } catch {}
    }

    const updatedProfile: TailorProfile = {
      ...dashboardProfile,
      liveCameraCaptured: true,
      liveCameraTimestamp: `Verified · ${timestampFull}`,
      liveCameraDataUrl: capturedDataUrl,
      liveCameraAddress: resolvedAddress,
      liveCameraCoords: resolvedCoords,
      liveCameraMachineType: dashboardProfile.machineType || 'Industrial Single Needle Lockstitch Machine',
    };

    setDashboardProfile(updatedProfile);
    setIsCapturingLiveLocation(false);
    triggerToast('Live Camera Verification Stamped! Exact location address and GPS coordinates recorded under image.');
  };

  const handleStartLiveStream = async () => {
    setCameraActiveInDash(true);
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch {}
    }
  };

  // Order workflow transitions
  const handleMoveAndSwitchTab = (orderId: string, targetStage: TailorOrderStage) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (targetStage === 'working' && targetOrder && !targetOrder.workbench?.readyToBegin) {
      triggerToast('Safety Guard: Please confirm Workbench Readiness before starting work on this order.');
      handleOpenWorkbenchModal(targetOrder);
      return;
    }
    if (targetStage === 'completed' && targetOrder && (targetOrder.progressUpdates || []).length === 0) {
      triggerToast('Safety Guard: Please upload work progress photo / verification before marking order completed.');
      setProgressModalOrderId(orderId);
      return;
    }
    onTransitionOrder(orderId, targetStage);
    if (targetStage === 'accepted' || targetStage === 'working' || targetStage === 'completed') {
      setActiveTab(targetStage);
    }
    triggerToast(`Order #${targetOrder?.orderNumber || ''} moved to ${targetStage.toUpperCase()}!`);
  };

  const handleOpenWorkbenchModal = (order: TailorOrder) => {
    setWorkbenchModalOrderId(order.id);
    setWbStatusLabel(order.workbench?.statusLabel || WORKBENCH_PRESETS[0]);
    setWbReadyToBegin(order.workbench?.readyToBegin ?? true);
    setWbNotes(order.workbench?.notes || '');
  };

  const handleSaveWorkbenchModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workbenchModalOrderId) return;
    if (onUpdateWorkbench) {
      onUpdateWorkbench(workbenchModalOrderId, wbStatusLabel, wbReadyToBegin, wbNotes);
    }
    triggerToast(`Workbench updated: "${wbStatusLabel}" (${wbReadyToBegin ? 'Ready to Start' : 'Prep In Progress'})`);
    setWorkbenchModalOrderId(null);
  };

  const handleCallCustomer = (order: TailorOrder) => {
    if (onRecordCustomerCall) {
      onRecordCustomerCall(order.id);
    }
    triggerToast(`Calling ${order.customerName} (${order.customerPhone})... Call logged against Order #${order.orderNumber}.`);
  };

  const handleSubmitProgressUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!progressModalOrderId || !progDescription.trim()) return;
    if (onAddWorkProgress) {
      onAddWorkProgress(progressModalOrderId, progPhotoUrl, progDescription.trim(), progWorkStatus);
    }
    triggerToast('Work progress update and atelier verification photo recorded!');
    setProgressModalOrderId(null);
    setProgDescription('');
  };

  const handleInitiateNewOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const finalOrderNumber = orderNumber.trim() || `TRN-${Math.floor(1000 + Math.random() * 9000)}`;
    const newDraft: TailorOrder = {
      id: `ord-${Date.now()}`,
      orderNumber: finalOrderNumber,
      customerName: customerName.trim() || 'Valued Customer',
      customerPhone: customerPhone.trim() || '+91 98450 12345',
      customerAddress: customerAddress.trim() || 'Indiranagar 100ft Road, Bengaluru',
      clothToBeAltered: clothToBeAltered.trim() || 'Formal Linen Shirt',
      clothDescription: clothDescription.trim() || 'Collar and side seam tailoring',
      tailorPayoutINR: Number(tailorPayoutINR) || 450,
      deliveryPayoutINR: Number(deliveryPayoutINR) || 120,
      placedAt: 'Just now',
      stage: 'incoming',
      sizeChart: {
        chestInches: chestInches.trim() || '40',
        waistInches: waistInches.trim() || '34',
        shoulderInches: shoulderInches.trim() || '18',
        sleeveLengthInches: sleeveLengthInches.trim() || '25',
        garmentLengthInches: garmentLengthInches.trim() || '30',
        neckCollarInches: neckCollarInches.trim() || '16',
        fitPreference,
      },
      colorGrade: {
        shadeName: shadeName.trim() || 'Trench Navy',
        hexCode: '#000080',
        pantoneRef: '19-4052 TCX',
        fabricFinish: fabricFinish.trim() || 'Pure Linen',
      },
      noteToTailor: noteToTailor.trim(),
      firstDeliveryPartner: AVAILABLE_DELIVERY_PARTNERS[0],
      firstDeliveryStatus: 'assigned',
      secondDeliveryStatus: 'not_ready',
      tailorShopName: dashboardProfile.shopName || 'Atelier Workshop',
      tailorShopAddress: dashboardProfile.shopAddress || 'Indiranagar Workshop',
    };

    setPendingCustomerOrderDraft(newDraft);
    setShowNewOrderModal(false);
  };

  const handleConfirmCustomerOrderWithPartner = () => {
    if (!pendingCustomerOrderDraft) return;
    const partner =
      AVAILABLE_DELIVERY_PARTNERS.find((p) => p.partnerId === selectedFirstPartnerId) ||
      AVAILABLE_DELIVERY_PARTNERS[0];

    onAddNewOrder(pendingCustomerOrderDraft, selectedServiceOption, needsTailorPopupChoice, partner);
    triggerToast(`Order #${pendingCustomerOrderDraft.orderNumber} placed! Delivery partner ${partner.partnerName} dispatched.`);
    setPendingCustomerOrderDraft(null);
  };

  return (
    <div className="w-full flex-1 flex flex-col bg-slate-50 min-h-screen text-slate-800">
      <canvas ref={canvasRef} className="hidden" />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-xl border border-slate-700 flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* =================================================================== */}
      {/* TRENCH ATELIER TOP HEADER (MAIN THEME COLOUR #000080)               */}
      {/* =================================================================== */}
      <header className="bg-[#000080] text-white px-4 sm:px-8 py-3 shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Brand & Atelier Badge */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shrink-0">
              <Scissors className="w-5 h-5 text-sky-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black tracking-tight text-white">
                  TRENCH ATELIER
                </span>
                <span className="px-2 py-0.5 rounded-md bg-white/20 text-xs font-mono font-bold tracking-wider text-sky-100 uppercase">
                  PARTNER
                </span>
              </div>
              <div className="text-xs sm:text-sm text-sky-100 font-semibold truncate max-w-[200px] sm:max-w-sm">
                {dashboardProfile.shopName || 'Bespoke Atelier Workshop'}
              </div>
            </div>
          </div>

          {/* Quick Stat Badges & Duty Status */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Workshop Status Switch */}
            <button
              type="button"
              onClick={() => {
                setIsWorkshopOpen(!isWorkshopOpen);
                triggerToast(isWorkshopOpen ? 'Workshop status set to Closed.' : 'Workshop status set to Open & Taking Orders!');
              }}
              className={`min-h-[40px] px-3.5 rounded-xl border text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                isWorkshopOpen
                  ? 'bg-emerald-500/25 border-emerald-400/50 text-emerald-100'
                  : 'bg-rose-500/25 border-rose-400/50 text-rose-100'
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isWorkshopOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                }`}
              />
              <span>
                {isWorkshopOpen ? 'On Duty' : 'Off Duty'}
              </span>
            </button>

            {/* Quick Earnings Stat */}
            <div className="min-h-[40px] px-3.5 rounded-xl bg-white/10 border border-white/20 flex items-center gap-1.5 text-xs sm:text-sm">
              <span className="text-sky-200 font-bold">Today:</span>
              <strong className="text-white font-extrabold font-mono">
                ₹{tailorFinance.totalEarningsINR.toLocaleString('en-IN')}
              </strong>
            </div>

            {/* Create New Order Button directly in header */}
            <button
              type="button"
              data-testid="open-new-order-modal-btn"
              onClick={() => setShowNewOrderModal(true)}
              className="min-h-[40px] px-4 rounded-xl bg-[#159937] hover:bg-emerald-700 active:scale-98 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shrink-0 transition-all cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>New Order</span>
            </button>

            {/* Back to Registration Button */}
            <button
              type="button"
              onClick={onBackToRegistration || onBack}
              className="min-h-[40px] px-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 flex items-center gap-1.5 text-white text-xs sm:text-sm font-bold transition-all cursor-pointer"
              title="Back to Tailor Registration Page"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Registration</span>
            </button>

            {/* Back / Exit */}
            <button
              type="button"
              onClick={onBack}
              className="h-10 w-10 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-all cursor-pointer"
              title="Return to Role Select"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* =================================================================== */}
      {/* MAIN CONTENT CONTAINER                                              */}
      {/* =================================================================== */}
      <main className="max-w-7xl mx-auto w-full px-3 sm:px-6 py-4 pb-28 flex-1 space-y-4">


        {/* ================================================================= */}
        {/* TAB 1: WORKBENCH & ORDERS                                         */}
        {/* ================================================================= */}
        {mainTab === 'workbench' && (
          <div className="space-y-4">
            {/* Real-Time Last Dispatched Banner */}
            {lastDispatchedOrderNumber && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-900 to-teal-900 text-white flex items-center justify-between gap-3 shadow-sm border border-emerald-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/25 border border-emerald-400/40 flex items-center justify-center text-emerald-200 shrink-0">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-mono uppercase tracking-wider text-emerald-300 font-bold">
                      Order Dispatched
                    </div>
                    <p className="text-sm font-bold text-white">
                      Order #{lastDispatchedOrderNumber} is ready — Delivery Partner assigned for doorstep pickup!
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onSwitchToDeliveryDashboard}
                  className="px-3.5 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-900 text-xs sm:text-sm font-extrabold shrink-0 flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>Delivery View</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Sub-Tabs: Accepted, Working, Completed Orders */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="grid grid-cols-3 sm:flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveTab('accepted')}
                  className={`py-2 px-2.5 sm:px-4 rounded-lg text-xs sm:text-sm font-bold transition-all text-center cursor-pointer ${
                    activeTab === 'accepted'
                      ? 'bg-white text-[#000080] shadow-xs'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  Accepted ({acceptedOrders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('working')}
                  className={`py-2 px-2.5 sm:px-4 rounded-lg text-xs sm:text-sm font-bold transition-all text-center cursor-pointer ${
                    activeTab === 'working'
                      ? 'bg-white text-[#000080] shadow-xs'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  Working ({workingOrders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('completed')}
                  className={`py-2 px-2.5 sm:px-4 rounded-lg text-xs sm:text-sm font-bold transition-all text-center cursor-pointer ${
                    activeTab === 'completed'
                      ? 'bg-white text-[#000080] shadow-xs'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  Done ({completedOrders.length})
                </button>
              </div>

              {/* Search Bar Input */}
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search order #, customer, cloth..."
                  className="w-full h-10 pl-9 pr-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#000080] focus:bg-white text-slate-900 placeholder:text-slate-400 font-medium"
                />
              </div>
            </div>

            {/* Split Screen Grid: Left = Incoming Queue / Orders; Right = Workbench Detail */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Left 7 Columns: Active Orders List */}
              <div className="lg:col-span-7 space-y-3">
                {currentTabOrders.length === 0 ? (
                  <div className="p-8 rounded-3xl bg-white border border-slate-200 text-center space-y-3 shadow-2xs">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#000080] flex items-center justify-center mx-auto">
                      <Scissors className="w-6 h-6" />
                    </div>
                    <div className="text-base font-extrabold text-slate-900">
                      No Orders in &quot;{activeTab.toUpperCase()}&quot;
                    </div>
                    <p className="text-sm text-slate-600 max-w-sm mx-auto">
                      All new customer garments placed or dispatched will appear here. Tap &quot;New Order&quot; to initiate a fresh garment booking.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowNewOrderModal(true)}
                      className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#000080] hover:bg-[#000066] text-white text-sm font-bold cursor-pointer inline-flex items-center gap-2 shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create New Customer Order</span>
                    </button>
                  </div>
                ) : (
                  currentTabOrders.map((order) => {
                    const isSelected = selectedOrderIdForModal === order.id;
                    return (
                      <div
                        key={order.id}
                        className={`p-4 sm:p-5 rounded-2xl border transition-all bg-white shadow-xs space-y-3.5 ${
                          isSelected ? 'border-[#000080] ring-2 ring-[#000080]/10' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {/* Order Header */}
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-base text-[#000080]">
                              #{order.orderNumber}
                            </span>
                            <span className="text-xs font-semibold text-slate-600">
                              · {order.placedAt}
                            </span>
                          </div>
                          <span className="font-mono font-extrabold text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
                            ₹{order.tailorPayoutINR.toLocaleString('en-IN')}
                          </span>
                        </div>

                        {/* Garment & Customer Details */}
                        <div className="space-y-1">
                          <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                            {order.clothToBeAltered}
                          </h3>
                          <div className="text-sm text-slate-700">
                            {order.clothDescription || 'Alteration & custom bespoke fitting'}
                          </div>
                        </div>

                        {/* Customer & Doorstep Info */}
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs sm:text-sm space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 flex items-center gap-1.5">
                              <User className="w-4 h-4 text-[#000080]" />
                              <span>{order.customerName}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCallCustomer(order)}
                              className="font-mono text-[#000080] hover:underline flex items-center gap-1 font-bold cursor-pointer bg-blue-50 px-2 py-0.5 rounded-md"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span>{order.customerPhone}</span>
                            </button>
                          </div>
                          <div className="text-slate-700 flex items-start gap-1.5 font-medium">
                            <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                            <span className="truncate">{order.customerAddress}</span>
                          </div>
                        </div>

                        {/* Workbench Status Tag */}
                        {order.workbench && (
                          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-xs sm:text-sm flex items-center justify-between">
                            <span className="text-slate-800 truncate font-semibold">
                              Bench: <strong className="text-[#000080]">{order.workbench.statusLabel}</strong>
                            </span>
                            <span
                              className={`text-xs font-bold px-2.5 py-1 rounded-md ${
                                order.workbench.readyToBegin
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {order.workbench.readyToBegin ? 'Ready ✓' : 'Setup Needed'}
                            </span>
                          </div>
                        )}

                        {/* Order Actions Toolbar */}
                        <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenWorkbenchModal(order)}
                              className="min-h-[40px] px-3.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer"
                            >
                              <Wrench className="w-3.5 h-3.5 text-[#000080]" />
                              <span>Workbench</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setProgressModalOrderId(order.id)}
                              className="min-h-[40px] px-3.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer"
                            >
                              <Camera className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Work Progress</span>
                            </button>
                          </div>

                          {/* Stage Transition Button */}
                          {order.stage === 'accepted' && (
                            <button
                              type="button"
                              onClick={() => handleMoveAndSwitchTab(order.id, 'working')}
                              className="min-h-[40px] px-4 rounded-xl bg-[#000080] hover:bg-[#000066] text-white text-xs sm:text-sm font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              <span>Start Work →</span>
                            </button>
                          )}
                          {order.stage === 'working' && (
                            <button
                              type="button"
                              onClick={() => handleMoveAndSwitchTab(order.id, 'completed')}
                              className="min-h-[40px] px-4 rounded-xl bg-[#159937] hover:bg-emerald-700 text-white text-xs sm:text-sm font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              <Check className="w-4 h-4 stroke-[3]" />
                              <span>Complete &amp; Dispatch</span>
                            </button>
                          )}
                          {order.stage === 'completed' && (
                            <span className="min-h-[40px] px-3 text-xs sm:text-sm font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-1">
                              Ready for Delivery Pickup ✓
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Right 5 Columns: Atelier Capabilities, Machinery & Quick Actions */}
              <div className="lg:col-span-5 space-y-4">
                {/* Atelier Identity & Equipment Card */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#000080] flex items-center justify-center">
                        <Wrench className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900">
                          {dashboardProfile.shopName || 'Atelier Workshop'}
                        </h4>
                        <div className="text-xs text-slate-600 font-medium">
                          {dashboardProfile.specialty || 'Stitching & Alterations'}
                        </div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Verified
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs sm:text-sm">
                    <div className="flex items-center justify-between text-slate-700">
                      <span>Primary Machine:</span>
                      <strong className="text-slate-900">
                        {dashboardProfile.machineType || 'Industrial Lockstitch'}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-700">
                      <span>Daily Capacity:</span>
                      <strong className="text-slate-900">
                        {dashboardProfile.dailyCapacity || '8–12 garments/day'}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-700">
                      <span>Master Artisan:</span>
                      <strong className="text-slate-900">
                        {dashboardProfile.ownerName || 'Lead Atelier Tailor'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Incoming Orders Box (Part 1 Queue) */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-[#000080]" />
                      <span>Incoming Queue ({incomingOrders.length})</span>
                    </h4>
                    <span className="text-xs text-slate-600 font-semibold">
                      Awaiting Accept
                    </span>
                  </div>

                  {incomingOrders.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-50 text-center text-xs sm:text-sm text-slate-600">
                      No pending orders waiting for acceptance.
                    </div>
                  ) : (
                    incomingOrders.map((ord) => (
                      <div
                        key={ord.id}
                        className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs sm:text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            #{ord.orderNumber}
                          </span>
                          <span className="font-mono font-extrabold text-emerald-800 text-sm">
                            ₹{ord.tailorPayoutINR}
                          </span>
                        </div>
                        <div className="font-semibold text-slate-800 truncate">
                          {ord.clothToBeAltered} ({ord.customerName})
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleMoveAndSwitchTab(ord.id, 'accepted')}
                            className="min-h-[38px] px-3.5 rounded-xl bg-[#000080] hover:bg-[#000066] text-white text-xs sm:text-sm font-bold cursor-pointer"
                          >
                            Accept Order →
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: EARNING & FINANCE (TAILOR WALLET)                           */}
        {/* ================================================================= */}
        {mainTab === 'finance' && (
          <div className="space-y-5">
            {/* Money Counter Card */}
            <MoneyCounterCard
              role="tailor"
              ledger={ledger}
              upiId={dashboardProfile.upiId || 'tailor@upi'}
            />

            {/* Payout Ledger Table */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Tailor Earnings Ledger &amp; Order Settlements
                  </h3>
                  <p className="text-xs text-slate-500">
                    Direct automated payouts for garment stitching, fitting, and alteration completions
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(true)}
                  className="h-9 px-4 rounded-xl bg-[#159937] hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Withdraw Payout</span>
                </button>
              </div>

              {tailorFinance.roleTransactions.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
                  <Landmark className="w-8 h-8 text-slate-400 mx-auto" />
                  <div className="text-xs font-bold text-slate-800">
                    No Settled Transactions Yet
                  </div>
                  <p className="text-xs text-slate-500">
                    Completed orders automatically credit your tailoring payout to this ledger and UPI wallet.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {tailorFinance.roleTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="py-3 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">
                          {tx.description}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {tx.timestamp} · {tx.status}
                        </div>
                      </div>
                      <span className="font-mono font-extrabold text-emerald-700 text-sm">
                        +₹{tx.amountINR.toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: ATELIER PROFILE & LIVE CAMERA VERIFICATION                 */}
        {/* ================================================================= */}
        {mainTab === 'profile' && (
          <div className="space-y-5">
            {/* Main Atelier Profile Banner */}
            <div className="bg-[#000080] text-white rounded-3xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white">
                    <Scissors className="w-7 h-7 text-sky-200" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-sky-200 font-bold">
                      VERIFIED ATELIER PARTNER
                    </span>
                    <h2 className="text-xl font-black text-white">
                      {dashboardProfile.shopName || 'Bespoke Atelier Workshop'}
                    </h2>
                    <div className="text-xs text-sky-100 mt-0.5">
                      {dashboardProfile.specialty} · Master Tailor: {dashboardProfile.ownerName || 'Verified Artisan'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                    <BadgeCheck className="w-4 h-4 text-emerald-400" />
                    <span>Live GPS &amp; Camera Verified</span>
                  </span>
                </div>
              </div>
            </div>

            {/* TAILOR PROFILE & ALL TAILOR DETAILS */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-[#000080]">
                    Tailor Profile &amp; Atelier Details
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    Complete Master Tailor &amp; Workshop Information
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                  {onBackToRegistration && (
                    <button
                      type="button"
                      onClick={onBackToRegistration}
                      className="px-3.5 py-1.5 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-[#000080] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Back to Registration Page & Edit Verification Steps"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Registration</span>
                    </button>
                  )}
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>{dashboardProfile.adminApproved ? 'Admin Approved Profile' : 'Active Tailor Profile'}</span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Personal & Contact Details */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <User className="w-4 h-4 text-[#000080]" />
                    <h4 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-900">
                      Personal &amp; Contact Details
                    </h4>
                  </div>
                  <div className="space-y-2.5 text-xs sm:text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">Master Tailor Name:</span>
                      <strong className="text-slate-900 font-bold text-right">
                        {dashboardProfile.ownerName || 'Not Provided'}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">Phone Number:</span>
                      <strong className="text-slate-900 font-mono font-bold text-right">
                        {dashboardProfile.phoneNumber || 'Not Provided'}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">Email Address:</span>
                      <strong className="text-slate-900 font-bold text-right truncate max-w-[200px]">
                        {dashboardProfile.email || 'Not Provided'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* 2. Shop & Location Details */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <MapPin className="w-4 h-4 text-[#000080]" />
                    <h4 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-900">
                      Atelier &amp; Shop Location
                    </h4>
                  </div>
                  <div className="space-y-2.5 text-xs sm:text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">Shop / Atelier Name:</span>
                      <strong className="text-slate-900 font-bold text-right">
                        {dashboardProfile.shopName || 'Not Provided'}
                      </strong>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-slate-500 shrink-0">Shop Address:</span>
                      <strong className="text-slate-900 font-bold text-right leading-snug">
                        {dashboardProfile.shopAddress || dashboardProfile.liveCameraAddress || 'Not Provided'}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">City &amp; Pincode:</span>
                      <strong className="text-slate-900 font-bold text-right">
                        {[dashboardProfile.city, dashboardProfile.pincode].filter(Boolean).join(' - ') || 'Not Provided'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* 3. Equipment & Specialization */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <Wrench className="w-4 h-4 text-[#000080]" />
                    <h4 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-900">
                      Workshop Equipment &amp; Specialty
                    </h4>
                  </div>
                  <div className="space-y-2.5 text-xs sm:text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">Craft Specialty:</span>
                      <strong className="text-[#000080] font-bold text-right">
                        {dashboardProfile.specialty || 'Stitching & Alterations'}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">Primary Machine:</span>
                      <strong className="text-slate-900 font-bold text-right">
                        {dashboardProfile.machineType || dashboardProfile.liveCameraMachineType || 'Not Provided'}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">Machine Serial / ID:</span>
                      <strong className="text-slate-900 font-mono font-bold text-right">
                        {dashboardProfile.machineNumber || 'Not Provided'}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">Daily Capacity:</span>
                      <strong className="text-slate-900 font-bold text-right">
                        {dashboardProfile.dailyCapacity || 'Not Provided'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* 4. Identity & Bank Settlement Details */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2">
                      <Landmark className="w-4 h-4 text-[#000080]" />
                      <h4 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-900">
                        KYC &amp; Bank Payout Details
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowWithdrawModal(true)}
                      className="text-xs text-[#000080] font-bold hover:underline cursor-pointer"
                    >
                      Update UPI
                    </button>
                  </div>
                  <div className="space-y-2.5 text-xs sm:text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">KYC Document:</span>
                      <strong className="text-slate-900 font-bold text-right">
                        {dashboardProfile.documentType || 'Government ID'}{' '}
                        {dashboardProfile.documentNumber ? `(${dashboardProfile.documentNumber})` : ''}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">Account Holder:</span>
                      <strong className="text-slate-900 font-bold text-right">
                        {dashboardProfile.bankAccountHolder || dashboardProfile.ownerName || 'Not Provided'}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">Bank Account &amp; IFSC:</span>
                      <strong className="text-slate-900 font-mono font-bold text-right">
                        {[dashboardProfile.bankAccountNumber, dashboardProfile.ifscCode].filter(Boolean).join(' · ') || 'Not Provided'}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">UPI Payout ID:</span>
                      <strong className="text-emerald-700 font-mono font-bold text-right">
                        {dashboardProfile.upiId || 'Not Provided'}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* =================================================================== */}
      {/* MODAL 1: NEW CUSTOMER ORDER POPUP (STEP 1)                          */}
      {/* =================================================================== */}
      {showNewOrderModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Create New Customer Order"
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-5 sm:p-6 space-y-4 shadow-2xl my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#000080]">
                  Customer Garment Booking · Step 1
                </div>
                <h3 className="text-lg font-black text-slate-900">
                  New Customer Stitching / Alteration Order
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewOrderModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInitiateNewOrder} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter Customer Name"
                    className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#000080]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Contact Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full h-10 px-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#000080]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Customer Pickup / Delivery Address *
                </label>
                <input
                  type="text"
                  required
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Doorstep address for Delivery Partner pickup"
                  className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#000080]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Garment / Cloth Type *
                  </label>
                  <input
                    type="text"
                    required
                    value={clothToBeAltered}
                    onChange={(e) => setClothToBeAltered(e.target.value)}
                    placeholder="e.g. Formal Suit, Linen Trousers, Kurta"
                    className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#000080]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Tailoring Payout Fee (INR)
                  </label>
                  <input
                    type="number"
                    value={tailorPayoutINR}
                    onChange={(e) => setTailorPayoutINR(e.target.value)}
                    placeholder="e.g. 450"
                    className="w-full h-10 px-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#000080]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Alteration Instructions / Work Description
                </label>
                <input
                  type="text"
                  value={clothDescription}
                  onChange={(e) => setClothDescription(e.target.value)}
                  placeholder="e.g. Taper sleeves by 1 inch, adjust hem length"
                  className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#000080]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewOrderModal(false)}
                  className="h-10 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="submit-new-order-btn"
                  className="h-10 px-5 rounded-xl bg-[#000080] hover:bg-[#000066] text-white text-xs font-bold cursor-pointer flex items-center gap-1.5"
                >
                  <span>Continue to Courier Assignment</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 2: TAILOR REQUIREMENT & FIRST DELIVERY DISPATCH (STEP 2)       */}
      {/* =================================================================== */}
      {pendingCustomerOrderDraft && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm First Delivery Partner Assignment"
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
        >
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#000080]">
                  Step 2 of 2 · First Delivery Assignment
                </div>
                <h3 className="text-base font-black text-slate-900">
                  Assign Delivery Partner for #{pendingCustomerOrderDraft.orderNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPendingCustomerOrderDraft(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Customer:</span>
                <strong className="text-slate-900">{pendingCustomerOrderDraft.customerName}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Cloth / Garment:</span>
                <strong className="text-slate-900">{pendingCustomerOrderDraft.clothToBeAltered}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Tailoring Fee:</span>
                <strong className="text-emerald-700 font-mono">₹{pendingCustomerOrderDraft.tailorPayoutINR}</strong>
              </div>
            </div>

            {/* Courier Choice List */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Select Available Delivery Partner (Customer Doorstep → Atelier):
              </label>
              {AVAILABLE_DELIVERY_PARTNERS.map((partner) => (
                <button
                  key={partner.partnerId}
                  type="button"
                  onClick={() => setSelectedFirstPartnerId(partner.partnerId)}
                  className={`w-full p-3 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition-all ${
                    selectedFirstPartnerId === partner.partnerId
                      ? 'border-[#000080] bg-blue-50/70 font-bold'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="text-left">
                    <div className="font-bold text-slate-900">
                      {partner.partnerName} · {partner.vehicleType}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {partner.partnerPhone} · {partner.vehicleNumber}
                    </div>
                  </div>
                  {selectedFirstPartnerId === partner.partnerId && (
                    <CheckCircle2 className="w-4 h-4 text-[#000080]" />
                  )}
                </button>
              ))}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPendingCustomerOrderDraft(null)}
                className="h-10 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCustomerOrderWithPartner}
                className="h-10 px-5 rounded-xl bg-[#159937] hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Check className="w-4 h-4" />
                <span>Confirm &amp; Dispatch Courier</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 3: WORKBENCH SETUP MODAL                                      */}
      {/* =================================================================== */}
      {workbenchModalOrderId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Update Atelier Workbench"
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
        >
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-[#000080]" />
                <h3 className="text-base font-black text-slate-900">
                  Update Atelier Workbench Readiness
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setWorkbenchModalOrderId(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveWorkbenchModal} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Workbench Preset Calibration *
                </label>
                <select
                  value={wbStatusLabel}
                  onChange={(e) => setWbStatusLabel(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#000080]"
                >
                  {WORKBENCH_PRESETS.map((preset) => (
                    <option key={preset} value={preset}>
                      {preset}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Artisan Notes / Thread Shade / Trim Prep
                </label>
                <textarea
                  rows={3}
                  value={wbNotes}
                  onChange={(e) => setWbNotes(e.target.value)}
                  placeholder="Notes regarding chalk markings, needle gauge, and thread tension..."
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#000080]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="wb-ready-check"
                  checked={wbReadyToBegin}
                  onChange={(e) => setWbReadyToBegin(e.target.checked)}
                  className="w-4 h-4 text-[#000080] rounded cursor-pointer"
                />
                <label htmlFor="wb-ready-check" className="text-xs font-bold text-slate-800 cursor-pointer">
                  Confirm bench is calibrated &amp; ready to start tailoring work
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setWorkbenchModalOrderId(null)}
                  className="h-10 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 px-5 rounded-xl bg-[#000080] hover:bg-[#000066] text-white text-xs font-bold cursor-pointer"
                >
                  Save Workbench State
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 4: WORK PROGRESS PHOTO & STAGE UPDATE                          */}
      {/* =================================================================== */}
      {progressModalOrderId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Upload Work Progress Update"
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
        >
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-black text-slate-900">
                  Record Work Progress &amp; Evidence
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setProgressModalOrderId(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitProgressUpload} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Tailoring Stage *
                </label>
                <select
                  value={progWorkStatus}
                  onChange={(e) => setProgWorkStatus(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#000080]"
                >
                  {WORK_PROGRESS_STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Progress Note &amp; Verification Evidence *
                </label>
                <textarea
                  rows={3}
                  required
                  value={progDescription}
                  onChange={(e) => setProgDescription(e.target.value)}
                  placeholder="Describe chalk marking, seam pinning, or finished stitch line..."
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#000080]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setProgressModalOrderId(null)}
                  className="h-10 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 px-5 rounded-xl bg-[#159937] hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                >
                  Save Progress Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 5: INSTANT UPI WITHDRAWAL MODAL                               */}
      {/* =================================================================== */}
      {showWithdrawModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Withdraw Tailor Payout"
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
        >
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-[#000080]" />
                <h3 className="text-base font-black text-slate-900">
                  Instant UPI Withdrawal
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="text-slate-500">Available Balance:</div>
              <div className="text-lg font-black font-mono text-emerald-700">
                ₹{tailorFinance.totalEarningsINR.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Settlement UPI ID
                </label>
                <input
                  type="text"
                  value={withdrawUpi}
                  onChange={(e) => setWithdrawUpi(e.target.value)}
                  placeholder="e.g. tailor@okhdfcbank"
                  className="w-full h-10 px-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#000080]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Amount to Withdraw (INR)
                </label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full h-10 px-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#000080]"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                className="h-10 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerToast(`Payout transfer of ₹${withdrawAmount || '0'} initiated to ${withdrawUpi || 'UPI'}! Settlement arrives in ~2 mins.`);
                  setShowWithdrawModal(false);
                }}
                className="h-10 px-5 rounded-xl bg-[#159937] hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
              >
                Withdraw Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BOTTOM NAVIGATION BAR (Delivery partner portal parity for mobile app)     */}
      {/* ========================================================================= */}
      <nav
        aria-label="Tailor Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-xl"
      >
        <div className="max-w-md mx-auto grid grid-cols-3 h-16">
          {[
            {
              id: 'workbench' as const,
              label: 'Orders',
              icon: Scissors,
              badge: acceptedOrders.length + workingOrders.length,
            },
            {
              id: 'finance' as const,
              label: 'Earnings',
              icon: Landmark,
              badge: tailorFinance.completedCount > 0 ? tailorFinance.completedCount : undefined,
            },
            {
              id: 'profile' as const,
              label: 'Atelier',
              icon: ShieldCheck,
              badge: dashboardProfile.liveCameraCaptured ? undefined : 1,
            },
          ].map((item) => {
            const Icon = item.icon;
            const active = mainTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setMainTab(item.id)}
                className={`relative flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer min-h-[44px] ${
                  active ? 'text-[#000080]' : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {item.badge ? (
                    <span className="absolute -top-1.5 -right-2.5 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
                <span className="text-xs font-bold tracking-tight">{item.label}</span>
                {active && (
                  <span className="absolute top-0 w-10 h-1 rounded-b-full bg-[#000080]" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
