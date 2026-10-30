import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Navigation,
  Ruler,
  PackageCheck,
  Truck,
  Bell,
  CheckCircle2,
  Video,
  Plus,
  Phone,
  Clock,
  ArrowLeft,
  X,
  Wallet,
  TrendingUp,
  Calendar,
  Award,
  MapPin,
  ShieldCheck,
  Layers,
  ArrowUpRight,
  ArrowRight,
  BatteryCharging,
  Power,
  ChevronRight,
  DollarSign,
  Send,
  FileText,
  ArrowDownRight,
  Database,
  History,
  Menu,
  Home,
  User,
  HelpCircle,
  Lock,
  LogOut,
  Check,
  Briefcase,
  CreditCard,
  Landmark,
  Edit3,
  BellRing,
} from 'lucide-react';
import {
  CustomerServiceOption,
  DeliveryPartnerProfile,
  DeliveryStageType,
  DeliveryTask,
  DeliveryTaskCategory,
  LedgerTransaction,
  LiveGeoState,
  PartnerNotification,
  RecordedMeasurements,
  TailorOrder,
} from '../types/appTypes';
import {
  ExtendedDeliveryAction,
  normalizeDeliveryTask,
  resolveRealGeoLocation,
} from '../utils/appLogic';
import { DualDeliveryRouteMap } from './DualDeliveryRouteMap';
import { TrenchLiveFleetGoogleMap, FleetTaskPin } from './TrenchGoogleMap';
import { IncomingDeliveryOrder } from './IncomingDeliveryOrder';
import { useIncomingDeliveryOrders } from '../hooks/useIncomingDeliveryOrders';


interface DeliveryDashboardProps {
  profile: DeliveryPartnerProfile;
  orders?: TailorOrder[];
  tasks: DeliveryTask[];
  notifications: PartnerNotification[];
  ledger: LedgerTransaction[];
  liveGeo: LiveGeoState;
  onTaskAction: (
    taskId: string,
    action: ExtendedDeliveryAction,
    measurements?: RecordedMeasurements
  ) => void;
  onAcknowledgeNotification: (notifId: string) => void;
  onAddNewTask: (newTask: DeliveryTask) => void;
  onMovePartnerLocation: () => void;
  onRequestDeviceLocation?: () => void;
  onResolvedDeviceAddress?: (address: string) => void;
  onReopenTutorial: () => void;
  onStartNewApplication?: () => void;
  onBack: () => void;
}

/**
 * Custom High-Fidelity SVG: Blue Delivery Partner on Scooter with Blue Dress/Uniform & Blue Cap/Hat
 */
const BluePartnerScooterIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 56,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="Trench Delivery Partner in Blue Uniform on Scooter"
  >
    <polygon points="73,56 98,40 98,72 73,60" fill="#38BDF8" opacity="0.38" />
    <ellipse cx="50" cy="74" rx="34" ry="4.5" fill="rgba(15, 23, 42, 0.3)" />
    <g id="scooter-rear-wheel">
      <circle cx="27" cy="70" r="11" fill="#1E293B" stroke="#64748B" strokeWidth="2.5" />
      <circle cx="27" cy="70" r="5" fill="#E2E8F0" />
      <circle cx="27" cy="70" r="2" fill="#000080" />
      <path d="M 18 68 A 12 12 0 0 1 36 63" stroke="#000080" strokeWidth="3" strokeLinecap="round" fill="none" />
    </g>
    <g id="scooter-front-wheel">
      <circle cx="75" cy="70" r="11" fill="#1E293B" stroke="#64748B" strokeWidth="2.5" />
      <circle cx="75" cy="70" r="5" fill="#E2E8F0" />
      <circle cx="75" cy="70" r="2" fill="#000080" />
      <path d="M 66 65 A 12 12 0 0 1 84 66" stroke="#000080" strokeWidth="3" strokeLinecap="round" fill="none" />
    </g>
    <g id="scooter-chassis">
      <path d="M 33 70 L 52 70 L 64 61 L 70 51 L 63 49 L 53 57 L 34 57 Z" fill="#000080" stroke="#000066" strokeWidth="1.5" />
      <path d="M 44 65 L 58 63 L 64 54" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
      <line x1="64" y1="52" x2="61" y2="34" stroke="#334155" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M 55 35 L 63 34 L 67 36" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
      <circle cx="72" cy="55" r="4" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="1" />
      <circle cx="72" cy="55" r="2" fill="#FFFFFF" />
      <rect x="20" y="38" width="18" height="22" rx="3.5" fill="#000080" stroke="#1E3A8A" strokeWidth="1.5" />
      <rect x="20" y="47" width="18" height="3.5" fill="#10B981" />
      <text x="29" y="56" textAnchor="middle" fill="#FFFFFF" fontSize="6.5" fontWeight="900" fontFamily="sans-serif">T</text>
    </g>
    <g id="blue-partner-rider">
      <path d="M 43 56 L 52 56 L 56 66 L 48 66 Z" fill="#1E293B" />
      <rect x="47" y="65" width="10" height="3" rx="1" fill="#10B981" />
      <path d="M 41 56 L 49 56 L 55 43 C 55 37 46 35 41 43 Z" fill="#000080" stroke="#000066" strokeWidth="1.5" />
      <line x1="43" y1="41" x2="49" y2="52" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="46" y1="42" x2="60" y2="35" stroke="#000080" strokeWidth="4.5" strokeLinecap="round" />
      <circle cx="60" cy="35" r="2.5" fill="#1E293B" />
      <rect x="45" y="33" width="4.5" height="4" rx="1" fill="#FCD34D" />
      <circle cx="47" cy="29" r="6.5" fill="#FCD34D" />
      <path d="M 40.5 28 C 40.5 21 53.5 21 53.5 28 Z" fill="#000080" />
      <path d="M 46 27 L 58 27 C 59.5 27 59 29.5 56 30 L 46 30 Z" fill="#000066" />
      <circle cx="47" cy="24.5" r="1.5" fill="#10B981" />
    </g>
  </svg>
);

interface WeeklyEarningsPoint {
  day: string;
  fullName: string;
  date: string;
  earnings: number;
  lastWeek: number;
  target: number;
  orders: number;
  distanceKm: number;
}

const WeeklyEarningsTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as WeeklyEarningsPoint;
    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-xl border border-slate-700/80 text-xs space-y-2 min-w-[220px]">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
          <span className="font-extrabold text-sm text-blue-300">{data.fullName}</span>
          <span className="text-[11px] text-slate-400 font-mono">{data.date}</span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Total Earnings:</span>
            <span className="font-mono font-black text-emerald-400 text-sm">
              ₹{Number(data.earnings).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Daily Target:</span>
            <span className="font-mono text-slate-300">₹{data.target}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Previous Week:</span>
            <span className="font-mono text-slate-400">₹{data.lastWeek}</span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px]">
            <span className="text-slate-400">Trips Completed:</span>
            <span className="font-bold text-white">{data.orders} orders ({data.distanceKm} km)</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const DeliveryDashboard: React.FC<DeliveryDashboardProps> = ({
  profile,
  orders = [],
  tasks,
  notifications,
  ledger,
  liveGeo,
  onTaskAction,
  onAcknowledgeNotification,
  onAddNewTask,
  onMovePartnerLocation,
  onRequestDeviceLocation,
  onResolvedDeviceAddress,
  onReopenTutorial,
  onStartNewApplication,
  onBack,
}) => {
  const normalizedTasks = tasks.map(normalizeDeliveryTask);

  // Reference Partner App Navigation Tabs: Home | Earning | Notification | Profile
  const [partnerNavTab, setPartnerNavTab] = useState<'home' | 'earning' | 'notification' | 'profile'>('home');
  const [profileSubSection, setProfileSubSection] = useState<
    'overview' | 'personal' | 'job' | 'documents' | 'bank'
  >('overview');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const [taskFilter, setTaskFilter] = useState<
    'all' | 'first_delivery' | 'second_delivery' | 'measurement_only' | 'cloth_logistics'
  >('all');
  const [selectedTaskId, setSelectedTaskId] = useState<string>(normalizedTasks[0]?.id || '');
  const [activeMeasurementModalTask, setActiveMeasurementModalTask] = useState<DeliveryTask | null>(null);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);

  // Partner Shift & Map States
  const [isOnline, setIsOnline] = useState(true);
  const [mapLayer, setMapLayer] = useState<'streets' | 'satellite' | 'traffic'>('streets');

  // Real-Time Zomato-Style Incoming Delivery Order Listener & Ringing Alert
  const {
    activeOffer,
    queuedCount,
    remainingSeconds,
    totalSeconds,
    isAccepting,
    isRejecting,
    actionError,
    isMuted,
    toggleMute,
    acceptOffer,
    rejectOffer,
    clearActionError,
    dispatchLiveTestOffer,
  } = useIncomingDeliveryOrders({
    partnerId: profile.phoneNumber || 'partner-default',
    partnerPhone: profile.phoneNumber || '+91 98765 43210',
    partnerName: profile.fullName || 'Delivery Partner',
    vehicleType: profile.vehicleType || 'EV',
    vehicleNumber: profile.vehicleNumber || '',
    isOnline,
    liveCoords:
      typeof liveGeo.lat === 'number' && typeof liveGeo.lng === 'number'
        ? { lat: liveGeo.lat, lng: liveGeo.lng }
        : null,
    onOrderAccepted: (acceptedTask) => {
      onAddNewTask(acceptedTask);
      setSelectedTaskId(acceptedTask.id);
    },
  });

  const triggerDeviceLocation = onRequestDeviceLocation || onMovePartnerLocation;

  // Wallet & Earnings Hub States
  const [earningsTab, setEarningsTab] = useState<'today' | 'week' | 'year'>('today');
  const [chartViewMode, setChartViewMode] = useState<'trend' | 'comparison' | 'orders'>('trend');
  const [ledgerTxFilter, setLedgerTxFilter] = useState<'all' | 'measurement' | 'cloth'>('all');
  const [showAllLedgerTx, setShowAllLedgerTx] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawSuccessToast, setWithdrawSuccessToast] = useState(false);

  // Dynamic wallet calculations from real transactions
  const totalCompletedEarnings = ledger
    .filter((tx) => tx.role === 'delivery')
    .reduce((sum, tx) => sum + (tx.amountINR || 0), 0);

  const walletBalance = totalCompletedEarnings;
  const todayEarnings = totalCompletedEarnings;
  const completedDeliveryTxCount = ledger.filter((tx) => tx.role === 'delivery').length;
  const todayDeliveriesCount = completedDeliveryTxCount;
  const dailyTargetCount = 8;
  const yearDeliveriesCount = completedDeliveryTxCount;
  const yearEarningsINR = totalCompletedEarnings;

  // Real-time weekly earnings data for Recharts line chart
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday (Today)'];
  const weeklyEarningsData: WeeklyEarningsPoint[] = daysOfWeek.map((day, idx) => {
    const isToday = idx === 6;
    return {
      day,
      fullName: dayNames[idx],
      date: `Day ${idx + 1}`,
      earnings: isToday ? todayEarnings : 0,
      lastWeek: 0,
      target: 650,
      orders: isToday ? todayDeliveriesCount : 0,
      distanceKm: isToday ? Number((completedDeliveryTxCount * 2.4).toFixed(1)) : 0,
    };
  });

  const totalWeeklyEarnings = weeklyEarningsData.reduce((acc, curr) => acc + curr.earnings, 0);
  const totalWeeklyLastWeek = weeklyEarningsData.reduce((acc, curr) => acc + curr.lastWeek, 0);
  const weeklyGrowthPct = totalWeeklyLastWeek > 0
    ? Math.round(((totalWeeklyEarnings - totalWeeklyLastWeek) / totalWeeklyLastWeek) * 100)
    : 0;
  const averageDailyEarnings = Math.round(totalWeeklyEarnings / weeklyEarningsData.length);
  const bestDay = weeklyEarningsData.reduce(
    (max, curr) => (curr.earnings > max.earnings ? curr : max),
    weeklyEarningsData[0]
  );
  const totalWeeklyOrders = weeklyEarningsData.reduce((acc, curr) => acc + curr.orders, 0);

  // Full Ledger Transactions Statement from real ledger only
  const combinedDeliveryLedger: LedgerTransaction[] = ledger.filter((tx) => tx.role === 'delivery');

  const filteredLedgerTx = combinedDeliveryLedger.filter((tx) => {
    if (ledgerTxFilter === 'all') return true;
    if (ledgerTxFilter === 'measurement') {
      return (
        tx.categoryLabel.toLowerCase().includes('measurement') ||
        tx.description.toLowerCase().includes('measurement')
      );
    }
    if (ledgerTxFilter === 'cloth') {
      return (
        tx.categoryLabel.toLowerCase().includes('cloth') ||
        tx.categoryLabel.toLowerCase().includes('altered') ||
        tx.description.toLowerCase().includes('delivery')
      );
    }
    return true;
  });

  // New Task Creation State
  const [newTaskCategory, setNewTaskCategory] = useState<DeliveryTaskCategory>('measurement_only');
  const [newTaskStage, setNewTaskStage] = useState<DeliveryStageType>('first_delivery');
  const [newTaskService, setNewTaskService] = useState<CustomerServiceOption>(
    'measurement_plus_cloth_pickup'
  );
  const [newTaskOrderNumber, setNewTaskOrderNumber] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCustomerName, setNewTaskCustomerName] = useState('');
  const [newTaskCustomerPhone, setNewTaskCustomerPhone] = useState('');
  const [newTaskPickupAddress, setNewTaskPickupAddress] = useState('');
  const [newTaskDropAddress, setNewTaskDropAddress] = useState('');
  const [newTaskTailorName] = useState('Royal Stitch Bespoke Studio');
  const [newTaskPayoutINR, setNewTaskPayoutINR] = useState('');
  const [newTaskDistanceKm, setNewTaskDistanceKm] = useState('');

  // Measurement Recording State
  const [measurementForm, setMeasurementForm] = useState<RecordedMeasurements>({
    shoulder: '',
    chest: '',
    waist: '',
    hips: '',
    sleeve: '',
    inseam: '',
    videoPostureVerified: true,
    recordedAt: 'Just now',
  });

  const filteredTasks = normalizedTasks.filter((t) => {
    if (taskFilter === 'all') return true;
    if (taskFilter === 'first_delivery') return t.deliveryStage === 'first_delivery';
    if (taskFilter === 'second_delivery') return t.deliveryStage === 'second_delivery';
    return t.category === taskFilter;
  });

  const selectedTask =
    normalizedTasks.find((t) => t.id === selectedTaskId) ||
    filteredTasks[0] ||
    normalizedTasks[0];

  const unacknowledgedNotifications = notifications.filter((n) => !n.acknowledged);

  // Live device GPS coordinates for the Trench Delivery Partner Scooter on Google Maps
  const currentScooterX = liveGeo.partnerMapX;
  const currentScooterY = liveGeo.partnerMapY;
  const currentScooterLat = liveGeo.lat;
  const currentScooterLng = liveGeo.lng;

  const fleetTaskPins: FleetTaskPin[] = normalizedTasks.map((t) => {
    const pickupGeo =
      t.pickupLocationCoords ||
      resolveRealGeoLocation(
        t.pickupAddress,
        t.deliveryStage === 'second_delivery' ? 'tailor' : 'customer',
        { lat: liveGeo.lat, lng: liveGeo.lng }
      );
    const dropGeo =
      t.dropLocationCoords ||
      resolveRealGeoLocation(
        t.dropAddress || t.tailorShopAddress || 'Assigned Tailor Studio',
        t.deliveryStage === 'second_delivery' ? 'customer' : 'tailor',
        { lat: liveGeo.lat, lng: liveGeo.lng }
      );
    return {
      id: t.id,
      orderNumber: t.orderNumber,
      customerName: t.customerName,
      title: t.title,
      stage: t.deliveryStage === 'second_delivery' ? 'second_delivery' : 'first_delivery',
      status: t.status,
      payoutINR: t.payoutINR,
      pickupCoords: {
        lat: pickupGeo.lat,
        lng: pickupGeo.lng,
        address: pickupGeo.address || t.pickupAddress,
      },
      dropCoords: {
        lat: dropGeo.lat,
        lng: dropGeo.lng,
        address: dropGeo.address || t.dropAddress || 'Assigned Tailor Workshop',
      },
      tailorShopName: t.tailorShopName,
    };
  });

  const selectedFleetPin =
    fleetTaskPins.find((p) => p.id === selectedTask?.id) || fleetTaskPins[0];

  const handleWithdrawUPI = () => {
    setShowWithdrawModal(false);
    setWithdrawSuccessToast(true);
    setTimeout(() => setWithdrawSuccessToast(false), 4500);
  };

  const handleOpenMeasurementRecorder = (task: DeliveryTask) => {
    setMeasurementForm({
      shoulder: task.recordedMeasurements?.shoulder || '',
      chest: task.recordedMeasurements?.chest || '',
      waist: task.recordedMeasurements?.waist || '',
      hips: task.recordedMeasurements?.hips || '',
      sleeve: task.recordedMeasurements?.sleeve || '',
      inseam: task.recordedMeasurements?.inseam || '',
      videoPostureVerified: true,
      recordedAt: 'Just now',
    });
    setActiveMeasurementModalTask(task);
  };

  const handleSubmitMeasurementModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMeasurementModalTask) return;
    onTaskAction(activeMeasurementModalTask.id, 'submit_measurements', measurementForm);
    setActiveMeasurementModalTask(null);
  };

  const handleCreateTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !newTaskOrderNumber.trim() ||
      !newTaskTitle.trim() ||
      !newTaskCustomerName.trim() ||
      !newTaskPickupAddress.trim()
    ) {
      return;
    }

    const pickupLoc = resolveRealGeoLocation(
      newTaskPickupAddress.trim(),
      newTaskStage === 'second_delivery' ? 'tailor' : 'customer',
      { lat: liveGeo.lat, lng: liveGeo.lng }
    );
    const dropAddr =
      newTaskDropAddress.trim() ||
      (newTaskStage === 'first_delivery'
        ? `${newTaskTailorName} (${liveGeo.sectorName})`
        : `Customer Delivery Address (${liveGeo.sectorName})`);
    const dropLoc = resolveRealGeoLocation(
      dropAddr,
      newTaskStage === 'second_delivery' ? 'customer' : 'tailor',
      { lat: liveGeo.lat, lng: liveGeo.lng }
    );

    const created: DeliveryTask = normalizeDeliveryTask({
      id: `task-${Date.now()}`,
      orderNumber: newTaskOrderNumber.trim(),
      category: newTaskCategory,
      deliveryStage: newTaskStage,
      selectedService: newTaskService,
      title: newTaskTitle.trim(),
      customerName: newTaskCustomerName.trim(),
      customerPhone: newTaskCustomerPhone.trim(),
      pickupAddress: newTaskPickupAddress.trim(),
      dropAddress: dropAddr,
      tailorShopName: newTaskTailorName,
      tailorShopAddress:
        newTaskStage === 'first_delivery' ? dropAddr : newTaskPickupAddress.trim(),
      garmentSummary: newTaskTitle.trim(),
      payoutINR: Number(newTaskPayoutINR) || 95,
      distanceKm: Number(newTaskDistanceKm) || 2.4,
      etaMinutes: Math.max(5, Math.round((Number(newTaskDistanceKm) || 2.4) * 4)),
      status: 'assigned',
      assignedPartnerName: profile.fullName || 'Delivery Partner',
      assignedPartnerPhone: profile.phoneNumber || 'Not provided',
      assignedAt: 'Just now',
      pickupLocationCoords: pickupLoc,
      dropLocationCoords: dropLoc,
      mapCoords: { x: pickupLoc.mapX, y: pickupLoc.mapY },
      deliveryHistory: [
        {
          id: `dh-${Date.now()}`,
          status: 'assigned',
          label: `${
            newTaskStage === 'second_delivery'
              ? 'Second Delivery (Tailor → Customer)'
              : 'First Delivery (Customer → Tailor)'
          } Assigned`,
          timestamp: 'Just now',
          locationAddress: newTaskPickupAddress.trim(),
        },
      ],
    });

    onAddNewTask(created);
    setSelectedTaskId(created.id);
    setNewTaskOrderNumber('');
    setNewTaskTitle('');
    setNewTaskCustomerName('');
    setNewTaskCustomerPhone('');
    setNewTaskPickupAddress('');
    setNewTaskDropAddress('');
    setNewTaskPayoutINR('');
    setNewTaskDistanceKm('');
    setShowNewTaskModal(false);
  };

  const handlePrimaryAction = (taskToAct: DeliveryTask | undefined = selectedTask) => {
    if (!taskToAct) {
      setShowNewTaskModal(true);
      return;
    }
    const isSecondStage =
      taskToAct.deliveryStage === 'second_delivery' || Boolean(taskToAct.isUrgentTailorPickup);

    if (isSecondStage) {
      if (taskToAct.status === 'assigned') {
        onTaskAction(taskToAct.id, 'pickup_from_tailor');
      } else if (
        taskToAct.status === 'picked_up_from_tailor' ||
        taskToAct.status === 'cloth_picked_up'
      ) {
        onTaskAction(taskToAct.id, 'deliver_to_customer');
      }
      return;
    }

    // First Delivery (Customer -> Tailor)
    if (
      taskToAct.selectedService === 'measurement_plus_cloth_pickup' &&
      !taskToAct.recordedMeasurements &&
      taskToAct.status === 'assigned'
    ) {
      handleOpenMeasurementRecorder(taskToAct);
      return;
    }
    if (
      taskToAct.status === 'assigned' ||
      taskToAct.status === 'measurement_recorded'
    ) {
      onTaskAction(taskToAct.id, 'pickup_from_customer');
    } else if (
      taskToAct.status === 'picked_up_from_customer' ||
      taskToAct.status === 'cloth_picked_up'
    ) {
      onTaskAction(taskToAct.id, 'deliver_to_tailor');
    }
  };

  const getPrimaryActionLabel = (task?: DeliveryTask) => {
    if (!task) return 'Assign New Task';
    const isSecondStage =
      task.deliveryStage === 'second_delivery' || Boolean(task.isUrgentTailorPickup);

    if (isSecondStage) {
      if (task.status === 'assigned') return '2nd Delivery: Mark Picked Up from Tailor';
      if (task.status === 'picked_up_from_tailor' || task.status === 'cloth_picked_up') {
        return '2nd Delivery: Mark Delivered to Customer';
      }
      return '2nd Delivery Completed (Customer Received) ✓';
    }

    if (
      task.selectedService === 'measurement_plus_cloth_pickup' &&
      !task.recordedMeasurements &&
      task.status === 'assigned'
    ) {
      return '1st Delivery: Take Customer Measurements';
    }
    if (task.status === 'assigned' || task.status === 'measurement_recorded') {
      return '1st Delivery: Mark Picked Up from Customer';
    }
    if (task.status === 'picked_up_from_customer' || task.status === 'cloth_picked_up') {
      return '1st Delivery: Mark Delivered to Tailor';
    }
    return '1st Delivery Completed (Handed to Tailor) ✓';
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Instant Withdraw Toast Notification */}
      {withdrawSuccessToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 border border-emerald-400 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
          <div className="text-xs sm:text-sm font-bold">
            <div>₹{walletBalance.toLocaleString('en-IN')} Withdrawn Successfully!</div>
            <div className="text-[11px] text-emerald-100 font-mono font-normal">
              Direct deposit initiated to UPI: {profile.upiId || 'Registered UPI ID'}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SLIDE-OUT HAMBURGER MENU DRAWER (Matches Reference Row 4 Col 3)           */}
      {/* ========================================================================= */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex">
          <div className="w-80 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col justify-between p-6 overflow-y-auto">
            <div className="space-y-6">
              {/* Top Profile Header inside Drawer */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#000080] text-white flex items-center justify-center font-black text-base overflow-hidden border-2 border-blue-200">
                    {profile.partnerPhotoDataUrl ? (
                      <img
                        src={profile.partnerPhotoDataUrl}
                        alt={profile.fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      profile.fullName?.charAt(0) || 'A'
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-black text-slate-900">
                      {profile.fullName || 'Delivery Partner'}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500">
                      {profile.phoneNumber || 'Partner Account'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Menu Items (Matches Reference Drawer) */}
              <nav className="space-y-1">
                {[
                  {
                    label: 'Home Dashboard',
                    icon: Home,
                    onClick: () => {
                      setPartnerNavTab('home');
                      setIsDrawerOpen(false);
                    },
                  },
                  {
                    label: 'Notification',
                    icon: Bell,
                    badge: unacknowledgedNotifications.length,
                    onClick: () => {
                      setPartnerNavTab('notification');
                      setIsDrawerOpen(false);
                    },
                  },
                  {
                    label: 'Earning & Finance',
                    icon: Wallet,
                    onClick: () => {
                      setPartnerNavTab('earning');
                      setIsDrawerOpen(false);
                    },
                  },
                  {
                    label: 'Partner Profile & Docs',
                    icon: User,
                    onClick: () => {
                      setPartnerNavTab('profile');
                      setProfileSubSection('overview');
                      setIsDrawerOpen(false);
                    },
                  },
                  {
                    label: 'Booking Schedule',
                    icon: Calendar,
                    onClick: () => {
                      setIsDrawerOpen(false);
                      setShowScheduleModal(true);
                    },
                  },
                  {
                    label: 'Measurement Tutorial',
                    icon: Video,
                    onClick: () => {
                      setIsDrawerOpen(false);
                      onReopenTutorial();
                    },
                  },
                  {
                    label: 'Support & Help Center',
                    icon: HelpCircle,
                    onClick: () => {
                      setIsDrawerOpen(false);
                    },
                  },
                  {
                    label: 'Terms & Privacy Policy',
                    icon: Lock,
                    onClick: () => {
                      setIsDrawerOpen(false);
                    },
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={item.onClick}
                      className="w-full px-3.5 py-3 rounded-xl hover:bg-blue-50/60 text-left flex items-center justify-between text-xs sm:text-sm font-bold text-slate-700 hover:text-[#000080] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 text-[#000080]" />
                        <span>{item.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {item.badge ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold">
                            {item.badge}
                          </span>
                        ) : null}
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Bottom Actions: Start New Delivery Application & Logout / Switch */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setIsDrawerOpen(false);
                  if (onStartNewApplication) {
                    onStartNewApplication();
                  } else {
                    onBack();
                  }
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#000080] text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Start New Delivery Application</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsDrawerOpen(false);
                  onBack();
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout / Switch Portal</span>
              </button>
            </div>
          </div>
          <div className="flex-1" onClick={() => setIsDrawerOpen(false)} />
        </div>
      )}



      {/* ========================================================================= */}
      {/* TOP PARTNER APP BAR + OFFLINE / ONLINE SEGMENTED TOGGLE (Reference Row 4) */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left: Hamburger Menu + Back Button + Add Location / Live GPS */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Open Partner Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={onBack}
              className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Back to Onboarding / Portal Select"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={triggerDeviceLocation}
                  className="text-xs sm:text-sm font-black text-slate-900 hover:text-[#000080] flex items-center gap-1.5 truncate cursor-pointer"
                >
                  <MapPin className="w-4 h-4 text-[#000080] shrink-0" />
                  <span className="truncate">{liveGeo.sectorName || 'Add Location'}</span>
                </button>
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md shrink-0">
                  4.95 ⭐
                </span>
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                <span className="font-bold text-slate-700">{profile.fullName || 'Delivery Partner'}</span>
                <span>·</span>
                <span>{profile.vehicleType || 'Vehicle not set'}</span>
                <span>·</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <BatteryCharging className="w-3 h-3" />
                  <span>86%</span>
                </span>
              </div>
            </div>
          </div>

          {/* Center: Offline | Online Segmented Toggle Pill (Matches Reference Row 4 Col 4) */}
          <div className="flex items-center flex-wrap gap-2.5 self-start md:self-auto">
            <div className="inline-flex p-1 rounded-full bg-slate-100 border border-slate-200">
              <button
                type="button"
                data-testid="partner-offline-btn"
                onClick={() => setIsOnline(false)}
                className={`px-5 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                  !isOnline
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Offline
              </button>
              <button
                type="button"
                data-testid="partner-online-btn"
                onClick={() => setIsOnline(true)}
                className={`px-5 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                  isOnline
                    ? 'bg-[#000080] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Online
              </button>
            </div>

            {isOnline && (
              <button
                type="button"
                data-testid="trigger-incoming-order-btn"
                onClick={() => {
                  dispatchLiveTestOffer();
                }}
                title="Dispatch a real-time incoming delivery order popup with ringing alert"
                className="px-3 py-2 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
              >
                <BellRing className="w-3.5 h-3.5" />
                <span>Incoming Order Ring</span>
              </button>
            )}

            <button
              type="button"
              onClick={onReopenTutorial}
              className="px-3 py-2 text-xs font-bold text-[#000080] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Video className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tutorial</span>
            </button>

            <div
              className="hidden xl:flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-[11px] font-mono font-bold shrink-0"
              title="Connected to Supabase Project nedcyrdglahskrifquxh"
            >
              <Database className="w-3.5 h-3.5 text-emerald-700" />
              <span>nedcyrdglahskrifquxh</span>
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* REFERENCE HOME SCREEN OVERVIEW: BOOKING SCHEDULE + 2 STAT CARDS + 3 TILES */}
      {/* ========================================================================= */}
      {partnerNavTab === 'home' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-xs space-y-4">
          {/* "Booking Schedule ›" Row (Exact Match to Reference Row 4 Col 4) */}
          <button
            type="button"
            onClick={() => setShowScheduleModal(true)}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-blue-50/40 flex items-center justify-between text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-[#000080]" />
              <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                Booking Schedule
              </span>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                08:00 AM – 08:00 PM Active Shift
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          {/* 2 Hero Stat Cards: Today's Earnings & Today's Bookings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div
              onClick={() => setPartnerNavTab('earning')}
              className="p-4 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/80 via-white to-sky-50/50 cursor-pointer hover:border-[#000080] transition-all flex items-center justify-between"
            >
              <div>
                <div className="text-xl sm:text-2xl font-black font-mono text-[#000080] tracking-tight">
                  ₹{walletBalance.toLocaleString('en-IN')}
                </div>
                <div className="text-xs sm:text-sm font-extrabold text-slate-800 mt-0.5">
                  Today&apos;s Earnings
                </div>
                <div className="text-[11px] font-medium text-slate-500 mt-0.5">
                  {todayDeliveriesCount > 0
                    ? `${todayDeliveriesCount} completed trip${todayDeliveriesCount === 1 ? '' : 's'} today`
                    : 'Verified instant UPI payout balance'}
                </div>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-[#000080]/10 text-[#000080] flex items-center justify-center font-black shrink-0">
                ₹
              </div>
            </div>

            <div
              onClick={() => setTaskFilter('all')}
              className="p-4 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/80 via-white to-sky-50/50 cursor-pointer hover:border-[#000080] transition-all flex items-center justify-between"
            >
              <div>
                <div className="text-xl sm:text-2xl font-black font-mono text-[#000080] tracking-tight">
                  {normalizedTasks.length} {normalizedTasks.length === 1 ? 'Order' : 'Orders'}
                </div>
                <div className="text-xs sm:text-sm font-extrabold text-slate-800 mt-0.5">
                  Today&apos;s Bookings
                </div>
                <div className="text-[11px] font-medium text-slate-500 mt-0.5">
                  Active doorstep pickup &amp; delivery queue
                </div>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-[#000080]/10 text-[#000080] flex items-center justify-center shrink-0">
                <PackageCheck className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* 3 Quick-Action Icon Cards: New Bookings | Booking Management | Finance (Matches Reference) */}
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setShowNewTaskModal(true)}
              className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-[#000080] hover:bg-blue-50/20 flex flex-col items-center text-center gap-2 transition-all cursor-pointer shadow-2xs"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#000080] flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-xs font-extrabold text-slate-800">New Bookings</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('partner-bookings-queue');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-[#000080] hover:bg-blue-50/20 flex flex-col items-center text-center gap-2 transition-all cursor-pointer shadow-2xs"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#000080] flex items-center justify-center">
                <Briefcase className="w-5 h-5" />
              </div>
              <span className="text-xs font-extrabold text-slate-800">Booking Management</span>
            </button>

            <button
              type="button"
              onClick={() => setShowWithdrawModal(true)}
              className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-[#000080] hover:bg-blue-50/20 flex flex-col items-center text-center gap-2 transition-all cursor-pointer shadow-2xs"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#000080] flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
              <span className="text-xs font-extrabold text-slate-800">Finance &amp; Withdraw</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PROFILE VIEW (Matches Reference Row 5 Cols 3-4 & Row 6 Cols 1-3)          */}
      {/* ========================================================================= */}
      {partnerNavTab === 'profile' && (
        <section className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              {profileSubSection !== 'overview' && (
                <button
                  type="button"
                  onClick={() => setProfileSubSection('overview')}
                  className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <h2 className="text-xl font-black text-slate-900">
                {profileSubSection === 'overview'
                  ? 'Profile'
                  : profileSubSection === 'personal'
                  ? 'Personal Details'
                  : profileSubSection === 'job'
                  ? 'Job Details'
                  : profileSubSection === 'documents'
                  ? 'Documents'
                  : 'Bank Details'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onStartNewApplication || onBack}
                className="px-3.5 py-2 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-xs font-bold text-[#000080] flex items-center gap-1.5 cursor-pointer"
                title="Start a new delivery onboarding application"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Start New Application</span>
              </button>
              <button
                type="button"
                onClick={onBack}
                className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Steps</span>
              </button>
            </div>
          </div>

          {profileSubSection === 'overview' && (
            <div className="max-w-xl mx-auto space-y-6">
              {/* Circular Partner Photo & Name (Matches Reference "Profile" Screen) */}
              <div className="flex flex-col items-center text-center space-y-2.5">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-[#000080] text-white flex items-center justify-center text-2xl font-black overflow-hidden border-4 border-blue-100 shadow-md">
                    {profile.partnerPhotoDataUrl ? (
                      <img
                        src={profile.partnerPhotoDataUrl}
                        alt={profile.fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      profile.fullName?.charAt(0) || 'A'
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    {profile.fullName || 'Delivery Partner'}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {profile.phoneNumber || 'Contact Pending'} · Verified Partner
                  </p>
                </div>
              </div>

              {/* 4 Profile Drill-Down Cards: Personal Details | Job Details | Documents | Bank Details */}
              <div className="space-y-3">
                {[
                  {
                    id: 'personal' as const,
                    label: 'Personal Details',
                    sub: `${profile.fullName || 'Partner'} · ${profile.city || 'Location Pending'}`,
                    icon: User,
                  },
                  {
                    id: 'job' as const,
                    label: 'Job Details',
                    sub: `${profile.vehicleType || 'Vehicle Pending'} · ${profile.vehicleNumber || 'Plate Pending'}`,
                    icon: Briefcase,
                  },
                  {
                    id: 'documents' as const,
                    label: 'Documents',
                    sub: `Aadhaar: ${profile.aadhaarNumber || 'Pending'} · PAN: ${profile.panNumber || 'Pending'}`,
                    icon: FileText,
                  },
                  {
                    id: 'bank' as const,
                    label: 'Bank Details',
                    sub: `A/C: ${profile.bankAccountNumber ? '•••• ' + profile.bankAccountNumber.slice(-4) : 'Pending'} · UPI: ${profile.upiId || 'Pending'}`,
                    icon: Landmark,
                  },
                ].map((row) => {
                  const Icon = row.icon;
                  return (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => setProfileSubSection(row.id)}
                      className="w-full p-4 rounded-2xl border border-slate-200 bg-white hover:border-[#000080] flex items-center justify-between text-left transition-all cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#000080] flex items-center justify-center shrink-0">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-extrabold text-slate-900">{row.label}</div>
                          <div className="text-xs text-slate-500">{row.sub}</div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {profileSubSection === 'personal' && (
            <div className="max-w-xl mx-auto space-y-3">
              {[
                { label: 'Full Name', value: profile.fullName || 'Not provided' },
                { label: 'Mobile Number', value: profile.phoneNumber || 'Not provided' },
                { label: 'Date of Birth', value: profile.dateOfBirth || 'Not provided' },
                {
                  label: 'Residential Address',
                  value: profile.streetAddress || profile.city
                    ? `${profile.streetAddress || ''}, ${profile.city || ''} ${profile.pincode || ''}`.trim()
                    : 'Not provided',
                },
                {
                  label: 'Emergency Contact',
                  value: profile.emergencyContactName || profile.emergencyContactPhone
                    ? `${profile.emergencyContactName || ''} (${profile.emergencyContactPhone || ''})`.trim()
                    : 'Not provided',
                },
              ].map((field) => (
                <div
                  key={field.label}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60"
                >
                  <div className="text-[11px] font-bold text-slate-400 uppercase">
                    {field.label}
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">{field.value}</div>
                </div>
              ))}
              <button
                type="button"
                onClick={onBack}
                className="w-full h-12 rounded-xl bg-[#000080] hover:bg-[#000066] text-white font-extrabold text-xs uppercase tracking-wider cursor-pointer mt-2"
              >
                UPDATE DOCUMENT &amp; DETAILS
              </button>
            </div>
          )}

          {profileSubSection === 'job' && (
            <div className="max-w-xl mx-auto space-y-3">
              {[
                { label: 'Active Service Location', value: liveGeo.sectorName },
                { label: 'Vehicle Type', value: profile.vehicleType || 'EV (Electric)' },
                { label: 'Vehicle Plate Number', value: profile.vehicleNumber || 'KA 01 EV 2026' },
                {
                  label: 'Driving License Number',
                  value: profile.drivingLicenseNumber || 'KA01 20210094821',
                },
              ].map((field) => (
                <div
                  key={field.label}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60"
                >
                  <div className="text-[11px] font-bold text-slate-400 uppercase">
                    {field.label}
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">{field.value}</div>
                </div>
              ))}
              <button
                type="button"
                onClick={onBack}
                className="w-full h-12 rounded-xl bg-[#000080] hover:bg-[#000066] text-white font-extrabold text-xs uppercase tracking-wider cursor-pointer mt-2"
              >
                UPDATE JOB DETAILS
              </button>
            </div>
          )}

          {profileSubSection === 'documents' && (
            <div className="max-w-xl mx-auto space-y-3">
              {[
                {
                  label: 'Aadhaar e-KYC',
                  value: profile.aadhaarNumber || 'Not provided',
                  file: profile.aadhaarPdfFileName || (profile.aadhaarFrontUploaded ? 'aadhaar_uploaded.pdf' : 'Not uploaded'),
                },
                {
                  label: 'PAN Card',
                  value: profile.panNumber || 'Not provided',
                  file: profile.panPdfFileName || (profile.panCardUploaded ? 'pan_uploaded.pdf' : 'Not uploaded'),
                },
                {
                  label: 'Driving License',
                  value: profile.drivingLicenseNumber || 'Not provided',
                  file: profile.drivingLicenseFileName || (profile.drivingLicenseUploaded ? 'dl_uploaded.pdf' : 'Not uploaded'),
                },
              ].map((doc) => (
                <div
                  key={doc.label}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-extrabold text-slate-900">{doc.label}</div>
                    <div className="text-xs font-mono text-slate-600 mt-0.5">{doc.value}</div>
                    <div className="text-[11px] text-[#000080] font-medium mt-0.5">{doc.file}</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                    Verified ✓
                  </span>
                </div>
              ))}
              <button
                type="button"
                onClick={onBack}
                className="w-full h-12 rounded-xl bg-[#000080] hover:bg-[#000066] text-white font-extrabold text-xs uppercase tracking-wider cursor-pointer mt-2"
              >
                UPDATE DOCUMENT
              </button>
            </div>
          )}

          {profileSubSection === 'bank' && (
            <div className="max-w-xl mx-auto space-y-3">
              {[
                {
                  label: 'Account Holder',
                  value: profile.bankAccountHolder || profile.fullName || 'Not provided',
                },
                {
                  label: 'Bank Account Number',
                  value: profile.bankAccountNumber || 'Not provided',
                },
                { label: 'IFSC Code', value: profile.ifscCode || 'Not provided' },
                { label: 'Verified UPI ID', value: profile.upiId || 'Not provided' },
              ].map((field) => (
                <div
                  key={field.label}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60"
                >
                  <div className="text-[11px] font-bold text-slate-400 uppercase">
                    {field.label}
                  </div>
                  <div className="text-sm font-mono font-bold text-slate-900 mt-0.5">
                    {field.value}
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setShowWithdrawModal(true)}
                className="w-full h-12 rounded-xl bg-[#000080] hover:bg-[#000066] text-white font-extrabold text-xs uppercase tracking-wider cursor-pointer mt-2"
              >
                WITHDRAW AMOUNT (₹{walletBalance.toLocaleString('en-IN')})
              </button>
            </div>
          )}
        </section>
      )}

      {/* ========================================================================= */}
      {/* 1. LIVE "ON THE WAY" GOOGLE MAP + BOOKING STATUS CHECKLIST (Row 6 Cols 2&3) */}
      {/* ========================================================================= */}
      {partnerNavTab === 'home' && normalizedTasks.length > 0 && selectedTask && (
      <section
        aria-label="Live On The Way Delivery Navigation Map"
        className="relative bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl text-white"
      >
        {/* Device Location Permission Banner when live GPS is not yet granted */}
        {(!liveGeo.isLiveDeviceLocation || liveGeo.permissionState === 'denied') && (
          <div className="px-4 py-3 bg-gradient-to-r from-[#000080] via-blue-900 to-slate-900 border-b border-sky-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-start sm:items-center gap-2.5 text-xs">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 sm:mt-0 animate-bounce" />
              <div>
                <span className="font-extrabold text-white">
                  {liveGeo.permissionState === 'denied'
                    ? 'Device Location Permission Blocked in Browser'
                    : 'Enable Real-Time Device Location for Live Delivery Navigation'}
                </span>
                <p className="text-[11px] text-sky-200 mt-0.5">
                  {liveGeo.errorMessage ||
                    'Grant browser geolocation permission so the map tracks your real live device coordinates instead of default coordinates.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={triggerDeviceLocation}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-md"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>
                {liveGeo.permissionState === 'requesting'
                  ? 'Requesting Device GPS...'
                  : 'Allow Device Location'}
              </span>
            </button>
          </div>
        )}

        {/* Top Floating Map Action Bar */}
        <div className="p-4 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-400">
                <span className="text-emerald-400 uppercase tracking-wider font-mono flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>
                    {liveGeo.isLiveDeviceLocation
                      ? `Active Delivery Navigation`
                      : 'Delivery Navigation'}
                  </span>
                </span>
                <span>·</span>
                <span className="text-sky-200 truncate max-w-[260px] sm:max-w-[380px]">
                  {liveGeo.sectorName}
                </span>
              </div>
              <div className="text-sm sm:text-base font-extrabold text-white mt-0.5 flex items-center gap-2">
                <span>
                  Active Order: {selectedTask ? selectedTask.customerName : 'Customer Order'}
                </span>
                {selectedTask && (
                  <span className="text-xs font-extrabold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-md">
                    ETA {selectedTask.etaMinutes} mins ({selectedTask.distanceKm} km)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Map Buttons: Live Device GPS Permission/Refresh, Map Mode & Call */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() =>
                setMapLayer((prev) =>
                  prev === 'streets'
                    ? 'satellite'
                    : prev === 'satellite'
                    ? 'traffic'
                    : 'streets'
                )
              }
              title="Switch between Default Real-World Google Map, Satellite View, and Radar View"
              className="px-3 py-1.5 text-xs font-bold text-sky-300 bg-slate-800 hover:bg-slate-700 border border-sky-500/40 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span>
                {mapLayer === 'streets'
                  ? 'Google Map (Default)'
                  : mapLayer === 'satellite'
                  ? 'Google Satellite'
                  : 'Radar View'}
              </span>
            </button>

            <button
              type="button"
              onClick={triggerDeviceLocation}
              title="Use or refresh real-time device GPS location via browser geolocation permission"
              className={`px-3.5 py-1.5 text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md ${
                liveGeo.isLiveDeviceLocation
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-[#000080] hover:bg-blue-600 text-white'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-white" />
              <span>
                {liveGeo.permissionState === 'requesting'
                  ? 'Locating Device...'
                  : liveGeo.isLiveDeviceLocation
                  ? '📍 Refresh Live Device GPS'
                  : '📍 Use My Device Location'}
              </span>
            </button>

            {selectedTask?.customerPhone && (
              <a
                href={`tel:${selectedTask.customerPhone}`}
                className="px-3 py-1.5 text-xs font-bold text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call Customer</span>
              </a>
            )}
          </div>
        </div>

        {/* Genuine Real-World Google Map (Default) with Custom Trench Delivery Logo & Blue Scooter Partner */}
        <div className="relative w-full h-96 sm:h-112 bg-[#161B22] overflow-hidden select-none">
          {mapLayer !== 'traffic' ? (
            <TrenchLiveFleetGoogleMap
              partnerName={profile.fullName || 'Partner'}
              partnerLat={currentScooterLat}
              partnerLng={currentScooterLng}
              accuracyMeters={liveGeo.accuracyMeters}
              isLiveDeviceLocation={liveGeo.isLiveDeviceLocation}
              liveAddressLabel={liveGeo.sectorName}
              onRequestLocationPermission={triggerDeviceLocation}
              onAddressResolved={onResolvedDeviceAddress}
              selectedTask={selectedFleetPin}
              allTasks={fleetTaskPins}
              onSelectTask={(taskId) => setSelectedTaskId(taskId)}
              mapTypeId={mapLayer === 'satellite' ? 'hybrid' : 'roadmap'}
            />
          ) : (
            <svg
              viewBox="0 0 800 400"
              className="w-full h-full block object-cover"
              role="img"
              aria-label="Interactive Delivery Street Map"
            >
              <rect width="800" height="400" fill="#0F172A" />
              <g fill="#1E293B" stroke="#0F172A" strokeWidth="2">
                <rect x="20" y="20" width="160" height="100" rx="8" />
                <rect x="220" y="20" width="160" height="100" rx="8" />
                <rect x="420" y="20" width="180" height="100" rx="8" />
                <rect x="640" y="20" width="140" height="100" rx="8" />
                <rect x="20" y="160" width="160" height="100" rx="8" />
                <rect x="220" y="160" width="160" height="100" rx="8" />
                <rect x="420" y="160" width="180" height="100" rx="8" fill="#143425" stroke="#10B981" strokeOpacity="0.4" />
                <rect x="640" y="160" width="140" height="100" rx="8" />
                <rect x="20" y="300" width="160" height="80" rx="8" />
                <rect x="220" y="300" width="160" height="80" rx="8" />
                <rect x="420" y="300" width="180" height="80" rx="8" />
                <rect x="640" y="300" width="140" height="80" rx="8" />
              </g>
              <g stroke="#334155" strokeWidth="28" fill="none" strokeLinecap="round">
                <path d="M 0 140 L 800 140" />
                <path d="M 0 280 L 800 280" />
                <path d="M 200 0 L 200 400" />
                <path d="M 400 0 L 400 400" />
                <path d="M 620 0 L 620 400" />
                <path d="M 40 380 L 760 40" stroke="#475569" strokeWidth="20" />
              </g>
              <g stroke="#64748B" strokeWidth="2" strokeDasharray="16 14" fill="none">
                <path d="M 0 140 L 800 140" />
                <path d="M 0 280 L 800 280" />
                <path d="M 200 0 L 200 400" />
                <path d="M 400 0 L 400 400" />
                <path d="M 620 0 L 620 400" />
                <path d="M 40 380 L 760 40" stroke="#94A3B8" strokeWidth="2" strokeDasharray="12 10" />
              </g>
              <g fill="#94A3B8" fontSize="10" fontFamily="monospace" fontWeight="bold">
                <text x="60" y="135">LIVE GPS: {liveGeo.lat.toFixed(4)}°N, {liveGeo.lng.toFixed(4)}°E</text>
                <text x="440" y="215" fill="#34D399">ACTIVE DEVICE GEOLOCATION SECTOR</text>
              </g>
              {selectedTask && (
                <g id="active-delivery-route">
                  <path
                    d={`M ${(currentScooterX / 100) * 800} ${(currentScooterY / 100) * 400} Q 400 200 ${
                      (selectedTask.mapCoords.x / 100) * 800
                    } ${(selectedTask.mapCoords.y / 100) * 400}`}
                    fill="none"
                    stroke="#38BDF8"
                    strokeWidth="6"
                    strokeLinecap="round"
                    opacity="0.9"
                  />
                  <path
                    d={`M ${(currentScooterX / 100) * 800} ${(currentScooterY / 100) * 400} Q 400 200 ${
                      (selectedTask.mapCoords.x / 100) * 800
                    } ${(selectedTask.mapCoords.y / 100) * 400}`}
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="2.5"
                    strokeDasharray="8 6"
                  />
                </g>
              )}
              {selectedTask && (
                <g
                  transform={`translate(${
                    (selectedTask.mapCoords.x / 100) * 800
                  }, ${(selectedTask.mapCoords.y / 100) * 400})`}
                >
                  <circle r="22" fill="rgba(239, 68, 68, 0.2)" />
                  <circle r="12" fill="#EF4444" stroke="#FFFFFF" strokeWidth="2.5" />
                  <path d="M -4 -3 L 4 -3 L 0 5 Z" fill="#FFFFFF" />
                  <rect x="-65" y="-45" width="130" height="26" rx="6" fill="#0F172A" stroke="#EF4444" strokeWidth="1.5" />
                  <text x="0" y="-30" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="bold">
                    {selectedTask.customerName}
                  </text>
                  <text x="0" y="-20" textAnchor="middle" fill="#F87171" fontSize="8" fontWeight="bold">
                    Order #{selectedTask.orderNumber}
                  </text>
                </g>
              )}
              <g
                transform={`translate(${
                  (currentScooterX / 100) * 800 - 32
                }, ${(currentScooterY / 100) * 400 - 32})`}
                className="transition-all duration-300"
              >
                <circle cx="32" cy="32" r="34" fill="rgba(56, 189, 248, 0.2)" className="animate-ping" style={{ animationDuration: '3s' }} />
                <circle cx="32" cy="32" r="26" fill="rgba(0, 0, 128, 0.35)" />
                <foreignObject width="64" height="64" x="0" y="0">
                  <BluePartnerScooterIcon size={64} />
                </foreignObject>
                <rect x="-10" y="62" width="84" height="18" rx="6" fill="#000080" stroke="#38BDF8" strokeWidth="1.5" />
                <text x="32" y="74" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="bold">
                  {profile.fullName || 'Partner (You)'} · 🛵
                </text>
              </g>
            </svg>
          )}

          {/* Reference "On The Way" White Bottom Card Overlay (Matches Row 6 Col 2) */}
          {selectedTask && (
            <div className="absolute bottom-3 inset-x-3 sm:inset-x-6 bg-white text-slate-900 border border-slate-200 rounded-2xl p-4 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-blue-50 border border-blue-200 text-[#000080] flex items-center justify-center font-black text-sm shrink-0">
                  {selectedTask.customerName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-900">
                      {selectedTask.customerName}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-[#000080] bg-blue-50 px-2 py-0.5 rounded-md">
                      #{selectedTask.orderNumber} · ₹{selectedTask.payoutINR}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-[#000080] shrink-0" />
                    <span className="truncate max-w-[260px] sm:max-w-[380px]">
                      {selectedTask.pickupAddress}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedTask.customerPhone && (
                  <a
                    href={`tel:${selectedTask.customerPhone}`}
                    className="w-10 h-10 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#000080] flex items-center justify-center shrink-0 cursor-pointer"
                    title="Call Customer"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => handlePrimaryAction(selectedTask)}
                  className="flex-1 sm:flex-initial px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white bg-[#000080] hover:bg-[#000066] active:scale-95 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#000080]/25"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{getPrimaryActionLabel(selectedTask)}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
      )}

      {/* ========================================================================= */}
      {/* 1B. REFERENCE "BOOKING STATUS" CHECKLIST CARD (Matches Row 6 Col 3)       */}
      {/* ========================================================================= */}
      {partnerNavTab === 'home' && selectedTask && (
        <section className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-black text-slate-900">Booking Status</h3>
              <p className="text-xs text-slate-500">
                Update Status · Booking ID #{selectedTask.orderNumber} ({selectedTask.title})
              </p>
            </div>
            <span className="text-xs font-extrabold text-[#000080] bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
              {selectedTask.deliveryStage === 'second_delivery'
                ? '2nd Delivery: Tailor → Customer'
                : '1st Delivery: Customer → Tailor'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {[
              {
                label: 'On the way to pickup',
                done: true,
              },
              {
                label:
                  selectedTask.selectedService === 'measurement_plus_cloth_pickup'
                    ? 'Measurements Recorded'
                    : 'Arrived at Pickup Location',
                done:
                  Boolean(selectedTask.recordedMeasurements) ||
                  selectedTask.status !== 'assigned',
              },
              {
                label:
                  selectedTask.deliveryStage === 'second_delivery'
                    ? 'Picked up from Tailor'
                    : 'Picked up from Customer',
                done:
                  selectedTask.status === 'picked_up_from_customer' ||
                  selectedTask.status === 'delivered_to_tailor' ||
                  selectedTask.status === 'picked_up_from_tailor' ||
                  selectedTask.status === 'delivered_to_customer' ||
                  selectedTask.status === 'cloth_picked_up' ||
                  selectedTask.status === 'cloth_delivered',
              },
              {
                label:
                  selectedTask.deliveryStage === 'second_delivery'
                    ? 'Delivered to Customer'
                    : 'Delivered to Tailor',
                done:
                  selectedTask.status === 'delivered_to_tailor' ||
                  selectedTask.status === 'delivered_to_customer' ||
                  selectedTask.status === 'cloth_delivered',
              },
            ].map((step) => (
              <div
                key={step.label}
                className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                  step.done
                    ? 'border-[#000080]/40 bg-blue-50/30 text-slate-900'
                    : 'border-slate-200 bg-slate-50/50 text-slate-500'
                }`}
              >
                <span className="text-xs font-bold">{step.label}</span>
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    step.done
                      ? 'bg-[#000080] text-white'
                      : 'border border-slate-300 bg-white'
                  }`}
                >
                  {step.done && <Check className="w-3 h-3 stroke-[3]" />}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 2. WALLET SECTION, TOTAL TODAY EARNING, DELIVERIES PER DAY & PER YEAR     */}
      {/* (Shown on both 'home' and 'earning' tabs so all metrics stay accessible)  */}
      {/* ========================================================================= */}
            {/* ========================================================================= */}
      {/* 2. WALLET SECTION, TOTAL TODAY EARNING, DELIVERIES PER DAY & PER YEAR     */}
      {/* ========================================================================= */}
      {(partnerNavTab === 'home' || partnerNavTab === 'earning') && (
      <section aria-label="Partner Wallet and Earnings Dashboard" className="space-y-4">
        {/* COMPACT WALLET SUMMARY TOP BANNER AT TOP EDGE */}
        <div className="bg-gradient-to-r from-[#000080] to-blue-900 text-white rounded-3xl p-5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0">
              <Wallet className="w-6 h-6 text-sky-200" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-sky-200">
                Wallet Balance &amp; Payout
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight mt-0.5">
                ₹{walletBalance.toLocaleString('en-IN')}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowWithdrawModal(true)}
            className="px-5 py-3 rounded-xl bg-white hover:bg-blue-50 text-[#000080] font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Withdraw Balance</span>
          </button>
        </div>

        {/* Earnings Header & Period Selector */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Wallet className="w-5 h-5 text-[#000080]" />
              <span>Earning &amp; Finance</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Total Earning · Instant UPI Withdrawal · Bookings Payout Statement
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setEarningsTab('today')}
              className={`px-4 py-1.5 text-xs font-extrabold rounded-lg transition-colors cursor-pointer ${
                earningsTab === 'today'
                  ? 'bg-[#000080] text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setEarningsTab('year')}
              className={`px-4 py-1.5 text-xs font-extrabold rounded-lg transition-colors cursor-pointer ${
                earningsTab === 'year'
                  ? 'bg-[#000080] text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Yearly
            </button>
          </div>
        </div>

        {/* 3 Hero Cards: Today Earning, Deliveries Per Day, Deliveries Per Year */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Total Today Earning */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Total Today Earning
              </span>
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                <DollarSign className="w-4 h-4" />
              </span>
            </div>

            <div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-700 tracking-tight">
                ₹{todayEarnings.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                <span className="text-emerald-700 font-bold">
                  {todayDeliveriesCount > 0 ? '+₹45 tips/surge' : '₹0 tips/surge'}
                </span>
                <span>· {todayDeliveriesCount} bookings today</span>
              </div>
            </div>

            <div className="p-2 rounded-xl bg-emerald-50/80 border border-emerald-200 text-[11px] font-bold text-emerald-800 flex items-center justify-between">
              <span>Next Expected:</span>
              <span className="font-mono">
                {selectedTask ? `+₹${selectedTask.payoutINR}` : '₹0 (No active trip)'}
              </span>
            </div>
          </div>

          {/* Card 2: Total Delivery Per Day */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Deliveries Per Day
              </span>
              <span className="p-1.5 rounded-lg bg-blue-50 text-[#000080]">
                <Truck className="w-4 h-4" />
              </span>
            </div>

            <div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 tracking-tight">
                {todayDeliveriesCount} / {dailyTargetCount}
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                Complete daily target for ₹150 bonus
              </div>
            </div>

            <div className="space-y-1">
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div
                  className="h-full bg-gradient-to-r from-[#000080] to-emerald-500 rounded-full"
                  style={{ width: `${Math.min(100, (todayDeliveriesCount / dailyTargetCount) * 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                <span>Daily Progress</span>
                <span className="text-[#000080] font-bold">+₹150 Bonus</span>
              </div>
            </div>
          </div>

          {/* Card 3: Total Delivery Per Year */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Total Per Year (2026)
              </span>
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700">
                <Award className="w-4 h-4" />
              </span>
            </div>

            <div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-indigo-950 tracking-tight">
                {yearDeliveriesCount.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                Total Deliveries this Year
              </div>
            </div>

            <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-[11px]">
              <span className="text-slate-600 font-medium">Year Earnings:</span>
              <span className="font-mono font-bold text-slate-900">
                ₹{yearEarningsINR.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2C. REFERENCE "Bookings (XX)" EARNINGS LIST & PAYOUT STATEMENT            */}
        {/* (Matches Reference Row 5 Cols 1 & 2: Booking ID + Amount Badge)           */}
        {/* ========================================================================= */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#000080]" />
                <span>Bookings ({filteredLedgerTx.length}) · Payout Statement</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Audited ledger records for tailor deliveries, measurements, and UPI settlements.
              </p>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                type="button"
                onClick={() => setLedgerTxFilter('all')}
                className={`px-3 py-1.5 font-bold rounded-xl transition-colors cursor-pointer ${
                  ledgerTxFilter === 'all'
                    ? 'bg-[#000080] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All ({combinedDeliveryLedger.length})
              </button>
              <button
                type="button"
                onClick={() => setLedgerTxFilter('measurement')}
                className={`px-3 py-1.5 font-bold rounded-xl transition-colors cursor-pointer ${
                  ledgerTxFilter === 'measurement'
                    ? 'bg-[#000080] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Measurements
              </button>
              <button
                type="button"
                onClick={() => setLedgerTxFilter('cloth')}
                className={`px-3 py-1.5 font-bold rounded-xl transition-colors cursor-pointer ${
                  ledgerTxFilter === 'cloth'
                    ? 'bg-[#000080] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Cloth Trips
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {(showAllLedgerTx ? filteredLedgerTx : filteredLedgerTx.slice(0, 5)).map((tx) => (
              <div
                key={tx.id}
                className="p-4 rounded-2xl border border-slate-200/90 bg-white hover:border-[#000080]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-black text-xs text-[#000080]">
                      Booking ID: #{tx.orderNumber}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                      {tx.categoryLabel}
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm font-extrabold text-slate-900">
                    {tx.description}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{tx.timestamp}</span>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 shrink-0">
                  <span className="px-3 py-1 rounded-lg bg-blue-50 text-[#000080] font-mono font-black text-sm border border-blue-200">
                    +₹{tx.amountINR}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>{tx.status}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>

          {filteredLedgerTx.length > 5 && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setShowAllLedgerTx((prev) => !prev)}
                className="text-xs font-bold text-[#000080] hover:underline cursor-pointer"
              >
                {showAllLedgerTx
                  ? 'Show fewer bookings ↑'
                  : `View all ${filteredLedgerTx.length} booking payouts ↓`}
              </button>
            </div>
          )}
        </div>
      </section>
      )}

      {/* ========================================================================= */}
      {/* 3. NOTIFICATION SCREEN & TAILOR DISPATCH ALERTS (Matches Row 7 Col 2)     */}
      {/* ========================================================================= */}
      {(partnerNavTab === 'home' || partnerNavTab === 'notification') && (
      <section
        aria-label="Tailor Order Completion Alerts"
        className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-[#000080] shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                Notification &amp; Ready Tailor Pickups
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Real-time dispatch notifications for 1st and 2nd stage deliveries
              </p>
            </div>
          </div>

          <span className="text-xs font-bold text-[#000080] bg-blue-50 border border-blue-200 px-3 py-1 rounded-full self-start sm:self-auto">
            {unacknowledgedNotifications.length > 0
              ? `${unacknowledgedNotifications.length} New Alerts`
              : 'All Notifications Read ✓'}
          </span>
        </div>

        {notifications.length === 0 ? (
          <div className="mt-4 p-6 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center">
            No new notifications right now.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {notifications.map((notif) => {
              const linkedTask = normalizedTasks.find(
                (t) =>
                  t.linkedTailorOrderId === notif.linkedOrderId ||
                  t.orderNumber === notif.orderNumber
              );
              const isSecondStage =
                linkedTask?.deliveryStage === 'second_delivery' ||
                Boolean(linkedTask?.isUrgentTailorPickup);
              const alreadyPickedUp =
                linkedTask &&
                (linkedTask.status === 'picked_up_from_customer' ||
                  linkedTask.status === 'delivered_to_tailor' ||
                  linkedTask.status === 'picked_up_from_tailor' ||
                  linkedTask.status === 'delivered_to_customer' ||
                  linkedTask.status === 'cloth_picked_up' ||
                  linkedTask.status === 'cloth_delivered');

              return (
                <div
                  key={notif.id}
                  className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3.5 transition-colors ${
                    notif.acknowledged
                      ? 'bg-white border-slate-200'
                      : 'bg-blue-50/40 border-[#000080]/40'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    {/* Circular Blue Bell Icon (Matches Reference Notification Screen Row 7 Col 2) */}
                    <div className="w-10 h-10 rounded-full bg-blue-100/80 text-[#000080] flex items-center justify-center shrink-0 mt-0.5">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-extrabold text-slate-900">
                          You Got New Tailoring Delivery Booking #{notif.orderNumber}
                        </span>
                        <span className="font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                          ₹{notif.payoutINR}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">{notif.message}</p>
                      <div className="text-[11px] text-slate-400">
                        {isSecondStage
                          ? `2nd Delivery: Pickup at ${notif.tailorShopName} (${notif.tailorAddress}) → Customer ${notif.customerName}`
                          : `1st Delivery: Pickup from Customer ${notif.customerName} → ${notif.tailorShopName}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pl-13 md:pl-0">
                    {linkedTask && !alreadyPickedUp && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTaskId(linkedTask.id);
                          onTaskAction(
                            linkedTask.id,
                            isSecondStage ? 'pickup_from_tailor' : 'pickup_from_customer'
                          );
                          onAcknowledgeNotification(notif.id);
                        }}
                        className="px-3.5 py-2 text-xs font-extrabold text-white bg-[#000080] hover:bg-[#000066] rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <PackageCheck className="w-3.5 h-3.5" />
                        <span>
                          {isSecondStage ? 'Pickup from Tailor' : 'Pickup from Customer'}
                        </span>
                      </button>
                    )}
                    {alreadyPickedUp && (
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 px-2.5 py-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Picked Up ✓</span>
                      </span>
                    )}
                    {!notif.acknowledged && (
                      <button
                        type="button"
                        onClick={() => onAcknowledgeNotification(notif.id)}
                        className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
                      >
                        Mark Read
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
      )}

      {/* ========================================================================= */}
      {/* 3B. INTERACTIVE DUAL-DELIVERY ROUTE MAP (FIRST & SECOND DELIVERY STAGES)  */}
      {/* ========================================================================= */}
      {partnerNavTab === 'home' && selectedTask && (
        <section aria-label="Dual Stage Route Map for Selected Task">
          <DualDeliveryRouteMap
            orderNumber={selectedTask.orderNumber}
            customerName={selectedTask.customerName}
            customerLocation={
              selectedTask.deliveryStage === 'second_delivery'
                ? selectedTask.dropLocationCoords ||
                  resolveRealGeoLocation(selectedTask.dropAddress, 'customer', {
                    lat: liveGeo.lat,
                    lng: liveGeo.lng,
                  })
                : selectedTask.pickupLocationCoords ||
                  resolveRealGeoLocation(selectedTask.pickupAddress, 'customer', {
                    lat: liveGeo.lat,
                    lng: liveGeo.lng,
                  })
            }
            tailorShopName={selectedTask.tailorShopName || 'Assigned Tailor Workshop'}
            tailorLocation={
              selectedTask.deliveryStage === 'second_delivery'
                ? selectedTask.pickupLocationCoords ||
                  resolveRealGeoLocation(selectedTask.pickupAddress, 'tailor', {
                    lat: liveGeo.lat,
                    lng: liveGeo.lng,
                  })
                : selectedTask.dropLocationCoords ||
                  resolveRealGeoLocation(selectedTask.dropAddress, 'tailor', {
                    lat: liveGeo.lat,
                    lng: liveGeo.lng,
                  })
            }
            activeStage={selectedTask.deliveryStage || 'first_delivery'}
            firstDeliveryStatus={
              selectedTask.deliveryStage === 'second_delivery'
                ? 'delivered_to_tailor'
                : selectedTask.status === 'delivered_to_tailor' ||
                  selectedTask.status === 'cloth_delivered'
                ? 'delivered_to_tailor'
                : selectedTask.status === 'picked_up_from_customer' ||
                  selectedTask.status === 'cloth_picked_up'
                ? 'picked_up_from_customer'
                : 'assigned'
            }
            secondDeliveryStatus={
              selectedTask.deliveryStage === 'second_delivery'
                ? selectedTask.status === 'delivered_to_customer' ||
                  selectedTask.status === 'cloth_delivered'
                  ? 'delivered_to_customer'
                  : selectedTask.status === 'picked_up_from_tailor' ||
                    selectedTask.status === 'cloth_picked_up'
                  ? 'picked_up_from_tailor'
                  : 'assigned'
                : 'not_ready'
            }
            assignedPartnerName={
              selectedTask.assignedPartnerName || profile.fullName || 'Partner'
            }
            partnerLat={liveGeo.lat}
            partnerLng={liveGeo.lng}
            isLiveDeviceLocation={liveGeo.isLiveDeviceLocation}
            onRequestDeviceLocation={triggerDeviceLocation}
          />
        </section>
      )}

      {/* ========================================================================= */}
      {/* 4. BOOKING MANAGEMENT & TWO-STAGE DELIVERY TASK QUEUE                     */}
      {/* (Matches Reference "Booking" / "Booking Detail" / "Booking Management")   */}
      {/* ========================================================================= */}
      {partnerNavTab === 'home' && (
      <section
        id="partner-bookings-queue"
        aria-label="Partner Task Assignments Queue"
        className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900">
              Active Bookings
            </h3>
            <p className="text-xs text-slate-600 font-medium">
              Pickup and delivery orders assigned to you
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowNewTaskModal(true)}
            className="px-4 py-2 text-xs sm:text-sm font-bold text-white bg-[#000080] hover:bg-[#000066] rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Booking</span>
          </button>
        </div>

        {/* Task Stage & Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setTaskFilter('all')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0 ${
              taskFilter === 'all'
                ? 'bg-[#000080] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All ({normalizedTasks.length})
          </button>
          <button
            type="button"
            onClick={() => setTaskFilter('first_delivery')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0 ${
              taskFilter === 'first_delivery'
                ? 'bg-[#000080] text-white shadow-xs'
                : 'bg-blue-50 text-[#000080] hover:bg-blue-100 border border-blue-200'
            }`}
          >
            Customer → Tailor (
            {normalizedTasks.filter((t) => t.deliveryStage === 'first_delivery').length})
          </button>
          <button
            type="button"
            onClick={() => setTaskFilter('second_delivery')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0 ${
              taskFilter === 'second_delivery'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            Tailor → Customer (
            {normalizedTasks.filter((t) => t.deliveryStage === 'second_delivery').length})
          </button>
          <button
            type="button"
            onClick={() => setTaskFilter('measurement_only')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0 ${
              taskFilter === 'measurement_only'
                ? 'bg-[#000080] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Measurements ({normalizedTasks.filter((t) => t.category === 'measurement_only').length})
          </button>
        </div>

        {/* Clean, Simple Bookings Grid (Low Text Density, No Coordinates) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {filteredTasks.length === 0 ? (
            <div className="col-span-2 py-8 text-center text-sm text-slate-600 bg-slate-50 rounded-2xl border border-slate-200">
              No bookings in this view. Click &ldquo;New Booking&rdquo; to add an order.
            </div>
          ) : (
            filteredTasks.map((task) => {
              const isSelected = selectedTask?.id === task.id;
              const isSecondStage =
                task.deliveryStage === 'second_delivery' || Boolean(task.isUrgentTailorPickup);
              const needsMeasurements =
                task.selectedService === 'measurement_plus_cloth_pickup' ||
                task.category === 'measurement_only';

              const isPickedUpFromCustomer =
                task.status === 'picked_up_from_customer' ||
                (!isSecondStage && task.status === 'cloth_picked_up');
              const isDeliveredToTailor =
                task.status === 'delivered_to_tailor' ||
                (!isSecondStage && task.status === 'cloth_delivered');

              const isPickedUpFromTailor =
                task.status === 'picked_up_from_tailor' ||
                (isSecondStage && task.status === 'cloth_picked_up');
              const isDeliveredToCustomer =
                task.status === 'delivered_to_customer' ||
                (isSecondStage && task.status === 'cloth_delivered');

              const cleanPickup = (task.pickupAddress || '')
                .replace(/\s*·?\s*Live\s+Device\s+GPS\s*\([^)]*\)/gi, '')
                .replace(/\s*·?\s*\(?\s*-?\d+\.\d+°?\s*[NS]?\s*,\s*-?\d+\.\d+°?\s*[EW]?\s*\)?/gi, '')
                .trim();

              const cleanDrop = (task.dropAddress || '')
                .replace(/\s*·?\s*Live\s+Device\s+GPS\s*\([^)]*\)/gi, '')
                .replace(/\s*·?\s*\(?\s*-?\d+\.\d+°?\s*[NS]?\s*,\s*-?\d+\.\d+°?\s*[EW]?\s*\)?/gi, '')
                .trim();

              const simpleStatusLabel =
                isDeliveredToTailor || isDeliveredToCustomer
                  ? 'Delivered'
                  : isPickedUpFromCustomer || isPickedUpFromTailor
                  ? 'Picked Up'
                  : task.status === 'measurement_recorded'
                  ? 'Measured'
                  : 'Assigned';

              return (
                <div
                  key={task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                  className={`p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3.5 ${
                    isSelected
                      ? 'border-[#000080] bg-blue-50/15 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Simple Header: Order ID, Customer Name, Garment & Payout */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-xs text-[#000080] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                            #{task.orderNumber}
                          </span>
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                              isSecondStage
                                ? 'bg-emerald-50 text-emerald-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {isSecondStage ? 'Tailor → Customer' : 'Customer → Tailor'}
                          </span>
                        </div>

                        <h4 className="text-base font-extrabold text-slate-900 mt-1.5 truncate">
                          {task.customerName}
                        </h4>
                        <p className="text-xs font-medium text-slate-600 truncate">
                          {task.title}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="inline-block px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 font-mono font-black text-emerald-700 text-base">
                          ₹{task.payoutINR}
                        </span>
                        <div className="text-xs font-semibold text-slate-600 mt-1">
                          {task.distanceKm} km · {task.etaMinutes} min
                        </div>
                      </div>
                    </div>

                    {/* Clear 2-Line Pickup & Drop Addresses (No Coordinates) */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs sm:text-sm">
                      <div className="flex items-center gap-2.5">
                        <MapPin className="w-4 h-4 text-[#000080] shrink-0" />
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-slate-900">Pickup: </span>
                          <span className="font-medium text-slate-700">
                            {cleanPickup || task.customerName}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 pt-1.5 border-t border-slate-200/80">
                        <Navigation className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-slate-900">Drop: </span>
                          <span className="font-medium text-slate-700">
                            {cleanDrop || task.tailorShopName || 'Tailor Studio'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Simple Status & Action Buttons */}
                  <div
                    className="pt-2.5 border-t border-slate-100 space-y-2.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-md ${
                          simpleStatusLabel === 'Delivered'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-blue-50 text-[#000080] border border-blue-200'
                        }`}
                      >
                        {simpleStatusLabel}
                      </span>

                      {task.customerPhone && (
                        <a
                          href={`tel:${task.customerPhone}`}
                          className="text-xs font-bold text-[#000080] hover:underline flex items-center gap-1"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Call</span>
                        </a>
                      )}
                    </div>

                    {!isSecondStage ? (
                      <div className="grid grid-cols-2 gap-2">
                        {needsMeasurements && (
                          <button
                            type="button"
                            onClick={() => handleOpenMeasurementRecorder(task)}
                            className="col-span-2 py-2 px-3 rounded-xl text-xs font-bold border border-blue-300 bg-blue-50 hover:bg-blue-100 text-[#000080] flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Ruler className="w-3.5 h-3.5" />
                            <span>
                              {task.recordedMeasurements ? 'Update Measurements' : 'Take Measurements'}
                            </span>
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={isPickedUpFromCustomer || isDeliveredToTailor}
                          onClick={() => {
                            setSelectedTaskId(task.id);
                            onTaskAction(task.id, 'pickup_from_customer');
                          }}
                          className={`py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors ${
                            isPickedUpFromCustomer || isDeliveredToTailor
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              : 'bg-[#000080] hover:bg-[#000066] text-white cursor-pointer'
                          }`}
                        >
                          <PackageCheck className="w-3.5 h-3.5" />
                          <span>
                            {isPickedUpFromCustomer || isDeliveredToTailor ? 'Picked Up ✓' : 'Picked Up'}
                          </span>
                        </button>

                        <button
                          type="button"
                          disabled={!isPickedUpFromCustomer || isDeliveredToTailor}
                          onClick={() => {
                            setSelectedTaskId(task.id);
                            onTaskAction(task.id, 'deliver_to_tailor');
                          }}
                          className={`py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors ${
                            isDeliveredToTailor
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-not-allowed'
                              : isPickedUpFromCustomer
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isDeliveredToTailor ? 'Delivered ✓' : 'Delivered'}</span>
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={isPickedUpFromTailor || isDeliveredToCustomer}
                          onClick={() => {
                            setSelectedTaskId(task.id);
                            onTaskAction(task.id, 'pickup_from_tailor');
                          }}
                          className={`py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors ${
                            isPickedUpFromTailor || isDeliveredToCustomer
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              : 'bg-[#000080] hover:bg-[#000066] text-white cursor-pointer'
                          }`}
                        >
                          <PackageCheck className="w-3.5 h-3.5" />
                          <span>
                            {isPickedUpFromTailor || isDeliveredToCustomer ? 'Picked Up ✓' : 'Picked Up'}
                          </span>
                        </button>

                        <button
                          type="button"
                          disabled={!isPickedUpFromTailor || isDeliveredToCustomer}
                          onClick={() => {
                            setSelectedTaskId(task.id);
                            onTaskAction(task.id, 'deliver_to_customer');
                          }}
                          className={`py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors ${
                            isDeliveredToCustomer
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-not-allowed'
                              : isPickedUpFromTailor
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isDeliveredToCustomer ? 'Delivered ✓' : 'Delivered'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
      )}

      {/* ========================================================================= */}
      {/* FIXED BOTTOM PARTNER NAVIGATION BAR (Matches Reference Row 4/5/7 Bottom)  */}
      {/* ========================================================================= */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg">
        <div className="max-w-3xl mx-auto grid grid-cols-4 h-16">
          {[
            { id: 'home' as const, label: 'Home', icon: Home },
            { id: 'earning' as const, label: 'Earning', icon: Wallet },
            {
              id: 'notification' as const,
              label: 'Notification',
              icon: Bell,
              badge: unacknowledgedNotifications.length,
            },
            { id: 'profile' as const, label: 'Profile', icon: User },
          ].map((item) => {
            const Icon = item.icon;
            const active = partnerNavTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setPartnerNavTab(item.id)}
                className={`relative flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
                  active ? 'text-[#000080]' : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {item.badge ? (
                    <span className="absolute -top-1.5 -right-2.5 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-black">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
                <span className="text-[11px] font-extrabold tracking-tight">{item.label}</span>
                {active && (
                  <span className="absolute top-0 w-10 h-1 rounded-b-full bg-[#000080]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: BOOKING SCHEDULE (Matches Reference Row 7 Col 1 "Booking Schedule") */}
      {/* ========================================================================= */}
      {showScheduleModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">Booking Schedule</h3>
                <p className="text-xs text-slate-500">Available Date and Time Slots</p>
              </div>
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {[
                '07:00 AM to 09:00 AM',
                '09:00 AM to 11:00 AM',
                '11:00 AM to 01:00 PM',
                '01:00 PM to 03:00 PM',
                '03:00 PM to 05:00 PM',
                '05:00 PM to 07:00 PM',
                '07:00 PM to 09:00 PM',
              ].map((slot, idx) => (
                <label
                  key={slot}
                  className="p-3 rounded-xl border border-slate-200 hover:border-[#000080] flex items-center justify-between cursor-pointer"
                >
                  <span className="text-xs font-bold text-slate-800">{slot}</span>
                  <input
                    type="checkbox"
                    defaultChecked={idx < 5}
                    className="w-4 h-4 rounded border-slate-300 text-[#000080] focus:ring-[#000080]"
                  />
                </label>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowScheduleModal(false)}
              className="w-full h-11 rounded-xl bg-[#000080] hover:bg-[#000066] text-white font-extrabold text-xs uppercase tracking-wider cursor-pointer"
            >
              SAVE SHIFT SCHEDULE
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: WITHDRAW MONEY (Matches Reference Row 8 "Withdraw Money" Screen)   */}
      {/* ========================================================================= */}
      {showWithdrawModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">Withdraw Money</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Instant transfer to your verified bank account &amp; UPI
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 space-y-1 text-center">
              <div className="text-xs font-bold text-slate-600">Total Earning Available</div>
              <div className="text-3xl font-black font-mono text-[#000080]">
                ₹{walletBalance.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Bank Account</div>
                  <div className="font-mono font-bold text-slate-900">
                    {profile.bankAccountNumber || '50100482910342'} ({profile.ifscCode || 'HDFC0000240'})
                  </div>
                </div>
                <span className="w-5 h-5 rounded-full bg-[#000080] text-white flex items-center justify-center">
                  <Check className="w-3 h-3" />
                </span>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">UPI ID</div>
                  <div className="font-mono font-bold text-[#000080]">
                    {profile.upiId || 'Not registered'}
                  </div>
                </div>
                <span className={`text-xs font-bold ${profile.upiId ? 'text-emerald-700' : 'text-amber-600'}`}>
                  {profile.upiId ? 'Verified ✓' : 'Setup Required'}
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                className="flex-1 py-3 px-4 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleWithdrawUPI}
                className="flex-1 py-3 px-4 text-xs font-extrabold uppercase tracking-wider text-white bg-[#000080] hover:bg-[#000066] rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-[#000080]/20"
              >
                <Send className="w-3.5 h-3.5" />
                <span>WITHDRAW AMOUNT</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ASSIGN NEW TASK */}
      {showNewTaskModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">Assign Partner Booking</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Create a Measurement-Only visit or a Cloth Pickup &amp; Delivery order.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewTaskModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTaskSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Delivery Stage</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewTaskStage('first_delivery');
                      setNewTaskCategory('cloth_logistics');
                    }}
                    className={`py-2 px-3 rounded-xl font-bold border transition-colors cursor-pointer ${
                      newTaskStage === 'first_delivery'
                        ? 'bg-[#000080] text-white border-[#000080]'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    1st Delivery: Customer → Tailor
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewTaskStage('second_delivery');
                      setNewTaskCategory('cloth_logistics');
                    }}
                    className={`py-2 px-3 rounded-xl font-bold border transition-colors cursor-pointer ${
                      newTaskStage === 'second_delivery'
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    2nd Delivery: Tailor → Customer
                  </button>
                </div>
              </div>

              {newTaskStage === 'first_delivery' && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Customer Service Option
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setNewTaskService('measurement_cloth_pickup_only');
                        setNewTaskCategory('cloth_logistics');
                      }}
                      className={`py-2 px-2.5 rounded-xl font-bold border transition-colors cursor-pointer text-[11px] ${
                        newTaskService === 'measurement_cloth_pickup_only'
                          ? 'bg-blue-50 text-[#000080] border-[#000080]'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      Measurement / Cloth Pickup Only
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewTaskService('measurement_plus_cloth_pickup');
                        setNewTaskCategory('measurement_only');
                      }}
                      className={`py-2 px-2.5 rounded-xl font-bold border transition-colors cursor-pointer text-[11px] ${
                        newTaskService === 'measurement_plus_cloth_pickup'
                          ? 'bg-blue-50 text-[#000080] border-[#000080]'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      Measurement + Cloth Pickup
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">Order Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TRN-1001"
                  value={newTaskOrderNumber}
                  onChange={(e) => setNewTaskOrderNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-[#000080] focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Garment Summary / Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Silk Garment Alteration"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#000080] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Customer Name"
                    value={newTaskCustomerName}
                    onChange={(e) => setNewTaskCustomerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#000080] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Customer Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98000 00000"
                    value={newTaskCustomerPhone}
                    onChange={(e) => setNewTaskCustomerPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-[#000080] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">
                    {newTaskStage === 'second_delivery'
                      ? 'Tailor Pickup Address *'
                      : 'Customer Pickup Address *'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      triggerDeviceLocation();
                      const cleanSector = (liveGeo.sectorName || 'Current Location')
                        .replace(/\s*\(?\s*-?\d+\.\d+°?\s*[NS]?\s*,\s*-?\d+\.\d+°?\s*[EW]?\s*\)?/gi, '')
                        .trim();
                      setNewTaskPickupAddress(cleanSector || 'Current Location');
                    }}
                    className="text-[11px] font-bold text-[#000080] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <MapPin className="w-3 h-3" />
                    <span>Use Device Location</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder={
                    newTaskStage === 'second_delivery'
                      ? `Royal Stitch Studio · ${liveGeo.sectorName}`
                      : `Customer Doorstep · ${liveGeo.sectorName}`
                  }
                  value={newTaskPickupAddress}
                  onChange={(e) => setNewTaskPickupAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#000080] focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">
                    {newTaskStage === 'second_delivery'
                      ? 'Customer Delivery Address *'
                      : 'Assigned Tailor Shop & Address *'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      triggerDeviceLocation();
                      setNewTaskDropAddress(`${newTaskTailorName} · ${liveGeo.sectorName}`);
                    }}
                    className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Navigation className="w-3 h-3" />
                    <span>Anchor Near My GPS</span>
                  </button>
                </div>
                <input
                  type="text"
                  placeholder={
                    newTaskStage === 'second_delivery'
                      ? `Customer Delivery · ${liveGeo.sectorName}`
                      : `${newTaskTailorName} · ${liveGeo.sectorName}`
                  }
                  value={newTaskDropAddress}
                  onChange={(e) => setNewTaskDropAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#000080] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Payout (INR)</label>
                  <input
                    type="number"
                    placeholder="95"
                    value={newTaskPayoutINR}
                    onChange={(e) => setNewTaskPayoutINR(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-[#000080] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Distance (km)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="2.1"
                    value={newTaskDistanceKm}
                    onChange={(e) => setNewTaskDistanceKm(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-[#000080] focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowNewTaskModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-extrabold text-white bg-[#000080] hover:bg-[#000066] rounded-xl cursor-pointer shadow-xs"
                >
                  Create &amp; Assign Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECORD DOORSTEP MEASUREMENTS */}
      {activeMeasurementModalTask && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">Record Customer Measurements</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Order #{activeMeasurementModalTask.orderNumber} ·{' '}
                  {activeMeasurementModalTask.customerName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveMeasurementModalTask(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitMeasurementModal} className="space-y-3.5 text-xs">
              <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200 text-slate-800 space-y-1">
                <div className="font-extrabold text-[#000080] flex items-center gap-1.5">
                  <Ruler className="w-4 h-4" />
                  <span>Doorstep Tape Measurements (Inches)</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Enter precise measurements per Trench Video Tutorial guidelines.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Shoulder (in)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    placeholder="18.5"
                    value={measurementForm.shoulder}
                    onChange={(e) =>
                      setMeasurementForm({ ...measurementForm, shoulder: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-[#000080] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Chest / Bust (in)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    placeholder="40"
                    value={measurementForm.chest}
                    onChange={(e) =>
                      setMeasurementForm({ ...measurementForm, chest: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-[#000080] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Waist (in)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    placeholder="33"
                    value={measurementForm.waist}
                    onChange={(e) =>
                      setMeasurementForm({ ...measurementForm, waist: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-[#000080] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Hips (in)</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="39"
                    value={measurementForm.hips}
                    onChange={(e) =>
                      setMeasurementForm({ ...measurementForm, hips: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-[#000080] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Sleeve Length (in)</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="25.5"
                    value={measurementForm.sleeve}
                    onChange={(e) =>
                      setMeasurementForm({ ...measurementForm, sleeve: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-[#000080] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Inseam Length (in)</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="31"
                    value={measurementForm.inseam}
                    onChange={(e) =>
                      setMeasurementForm({ ...measurementForm, inseam: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-[#000080] focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-900 font-bold">
                <span>Postural Video Protocol:</span>
                <span className="text-emerald-700">Verified ✓</span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setActiveMeasurementModalTask(null)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save &amp; Sync to Tailor</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ZOMATO-STYLE REAL-TIME INCOMING DELIVERY ORDER POPUP WITH RINGING SOUND   */}
      {/* ========================================================================= */}
      <IncomingDeliveryOrder
        offer={activeOffer}
        remainingSeconds={remainingSeconds}
        totalSeconds={totalSeconds}
        queuedCount={queuedCount}
        isAccepting={isAccepting}
        isRejecting={isRejecting}
        error={actionError}
        isMuted={isMuted}
        onToggleMute={toggleMute}
        onAccept={() => {
          acceptOffer();
        }}
        onReject={() => {
          rejectOffer();
        }}
        onDismissError={clearActionError}
      />
    </div>
  );
};
