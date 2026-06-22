-- ========================================================
-- HAPPY PAWS RESCUE HAVEN DATABASE SCHEMA
-- ========================================================

-- Custom Enums
CREATE TYPE pet_status AS ENUM ('AVAILABLE', 'PENDING', 'ADOPTED');
CREATE TYPE application_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE transport_status AS ENUM ('PENDING', 'EN_ROUTE', 'DELIVERED', 'CANCELLED');

-- 1. Pets Table (Case File / Intake Database)
CREATE TABLE public.pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  species TEXT NOT NULL, -- 'Dog' | 'Cat' | etc.
  breed TEXT,
  age TEXT,              -- e.g. "2 years", "3 months"
  gender TEXT,           -- 'Male' | 'Female'
  description TEXT,
  status pet_status NOT NULL DEFAULT 'AVAILABLE',
  case_number TEXT UNIQUE NOT NULL, -- e.g. "HPRH-2026-0042"
  intake_date DATE NOT NULL DEFAULT CURRENT_DATE,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Adopters Table (Public profile for adopters)
CREATE TABLE public.adopters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Adoption Applications Table
CREATE TABLE public.adoption_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  adopter_id UUID REFERENCES public.adopters(id) ON DELETE CASCADE NOT NULL,
  status application_status NOT NULL DEFAULT 'PENDING',
  housing_type TEXT NOT NULL,              -- e.g. 'House', 'Apartment', etc.
  has_other_pets BOOLEAN NOT NULL DEFAULT false,
  experience_details TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Adoptions Table (Finalized Adoptions)
CREATE TABLE public.adoptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.adoption_applications(id) ON DELETE CASCADE NOT NULL,
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  adopter_id UUID REFERENCES public.adopters(id) ON DELETE CASCADE NOT NULL,
  adoption_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  fee_paid NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  contract_signed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Transport Requests Table
CREATE TABLE public.transport_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adoption_id UUID REFERENCES public.adoptions(id) ON DELETE CASCADE NOT NULL UNIQUE,
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  adopter_id UUID REFERENCES public.adopters(id) ON DELETE CASCADE NOT NULL,
  status transport_status NOT NULL DEFAULT 'PENDING',
  pickup_address TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  tracking_id TEXT UNIQUE NOT NULL, -- e.g. "TR-2026-9938"
  scheduled_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Volunteers Table (Foster/Volunteer Applications)
-- Dropped volunteer_status enum and status column as per user feedback.
CREATE TABLE public.volunteers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  interests TEXT[] DEFAULT '{}', -- e.g. ['Fostering', 'Transport', 'Events']
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Staff Table (Rescue staff/admin credentials)
CREATE TABLE public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'staff',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS (Row Level Security) Configuration
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adopters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adoption_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adoptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- Policies: Pets are readable by everyone
CREATE POLICY "Allow public read access to pets" ON public.pets
  FOR SELECT USING (true);

-- Policies: Staff has full read/write access to all tables
CREATE POLICY "Staff full access to pets" ON public.pets
  FOR ALL TO public USING (EXISTS (SELECT 1 FROM public.staff s WHERE s.user_id = auth.uid()));

CREATE POLICY "Staff full access to adopters" ON public.adopters
  FOR ALL TO public USING (EXISTS (SELECT 1 FROM public.staff s WHERE s.user_id = auth.uid()));

CREATE POLICY "Staff full access to adoption_applications" ON public.adoption_applications
  FOR ALL TO public USING (EXISTS (SELECT 1 FROM public.staff s WHERE s.user_id = auth.uid()));

CREATE POLICY "Staff full access to adoptions" ON public.adoptions
  FOR ALL TO public USING (EXISTS (SELECT 1 FROM public.staff s WHERE s.user_id = auth.uid()));

CREATE POLICY "Staff full access to transport_requests" ON public.transport_requests
  FOR ALL TO public USING (EXISTS (SELECT 1 FROM public.staff s WHERE s.user_id = auth.uid()));

CREATE POLICY "Staff full access to volunteers" ON public.volunteers
  FOR ALL TO public USING (EXISTS (SELECT 1 FROM public.staff s WHERE s.user_id = auth.uid()));

CREATE POLICY "Staff full access to staff table" ON public.staff
  FOR ALL TO public USING (EXISTS (SELECT 1 FROM public.staff s WHERE s.user_id = auth.uid()));

-- Policies: Users can interact with their own adopter profile
CREATE POLICY "Adopters can view their own profile" ON public.adopters
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Adopters can update their own profile" ON public.adopters
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Adopters can insert their own profile" ON public.adopters
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies: Users can interact with their own adoption applications
CREATE POLICY "Adopters can view their own applications" ON public.adoption_applications
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.adopters a WHERE a.id = adopter_id AND a.user_id = auth.uid()
  ));

CREATE POLICY "Adopters can insert their own applications" ON public.adoption_applications
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.adopters a WHERE a.id = adopter_id AND a.user_id = auth.uid()
  ));

-- Policies: Users can view their own transport requests
CREATE POLICY "Adopters can view their own transport requests" ON public.transport_requests
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.adopters a WHERE a.id = adopter_id AND a.user_id = auth.uid()
  ));

-- Policies: Volunteers can view/create their own records
CREATE POLICY "Volunteers can view their own profile" ON public.volunteers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Volunteers can insert their own profile" ON public.volunteers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Volunteers can update their own profile" ON public.volunteers
  FOR UPDATE USING (auth.uid() = user_id);
