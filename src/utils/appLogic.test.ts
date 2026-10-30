import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRoleEarnings,
  EMPTY_DELIVERY_PROFILE,
  EMPTY_TAILOR_PROFILE,
  INITIAL_DELIVERY_TASKS,
  INITIAL_LEDGER,
  INITIAL_NOTIFICATIONS,
  INITIAL_TAILOR_ORDERS,
  performDeliveryTaskAction,
  transitionTailorOrderStage,
  validateAadhaarPortal,
  validateBankPortal,
  validateDeliveryOnboarding,
  validateOtpInput,
  validatePersonalPortal,
  validateTailorOnboarding,
  validateVehiclePortal,
} from './appLogic';
import {
  DeliveryPartnerProfile,
  DeliveryTask,
  TailorOrder,
  TailorProfile,
} from '../types/appTypes';

test('Initial data arrays start completely empty with zero synthetic data', () => {
  assert.equal(INITIAL_TAILOR_ORDERS.length, 0);
  assert.equal(INITIAL_DELIVERY_TASKS.length, 0);
  assert.equal(INITIAL_NOTIFICATIONS.length, 0);
  assert.equal(INITIAL_LEDGER.length, 0);
});

test('OTP verification validates 10-digit phone and 6-digit OTP', () => {
  const validRes = validateOtpInput('+91 98450 67123', '482910');
  assert.equal(validRes.valid, true);
  assert.equal(validRes.errors.length, 0);

  const invalidRes = validateOtpInput('12345', '12');
  assert.equal(invalidRes.valid, false);
  assert.equal(invalidRes.errors.length, 2);
});

test('Sequential Delivery Portals 1 to 4 validate Aadhaar, Driving License/Vehicle, Personal/Live Photo, and Bank/UPI', () => {
  const filledProfile: DeliveryPartnerProfile = {
    documentType: 'Aadhaar Card',
    documentNumber: '8492 7104 3918',
    documentUploaded: true,
    documentFileName: 'aadhaar.jpg',
    drivingLicenseUploaded: true,
    drivingLicenseFileName: 'license.jpg',
    vehicleNumber: 'KA-01-EV-7842',
    vehicleType: 'EV',
    fullName: 'Aarav Kulkarni',
    phoneNumber: '+91 98450 67123',
    gmailAddress: 'aarav@gmail.com',
    residentialAddress: '100ft Road, Indiranagar',
    pincode: '560038',
    partnerPhotoUrl: 'live_photo.jpg',
    upiId: 'aarav@upi',
    bankAccountNumber: '50100482910433',
    verified: true,
    adminApproved: true,
    tutorialCompleted: true,
  };

  assert.equal(validateAadhaarPortal(EMPTY_DELIVERY_PROFILE).valid, false);
  assert.equal(validateAadhaarPortal(filledProfile).valid, true);

  assert.equal(validateVehiclePortal(EMPTY_DELIVERY_PROFILE).valid, false);
  assert.equal(validateVehiclePortal(filledProfile).valid, true);

  assert.equal(validatePersonalPortal(EMPTY_DELIVERY_PROFILE).valid, false);
  assert.equal(validatePersonalPortal(filledProfile).valid, true);

  assert.equal(validateBankPortal(EMPTY_DELIVERY_PROFILE).valid, false);
  assert.equal(validateBankPortal(filledProfile).valid, true);

  assert.equal(validateDeliveryOnboarding(filledProfile).valid, true);
});

test('Tailor onboarding validates live camera capture and shop details', () => {
  assert.equal(validateTailorOnboarding(EMPTY_TAILOR_PROFILE).valid, false);

  const validTailor: TailorProfile = {
    documentType: 'GST',
    documentNumber: '29AABCU9603R1ZM',
    documentUploaded: true,
    documentFileName: 'doc.pdf',
    shopName: 'Bespoke Tailors',
    specialty: 'Stitching',
    liveCameraCaptured: true,
    liveCameraTimestamp: 'Verified',
    liveCameraAddress: 'Indiranagar 100ft Road, Bengaluru',
    liveCameraCoords: { latitude: 12.9716, longitude: 77.6412, accuracy: 6 },
    verified: true,
    adminApproved: true,
  };
  assert.equal(validateTailorOnboarding(validTailor).valid, true);
  assert.equal(Boolean(validTailor.liveCameraAddress), true);
  assert.equal(validTailor.liveCameraCoords?.latitude, 12.9716);
});

test('Tailor Order completion automatically triggers Delivery Partner pickup notification and task', () => {
  const sampleOrder: TailorOrder = {
    id: 'ord-1',
    orderNumber: 'ORD-101',
    customerName: 'Rohan',
    customerPhone: '+91 98860 11290',
    customerAddress: 'Indiranagar, Bengaluru',
    clothToBeAltered: 'Cotton Shirt',
    clothDescription: 'Stitching',
    sizeChart: {
      chestInches: '40"',
      waistInches: '34"',
      shoulderInches: '17.5"',
      sleeveLengthInches: '25"',
      garmentLengthInches: '29"',
      neckCollarInches: '15.5"',
      fitPreference: 'Classic Regular',
    },
    colorGrade: {
      shadeName: 'Navy',
      hexCode: '#1E293B',
      pantoneRef: '-',
      fabricFinish: 'Cotton',
    },
    noteToTailor: '-',
    stage: 'working',
    tailorPayoutINR: 1500,
    deliveryPayoutINR: 180,
    tailorShopName: 'Bespoke Tailors',
    tailorShopAddress: 'Indiranagar',
    placedAt: 'Just now',
  };

  const result = transitionTailorOrderStage(
    [sampleOrder],
    [],
    [],
    [],
    'ord-1',
    'completed',
    'Just now'
  );

  assert.equal(result.updatedOrders[0].stage, 'completed');
  assert.ok(result.createdNotification);
  assert.equal(result.createdNotification?.orderNumber, 'ORD-101');
  assert.equal(result.updatedTasks.length, 1);
  assert.equal(
    calculateRoleEarnings(result.updatedLedger, 'tailor').totalEarningsINR,
    1500
  );
});

test('Delivery Partner Measurement-Only task and Cloth pickup/delivery update Money Counter', () => {
  const measTask: DeliveryTask = {
    id: 'task-1',
    orderNumber: 'ORD-201',
    category: 'measurement_only',
    title: 'Measurement Visit',
    customerName: 'Kabir',
    customerPhone: '+91 98452 90112',
    pickupAddress: 'Domlur',
    dropAddress: 'Measurement Only',
    garmentSummary: 'Measurement Visit',
    payoutINR: 200,
    distanceKm: 2,
    etaMinutes: 8,
    status: 'assigned',
    mapCoords: { x: 20, y: 30 },
  };

  const measResult = performDeliveryTaskAction(
    [measTask],
    [],
    'task-1',
    'submit_measurements',
    {
      shoulder: '18',
      chest: '40',
      waist: '34',
      hips: '39',
      sleeve: '25',
      inseam: '31',
      videoPostureVerified: true,
      recordedAt: 'Just now',
    }
  );

  assert.equal(measResult.updatedTasks[0].status, 'measurement_recorded');
  assert.equal(
    calculateRoleEarnings(measResult.updatedLedger, 'delivery')
      .totalEarningsINR,
    200
  );
});
