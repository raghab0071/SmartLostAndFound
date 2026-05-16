-- Supabase schema for Smart Lost & Found

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  user_id text PRIMARY KEY,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  picture text,
  role text NOT NULL,
  password_hash text,
  points int DEFAULT 0,
  badges jsonb DEFAULT '[]'::jsonb,
  institute text,
  roll_no text,
  phone text,
  profile_complete boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Student sessions table
CREATE TABLE IF NOT EXISTS public.user_sessions (
  session_token text PRIMARY KEY,
  user_id text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Centres table
CREATE TABLE IF NOT EXISTS public.centres (
  centre_id text PRIMARY KEY,
  name text NOT NULL,
  institute text,
  address text,
  phone text,
  open_hours text,
  managed_by_admin_id text,
  managed_by_admin_name text,
  created_at timestamptz DEFAULT now()
);

-- Found items table
CREATE TABLE IF NOT EXISTS public.found_items (
  item_id text PRIMARY KEY,
  title text NOT NULL,
  description text,
  category text,
  color text,
  brand text,
  location_found text,
  building text,
  date_found text,
  images jsonb DEFAULT '[]'::jsonb,
  centre_id text,
  qr_payload text,
  status text DEFAULT 'open',
  posted_by_admin_id text,
  posted_by_admin_name text,
  submitted_by_roll_no text,
  submitted_by_institute text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Lost items table
CREATE TABLE IF NOT EXISTS public.lost_items (
  item_id text PRIMARY KEY,
  title text NOT NULL,
  description text,
  category text,
  color text,
  brand text,
  location_lost text,
  building text,
  date_lost text,
  images jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'open',
  reported_by_user_id text,
  reported_by_name text,
  reported_by_email text,
  reported_by_institute text,
  created_at timestamptz DEFAULT now()
);

-- Claims flow table
CREATE TABLE IF NOT EXISTS public.claims (
  claim_id text PRIMARY KEY,
  found_item_id text,
  found_item_title text,
  claimant_user_id text,
  claimant_name text,
  claimant_email text,
  claimant_roll_no text,
  claimant_institute text,
  ownership_proof text,
  proof_images jsonb DEFAULT '[]'::jsonb,
  contact text,
  status text DEFAULT 'submitted',
  timeline jsonb DEFAULT '[]'::jsonb,
  admin_notes text,
  decided_by_admin_id text,
  decided_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  notification_id text PRIMARY KEY,
  user_id text,
  type text,
  title text,
  body text,
  link text,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Matches table
CREATE TABLE IF NOT EXISTS public.matches (
  match_id text PRIMARY KEY,
  lost_item_id text,
  found_item_id text,
  similarity int,
  title text,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Add foreign key constraints
ALTER TABLE public.user_sessions ADD CONSTRAINT fk_user_sessions_user_id FOREIGN KEY (user_id) REFERENCES public.users(user_id);
ALTER TABLE public.centres ADD CONSTRAINT fk_centres_admin_id FOREIGN KEY (managed_by_admin_id) REFERENCES public.users(user_id);
ALTER TABLE public.found_items ADD CONSTRAINT fk_found_items_admin_id FOREIGN KEY (posted_by_admin_id) REFERENCES public.users(user_id);
ALTER TABLE public.lost_items ADD CONSTRAINT fk_lost_items_user_id FOREIGN KEY (reported_by_user_id) REFERENCES public.users(user_id);
ALTER TABLE public.claims ADD CONSTRAINT fk_claims_found_item_id FOREIGN KEY (found_item_id) REFERENCES public.found_items(item_id);
ALTER TABLE public.claims ADD CONSTRAINT fk_claims_claimant_user_id FOREIGN KEY (claimant_user_id) REFERENCES public.users(user_id);
ALTER TABLE public.claims ADD CONSTRAINT fk_claims_decided_by_admin_id FOREIGN KEY (decided_by_admin_id) REFERENCES public.users(user_id);
ALTER TABLE public.notifications ADD CONSTRAINT fk_notifications_user_id FOREIGN KEY (user_id) REFERENCES public.users(user_id);
ALTER TABLE public.matches ADD CONSTRAINT fk_matches_lost_item_id FOREIGN KEY (lost_item_id) REFERENCES public.lost_items(item_id);
ALTER TABLE public.matches ADD CONSTRAINT fk_matches_found_item_id FOREIGN KEY (found_item_id) REFERENCES public.found_items(item_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_found_items_status ON public.found_items(status);
CREATE INDEX IF NOT EXISTS idx_found_items_posted_by_admin ON public.found_items(posted_by_admin_id);
CREATE INDEX IF NOT EXISTS idx_lost_items_reported_by_user ON public.lost_items(reported_by_user_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON public.claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_found_item_id ON public.claims(found_item_id);
CREATE INDEX IF NOT EXISTS idx_centres_admin ON public.centres(managed_by_admin_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
