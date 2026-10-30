export type AppRole = 'delivery' | 'tailor';

export type EntryStage = 'phone_otp' | 'choose_role' | 'active_portal';

export type DeliveryStep =
  | 'aadhaar_portal'
  | 'vehicle_portal'
  | 'personal_portal'
  | 'bank_portal'
  | 'admin_approval'
  | 'tutorial'
  | 'dashboard';

export type TailorStep =
  | 'onboarding'
  | 'identity_portal'
  | 'equipment_portal'
  | 'personal_portal'
  | 'camera_portal'
  | 'bank_portal'
  | 'admin_approval'
  | 'dashboard';

export type VehicleType = '' | 'EV' | 'Motorcycle / Bike' | '3-Wheeler' | 'Bike' | 'Motorcycle';
export type DocumentType = 'Aadhaar Card' | 'PAN Card' | 'Driving License';
export type VerificationDocStatus = 'Pending' | 'Verified' | 'Rejected';

export type DeliveryOnboardingStep = DeliveryStep;
export type DeliveryVehicleType = VehicleType;

export interface DeliveryPartnerProfile {
  documentType: DocumentType;
  documentNumber: string;
  documentUploaded: boolean;
  documentFileName: string;
  documentPreviewUrl?: string;
  aadhaarStatus?: VerificationDocStatus;
  aadhaarNumber?: string;
  aadhaarVerified?: boolean;
  aadhaarFrontUploaded?: boolean;
  aadhaarPdfFileName?: string;
  aadhaarBackUploaded?: boolean;
  aadhaarBackPdfFileName?: string;
  panNumber?: string;
  panUploaded?: boolean;
  panFileName?: string;
  panPreviewUrl?: string;
  panStatus?: VerificationDocStatus;
  panCardUploaded?: boolean;
  panPdfFileName?: string;
  drivingLicenseUploaded?: boolean;
  drivingLicenseFileName?: string;
  drivingLicensePreviewUrl?: string;
  drivingLicenseNumber?: string;
  vehicleVerified?: boolean;
  personalDetailsVerified?: boolean;
  partnerPhotoCaptured?: boolean;
  partnerPhotoDataUrl?: string;
  bankAccountHolder?: string;
  ifscCode?: string;
  bankVerified?: boolean;
  applicationSubmittedAt?: string;
  menTutorialWatchedPercent?: number;
  womenTutorialWatchedPercent?: number;
  menTutorialCompleted?: boolean;
  womenTutorialCompleted?: boolean;
  tutorialConfirmationChecked?: boolean;
  city?: string;
  streetAddress?: string;
  dateOfBirth?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  vehicleNumber: string;
  vehicleType: VehicleType;
  fullName: string;
  phoneNumber: string;
  gmailAddress: string;
  residentialAddress: string;
  pincode: string;
  partnerPhotoUrl: string; // Required mandatory live photo*
  partnerPhotoPreviewUrl?: string;
  upiId: string;
  bankAccountNumber: string;
  verified: boolean;
  adminApproved?: boolean;
  tutorialCompleted: boolean;
}

export type TailorSpecialty =
  | 'Stitching'
  | 'Alteration'
  | 'Both Stitching & Alteration'
  | 'Bespoke Bridal & Formal';

export interface TailorProfile {
  documentType: string;
  documentNumber: string;
  documentUploaded: boolean;
  documentFileName: string;
  documentPreviewUrl?: string;
  shopName: string;
  specialty: TailorSpecialty;
  // Workshop Equipment & Machinery
  machineType?: string;
  machineNumber?: string;
  dailyCapacity?: string;
  // Personal & Atelier Details
  ownerName?: string;
  phoneNumber?: string;
  email?: string;
  shopAddress?: string;
  city?: string;
  pincode?: string;
  // Bank & Payout Details
  bankAccountNumber?: string;
  bankAccountHolder?: string;
  ifscCode?: string;
  upiId?: string;
  bankVerified?: boolean;
  // Live Camera Verification with Shop/Machine Photo & Printed Location
  liveCameraCaptured: boolean;
  liveCameraTimestamp: string;
  liveCameraDataUrl?: string;
  liveCameraAddress?: string;
  liveCameraCoords?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  liveCameraMachineType?: string;
  // Verification states
  identityVerified?: boolean;
  equipmentVerified?: boolean;
  personalVerified?: boolean;
  verified: boolean;
  adminApproved?: boolean;
  applicationSubmittedAt?: string;
}

export interface SizeChartSpec {
  chestInches: string;
  waistInches: string;
  shoulderInches: string;
  sleeveLengthInches: string;
  garmentLengthInches: string;
  neckCollarInches: string;
  fitPreference: 'Slim Tailored' | 'Classic Regular' | 'Relaxed Bespoke';
}

export type TailorOrderStage =
  | 'incoming' // Part 1: Incoming / Placed Orders
  | 'accepted' // Part 2 Tab 1: Recently Accepted Orders
  | 'working'  // Part 2 Tab 2: Working Orders (In-progress)
  | 'completed' // Part 2 Tab 3: Completed Orders
  | 'declined';

/**
 * 1. Customer Service Selection
 */
export type CustomerServiceOption =
  | 'measurement_cloth_pickup_only' // Customer already has measurements; needs cloth pickup & delivery to tailor
  | 'measurement_plus_cloth_pickup'; // Customer needs measurements to be taken AND cloth to be collected

/**
 * 10. 14-Stage Consistent Order Workflow Status System
 */
export type OrderWorkflowStatus =
  | 'Order Placed'
  | 'Awaiting First Delivery Assignment'
  | 'First Delivery Assigned'
  | 'Parcel Picked Up from Customer'
  | 'Parcel Delivered to Tailor'
  | 'Awaiting Tailor Workbench Update'
  | 'Ready to Start Work'
  | 'Work In Progress'
  | 'Work Completed'
  | 'Awaiting Second Delivery Assignment'
  | 'Second Delivery Assigned'
  | 'Parcel Picked Up from Tailor'
  | 'Delivered to Customer'
  | 'Order Completed';

export type FirstDeliveryLegStatus =
  | 'awaiting_assignment'
  | 'assigned'
  | 'picked_up_from_customer'
  | 'delivered_to_tailor';

export type SecondDeliveryLegStatus =
  | 'not_ready'
  | 'awaiting_assignment'
  | 'assigned'
  | 'picked_up_from_tailor'
  | 'delivered_to_customer';

export interface GeoLocationPoint {
  lat: number;
  lng: number;
  address: string;
  landmark?: string;
  mapX: number; // 0-100 canvas projection
  mapY: number; // 0-100 canvas projection
}

export interface TailorWorkbenchState {
  statusLabel: string;
  readyToBegin: boolean;
  notes: string;
  updatedAt: string;
  updatedBy: string;
}

export interface WorkProgressUpdate {
  id: string;
  orderId: string;
  photoUrl: string;
  description: string;
  uploadedAt: string;
  workStatus: string;
}

export interface OrderTimelineEvent {
  id: string;
  status: OrderWorkflowStatus | string;
  actor: 'customer' | 'delivery' | 'tailor' | 'system';
  description: string;
  timestamp: string;
}

export interface AssignedDeliveryPartnerInfo {
  partnerId: string;
  partnerName: string;
  partnerPhone: string;
  vehicleType: string;
  vehicleNumber: string;
  assignedAt: string;
}

export interface TailorOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  clothToBeAltered: string;
  clothDescription: string;
  sizeChart: SizeChartSpec;
  colorGrade: {
    shadeName: string;
    hexCode: string;
    pantoneRef: string;
    fabricFinish: string;
  };
  noteToTailor: string;
  stage: TailorOrderStage;
  tailorPayoutINR: number;
  deliveryPayoutINR: number;
  tailorShopName: string;
  tailorShopAddress: string;
  placedAt: string;
  completedAt?: string;
  pickupDispatched?: boolean;

  // Extended End-to-End Workflow Fields
  selectedService?: CustomerServiceOption;
  needsTailor?: boolean;
  orderStatus?: OrderWorkflowStatus;
  firstDeliveryStatus?: FirstDeliveryLegStatus;
  secondDeliveryStatus?: SecondDeliveryLegStatus;
  firstDeliveryPartner?: AssignedDeliveryPartnerInfo;
  secondDeliveryPartner?: AssignedDeliveryPartnerInfo;
  customerLocation?: GeoLocationPoint;
  tailorLocation?: GeoLocationPoint;
  workbench?: TailorWorkbenchState;
  customerContacted?: boolean;
  customerCalledAt?: string;
  workStartedAt?: string;
  progressUpdates?: WorkProgressUpdate[];
  timeline?: OrderTimelineEvent[];
}

export type DeliveryTaskCategory = 'measurement_only' | 'cloth_logistics';
export type DeliveryStageType = 'first_delivery' | 'second_delivery' | 'measurement_visit';

export type DeliveryTaskStatus =
  | 'assigned'
  | 'measurement_recorded'
  | 'cloth_picked_up'
  | 'cloth_delivered'
  | 'picked_up_from_customer'
  | 'delivered_to_tailor'
  | 'picked_up_from_tailor'
  | 'delivered_to_customer';

export interface RecordedMeasurements {
  shoulder: string;
  chest: string;
  waist: string;
  hips: string;
  sleeve: string;
  inseam: string;
  videoPostureVerified: boolean;
  recordedAt: string;
}

export interface DeliveryHistoryEntry {
  id: string;
  status: string;
  label: string;
  timestamp: string;
  locationAddress: string;
}

export interface DeliveryTask {
  id: string;
  orderNumber: string;
  category: DeliveryTaskCategory; // 'measurement_only' vs 'cloth_logistics'
  deliveryStage?: DeliveryStageType; // 'first_delivery' (Customer -> Tailor) | 'second_delivery' (Tailor -> Customer)
  selectedService?: CustomerServiceOption;
  title: string;
  customerName: string;
  customerPhone: string;
  pickupAddress: string;
  dropAddress: string;
  tailorShopName?: string;
  tailorShopAddress?: string;
  garmentSummary: string;
  payoutINR: number;
  distanceKm: number;
  etaMinutes: number;
  status: DeliveryTaskStatus;
  linkedTailorOrderId?: string;
  isUrgentTailorPickup?: boolean;
  assignedPartnerId?: string;
  assignedPartnerName?: string;
  assignedPartnerPhone?: string;
  assignedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  pickupLocationCoords?: GeoLocationPoint;
  dropLocationCoords?: GeoLocationPoint;
  deliveryHistory?: DeliveryHistoryEntry[];
  mapCoords: {
    x: number;
    y: number;
  };
  recordedMeasurements?: RecordedMeasurements;
}

export interface PartnerNotification {
  id: string;
  orderNumber: string;
  linkedOrderId: string;
  tailorShopName: string;
  tailorAddress: string;
  customerName: string;
  clothToBeAltered: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
  payoutINR: number;
  targetRole?: 'delivery' | 'tailor' | 'customer' | 'all';
  workflowStatus?: OrderWorkflowStatus;
}

export interface LedgerTransaction {
  id: string;
  role: AppRole;
  orderNumber: string;
  description: string;
  categoryLabel: string;
  amountINR: number;
  timestamp: string;
  status: 'Settled to UPI' | 'Cleared';
}

export interface LiveGeoState {
  lat: number;
  lng: number;
  sectorName: string;
  trackingActive: boolean;
  accuracyMeters: number;
  partnerMapX: number;
  partnerMapY: number;
  permissionState?: 'granted' | 'prompt' | 'denied' | 'requesting' | 'unsupported';
  isLiveDeviceLocation?: boolean;
  lastUpdated?: string;
  errorMessage?: string;
}

// ============================================================================
// TRENCH UNIFIED AGENTIC AI SYSTEM TYPES
// ============================================================================

export type InternalAgentRole =
  | 'Order Agent'
  | 'Dispatch Agent'
  | 'Tailor Workflow Agent'
  | 'Delivery Monitoring Agent'
  | 'Communication Agent'
  | 'Exception Agent';

export type AgentVerificationStatus =
  | 'verified'
  | 'blocked_safety'
  | 'requires_human_approval'
  | 'retried'
  | 'escalated';

export interface AgentAuditLogEntry {
  id: string;
  timestamp: string;
  orderId: string;
  orderNumber: string;
  agent: InternalAgentRole;
  eventTrigger: string;
  reasoning: string;
  toolCalled: string;
  toolArgs: Record<string, any>;
  verificationStatus: AgentVerificationStatus;
  outcomeSummary: string;
  statusBefore?: string;
  statusAfter?: string;
}

export interface AgentPendingApproval {
  id: string;
  orderId: string;
  orderNumber: string;
  agent: InternalAgentRole;
  title: string;
  reason: string;
  proposedActionType:
    | 'confirm_workbench_ready'
    | 'approve_start_work'
    | 'approve_second_delivery_dispatch'
    | 'resolve_missing_measurements';
  proposedPayload?: Record<string, any>;
  requiredRole: 'tailor' | 'delivery' | 'customer';
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface AgentExceptionAlert {
  id: string;
  orderId: string;
  orderNumber: string;
  agent: InternalAgentRole;
  severity: 'warning' | 'critical';
  issueType:
    | 'missing_measurements'
    | 'workbench_not_ready'
    | 'unconfirmed_customer_contact'
    | 'missing_completion_evidence'
    | 'delivery_delay'
    | 'assignment_failed';
  message: string;
  resolutionHint: string;
  resolved: boolean;
  createdAt: string;
}

export interface OrderAgentSummary {
  orderId: string;
  orderNumber: string;
  activeAgent: InternalAgentRole;
  workflowStepIndex: number; // 1..9 in the 9-step autonomous lifecycle
  workflowStepLabel: string;
  currentStepAnalysis: string;
  nextRecommendedAction: string;
  safetyGateStatus: 'clear' | 'awaiting_tailor_confirmation' | 'awaiting_measurements' | 'awaiting_completion_evidence';
  lastUpdated: string;
}

export interface AgentOrchestratorState {
  isRunning: boolean;
  engineStatus: 'gemini_active' | 'deterministic_fallback' | 'idle';
  lastRunAt: string;
  lastTriggerEvent: string;
  activeAgent: InternalAgentRole;
  auditLog: AgentAuditLogEntry[];
  pendingApprovals: AgentPendingApproval[];
  exceptions: AgentExceptionAlert[];
  orderSummaries: Record<string, OrderAgentSummary>;
}

// ============================================================================
// REAL-TIME DELIVERY PARTNER ORDER POPUP & DISPATCH TYPES
// ============================================================================

export type DeliveryOfferStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'cancelled';

export interface OfferLatLng {
  lat: number;
  lng: number;
}

export interface IncomingDeliveryOffer {
  offerId: string;
  orderId: string;
  orderNumber: string;
  taskId?: string;
  partnerId: string;
  partnerPhone: string;
  customerName: string;
  customerPhone?: string;
  customerPhoneAuthorized?: boolean;
  restaurantName: string;
  orderAmountINR: number;
  estimatedEarningsINR: number;
  pickupAddress: string;
  deliveryAddress: string;
  pickupCoords?: OfferLatLng | null;
  deliveryCoords?: OfferLatLng | null;
  distanceKm: number;
  etaMinutes: number;
  garmentSummary?: string;
  deliveryStage?: DeliveryStageType;
  status: DeliveryOfferStatus;
  expiresAt: string;
  createdAt: string;
  respondedAt?: string | null;
}

export interface PartnerLiveLocation {
  partnerId: string;
  partnerPhone: string;
  partnerName: string;
  vehicleType?: string;
  vehicleNumber?: string;
  isOnline: boolean;
  lat: number | null;
  lng: number | null;
  serviceRadiusKm: number;
  updatedAt: string;
}



