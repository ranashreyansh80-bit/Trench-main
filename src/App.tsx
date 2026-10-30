/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import {
  useUser,
  useClerk,
} from '@clerk/clerk-react';
import {
  AppRole,
  AssignedDeliveryPartnerInfo,
  CustomerServiceOption,
  DeliveryPartnerProfile,
  DeliveryStep,
  DeliveryTask,
  EntryStage,
  LedgerTransaction,
  LiveGeoState,
  PartnerNotification,
  RecordedMeasurements,
  TailorOrder,
  TailorOrderStage,
  TailorProfile,
  TailorStep,
} from './types/appTypes';
import {
  AVAILABLE_DELIVERY_PARTNERS,
  EMPTY_DELIVERY_PROFILE,
  EMPTY_TAILOR_PROFILE,
  ExtendedDeliveryAction,
  INITIAL_DELIVERY_TASKS,
  INITIAL_LEDGER,
  INITIAL_NOTIFICATIONS,
  INITIAL_TAILOR_ORDERS,
  addTailorWorkProgressUpdate,
  assignSecondDeliveryPartnerToOrder,
  createCustomerOrderWithFirstDelivery,
  performDeliveryTaskAction,
  reanchorOrdersAndTasksToDeviceLocation,
  recordTailorCustomerCall,
  transitionTailorOrderStage,
  updateTailorWorkbenchState,
} from './utils/appLogic';
import {
  fetchBootstrapData,
  fetchDeliveryProfile,
  saveDeliveryProfile,
  fetchTailorProfile,
  saveTailorProfile,
  syncTailorOrder,
  syncDeliveryTask,
  syncNotification,
  syncLedgerTransaction,
  syncUserLogin,
} from './utils/api';
import { OtpAuthScreen } from './components/OtpAuthBannerModal';
import { DeliveryOnboarding } from './components/DeliveryOnboarding';
import { VideoMeasurementTutorial } from './components/VideoMeasurementTutorial';
import { DeliveryDashboard } from './components/DeliveryDashboard';
import { TailorOnboarding } from './components/TailorOnboarding';
import { TailorDashboard } from './components/TailorDashboard';
import { TrenchLogo } from './components/TrenchLogo';
import { DeliveryBoyWatermark } from './components/DeliveryBoyWatermark';

const STORAGE_KEYS = {
  SESSION: 'trench_auth_session',
  DELIVERY_PROFILE: 'trench_delivery_profile',
  TAILOR_PROFILE: 'trench_tailor_profile',
  CACHED_ORDERS: 'trench_cached_orders',
  CACHED_TASKS: 'trench_cached_tasks',
  CACHED_NOTIFS: 'trench_cached_notifs',
  CACHED_LEDGER: 'trench_cached_ledger',
  CACHED_DEVICE_GEO: 'trench_cached_device_geo',
};

interface StoredAuthSession {
  isLoggedIn: boolean;
  verifiedPhone: string;
  activeRole: AppRole;
  entryStage: EntryStage;
  deliveryStep: DeliveryStep;
  tailorStep: TailorStep;
}

const normalizeAccountKey = (accountId: string): string =>
  (accountId || '').trim().toLowerCase();

const getDeliveryProfileKeyForAccount = (accountId: string): string =>
  `${STORAGE_KEYS.DELIVERY_PROFILE}::${normalizeAccountKey(accountId)}`;

const getTailorProfileKeyForAccount = (accountId: string): string =>
  `${STORAGE_KEYS.TAILOR_PROFILE}::${normalizeAccountKey(accountId)}`;

const getDeliveryStepKeyForAccount = (accountId: string): string =>
  `trench_delivery_step::${normalizeAccountKey(accountId)}`;

const getTailorStepKeyForAccount = (accountId: string): string =>
  `trench_tailor_step::${normalizeAccountKey(accountId)}`;

const getInitialSession = (): StoredAuthSession | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.isLoggedIn && parsed.verifiedPhone) return parsed;
    }
  } catch {}
  return null;
};

const loadDeliveryProfileForAccount = (
  accountId: string,
  email?: string
): DeliveryPartnerProfile | null => {
  const norm = normalizeAccountKey(accountId);
  if (!norm) return null;
  try {
    const raw = localStorage.getItem(getDeliveryProfileKeyForAccount(norm));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return { ...EMPTY_DELIVERY_PROFILE, ...parsed };
      }
    }
  } catch {}
  return null;
};

const buildFreshDeliveryProfileForAccount = (
  phoneOrIdentity: string,
  email?: string
): DeliveryPartnerProfile => {
  const isEmail = Boolean(
    (email && email.includes('@')) || (phoneOrIdentity && phoneOrIdentity.includes('@'))
  );
  return {
    ...EMPTY_DELIVERY_PROFILE,
    phoneNumber: isEmail ? '' : phoneOrIdentity || '',
    gmailAddress: email || (isEmail ? phoneOrIdentity : ''),
  };
};

const loadTailorProfileForAccount = (accountId: string): TailorProfile | null => {
  const norm = normalizeAccountKey(accountId);
  if (!norm) return null;
  try {
    const raw = localStorage.getItem(getTailorProfileKeyForAccount(norm));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return { ...EMPTY_TAILOR_PROFILE, ...parsed };
      }
    }
  } catch {}
  return null;
};

const loadDeliveryStepForAccount = (accountId: string): DeliveryStep | null => {
  const norm = normalizeAccountKey(accountId);
  if (!norm) return null;
  try {
    const step = localStorage.getItem(getDeliveryStepKeyForAccount(norm)) as DeliveryStep | null;
    if (step) return step;
  } catch {}
  return null;
};

const loadTailorStepForAccount = (accountId: string): TailorStep | null => {
  const norm = normalizeAccountKey(accountId);
  if (!norm) return null;
  try {
    const step = localStorage.getItem(getTailorStepKeyForAccount(norm)) as TailorStep | null;
    if (step) return step;
  } catch {}
  return null;
};

const isSyntheticOrderNumber = (num?: string) =>
  ['TRN-8821', 'TRN-8824', 'TRN-8819', 'TRN-8830', 'TRN-8815', 'TRN-8818', 'TRN-8812', 'TRN-8805', 'TRN-8794'].includes(num || '');

const isSyntheticId = (id?: string) =>
  ['ord-101', 'ord-102', 'ord-103', 'ord-104', 'task-101', 'task-102', 'task-103', 'notif-101', 'notif-102', 'tx-init', 'tx-del-sample'].some(
    (prefix) => (id || '').startsWith(prefix)
  );

const filterSyntheticOrders = (list: TailorOrder[]): TailorOrder[] =>
  (Array.isArray(list) ? list : []).filter(
    (o) => !isSyntheticOrderNumber(o.orderNumber) && !isSyntheticId(o.id) && !['Aarav Mehta', 'Priya Sharma', 'Rajesh Khanna', 'Kavita Nair'].includes(o.customerName)
  );

const filterSyntheticTasks = (list: DeliveryTask[]): DeliveryTask[] =>
  (Array.isArray(list) ? list : []).filter(
    (t) => !isSyntheticOrderNumber(t.orderNumber) && !isSyntheticId(t.id) && !['Aarav Mehta', 'Priya Sharma', 'Rajesh Khanna', 'Kavita Nair'].includes(t.customerName)
  );

const filterSyntheticNotifs = (list: PartnerNotification[]): PartnerNotification[] =>
  (Array.isArray(list) ? list : []).filter(
    (n) => !isSyntheticOrderNumber(n.orderNumber) && !isSyntheticId(n.id)
  );

const filterSyntheticLedger = (list: LedgerTransaction[]): LedgerTransaction[] =>
  (Array.isArray(list) ? list : []).filter(
    (l) => !isSyntheticOrderNumber(l.orderNumber) && !isSyntheticId(l.id)
  );

const getInitialOrders = (): TailorOrder[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CACHED_ORDERS);
    if (raw) {
      const parsed = filterSyntheticOrders(JSON.parse(raw));
      localStorage.setItem(STORAGE_KEYS.CACHED_ORDERS, JSON.stringify(parsed));
      return parsed;
    }
  } catch {}
  return [];
};

const getInitialTasks = (): DeliveryTask[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CACHED_TASKS);
    if (raw) {
      const parsed = filterSyntheticTasks(JSON.parse(raw));
      localStorage.setItem(STORAGE_KEYS.CACHED_TASKS, JSON.stringify(parsed));
      return parsed;
    }
  } catch {}
  return [];
};

const getInitialNotifications = (): PartnerNotification[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CACHED_NOTIFS);
    if (raw) {
      const parsed = filterSyntheticNotifs(JSON.parse(raw));
      localStorage.setItem(STORAGE_KEYS.CACHED_NOTIFS, JSON.stringify(parsed));
      return parsed;
    }
  } catch {}
  return [];
};

const getInitialLedger = (): LedgerTransaction[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CACHED_LEDGER);
    if (raw) {
      const parsed = filterSyntheticLedger(JSON.parse(raw));
      localStorage.setItem(STORAGE_KEYS.CACHED_LEDGER, JSON.stringify(parsed));
      return parsed;
    }
  } catch {}
  return [];
};

export default function App() {
  const initialSession = getInitialSession();
  const { isSignedIn: isClerkSignedIn, user: clerkUser } = useUser();
  const { signOut: clerkSignOut } = useClerk();

  // Instant restore: if already logged in previously, stay logged in and skip repeated login
  const [entryStage, setEntryStage] = useState<EntryStage>(() =>
    initialSession ? initialSession.entryStage : 'phone_otp'
  );
  const [verifiedPhone, setVerifiedPhone] = useState<string>(() =>
    initialSession ? initialSession.verifiedPhone : ''
  );

  const [activeRole, setActiveRole] = useState<AppRole>(() =>
    initialSession ? initialSession.activeRole : 'delivery'
  );
  const [deliveryStep, setDeliveryStep] = useState<DeliveryStep>(() => {
    if (initialSession?.verifiedPhone) {
      return (
        loadDeliveryStepForAccount(initialSession.verifiedPhone) ||
        initialSession.deliveryStep ||
        'aadhaar_portal'
      );
    }
    return 'aadhaar_portal';
  });
  const [tailorStep, setTailorStep] = useState<TailorStep>(() => {
    if (initialSession?.verifiedPhone) {
      return (
        loadTailorStepForAccount(initialSession.verifiedPhone) ||
        initialSession.tailorStep ||
        'onboarding'
      );
    }
    return 'onboarding';
  });

  const [deliveryProfile, setDeliveryProfile] = useState<DeliveryPartnerProfile>(() => {
    if (initialSession?.verifiedPhone) {
      return (
        loadDeliveryProfileForAccount(initialSession.verifiedPhone) ||
        buildFreshDeliveryProfileForAccount(initialSession.verifiedPhone)
      );
    }
    return { ...EMPTY_DELIVERY_PROFILE };
  });
  const [tailorProfile, setTailorProfile] = useState<TailorProfile>(() => {
    if (initialSession?.verifiedPhone) {
      return (
        loadTailorProfileForAccount(initialSession.verifiedPhone) || {
          ...EMPTY_TAILOR_PROFILE,
        }
      );
    }
    return { ...EMPTY_TAILOR_PROFILE };
  });

  // Instant 0ms cached data bootstrap
  const [tailorOrders, setTailorOrders] = useState<TailorOrder[]>(getInitialOrders);
  const [deliveryTasks, setDeliveryTasks] = useState<DeliveryTask[]>(getInitialTasks);
  const [notifications, setNotifications] = useState<PartnerNotification[]>(
    getInitialNotifications
  );
  const [ledger, setLedger] = useState<LedgerTransaction[]>(getInitialLedger);
  const [lastDispatchedOrderNumber, setLastDispatchedOrderNumber] = useState<
    string | null
  >(null);

  const [quotaExceeded, setQuotaExceeded] = useState(false);

  const [liveGeo, setLiveGeo] = useState<LiveGeoState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CACHED_DEVICE_GEO);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Number.isFinite(parsed.lat) && Number.isFinite(parsed.lng)) {
          return parsed;
        }
      }
    } catch {}
    return {
      lat: 12.9716,
      lng: 77.5946,
      sectorName: 'Click "Allow Device Location" for Live GPS',
      trackingActive: false,
      accuracyMeters: 10,
      partnerMapX: 46,
      partnerMapY: 54,
      permissionState: 'prompt',
      isLiveDeviceLocation: false,
    };
  });

  useEffect(() => {
    const onQuota = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuota);
  }, []);

  // Apply real device GPS coordinates and re-anchor active orders/tasks around the user's real location
  const applyDeviceCoordinates = React.useCallback(
    (latitude: number, longitude: number, accuracy?: number, resolvedName?: string) => {
      const accMeters = Math.max(1, Math.round(accuracy || 6));
      setLiveGeo((prev) => {
        const nextSectorName =
          resolvedName ||
          (prev.isLiveDeviceLocation &&
          prev.sectorName &&
          !prev.sectorName.toLowerCase().includes('allow') &&
          !prev.sectorName.toLowerCase().includes('requesting')
            ? prev.sectorName
            : `Live Device GPS (${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E)`);

        const nextState: LiveGeoState = {
          lat: latitude,
          lng: longitude,
          sectorName: nextSectorName,
          trackingActive: true,
          accuracyMeters: accMeters,
          partnerMapX: 48,
          partnerMapY: 52,
          permissionState: 'granted',
          isLiveDeviceLocation: true,
          lastUpdated: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          errorMessage: undefined,
        };
        try {
          localStorage.setItem(STORAGE_KEYS.CACHED_DEVICE_GEO, JSON.stringify(nextState));
        } catch {}
        return nextState;
      });

      // Re-anchor orders and delivery tasks around the user's real live device coordinates
      setTailorOrders((prevOrders) => {
        setDeliveryTasks((prevTasks) => {
          const { reanchoredOrders, reanchoredTasks } =
            reanchorOrdersAndTasksToDeviceLocation(
              prevOrders,
              prevTasks,
              latitude,
              longitude,
              resolvedName
            );
          setTailorOrders(reanchoredOrders);
          return reanchoredTasks;
        });
        return prevOrders;
      });
    },
    []
  );

  // Callback invoked when Google Maps Geocoder resolves the user's real street address
  const handleResolvedDeviceAddress = React.useCallback((formattedAddress: string) => {
    if (!formattedAddress) return;
    setLiveGeo((prev) => {
      if (prev.sectorName === formattedAddress) return prev;
      const updated = { ...prev, sectorName: formattedAddress };
      try {
        localStorage.setItem(STORAGE_KEYS.CACHED_DEVICE_GEO, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setTailorOrders((prevOrders) => {
      setDeliveryTasks((prevTasks) => {
        setLiveGeo((currentGeo) => {
          const { reanchoredOrders, reanchoredTasks } =
            reanchorOrdersAndTasksToDeviceLocation(
              prevOrders,
              prevTasks,
              currentGeo.lat,
              currentGeo.lng,
              formattedAddress
            );
          setTailorOrders(reanchoredOrders);
          setDeliveryTasks(reanchoredTasks);
          return currentGeo;
        });
        return prevTasks;
      });
      return prevOrders;
    });
  }, []);

  // Explicitly request browser/device location permission & start live GPS tracking
  const handleRequestDeviceLocation = React.useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLiveGeo((prev) => ({
        ...prev,
        permissionState: 'unsupported',
        errorMessage: 'Geolocation is not supported by this browser/device.',
      }));
      return;
    }

    setLiveGeo((prev) => ({
      ...prev,
      permissionState: 'requesting',
      errorMessage: undefined,
    }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyDeviceCoordinates(
          pos.coords.latitude,
          pos.coords.longitude,
          pos.coords.accuracy
        );
      },
      (err) => {
        setLiveGeo((prev) => ({
          ...prev,
          permissionState: err.code === 1 ? 'denied' : 'prompt',
          errorMessage:
            err.code === 1
              ? 'Location permission was denied. Please allow Location access in your browser site settings and click Allow Device Location.'
              : err.message || 'Unable to acquire device GPS coordinates.',
        }));
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
  }, [applyDeviceCoordinates]);

  // Automatically request & watch real-time device GPS position on mount
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;

    let watchId: number | null = null;

    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((status) => {
          setLiveGeo((prev) => ({
            ...prev,
            permissionState: status.state as 'granted' | 'prompt' | 'denied',
          }));
          status.onchange = () => {
            setLiveGeo((prev) => ({
              ...prev,
              permissionState: status.state as 'granted' | 'prompt' | 'denied',
            }));
            if (status.state === 'granted') {
              handleRequestDeviceLocation();
            }
          };
        })
        .catch(() => {});
    }

    // Attempt initial device position acquisition & continuous watchPosition
    handleRequestDeviceLocation();

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        applyDeviceCoordinates(
          pos.coords.latitude,
          pos.coords.longitude,
          pos.coords.accuracy
        );
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [applyDeviceCoordinates, handleRequestDeviceLocation]);

  // Revalidate fresh data in background (Stale-While-Revalidate pattern for ultra fast loads)
  useEffect(() => {
    fetchBootstrapData().then((data) => {
      if (data) {
        const cleanOrders = filterSyntheticOrders(data.orders || []);
        setTailorOrders(cleanOrders);
        try {
          localStorage.setItem(STORAGE_KEYS.CACHED_ORDERS, JSON.stringify(cleanOrders));
        } catch {}

        const cleanTasks = filterSyntheticTasks(data.tasks || []);
        setDeliveryTasks(cleanTasks);
        try {
          localStorage.setItem(STORAGE_KEYS.CACHED_TASKS, JSON.stringify(cleanTasks));
        } catch {}

        const cleanNotifs = filterSyntheticNotifs(data.notifications || []);
        setNotifications(cleanNotifs);
        try {
          localStorage.setItem(STORAGE_KEYS.CACHED_NOTIFS, JSON.stringify(cleanNotifs));
        } catch {}

        const cleanLedger = filterSyntheticLedger(data.ledger || []);
        setLedger(cleanLedger);
        try {
          localStorage.setItem(STORAGE_KEYS.CACHED_LEDGER, JSON.stringify(cleanLedger));
        } catch {}
      }
    });
  }, []);

  // Save session & per-account step progress
  useEffect(() => {
    if (verifiedPhone) {
      const session: StoredAuthSession = {
        isLoggedIn: true,
        verifiedPhone,
        activeRole,
        entryStage,
        deliveryStep,
        tailorStep,
      };
      try {
        localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
        localStorage.setItem(getDeliveryStepKeyForAccount(verifiedPhone), deliveryStep);
        localStorage.setItem(getTailorStepKeyForAccount(verifiedPhone), tailorStep);
      } catch {}
    }
  }, [verifiedPhone, entryStage, activeRole, deliveryStep, tailorStep]);

  // Persist delivery profile changes scoped specifically to the active account
  useEffect(() => {
    if (!verifiedPhone) return;
    try {
      localStorage.setItem(
        getDeliveryProfileKeyForAccount(verifiedPhone),
        JSON.stringify(deliveryProfile)
      );
    } catch {}
  }, [deliveryProfile, verifiedPhone]);

  // Persist tailor profile changes scoped specifically to the active account
  useEffect(() => {
    if (!verifiedPhone) return;
    try {
      localStorage.setItem(
        getTailorProfileKeyForAccount(verifiedPhone),
        JSON.stringify(tailorProfile)
      );
    } catch {}
  }, [tailorProfile, verifiedPhone]);

  // Persist orders, tasks, notifications, and ledger to localStorage cache
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CACHED_ORDERS, JSON.stringify(tailorOrders));
    } catch {}
  }, [tailorOrders]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CACHED_TASKS, JSON.stringify(deliveryTasks));
    } catch {}
  }, [deliveryTasks]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CACHED_NOTIFS, JSON.stringify(notifications));
    } catch {}
  }, [notifications]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CACHED_LEDGER, JSON.stringify(ledger));
    } catch {}
  }, [ledger]);

  const handleCycleLocation = () => {
    handleRequestDeviceLocation();
  };

  const handleSignOut = async () => {
    try {
      await clerkSignOut();
    } catch {}
    try {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
    } catch {}
    setVerifiedPhone('');
    setDeliveryProfile({ ...EMPTY_DELIVERY_PROFILE });
    setTailorProfile({ ...EMPTY_TAILOR_PROFILE });
    setDeliveryStep('aadhaar_portal');
    setTailorStep('onboarding');
    setEntryStage('phone_otp');
  };

  // Step 1: Phone / Gmail / Email verified -> load that specific account's state or start fresh
  const handlePhoneVerified = React.useCallback(
    (phoneOrIdentity: string, email?: string) => {
      const accountIdentity = (email || phoneOrIdentity || '').trim();
      if (!accountIdentity) return;

      setVerifiedPhone(accountIdentity);
      syncUserLogin(phoneOrIdentity, email, activeRole);

      // Check if this specific account has local onboarding progress; if not, start completely fresh!
      const savedLocalDelivery = loadDeliveryProfileForAccount(accountIdentity, email);
      const freshDelivery = buildFreshDeliveryProfileForAccount(phoneOrIdentity, email);

      if (savedLocalDelivery) {
        setDeliveryProfile(savedLocalDelivery);
        const savedStep = loadDeliveryStepForAccount(accountIdentity);
        setDeliveryStep(
          savedStep || (savedLocalDelivery.adminApproved ? 'dashboard' : 'aadhaar_portal')
        );
      } else {
        // Brand-new account -> reset Delivery Portal to fresh start (Step 1: aadhaar_portal)
        setDeliveryProfile(freshDelivery);
        setDeliveryStep('aadhaar_portal');
        try {
          localStorage.setItem(
            getDeliveryProfileKeyForAccount(accountIdentity),
            JSON.stringify(freshDelivery)
          );
          localStorage.setItem(
            getDeliveryStepKeyForAccount(accountIdentity),
            'aadhaar_portal'
          );
        } catch {}
      }

      const savedLocalTailor = loadTailorProfileForAccount(accountIdentity);
      if (savedLocalTailor) {
        setTailorProfile(savedLocalTailor);
        const savedTailorStep = loadTailorStepForAccount(accountIdentity);
        setTailorStep(
          savedTailorStep || (savedLocalTailor.adminApproved ? 'dashboard' : 'onboarding')
        );
      } else {
        const freshTailor = { ...EMPTY_TAILOR_PROFILE };
        setTailorProfile(freshTailor);
        setTailorStep('onboarding');
      }

      // Check backend database only for this specific account key
      fetchDeliveryProfile(accountIdentity).then((savedFromDb) => {
        if (
          savedFromDb &&
          (savedFromDb.verified ||
            savedFromDb.adminApproved ||
            savedFromDb.documentUploaded ||
            savedFromDb.aadhaarVerified) &&
          (normalizeAccountKey(savedFromDb.phoneNumber || '') ===
            normalizeAccountKey(accountIdentity) ||
            normalizeAccountKey(savedFromDb.gmailAddress || '') ===
              normalizeAccountKey(accountIdentity))
        ) {
          setDeliveryProfile((prev) => ({ ...prev, ...savedFromDb }));
        }
      });

      fetchTailorProfile(accountIdentity).then((savedTailorFromDb) => {
        if (
          savedTailorFromDb &&
          (savedTailorFromDb.verified ||
            savedTailorFromDb.adminApproved ||
            savedTailorFromDb.documentUploaded)
        ) {
          setTailorProfile((prev) => ({ ...prev, ...savedTailorFromDb }));
        }
      });

      setEntryStage('choose_role');
    },
    [activeRole]
  );

  // Detect if Clerk user switches to a different account while the app is open
  useEffect(() => {
    if (!isClerkSignedIn || !clerkUser) return;
    const primaryEmail = clerkUser.primaryEmailAddress?.emailAddress;
    const primaryPhone = clerkUser.primaryPhoneNumber?.phoneNumber;
    const clerkIdentity =
      primaryEmail ||
      primaryPhone ||
      clerkUser.username ||
      clerkUser.fullName ||
      clerkUser.id;
    if (
      clerkIdentity &&
      verifiedPhone &&
      normalizeAccountKey(clerkIdentity) !== normalizeAccountKey(verifiedPhone)
    ) {
      handlePhoneVerified(clerkIdentity, primaryEmail);
    }
  }, [isClerkSignedIn, clerkUser, verifiedPhone, handlePhoneVerified]);

  const handleUpdateDeliveryProfile = (
    updater:
      | Partial<DeliveryPartnerProfile>
      | ((prev: DeliveryPartnerProfile) => DeliveryPartnerProfile)
  ) => {
    setDeliveryProfile((prev) => {
      const next =
        typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      saveDeliveryProfile(next, verifiedPhone);
      return next;
    });
  };

  const handleUpdateTailorProfile = (
    updater: React.SetStateAction<TailorProfile>
  ) => {
    setTailorProfile((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      const key = verifiedPhone || 'current_user';
      saveTailorProfile(key, next);
      return next;
    });
  };

  // Step 2: Role chosen -> open Delivery Portal 1 (Aadhaar) for a new account, or resume saved step for this account
  const handleSelectRole = (role: AppRole) => {
    setActiveRole(role);
    setEntryStage('active_portal');

    if (verifiedPhone) {
      syncUserLogin(verifiedPhone, undefined, role);
    }

    if (role === 'delivery') {
      if (deliveryProfile.adminApproved) {
        setDeliveryStep('dashboard');
      } else {
        const savedStep = verifiedPhone
          ? loadDeliveryStepForAccount(verifiedPhone)
          : null;
        setDeliveryStep(
          savedStep && savedStep !== 'dashboard' ? savedStep : 'aadhaar_portal'
        );
      }
    } else {
      setTailorStep(tailorProfile.adminApproved ? 'dashboard' : 'onboarding');
    }
  };

  const handleTransitionOrder = (
    orderId: string,
    nextStage: TailorOrderStage
  ) => {
    const timeLabel = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const res = transitionTailorOrderStage(
      tailorOrders,
      deliveryTasks,
      notifications,
      ledger,
      orderId,
      nextStage,
      `Today · ${timeLabel}`
    );
    setTailorOrders(res.updatedOrders);
    setDeliveryTasks(res.updatedTasks);
    setNotifications(res.updatedNotifications);
    setLedger(res.updatedLedger);

    const changedOrder = res.updatedOrders.find((o) => o.id === orderId);
    if (changedOrder) syncTailorOrder(changedOrder);
    if (res.createdNotification) {
      syncNotification(res.createdNotification);
      setLastDispatchedOrderNumber(res.createdNotification.orderNumber);
    }
    const matchingTask = res.updatedTasks.find(
      (t) => t.linkedTailorOrderId === orderId
    );
    if (matchingTask) syncDeliveryTask(matchingTask);
    const matchingTx = res.updatedLedger.find(
      (tx) => tx.orderNumber === changedOrder?.orderNumber
    );
    if (matchingTx) syncLedgerTransaction(matchingTx);
  };

  const handleAddNewOrder = (
    newOrder: TailorOrder,
    selectedService: CustomerServiceOption = 'measurement_plus_cloth_pickup',
    needsTailor: boolean = true,
    firstPartner: AssignedDeliveryPartnerInfo = AVAILABLE_DELIVERY_PARTNERS[0]
  ) => {
    const timeLabel = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const res = createCustomerOrderWithFirstDelivery(
      newOrder,
      selectedService,
      needsTailor,
      firstPartner,
      `Today · ${timeLabel}`
    );

    const nextOrders = [res.createdOrder, ...tailorOrders];
    const nextTasks = [res.createdFirstDeliveryTask, ...deliveryTasks];
    const nextNotifs = [res.createdNotification, ...notifications];

    setTailorOrders(nextOrders);
    setDeliveryTasks(nextTasks);
    setNotifications(nextNotifs);

    syncTailorOrder(res.createdOrder);
    syncDeliveryTask(res.createdFirstDeliveryTask);
    syncNotification(res.createdNotification);
  };

  const handleUpdateWorkbench = (
    orderId: string,
    statusLabel: string,
    readyToBegin: boolean,
    notes: string
  ) => {
    const timeLabel = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const res = updateTailorWorkbenchState(
      tailorOrders,
      notifications,
      orderId,
      statusLabel,
      readyToBegin,
      notes,
      `Today · ${timeLabel}`
    );
    setTailorOrders(res.updatedOrders);
    setNotifications(res.updatedNotifications);

    const changedOrder = res.updatedOrders.find((o) => o.id === orderId);
    if (changedOrder) syncTailorOrder(changedOrder);
    if (res.createdNotification) syncNotification(res.createdNotification);
  };

  const handleRecordCustomerCall = (orderId: string) => {
    const timeLabel = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const updated = recordTailorCustomerCall(
      tailorOrders,
      orderId,
      `Today · ${timeLabel}`
    );
    setTailorOrders(updated);
    const changedOrder = updated.find((o) => o.id === orderId);
    if (changedOrder) syncTailorOrder(changedOrder);
  };

  const handleAddWorkProgress = (
    orderId: string,
    photoUrl: string,
    description: string,
    workStatus: string
  ) => {
    const timeLabel = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const res = addTailorWorkProgressUpdate(
      tailorOrders,
      notifications,
      orderId,
      photoUrl,
      description,
      workStatus,
      `Today · ${timeLabel}`
    );
    setTailorOrders(res.updatedOrders);
    setNotifications(res.updatedNotifications);

    const changedOrder = res.updatedOrders.find((o) => o.id === orderId);
    if (changedOrder) syncTailorOrder(changedOrder);
    if (res.createdNotification) syncNotification(res.createdNotification);
  };

  const handleAssignSecondDeliveryPartner = (
    orderId: string,
    partner: AssignedDeliveryPartnerInfo
  ) => {
    const timeLabel = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const res = assignSecondDeliveryPartnerToOrder(
      tailorOrders,
      deliveryTasks,
      notifications,
      orderId,
      partner,
      `Today · ${timeLabel}`
    );
    setTailorOrders(res.updatedOrders);
    setDeliveryTasks(res.updatedTasks);
    setNotifications(res.updatedNotifications);

    const changedOrder = res.updatedOrders.find((o) => o.id === orderId);
    if (changedOrder) syncTailorOrder(changedOrder);
    if (res.createdTask) syncDeliveryTask(res.createdTask);
    if (res.createdNotification) {
      syncNotification(res.createdNotification);
      setLastDispatchedOrderNumber(res.createdNotification.orderNumber);
    }
  };

  const handleAddNewTask = (newTask: DeliveryTask) => {
    const nextTasks = [newTask, ...deliveryTasks];
    setDeliveryTasks(nextTasks);
    syncDeliveryTask(newTask);
  };

  const handleDeliveryTaskAction = (
    taskId: string,
    action: ExtendedDeliveryAction,
    measurements?: RecordedMeasurements
  ) => {
    const timeLabel = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const res = performDeliveryTaskAction(
      deliveryTasks,
      ledger,
      taskId,
      action,
      measurements,
      `Today · ${timeLabel}`,
      tailorOrders,
      notifications
    );
    setDeliveryTasks(res.updatedTasks);
    setLedger(res.updatedLedger);
    if (res.updatedOrders) {
      setTailorOrders(res.updatedOrders);
    }
    if (res.updatedNotifications) {
      setNotifications(res.updatedNotifications);
    }

    const changedTask = res.updatedTasks.find((t) => t.id === taskId);
    if (changedTask) {
      syncDeliveryTask(changedTask);
      if (res.updatedOrders) {
        const linkedOrder = res.updatedOrders.find(
          (o) =>
            o.id === changedTask.linkedTailorOrderId ||
            o.orderNumber === changedTask.orderNumber
        );
        if (linkedOrder) syncTailorOrder(linkedOrder);
      }
    }
    if (res.createdNotification) {
      syncNotification(res.createdNotification);
    }
    const newTx = res.updatedLedger.find(
      (tx) => tx.orderNumber === changedTask?.orderNumber
    );
    if (newTx) syncLedgerTransaction(newTx);
  };

  const handleAcknowledgeNotification = (notifId: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) =>
        n.id === notifId ? { ...n, acknowledged: true } : n
      );
      const target = updated.find((n) => n.id === notifId);
      if (target) syncNotification(target);
      return updated;
    });
  };

  const isDashboard =
    entryStage === 'active_portal' &&
    ((activeRole === 'delivery' && deliveryStep === 'dashboard') ||
      (activeRole === 'tailor' && tailorStep === 'dashboard'));

  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}>
    <div className="min-h-dvh w-full flex flex-col bg-slate-50 text-slate-900 overflow-x-hidden">
      {quotaExceeded && (
        <div
          role="alert"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 9999,
            background: '#fff3cd',
            color: '#664d03',
            borderBottom: '1px solid #ffecb5',
            padding: '10px 16px',
            fontSize: '14px',
          }}
        >
          Google Maps notice: Quota limit reached. To enable continuous live map tracking, configure your Google Cloud API key — see{' '}
          <a
            href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#0d6efd', textDecoration: 'underline' }}
          >
            troubleshooting quota exceeded errors
          </a>
          .
        </div>
      )}
      {/* Clean Minimal Brand Header (Shown after starting login page) */}
      {entryStage !== 'phone_otp' && (
        <header
          className={`flex items-center justify-between gap-3 px-4 sm:px-6 ${
            !isDashboard
              ? 'py-2 h-13 shrink-0'
              : 'py-2.5 sm:py-3'
          } bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs`}
        >
          <div className="flex items-center gap-2.5 shrink-0">
            <TrenchLogo variant="header" size="sm" />
          </div>

          {/* Sign Out */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSignOut}
              title="Sign out of current account"
              className="text-[11px] font-bold text-slate-500 hover:text-red-600 px-2.5 py-1 hover:bg-red-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-red-200"
            >
              Sign Out
            </button>
          </div>
        </header>
      )}

      {/* Main Content Viewport: Always full scrollability and proper viewport adaptation */}
      <main
        className={`flex-1 w-full mx-auto flex flex-col ${
          entryStage === 'phone_otp'
            ? 'max-w-7xl items-stretch sm:items-center justify-center p-0 sm:px-6 sm:py-6'
            : !isDashboard
            ? 'max-w-4xl items-center justify-start sm:justify-center px-3 sm:px-6 py-3 sm:py-6 overflow-y-auto'
            : 'max-w-7xl px-3 sm:px-6 py-4 sm:py-8'
        }`}
      >
        {entryStage !== 'active_portal' ? (
          <OtpAuthScreen
            entryStage={entryStage}
            verifiedPhone={verifiedPhone}
            liveGeo={liveGeo}
            onPhoneVerified={handlePhoneVerified}
            onSelectRole={handleSelectRole}
            onChangePhone={handleSignOut}
          />
        ) : activeRole === 'delivery' ? (
          <div className="relative w-full flex-1 flex flex-col items-center justify-center my-auto py-1">
            {/* Ambient delivery boy background watermark across all delivery partner portals */}
            {!isDashboard && (
              <DeliveryBoyWatermark
                opacityClass="opacity-[0.05] sm:opacity-[0.07]"
                variant="fullscreen"
              />
            )}
            <div className="relative z-10 w-full flex flex-col items-center justify-center">
              {/* Delivery Portals 1, 2, 3, 4, and 6 (Admin Approval) */}
              {(deliveryStep === 'aadhaar_portal' ||
                deliveryStep === 'vehicle_portal' ||
                deliveryStep === 'personal_portal' ||
                deliveryStep === 'bank_portal' ||
                deliveryStep === 'admin_approval') && (
                <DeliveryOnboarding
                  key={`del-onb-${verifiedPhone || 'guest'}`}
                  profile={deliveryProfile}
                  currentStep={deliveryStep}
                  onSelectStep={setDeliveryStep}
                  onStepChange={setDeliveryStep}
                  onUpdateProfile={handleUpdateDeliveryProfile}
                  onApproveAndEnterDashboard={() => {
                    handleUpdateDeliveryProfile({
                      adminApproved: true,
                    });
                    setDeliveryStep('dashboard');
                  }}
                  onBack={() => setEntryStage('choose_role')}
                  onBackToRoleSelect={() => setEntryStage('choose_role')}
                />
              )}

              {/* Delivery Portal 5: Video Measurement Tutorial (Strictly inside Delivery Portal BEFORE Admin Approval) */}
              {deliveryStep === 'tutorial' && (
                <VideoMeasurementTutorial
                  key={`del-tut-${verifiedPhone || 'guest'}`}
                  profile={deliveryProfile}
                  partnerName={deliveryProfile.fullName || 'Delivery Partner'}
                  tutorialCompleted={deliveryProfile.tutorialCompleted}
                  onUpdateProfile={handleUpdateDeliveryProfile}
                  onSelectStep={setDeliveryStep}
                  onCompleteTutorial={() => {
                    handleUpdateDeliveryProfile({
                      tutorialCompleted: true,
                      menTutorialWatchedPercent: 100,
                      womenTutorialWatchedPercent: 100,
                    });
                    setDeliveryStep('admin_approval');
                  }}
                  onCompleteTutorialAndEnterDashboard={() => {
                    handleUpdateDeliveryProfile({
                      tutorialCompleted: true,
                      menTutorialWatchedPercent: 100,
                      womenTutorialWatchedPercent: 100,
                    });
                    setDeliveryStep('admin_approval');
                  }}
                  onBackToOnboarding={() => setDeliveryStep('bank_portal')}
                />
              )}

              {/* Delivery Partner Main Dashboard (Opened after Admin Approval) */}
              {deliveryStep === 'dashboard' && (
                <DeliveryDashboard
                  key={`del-dash-${verifiedPhone || 'guest'}`}
                  profile={deliveryProfile}
                  orders={tailorOrders}
                  tasks={deliveryTasks}
                  notifications={notifications}
                  ledger={ledger}
                  liveGeo={liveGeo}
                  onTaskAction={handleDeliveryTaskAction}
                  onAcknowledgeNotification={handleAcknowledgeNotification}
                  onAddNewTask={handleAddNewTask}
                  onMovePartnerLocation={handleRequestDeviceLocation}
                  onRequestDeviceLocation={handleRequestDeviceLocation}
                  onResolvedDeviceAddress={handleResolvedDeviceAddress}
                  onReopenTutorial={() => setDeliveryStep('tutorial')}
                  onBack={() => setEntryStage('choose_role')}
                />
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Tailor Onboarding & Admin Approval Portals */}
            {(tailorStep === 'onboarding' ||
              tailorStep === 'identity_portal' ||
              tailorStep === 'equipment_portal' ||
              tailorStep === 'personal_portal' ||
              tailorStep === 'camera_portal' ||
              tailorStep === 'bank_portal' ||
              tailorStep === 'admin_approval') && (
              <TailorOnboarding
                key={`tailor-onb-${verifiedPhone || 'guest'}`}
                profile={tailorProfile}
                currentStep={tailorStep}
                onStepChange={setTailorStep}
                onSelectStep={setTailorStep}
                onUpdateProfile={handleUpdateTailorProfile}
                onApproveAndEnterDashboard={(updated) => {
                  handleUpdateTailorProfile({
                    ...updated,
                    adminApproved: true,
                    verified: true,
                  });
                  setTailorStep('dashboard');
                }}
                onBackToRoleSelect={() => setEntryStage('choose_role')}
              />
            )}

            {/* Tailor Partner Main Dashboard (Opened after Admin Approval) */}
            {tailorStep === 'dashboard' && (
              <TailorDashboard
                key={`tailor-dash-${verifiedPhone || 'guest'}`}
                profile={tailorProfile}
                orders={tailorOrders}
                tasks={deliveryTasks}
                ledger={ledger}
                liveGeo={liveGeo}
                onRequestDeviceLocation={handleRequestDeviceLocation}
                lastDispatchedOrderNumber={lastDispatchedOrderNumber}
                onTransitionOrder={handleTransitionOrder}
                onAddNewOrder={handleAddNewOrder}
                onUpdateWorkbench={handleUpdateWorkbench}
                onRecordCustomerCall={handleRecordCustomerCall}
                onAddWorkProgress={handleAddWorkProgress}
                onAssignSecondDeliveryPartner={handleAssignSecondDeliveryPartner}
                onSwitchToDeliveryDashboard={() => {
                  setActiveRole('delivery');
                  setDeliveryStep('dashboard');
                }}
                onBackToRegistration={() => setTailorStep('admin_approval')}
                onBack={() => setEntryStage('choose_role')}
              />
            )}
          </>
        )}
      </main>

      {/* Clean Minimal Footer — only shown on dashboard */}
      {isDashboard && (
        <footer className="bg-white border-t border-slate-200 px-6 py-4 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <strong className="italic font-bold text-[#000080]">trench</strong> — Delivery Partner &amp; Tailor Partner Platform
            </div>
            {verifiedPhone && (
              <span className="font-mono text-slate-600">{verifiedPhone}</span>
            )}
          </div>
        </footer>
      )}
    </div>
    </APIProvider>
  );
}
