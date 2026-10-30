import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Users table (linked to Firebase Auth UID or mobile identity)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email'),
  phone: text('phone'),
  role: text('role').default('delivery'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Delivery Partner profiles
export const deliveryProfiles = pgTable('delivery_profiles', {
  id: serial('id').primaryKey(),
  phone: text('phone').notNull().unique(),
  fullName: text('full_name').default(''),
  documentType: text('document_type').default('Aadhaar Card'),
  documentNumber: text('document_number').default(''),
  documentUploaded: boolean('document_uploaded').default(false),
  documentFileName: text('document_file_name').default(''),
  documentPreviewUrl: text('document_preview_url').default(''),
  aadhaarStatus: text('aadhaar_status').default('Pending'),
  panNumber: text('pan_number').default(''),
  panUploaded: boolean('pan_uploaded').default(false),
  panFileName: text('pan_file_name').default(''),
  panPreviewUrl: text('pan_preview_url').default(''),
  panStatus: text('pan_status').default('Pending'),
  drivingLicenseUploaded: boolean('driving_license_uploaded').default(false),
  drivingLicenseFileName: text('driving_license_file_name').default(''),
  drivingLicensePreviewUrl: text('driving_license_preview_url').default(''),
  vehicleNumber: text('vehicle_number').default(''),
  vehicleType: text('vehicle_type').default('EV'),
  gmailAddress: text('gmail_address').default(''),
  residentialAddress: text('residential_address').default(''),
  pincode: text('pincode').default(''),
  partnerPhotoUrl: text('partner_photo_url').default(''),
  partnerPhotoPreviewUrl: text('partner_photo_preview_url').default(''),
  upiId: text('upi_id').default(''),
  bankAccountNumber: text('bank_account_number').default(''),
  verified: boolean('verified').default(false),
  adminApproved: boolean('admin_approved').default(false),
  tutorialCompleted: boolean('tutorial_completed').default(false),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tailor profiles
export const tailorProfiles = pgTable('tailor_profiles', {
  id: serial('id').primaryKey(),
  phone: text('phone').notNull().unique(),
  shopName: text('shop_name').notNull().default(''),
  specialty: text('specialty').notNull().default('Stitching'),
  documentType: text('document_type').default(''),
  documentNumber: text('document_number').default(''),
  documentUploaded: boolean('document_uploaded').default(false),
  documentFileName: text('document_file_name').default(''),
  documentPreviewUrl: text('document_preview_url').default(''),
  liveCameraCaptured: boolean('live_camera_captured').default(false),
  liveCameraTimestamp: text('live_camera_timestamp').default(''),
  liveCameraDataUrl: text('live_camera_data_url').default(''),
  verified: boolean('verified').default(false),
  adminApproved: boolean('admin_approved').default(false),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Tailor Orders
export const tailorOrders = pgTable('tailor_orders', {
  id: serial('id').primaryKey(),
  orderId: text('order_id').notNull().unique(),
  orderNumber: text('order_number').notNull(),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull(),
  customerAddress: text('customer_address').notNull(),
  clothToBeAltered: text('cloth_to_be_altered').notNull(),
  clothDescription: text('cloth_description').default(''),
  sizeChartJson: text('size_chart_json').default('{}'),
  colorGradeJson: text('color_grade_json').default('{}'),
  noteToTailor: text('note_to_tailor').default(''),
  stage: text('stage').notNull().default('incoming'),
  tailorPayoutINR: integer('tailor_payout_inr').notNull().default(220),
  deliveryPayoutINR: integer('delivery_payout_inr').notNull().default(85),
  tailorShopName: text('tailor_shop_name').notNull(),
  tailorShopAddress: text('tailor_shop_address').notNull(),
  placedAt: text('placed_at').notNull(),
  completedAt: text('completed_at'),
  pickupDispatched: boolean('pickup_dispatched').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// Delivery Tasks (Measurement-only & Cloth logistics)
export const deliveryTasks = pgTable('delivery_tasks', {
  id: serial('id').primaryKey(),
  taskId: text('task_id').notNull().unique(),
  orderNumber: text('order_number').notNull(),
  category: text('category').notNull().default('measurement_only'),
  title: text('title').notNull(),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull(),
  pickupAddress: text('pickup_address').notNull(),
  dropAddress: text('drop_address').notNull(),
  garmentSummary: text('garment_summary').notNull(),
  payoutINR: integer('payout_inr').notNull().default(85),
  distanceKm: text('distance_km').default('2.5'),
  etaMinutes: integer('eta_minutes').default(15),
  status: text('status').notNull().default('assigned'),
  linkedTailorOrderId: text('linked_tailor_order_id'),
  isUrgentTailorPickup: boolean('is_urgent_tailor_pickup').default(false),
  mapCoordsJson: text('map_coords_json').default('{"x":50,"y":50}'),
  recordedMeasurementsJson: text('recorded_measurements_json'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Notifications
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  notifId: text('notif_id').notNull().unique(),
  orderNumber: text('order_number').notNull(),
  linkedOrderId: text('linked_order_id').notNull(),
  tailorShopName: text('tailor_shop_name').notNull(),
  tailorAddress: text('tailor_address').notNull(),
  customerName: text('customer_name').notNull(),
  clothToBeAltered: text('cloth_to_be_altered').notNull(),
  message: text('message').notNull(),
  timestamp: text('timestamp').notNull(),
  acknowledged: boolean('acknowledged').default(false),
  payoutINR: integer('payout_inr').notNull().default(85),
  createdAt: timestamp('created_at').defaultNow(),
});

// Ledger Transactions
export const ledgerTransactions = pgTable('ledger_transactions', {
  id: serial('id').primaryKey(),
  txId: text('tx_id').notNull().unique(),
  role: text('role').notNull(),
  orderNumber: text('order_number').notNull(),
  description: text('description').notNull(),
  categoryLabel: text('category_label').notNull(),
  amountINR: integer('amount_inr').notNull(),
  timestamp: text('timestamp').notNull(),
  status: text('status').notNull().default('Settled to UPI'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Real-time Delivery Partner Offers table (Zomato-style dispatch offers)
export const deliveryOffers = pgTable('delivery_offers', {
  id: serial('id').primaryKey(),
  offerId: text('offer_id').notNull().unique(),
  orderId: text('order_id').notNull(),
  orderNumber: text('order_number').notNull(),
  taskId: text('task_id'),
  partnerId: text('partner_id').notNull(),
  partnerPhone: text('partner_phone').notNull(),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull(),
  restaurantName: text('restaurant_name').notNull(),
  orderAmountINR: integer('order_amount_inr').notNull().default(0),
  estimatedEarningsINR: integer('estimated_earnings_inr').notNull().default(0),
  pickupAddress: text('pickup_address').notNull(),
  deliveryAddress: text('delivery_address').notNull(),
  pickupLat: text('pickup_lat'),
  pickupLng: text('pickup_lng'),
  deliveryLat: text('delivery_lat'),
  deliveryLng: text('delivery_lng'),
  distanceKm: text('distance_km').notNull().default('0'),
  etaMinutes: integer('eta_minutes').notNull().default(15),
  garmentSummary: text('garment_summary').default(''),
  deliveryStage: text('delivery_stage').default('first_delivery'),
  status: text('status').notNull().default('pending'),
  expiresAt: timestamp('expires_at').notNull(),
  respondedAt: timestamp('responded_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Delivery Partner Live GPS & Online Status table for Discovery
export const partnerLocations = pgTable('partner_locations', {
  id: serial('id').primaryKey(),
  partnerId: text('partner_id').notNull().unique(),
  partnerPhone: text('partner_phone').notNull(),
  partnerName: text('partner_name').notNull().default('Delivery Partner'),
  vehicleType: text('vehicle_type').default('EV'),
  vehicleNumber: text('vehicle_number').default(''),
  isOnline: boolean('is_online').default(false).notNull(),
  lat: text('lat'),
  lng: text('lng'),
  serviceRadiusKm: integer('service_radius_km').default(15).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================================
// AGENTIC AI PERSISTENT RECORDS
// ============================================================================

// Workflow runs: order ID, current stage (1..11), status, version, timestamps
export const workflowRuns = pgTable('workflow_runs', {
  id: serial('id').primaryKey(),
  runId: text('run_id').notNull().unique(),
  orderId: text('order_id').notNull().unique(),
  orderNumber: text('order_number').notNull(),
  currentStageNumber: integer('current_stage_number').notNull().default(1),
  currentStageCode: text('current_stage_code').notNull().default('01_ORDER_PLACED'),
  currentStageLabel: text('current_stage_label').notNull().default('Customer places order'),
  activeAgent: text('active_agent').notNull().default('Order Agent'),
  workflowStatus: text('workflow_status').notNull().default('active'), // 'active' | 'paused_for_input' | 'paused_exception' | 'completed'
  version: integer('version').notNull().default(1),
  blockingReason: text('blocking_reason'),
  nextRecommendedAction: text('next_recommended_action'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Agent actions: selected agent, requested action, execution result, retry count, idempotency key
export const agentActions = pgTable('agent_actions', {
  id: serial('id').primaryKey(),
  actionId: text('action_id').notNull().unique(),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  orderId: text('order_id').notNull(),
  orderNumber: text('order_number').notNull(),
  selectedAgent: text('selected_agent').notNull(),
  requestedTool: text('requested_tool').notNull(),
  toolArgumentsJson: text('tool_arguments_json').default('{}'),
  policyDecision: text('policy_decision').notNull().default('authorized'), // 'authorized' | 'rejected'
  executionResult: text('execution_result').notNull(),
  retryCount: integer('retry_count').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Order events: event type, order ID, unique event ID, timestamp
export const orderEvents = pgTable('order_events', {
  id: serial('id').primaryKey(),
  eventId: text('event_id').notNull().unique(),
  orderId: text('order_id').notNull(),
  orderNumber: text('order_number').notNull(),
  eventType: text('event_type').notNull(),
  sourcePortal: text('source_portal').notNull().default('system'), // 'customer' | 'tailor' | 'delivery' | 'system'
  payloadJson: text('payload_json').default('{}'),
  processed: boolean('processed').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Audit history: action, reason, actor, approval, and verified result
export const auditHistory = pgTable('audit_history', {
  id: serial('id').primaryKey(),
  auditId: text('audit_id').notNull().unique(),
  orderId: text('order_id').notNull(),
  orderNumber: text('order_number').notNull(),
  stageNumber: integer('stage_number').notNull().default(1),
  actor: text('actor').notNull(), // Agent name or human role
  action: text('action').notNull(),
  reason: text('reason').notNull(),
  approvalStatus: text('approval_status').notNull().default('verified'), // 'verified' | 'blocked_safety' | 'requires_human_approval' | 'escalated'
  verifiedResult: text('verified_result').notNull(),
  timestampLabel: text('timestamp_label').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Pending exceptions: issue, assigned human, resolution, and status
export const pendingExceptions = pgTable('pending_exceptions', {
  id: serial('id').primaryKey(),
  exceptionId: text('exception_id').notNull().unique(),
  orderId: text('order_id').notNull(),
  orderNumber: text('order_number').notNull(),
  agent: text('agent').notNull().default('Exception Agent'),
  severity: text('severity').notNull().default('warning'), // 'warning' | 'critical'
  issueType: text('issue_type').notNull(),
  issueDescription: text('issue_description').notNull(),
  assignedHumanRole: text('assigned_human_role').notNull().default('customer'), // 'customer' | 'tailor' | 'delivery'
  resolutionHint: text('resolution_hint').notNull(),
  resolutionDataJson: text('resolution_data_json'),
  status: text('status').notNull().default('open'), // 'open' | 'resolved' | 'escalated'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at'),
});



