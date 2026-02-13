-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.amenities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  icon text,
  category text DEFAULT 'basic'::text CHECK (category = ANY (ARRAY['basic'::text, 'comfort'::text, 'safety'::text, 'outdoor'::text, 'services'::text])),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT amenities_pkey PRIMARY KEY (id)
);
CREATE TABLE public.complaint_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT complaint_messages_pkey PRIMARY KEY (id),
  CONSTRAINT complaint_messages_complaint_id_fkey FOREIGN KEY (complaint_id) REFERENCES public.tenant_complaints(id),
  CONSTRAINT complaint_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id)
);
CREATE TABLE public.conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  listing_id uuid,
  participant1_id uuid NOT NULL,
  participant2_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT conversations_pkey PRIMARY KEY (id),
  CONSTRAINT conversations_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.property_listings(id),
  CONSTRAINT conversations_landlord_id_fkey FOREIGN KEY (participant1_id) REFERENCES auth.users(id),
  CONSTRAINT conversations_tenant_id_fkey FOREIGN KEY (participant2_id) REFERENCES auth.users(id)
);
CREATE TABLE public.inquiries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  property_id uuid,
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'new'::text CHECK (status = ANY (ARRAY['new'::text, 'read'::text, 'archived'::text])),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT inquiries_pkey PRIMARY KEY (id),
  CONSTRAINT inquiries_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id)
);
CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  landlord_id uuid NOT NULL,
  unit_id uuid,
  tenant_name text NOT NULL,
  tenant_email text,
  description text,
  amount numeric NOT NULL,
  due_date date NOT NULL,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['paid'::text, 'pending'::text, 'overdue'::text])),
  paid_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT invoices_pkey PRIMARY KEY (id),
  CONSTRAINT invoices_landlord_id_fkey FOREIGN KEY (landlord_id) REFERENCES public.profiles(id),
  CONSTRAINT invoices_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id)
);
CREATE TABLE public.landlord_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  business_name text,
  business_address text NOT NULL,
  phone text NOT NULL,
  government_id_url text NOT NULL,
  property_document_url text,
  business_permit_url text,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'under_review'::text])),
  rejection_reason text,
  admin_notes text,
  submitted_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  reviewed_at timestamp with time zone,
  reviewed_by uuid,
  CONSTRAINT landlord_applications_pkey PRIMARY KEY (id),
  CONSTRAINT landlord_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT landlord_applications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id)
);
CREATE TABLE public.leases (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL,
  tenant_id uuid,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['active'::text, 'terminated'::text, 'pending'::text, 'pending_landlord'::text])),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  signature_url text,
  signed_at timestamp with time zone,
  landlord_signature_url text,
  landlord_signed_at timestamp with time zone,
  rent_amount numeric DEFAULT 0.00,
  CONSTRAINT leases_pkey PRIMARY KEY (id),
  CONSTRAINT leases_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id),
  CONSTRAINT leases_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.listing_amenities (
  listing_id uuid NOT NULL,
  amenity_id uuid NOT NULL,
  is_highlighted boolean DEFAULT false,
  additional_info text,
  CONSTRAINT listing_amenities_pkey PRIMARY KEY (listing_id, amenity_id),
  CONSTRAINT listing_amenities_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.property_listings(id),
  CONSTRAINT listing_amenities_amenity_id_fkey FOREIGN KEY (amenity_id) REFERENCES public.amenities(id)
);
CREATE TABLE public.listing_inquiries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  message text NOT NULL,
  preferred_move_in date,
  status text DEFAULT 'new'::text CHECK (status = ANY (ARRAY['new'::text, 'read'::text, 'replied'::text, 'archived'::text])),
  user_id uuid,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  replied_at timestamp with time zone,
  CONSTRAINT listing_inquiries_pkey PRIMARY KEY (id),
  CONSTRAINT listing_inquiries_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.property_listings(id),
  CONSTRAINT listing_inquiries_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.listing_photos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL,
  url text NOT NULL,
  storage_path text,
  alt_text text,
  caption text,
  photo_type text DEFAULT 'interior'::text CHECK (photo_type = ANY (ARRAY['cover'::text, 'exterior'::text, 'interior'::text, 'amenity'::text, 'unit'::text, 'floor_plan'::text, 'document'::text])),
  display_order integer DEFAULT 0,
  is_primary boolean DEFAULT false,
  width integer,
  height integer,
  file_size integer,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT listing_photos_pkey PRIMARY KEY (id),
  CONSTRAINT listing_photos_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.property_listings(id)
);
CREATE TABLE public.listing_views (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL,
  viewer_ip text,
  user_agent text,
  referrer text,
  viewed_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT listing_views_pkey PRIMARY KEY (id),
  CONSTRAINT listing_views_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.property_listings(id)
);
CREATE TABLE public.maintenance_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  unit_id uuid,
  tenant_id uuid,
  title text NOT NULL,
  description text,
  priority text DEFAULT 'info'::text CHECK (priority = ANY (ARRAY['critical'::text, 'warning'::text, 'info'::text])),
  status text DEFAULT 'open'::text CHECK (status = ANY (ARRAY['open'::text, 'in_progress'::text, 'resolved'::text])),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  ai_category text,
  ai_severity text,
  ai_summary text,
  ai_suggested_action text,
  ai_estimated_cost text,
  ai_confidence double precision,
  CONSTRAINT maintenance_requests_pkey PRIMARY KEY (id),
  CONSTRAINT maintenance_requests_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT maintenance_requests_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id),
  CONSTRAINT maintenance_requests_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  delivered_at timestamp with time zone,
  seen_at timestamp with time zone,
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id)
);
CREATE TABLE public.payment_methods (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  landlord_id uuid NOT NULL,
  property_id uuid,
  label text NOT NULL,
  account_name text,
  account_number text,
  qr_url text NOT NULL,
  instructions text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT payment_methods_pkey PRIMARY KEY (id),
  CONSTRAINT payment_methods_landlord_id_fkey FOREIGN KEY (landlord_id) REFERENCES public.profiles(id),
  CONSTRAINT payment_methods_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id)
);
CREATE TABLE public.payment_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL,
  landlord_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  tenant_email text,
  payment_method_id uuid,
  amount numeric NOT NULL,
  reference_number text,
  receipt_url text NOT NULL,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT payment_submissions_pkey PRIMARY KEY (id),
  CONSTRAINT payment_submissions_payment_method_id_fkey FOREIGN KEY (payment_method_id) REFERENCES public.payment_methods(id),
  CONSTRAINT payment_submissions_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id),
  CONSTRAINT payment_submissions_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id),
  CONSTRAINT payment_submissions_landlord_id_fkey FOREIGN KEY (landlord_id) REFERENCES public.profiles(id),
  CONSTRAINT payment_submissions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  full_name text,
  avatar_url text,
  role text NOT NULL CHECK (role = ANY (ARRAY['landlord'::text, 'tenant'::text, 'admin'::text])),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  phone text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  is_name_private boolean DEFAULT false,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.properties (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  landlord_id uuid NOT NULL,
  name text NOT NULL,
  address text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  lat double precision,
  lng double precision,
  CONSTRAINT properties_pkey PRIMARY KEY (id),
  CONSTRAINT properties_landlord_id_fkey FOREIGN KEY (landlord_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.property_knowledge_base (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  category text NOT NULL,
  topic text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  embedding USER-DEFINED,
  CONSTRAINT property_knowledge_base_pkey PRIMARY KEY (id),
  CONSTRAINT property_knowledge_base_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id)
);
CREATE TABLE public.property_listings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL UNIQUE,
  landlord_id uuid NOT NULL,
  title text NOT NULL,
  headline text,
  description text,
  status text DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'published'::text, 'paused'::text, 'archived'::text])),
  is_featured boolean DEFAULT false,
  published_at timestamp with time zone,
  display_address text,
  city text NOT NULL,
  barangay text,
  landmark text,
  lat numeric,
  lng numeric,
  price_range_min numeric,
  price_range_max numeric,
  price_display text,
  property_type text NOT NULL CHECK (property_type = ANY (ARRAY['apartment'::text, 'dormitory'::text, 'boarding_house'::text, 'condo'::text, 'townhouse'::text, 'house'::text])),
  total_units integer DEFAULT 1,
  available_units integer DEFAULT 0,
  show_phone boolean DEFAULT true,
  contact_phone text,
  show_email boolean DEFAULT true,
  contact_email text,
  whatsapp_number text,
  facebook_page text,
  pets_allowed boolean DEFAULT false,
  smoking_allowed boolean DEFAULT false,
  visitors_allowed boolean DEFAULT true,
  curfew_time time without time zone,
  gender_restriction text DEFAULT 'none'::text CHECK (gender_restriction = ANY (ARRAY['male_only'::text, 'female_only'::text, 'couples_only'::text, 'family_only'::text, 'none'::text])),
  min_lease_months integer DEFAULT 1,
  max_lease_months integer,
  deposit_months numeric DEFAULT 1.0,
  advance_months numeric DEFAULT 1.0,
  slug text UNIQUE,
  meta_description text,
  keywords ARRAY,
  view_count integer DEFAULT 0,
  inquiry_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT property_listings_pkey PRIMARY KEY (id),
  CONSTRAINT property_listings_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT property_listings_landlord_id_fkey FOREIGN KEY (landlord_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  landlord_id uuid NOT NULL,
  property_id uuid,
  title text NOT NULL,
  description text,
  priority text DEFAULT 'medium'::text CHECK (priority = ANY (ARRAY['high'::text, 'medium'::text, 'low'::text])),
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text])),
  due_date date,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  completed_at timestamp with time zone,
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_landlord_id_fkey FOREIGN KEY (landlord_id) REFERENCES public.profiles(id),
  CONSTRAINT tasks_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id)
);
CREATE TABLE public.tenant_complaints (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  complainant_id uuid NOT NULL,
  respondent_unit_id uuid NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  priority text DEFAULT 'low'::text,
  status text DEFAULT 'open'::text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  escalated_at timestamp with time zone,
  CONSTRAINT tenant_complaints_pkey PRIMARY KEY (id),
  CONSTRAINT tenant_complaints_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT tenant_complaints_complainant_id_fkey FOREIGN KEY (complainant_id) REFERENCES auth.users(id),
  CONSTRAINT tenant_complaints_respondent_unit_id_fkey FOREIGN KEY (respondent_unit_id) REFERENCES public.units(id)
);
CREATE TABLE public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  landlord_id uuid NOT NULL,
  property_id uuid,
  type text NOT NULL CHECK (type = ANY (ARRAY['income'::text, 'expense'::text])),
  category text NOT NULL,
  description text,
  amount numeric NOT NULL,
  date date NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT transactions_pkey PRIMARY KEY (id),
  CONSTRAINT transactions_landlord_id_fkey FOREIGN KEY (landlord_id) REFERENCES public.profiles(id),
  CONSTRAINT transactions_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id)
);
CREATE TABLE public.unit_amenities (
  unit_id uuid NOT NULL,
  amenity_id uuid NOT NULL,
  CONSTRAINT unit_amenities_pkey PRIMARY KEY (unit_id, amenity_id),
  CONSTRAINT unit_amenities_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id),
  CONSTRAINT unit_amenities_amenity_id_fkey FOREIGN KEY (amenity_id) REFERENCES public.amenities(id)
);
CREATE TABLE public.unit_photos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL,
  url text NOT NULL,
  storage_path text,
  alt_text text,
  caption text,
  photo_type text DEFAULT 'other'::text CHECK (photo_type = ANY (ARRAY['bedroom'::text, 'bathroom'::text, 'kitchen'::text, 'living'::text, 'balcony'::text, 'other'::text])),
  display_order integer DEFAULT 0,
  is_primary boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unit_photos_pkey PRIMARY KEY (id),
  CONSTRAINT unit_photos_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id)
);
CREATE TABLE public.units (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  unit_number text NOT NULL,
  rent_amount numeric NOT NULL,
  status text DEFAULT 'available'::text CHECK (status = ANY (ARRAY['available'::text, 'occupied'::text, 'maintenance'::text, 'neardue'::text])),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  unit_type text DEFAULT 'studio'::text,
  grid_x integer DEFAULT 0,
  grid_y integer DEFAULT 0,
  map_x integer DEFAULT 0,
  map_y integer DEFAULT 0,
  map_floor integer DEFAULT 1,
  CONSTRAINT units_pkey PRIMARY KEY (id),
  CONSTRAINT units_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id)
);

CREATE TABLE public.unit_map_tiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  floor integer NOT NULL DEFAULT 1,
  grid_x integer NOT NULL,
  grid_y integer NOT NULL,
  tile_type text NOT NULL DEFAULT 'corridor'::text CHECK (tile_type = ANY (ARRAY['corridor'::text])),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unit_map_tiles_pkey PRIMARY KEY (id),
  CONSTRAINT unit_map_tiles_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT unit_map_tiles_unique UNIQUE (property_id, floor, grid_x, grid_y, tile_type)
);