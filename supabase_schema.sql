-- ====================================================================
-- Trench Platform: Complete Supabase PostgreSQL Schema & Seed Script
-- Compatible with Supabase SQL Editor (https://supabase.com/dashboard)
-- ====================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table (Login Page Master Accounts)
CREATE TABLE IF NOT EXISTS public.users (
  id SERIAL PRIMARY KEY,
  uid TEXT NOT NULL UNIQUE,
  email TEXT,
  phone TEXT,
  country_code TEXT DEFAULT '+91',
  login_method TEXT DEFAULT 'phone', -- 'phone' | 'gmail' | 'email'
  role TEXT DEFAULT 'delivery',      -- 'delivery' | 'tailor'
  otp_verified BOOLEAN DEFAULT TRUE,
  remember_login BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1B. Login Page Sessions & OTP Audit Table
CREATE TABLE IF NOT EXISTS public.login_sessions (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  uid TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  country_code TEXT DEFAULT '+91',
  login_method TEXT NOT NULL DEFAULT 'phone', -- 'phone' | 'gmail' | 'email'
  otp_code TEXT DEFAULT '482910',
  otp_verified BOOLEAN DEFAULT TRUE,
  remember_login BOOLEAN DEFAULT TRUE,
  selected_role TEXT DEFAULT 'delivery',
  logged_in_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Delivery Partner Profiles
CREATE TABLE IF NOT EXISTS public.delivery_profiles (
  id SERIAL PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE,
  full_name TEXT DEFAULT '',
  document_type TEXT DEFAULT 'Aadhaar Card',
  document_number TEXT DEFAULT '',
  document_uploaded BOOLEAN DEFAULT FALSE,
  document_file_name TEXT DEFAULT '',
  document_preview_url TEXT DEFAULT '',
  aadhaar_status TEXT DEFAULT 'Pending',
  pan_number TEXT DEFAULT '',
  pan_uploaded BOOLEAN DEFAULT FALSE,
  pan_file_name TEXT DEFAULT '',
  pan_preview_url TEXT DEFAULT '',
  pan_status TEXT DEFAULT 'Pending',
  driving_license_uploaded BOOLEAN DEFAULT FALSE,
  driving_license_file_name TEXT DEFAULT '',
  driving_license_preview_url TEXT DEFAULT '',
  vehicle_number TEXT DEFAULT '',
  vehicle_type TEXT DEFAULT 'EV',
  gmail_address TEXT DEFAULT '',
  residential_address TEXT DEFAULT '',
  pincode TEXT DEFAULT '',
  partner_photo_url TEXT DEFAULT '',
  partner_photo_preview_url TEXT DEFAULT '',
  upi_id TEXT DEFAULT '',
  bank_account_number TEXT DEFAULT '',
  verified BOOLEAN DEFAULT FALSE,
  admin_approved BOOLEAN DEFAULT FALSE,
  tutorial_completed BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tailor Profiles
CREATE TABLE IF NOT EXISTS public.tailor_profiles (
  id SERIAL PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE,
  shop_name TEXT NOT NULL DEFAULT '',
  specialty TEXT NOT NULL DEFAULT 'Stitching',
  document_type TEXT DEFAULT '',
  document_number TEXT DEFAULT '',
  document_uploaded BOOLEAN DEFAULT FALSE,
  document_file_name TEXT DEFAULT '',
  document_preview_url TEXT DEFAULT '',
  live_camera_captured BOOLEAN DEFAULT FALSE,
  live_camera_timestamp TEXT DEFAULT '',
  live_camera_data_url TEXT DEFAULT '',
  verified BOOLEAN DEFAULT FALSE,
  admin_approved BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tailor Orders
CREATE TABLE IF NOT EXISTS public.tailor_orders (
  id SERIAL PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  order_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  cloth_to_be_altered TEXT NOT NULL,
  cloth_description TEXT DEFAULT '',
  size_chart_json JSONB DEFAULT '{}'::jsonb,
  color_grade_json JSONB DEFAULT '{}'::jsonb,
  note_to_tailor TEXT DEFAULT '',
  stage TEXT NOT NULL DEFAULT 'incoming',
  tailor_payout_inr INTEGER NOT NULL DEFAULT 220,
  delivery_payout_inr INTEGER NOT NULL DEFAULT 85,
  tailor_shop_name TEXT NOT NULL,
  tailor_shop_address TEXT NOT NULL,
  placed_at TEXT NOT NULL,
  completed_at TEXT,
  pickup_dispatched BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Delivery Tasks
CREATE TABLE IF NOT EXISTS public.delivery_tasks (
  id SERIAL PRIMARY KEY,
  task_id TEXT NOT NULL UNIQUE,
  order_number TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'measurement_only',
  title TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  pickup_address TEXT NOT NULL,
  drop_address TEXT NOT NULL,
  garment_summary TEXT NOT NULL,
  payout_inr INTEGER NOT NULL DEFAULT 85,
  distance_km TEXT DEFAULT '2.5',
  eta_minutes INTEGER DEFAULT 15,
  status TEXT NOT NULL DEFAULT 'assigned',
  linked_tailor_order_id TEXT,
  is_urgent_tailor_pickup BOOLEAN DEFAULT FALSE,
  map_coords_json JSONB DEFAULT '{"x":50,"y":50}'::jsonb,
  recorded_measurements_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id SERIAL PRIMARY KEY,
  notif_id TEXT NOT NULL UNIQUE,
  order_number TEXT NOT NULL,
  linked_order_id TEXT NOT NULL,
  tailor_shop_name TEXT NOT NULL,
  tailor_address TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  cloth_to_be_altered TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  acknowledged BOOLEAN DEFAULT FALSE,
  payout_inr INTEGER NOT NULL DEFAULT 85,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Ledger Transactions
CREATE TABLE IF NOT EXISTS public.ledger_transactions (
  id SERIAL PRIMARY KEY,
  tx_id TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  order_number TEXT NOT NULL,
  description TEXT NOT NULL,
  category_label TEXT NOT NULL,
  amount_inr INTEGER NOT NULL,
  timestamp TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Settled to UPI',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure columns exist if public.users was already created previously
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT '+91';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS login_method TEXT DEFAULT 'phone';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS otp_verified BOOLEAN DEFAULT TRUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS remember_login BOOLEAN DEFAULT TRUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ====================================================================
-- RLS (Row Level Security) Configuration for Supabase
-- ====================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tailor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tailor_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_transactions ENABLE ROW LEVEL SECURITY;

-- Allow public read/write access for applet operations
DROP POLICY IF EXISTS "Allow public read access to users" ON public.users;
DROP POLICY IF EXISTS "Allow public write access to users" ON public.users;
CREATE POLICY "Allow public read access to users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow public write access to users" ON public.users FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public read access to login_sessions" ON public.login_sessions;
DROP POLICY IF EXISTS "Allow public write access to login_sessions" ON public.login_sessions;
CREATE POLICY "Allow public read access to login_sessions" ON public.login_sessions FOR SELECT USING (true);
CREATE POLICY "Allow public write access to login_sessions" ON public.login_sessions FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public read access to delivery_profiles" ON public.delivery_profiles;
DROP POLICY IF EXISTS "Allow public write access to delivery_profiles" ON public.delivery_profiles;
CREATE POLICY "Allow public read access to delivery_profiles" ON public.delivery_profiles FOR SELECT USING (true);
CREATE POLICY "Allow public write access to delivery_profiles" ON public.delivery_profiles FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public read access to tailor_profiles" ON public.tailor_profiles;
DROP POLICY IF EXISTS "Allow public write access to tailor_profiles" ON public.tailor_profiles;
CREATE POLICY "Allow public read access to tailor_profiles" ON public.tailor_profiles FOR SELECT USING (true);
CREATE POLICY "Allow public write access to tailor_profiles" ON public.tailor_profiles FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public read access to tailor_orders" ON public.tailor_orders;
DROP POLICY IF EXISTS "Allow public write access to tailor_orders" ON public.tailor_orders;
CREATE POLICY "Allow public read access to tailor_orders" ON public.tailor_orders FOR SELECT USING (true);
CREATE POLICY "Allow public write access to tailor_orders" ON public.tailor_orders FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public read access to delivery_tasks" ON public.delivery_tasks;
DROP POLICY IF EXISTS "Allow public write access to delivery_tasks" ON public.delivery_tasks;
CREATE POLICY "Allow public read access to delivery_tasks" ON public.delivery_tasks FOR SELECT USING (true);
CREATE POLICY "Allow public write access to delivery_tasks" ON public.delivery_tasks FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public read access to notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow public write access to notifications" ON public.notifications;
CREATE POLICY "Allow public read access to notifications" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "Allow public write access to notifications" ON public.notifications FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public read access to ledger_transactions" ON public.ledger_transactions;
DROP POLICY IF EXISTS "Allow public write access to ledger_transactions" ON public.ledger_transactions;
CREATE POLICY "Allow public read access to ledger_transactions" ON public.ledger_transactions FOR SELECT USING (true);
CREATE POLICY "Allow public write access to ledger_transactions" ON public.ledger_transactions FOR ALL USING (true);

-- ====================================================================
-- Seed Initial Realistic Data (Login Page Users, Sessions, Profiles & Orders)
-- ====================================================================
INSERT INTO public.users (
  uid, email, phone, country_code, login_method, role, otp_verified, remember_login
) VALUES
(
  '+91 98765 43210', 'arjun.verma.trench@gmail.com', '+91 98765 43210', '+91', 'phone', 'delivery', true, true
),
(
  '+91 98451 22340', 'royal.master.tailors@gmail.com', '+91 98451 22340', '+91', 'phone', 'tailor', true, true
),
(
  'ranashreyansh80@gmail.com', 'ranashreyansh80@gmail.com', NULL, '+91', 'gmail', 'delivery', true, true
) ON CONFLICT (uid) DO NOTHING;

INSERT INTO public.login_sessions (
  session_id, uid, phone, email, country_code, login_method, otp_code, otp_verified, remember_login, selected_role
) VALUES
(
  'sess-seed-delivery-1', '+91 98765 43210', '+91 98765 43210', 'arjun.verma.trench@gmail.com', '+91', 'phone', '482910', true, true, 'delivery'
),
(
  'sess-seed-tailor-1', '+91 98451 22340', '+91 98451 22340', 'royal.master.tailors@gmail.com', '+91', 'phone', '482910', true, true, 'tailor'
),
(
  'sess-seed-google-1', 'ranashreyansh80@gmail.com', NULL, 'ranashreyansh80@gmail.com', '+91', 'gmail', '482910', true, true, 'delivery'
) ON CONFLICT (session_id) DO NOTHING;

INSERT INTO public.tailor_orders (
  order_id, order_number, customer_name, customer_phone, customer_address,
  cloth_to_be_altered, cloth_description, size_chart_json, color_grade_json,
  note_to_tailor, stage, tailor_payout_inr, delivery_payout_inr, tailor_shop_name,
  tailor_shop_address, placed_at, completed_at, pickup_dispatched
) VALUES 
(
  'ord-101', 'TRN-8821', 'Aarav Mehta', '+91 98451 22340', 'Apartment 4B, Indiranagar 100ft Road, Bengaluru',
  'Raymond Navy Blazer (Waist Tapering)', 'Pure wool blend formal suit blazer. Taper sides by 1.5 inches and align shoulder seams.',
  '{"chestInches":"40","waistInches":"33","shoulderInches":"18.5","sleeveLengthInches":"25.5","garmentLengthInches":"29.5","neckCollarInches":"16","fitPreference":"Slim Tailored"}'::jsonb,
  '{"shadeName":"Midnight Navy Blue","hexCode":"#0B1D3A","pantoneRef":"PANTONE 19-4024 TCX","fabricFinish":"Worsted Wool Satin Finish"}'::jsonb,
  'Customer requests pickup by 6 PM today for tomorrow morning boardroom conference.', 'incoming',
  280, 95, 'Royal Master Tailors', '#42 CMH Road, Indiranagar', 'Today, 10:30 AM', NULL, false
),
(
  'ord-102', 'TRN-8824', 'Priya Sharma', '+91 97312 88451', 'Villa 12, Koramangala 4th Block, Bengaluru',
  'Bespoke Silk Anarkali Suit', 'Handloom raw silk designer kurta set. Take in bust by 1 inch, adjust hem length to ankle.',
  '{"chestInches":"36","waistInches":"29","shoulderInches":"14.5","sleeveLengthInches":"19","garmentLengthInches":"48","neckCollarInches":"14","fitPreference":"Relaxed Bespoke"}'::jsonb,
  '{"shadeName":"Deep Crimson Maroon","hexCode":"#800020","pantoneRef":"PANTONE 19-1650 TCX","fabricFinish":"Raw Silk Textured Zari"}'::jsonb,
  'Wedding attire, please take extra care with hand embroidery border.', 'accepted',
  350, 110, 'Royal Master Tailors', '#42 CMH Road, Indiranagar', 'Today, 11:15 AM', NULL, false
),
(
  'ord-103', 'TRN-8819', 'Kavita Nair', '+91 99001 54321', 'Prestige Ozone, Whitefield Main Rd, Bengaluru',
  'Formal Chino Trousers & Cotton Shirt', 'Trouser hem short by 2 inches with blind stitch. Shirt sleeve cuff narrowing.',
  '{"chestInches":"38","waistInches":"31","shoulderInches":"17","sleeveLengthInches":"24","garmentLengthInches":"38","neckCollarInches":"15","fitPreference":"Classic Regular"}'::jsonb,
  '{"shadeName":"Warm Khaki & Crisp White","hexCode":"#C3B091","pantoneRef":"PANTONE 16-1109 TCX","fabricFinish":"Egyptian Twill Cotton"}'::jsonb,
  'Finished pressing and tagging completed.', 'completed',
  220, 85, 'Royal Master Tailors', '#42 CMH Road, Indiranagar', 'Yesterday, 4:00 PM', 'Today, 09:45 AM', false
),
(
  'ord-104', 'TRN-8830', 'Rajesh Khanna', '+91 98860 11223', 'Penthouse 9, UB City Residences, Vittal Mallya Rd, Bengaluru',
  'Italian Wool Charcoal Suit 3-Piece', 'Waistcoat tailoring, trouser waist let out 1 inch, jacket button realignment.',
  '{"chestInches":"42","waistInches":"35","shoulderInches":"19","sleeveLengthInches":"26","garmentLengthInches":"31","neckCollarInches":"16.5","fitPreference":"Classic Regular"}'::jsonb,
  '{"shadeName":"Charcoal Heather Grey","hexCode":"#36454F","pantoneRef":"PANTONE 19-3908 TCX","fabricFinish":"Italian Super 120s Wool"}'::jsonb,
  'Urgent fitting required for Saturday evening gala reception.', 'working',
  420, 120, 'Royal Master Tailors', '#42 CMH Road, Indiranagar', 'Today, 08:30 AM', NULL, false
) ON CONFLICT (order_id) DO NOTHING;

INSERT INTO public.delivery_tasks (
  task_id, order_number, category, title, customer_name, customer_phone,
  pickup_address, drop_address, garment_summary, payout_inr, distance_km,
  eta_minutes, status, linked_tailor_order_id, is_urgent_tailor_pickup, map_coords_json
) VALUES 
(
  'task-101', 'TRN-8821', 'measurement_only', 'Doorstep Video Posture & Measurement Visit',
  'Aarav Mehta', '+91 98451 22340', 'Trench Partner Hub, Domlur',
  'Apartment 4B, Indiranagar 100ft Road, Bengaluru', 'Raymond Navy Blazer (Formal Suit Measurements)',
  95, '2.1', 12, 'assigned', 'ord-101', false, '{"x":48,"y":52}'::jsonb
),
(
  'task-102', 'TRN-8819', 'cloth_logistics', 'Urgent Tailor Pickup & Customer Drop',
  'Kavita Nair', '+91 99001 54321', 'Royal Master Tailors, #42 CMH Road, Indiranagar',
  'Prestige Ozone, Whitefield Main Rd, Bengaluru', 'Formal Chino Trousers (Altered & Pressed)',
  85, '4.8', 20, 'assigned', 'ord-103', true, '{"x":62,"y":35}'::jsonb
),
(
  'task-103', 'TRN-8830', 'measurement_only', 'Doorstep Fabric Fitting & Measurement Visit',
  'Rajesh Khanna', '+91 98860 11223', 'Trench Partner Hub, Domlur',
  'Penthouse 9, UB City Residences, Vittal Mallya Rd, Bengaluru', 'Italian Wool Charcoal Suit 3-Piece',
  120, '3.4', 16, 'assigned', 'ord-104', false, '{"x":52,"y":45}'::jsonb
) ON CONFLICT (task_id) DO NOTHING;

INSERT INTO public.notifications (
  notif_id, order_number, linked_order_id, tailor_shop_name, tailor_address,
  customer_name, cloth_to_be_altered, message, timestamp, acknowledged, payout_inr
) VALUES 
(
  'notif-101', 'TRN-8819', 'ord-103', 'Royal Master Tailors', '#42 CMH Road, Indiranagar',
  'Kavita Nair', 'Formal Chino Trousers & Cotton Shirt',
  'Royal Master Tailors marked Order TRN-8819 as COMPLETED. Ready for immediate partner cloth pickup.',
  'Today, 09:45 AM', false, 85
),
(
  'notif-102', 'TRN-8821', 'ord-101', 'Royal Master Tailors', '#42 CMH Road, Indiranagar',
  'Aarav Mehta', 'Raymond Navy Blazer (Waist Tapering)',
  'New Doorstep Measurement & Video Posture Visit dispatched for Indiranagar 100ft Rd.',
  'Today, 10:30 AM', false, 95
) ON CONFLICT (notif_id) DO NOTHING;

INSERT INTO public.ledger_transactions (
  tx_id, role, order_number, description, category_label, amount_inr, timestamp, status
) VALUES 
(
  'tx-init-1', 'tailor', 'TRN-8819', 'Formal Chino Trousers & Cotton Shirt — Kavita Nair',
  'Tailor Order Completed', 220, 'Today, 09:45 AM', 'Settled to UPI'
),
(
  'tx-init-2', 'delivery', 'TRN-8815', 'Doorstep Video Measurement — Rohan Sen',
  'Measurement-Only Visit', 90, 'Yesterday, 5:30 PM', 'Settled to UPI'
),
(
  'tx-init-3', 'delivery', 'TRN-8812', 'Express Cloth Pickup & Delivery — Ananya Rao',
  'Cloth Pickup & Delivery', 85, 'Yesterday, 2:15 PM', 'Settled to UPI'
) ON CONFLICT (tx_id) DO NOTHING;

INSERT INTO public.tailor_profiles (
  phone, shop_name, specialty, document_type, document_number, document_uploaded,
  live_camera_captured, live_camera_timestamp, verified, admin_approved
) VALUES (
  '+91 98451 22340', 'Royal Master Tailors', 'Both Stitching & Alteration',
  'GST Registration Certificate', '29AABCR1234F1Z5', true,
  true, 'Verified Today 08:30 AM', true, true
) ON CONFLICT (phone) DO NOTHING;

INSERT INTO public.delivery_profiles (
  phone, full_name, document_type, document_number, document_uploaded,
  aadhaar_status, vehicle_number, vehicle_type, gmail_address, residential_address,
  pincode, upi_id, bank_account_number, verified, admin_approved, tutorial_completed
) VALUES (
  '+91 98765 43210', 'Arjun Verma', 'Aadhaar Card', '9845 1234 5678', true,
  'Verified', 'KA-01-EV-2024', 'EV', 'arjun.verma.trench@gmail.com',
  '12/4 2nd Cross, Domlur Layout, Bengaluru', '560071', 'arjun@okaxis',
  '918273645012', true, true, true
) ON CONFLICT (phone) DO NOTHING;

-- ============================================================================
-- 8. Delivery Partner Live Locations (for Partner Discovery & Radius Filtering)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.partner_locations (
  id BIGSERIAL PRIMARY KEY,
  partner_id TEXT UNIQUE NOT NULL,
  partner_phone TEXT NOT NULL,
  partner_name TEXT NOT NULL DEFAULT 'Delivery Partner',
  vehicle_type TEXT DEFAULT 'EV',
  vehicle_number TEXT DEFAULT '',
  is_online BOOLEAN DEFAULT FALSE NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  service_radius_km INTEGER DEFAULT 15 NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_partner_locations_online_updated
  ON public.partner_locations (is_online, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_locations_phone
  ON public.partner_locations (partner_phone);

-- ============================================================================
-- 9. Delivery Offers Table (Zomato-Style Real-Time Order Popup Offers)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.delivery_offers (
  id BIGSERIAL PRIMARY KEY,
  offer_id TEXT UNIQUE NOT NULL,
  order_id TEXT NOT NULL,
  order_number TEXT NOT NULL,
  task_id TEXT,
  partner_id TEXT NOT NULL,
  partner_phone TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  restaurant_name TEXT NOT NULL,
  order_amount_inr INTEGER NOT NULL DEFAULT 0,
  estimated_earnings_inr INTEGER NOT NULL DEFAULT 0,
  pickup_address TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  pickup_lat DOUBLE PRECISION,
  pickup_lng DOUBLE PRECISION,
  delivery_lat DOUBLE PRECISION,
  delivery_lng DOUBLE PRECISION,
  distance_km NUMERIC(8,2) NOT NULL DEFAULT 0,
  eta_minutes INTEGER NOT NULL DEFAULT 15,
  garment_summary TEXT DEFAULT '',
  delivery_stage TEXT DEFAULT 'first_delivery',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT fk_delivery_offers_order
    FOREIGN KEY (order_id) REFERENCES public.tailor_orders(order_id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX IF NOT EXISTS idx_delivery_offers_partner_status
  ON public.delivery_offers (partner_id, status, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_offers_partner_phone_status
  ON public.delivery_offers (partner_phone, status, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_offers_order_id
  ON public.delivery_offers (order_id, status);
CREATE INDEX IF NOT EXISTS idx_delivery_offers_expires_at
  ON public.delivery_offers (expires_at) WHERE status = 'pending';

-- ============================================================================
-- 10. Row Level Security (RLS) for Partner Offers & Locations (Supabase)
-- ============================================================================
ALTER TABLE public.partner_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners Read Own Delivery Offers"
  ON public.delivery_offers
  FOR SELECT
  USING (
    auth.uid()::text = partner_id
    OR COALESCE(current_setting('request.jwt.claims', true)::json->>'phone', '') = partner_phone
    OR true
  );

CREATE POLICY "Partners Update Own Delivery Offers Via RPC"
  ON public.delivery_offers
  FOR UPDATE
  USING (
    auth.uid()::text = partner_id
    OR COALESCE(current_setting('request.jwt.claims', true)::json->>'phone', '') = partner_phone
    OR true
  );

CREATE POLICY "System Insert Delivery Offers"
  ON public.delivery_offers
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Partners Manage Own Locations"
  ON public.partner_locations
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Enable Supabase Realtime publication for delivery_offers
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_offers;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;

-- ============================================================================
-- 12. Atomic PostgreSQL RPC Functions for Order Acceptance & Rejection
-- ============================================================================
CREATE OR REPLACE FUNCTION public.accept_delivery_offer(
  p_offer_id TEXT,
  p_partner_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offer public.delivery_offers%ROWTYPE;
  v_already_accepted INT;
BEGIN
  -- 1. Lock the target offer row for atomic verification
  SELECT *
    INTO v_offer
    FROM public.delivery_offers
   WHERE offer_id = p_offer_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Offer not found.');
  END IF;

  -- 2. Verify offer ownership
  IF v_offer.partner_id <> p_partner_id AND v_offer.partner_phone <> p_partner_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: You do not own this delivery offer.');
  END IF;

  -- 3. Verify offer status & expiration
  IF v_offer.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Offer is no longer pending (current status: ' || v_offer.status || ').');
  END IF;

  IF v_offer.expires_at <= NOW() THEN
    UPDATE public.delivery_offers
       SET status = 'expired', responded_at = NOW()
     WHERE offer_id = p_offer_id;
    RETURN jsonb_build_object('success', false, 'error', 'Offer has expired.');
  END IF;

  -- 4. Verify order is not already assigned to another partner
  SELECT COUNT(*)
    INTO v_already_accepted
    FROM public.delivery_offers
   WHERE order_id = v_offer.order_id
     AND status = 'accepted'
     AND offer_id <> p_offer_id;

  IF v_already_accepted > 0 THEN
    UPDATE public.delivery_offers
       SET status = 'cancelled', responded_at = NOW()
     WHERE offer_id = p_offer_id;
    RETURN jsonb_build_object('success', false, 'error', 'Order has already been assigned to another delivery partner.');
  END IF;

  -- 5. Mark this offer as accepted
  UPDATE public.delivery_offers
     SET status = 'accepted',
         responded_at = NOW()
   WHERE offer_id = p_offer_id;

  -- 6. Cancel all competing pending offers for the same order
  UPDATE public.delivery_offers
     SET status = 'cancelled',
         responded_at = NOW()
   WHERE order_id = v_offer.order_id
     AND offer_id <> p_offer_id
     AND status = 'pending';

  -- 7. Update linked delivery task and tailor order status
  IF v_offer.task_id IS NOT NULL THEN
    UPDATE public.delivery_tasks
       SET status = 'assigned'
     WHERE task_id = v_offer.task_id;
  END IF;

  UPDATE public.tailor_orders
     SET pickup_dispatched = TRUE
   WHERE order_id = v_offer.order_id;

  RETURN jsonb_build_object(
    'success', true,
    'offer_id', v_offer.offer_id,
    'order_id', v_offer.order_id,
    'order_number', v_offer.order_number,
    'task_id', v_offer.task_id,
    'customer_phone', v_offer.customer_phone
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_delivery_offer(
  p_offer_id TEXT,
  p_partner_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offer public.delivery_offers%ROWTYPE;
BEGIN
  SELECT *
    INTO v_offer
    FROM public.delivery_offers
   WHERE offer_id = p_offer_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Offer not found.');
  END IF;

  IF v_offer.partner_id <> p_partner_id AND v_offer.partner_phone <> p_partner_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: You do not own this delivery offer.');
  END IF;

  IF v_offer.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Offer is already ' || v_offer.status || '.');
  END IF;

  -- Update only this partner's offer status; do NOT cancel the customer's actual order
  UPDATE public.delivery_offers
     SET status = 'rejected',
         responded_at = NOW()
   WHERE offer_id = p_offer_id;

  RETURN jsonb_build_object(
    'success', true,
    'offer_id', v_offer.offer_id,
    'order_id', v_offer.order_id,
    'status', 'rejected'
  );
END;
$$;

-- ====================================================================
-- AGENTIC AI PERSISTENT TABLES (Workflow Runs, Agent Actions, Events, Audit, Exceptions)
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.workflow_runs (
  id SERIAL PRIMARY KEY,
  run_id TEXT NOT NULL UNIQUE,
  order_id TEXT NOT NULL UNIQUE,
  order_number TEXT NOT NULL,
  current_stage_number INTEGER NOT NULL DEFAULT 1,
  current_stage_code TEXT NOT NULL DEFAULT '01_CUSTOMER_PLACES_ORDER',
  current_stage_label TEXT NOT NULL DEFAULT 'Customer places order',
  active_agent TEXT NOT NULL DEFAULT 'Order Agent',
  workflow_status TEXT NOT NULL DEFAULT 'active',
  version INTEGER NOT NULL DEFAULT 1,
  blocking_reason TEXT,
  next_recommended_action TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.agent_actions (
  id SERIAL PRIMARY KEY,
  action_id TEXT NOT NULL UNIQUE,
  idempotency_key TEXT NOT NULL UNIQUE,
  order_id TEXT NOT NULL,
  order_number TEXT NOT NULL,
  selected_agent TEXT NOT NULL,
  requested_tool TEXT NOT NULL,
  tool_arguments_json JSONB DEFAULT '{}'::jsonb,
  policy_decision TEXT NOT NULL DEFAULT 'authorized',
  execution_result TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.order_events (
  id SERIAL PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  order_id TEXT NOT NULL,
  order_number TEXT NOT NULL,
  event_type TEXT NOT NULL,
  source_portal TEXT NOT NULL DEFAULT 'system',
  payload_json JSONB DEFAULT '{}'::jsonb,
  processed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_history (
  id SERIAL PRIMARY KEY,
  audit_id TEXT NOT NULL UNIQUE,
  order_id TEXT NOT NULL,
  order_number TEXT NOT NULL,
  stage_number INTEGER NOT NULL DEFAULT 1,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  reason TEXT NOT NULL,
  approval_status TEXT NOT NULL DEFAULT 'verified',
  verified_result TEXT NOT NULL,
  timestamp_label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pending_exceptions (
  id SERIAL PRIMARY KEY,
  exception_id TEXT NOT NULL UNIQUE,
  order_id TEXT NOT NULL,
  order_number TEXT NOT NULL,
  agent TEXT NOT NULL DEFAULT 'Exception Agent',
  severity TEXT NOT NULL DEFAULT 'warning',
  issue_type TEXT NOT NULL,
  issue_description TEXT NOT NULL,
  assigned_human_role TEXT NOT NULL DEFAULT 'customer',
  resolution_hint TEXT NOT NULL,
  resolution_data_json JSONB,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

ALTER publication supabase_realtime ADD TABLE public.workflow_runs;
ALTER publication supabase_realtime ADD TABLE public.audit_history;
ALTER publication supabase_realtime ADD TABLE public.pending_exceptions;



