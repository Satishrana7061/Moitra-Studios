-- ==============================================================================
-- PRIME MINISTER MANIFESTO TRACKER - SUPABASE SETUP INSTRUCTIONS
-- ==============================================================================
-- Instructions: 
-- 1. Go to your Supabase Dashboard (https://supabase.com/dashboard)
-- 2. Select your "Moitra Studios" project.
-- 3. Go to the "SQL Editor" on the left sidebar.
-- 4. Create a new query, paste all the code below, and click "Run".
-- ==============================================================================

-- 1. Create the `manifesto_promises` table
CREATE TABLE public.manifesto_promises (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    source_manifesto_year INTEGER NOT NULL,
    category TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Fulfilled', 'Partially Fulfilled', 'Not Fulfilled', 'In Progress', 'Unclear')),
    verdict_summary TEXT NOT NULL,
    reel_link TEXT,
    announced_date DATE,
    announced_situation TEXT,
    fulfilled_details TEXT,
    unfulfilled_details TEXT,
    published BOOLEAN DEFAULT false NOT NULL,
    slug TEXT UNIQUE NOT NULL
);

-- 2. Create the `promise_evidence` table
CREATE TABLE public.promise_evidence (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    promise_id UUID REFERENCES public.manifesto_promises(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('Official', 'Independent Tracker', 'News Media', 'Fact Check')),
    date_published DATE
);

-- 3. Set up Row Level Security (RLS)
-- Enable RLS on both tables
ALTER TABLE public.manifesto_promises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promise_evidence ENABLE ROW LEVEL SECURITY;

-- Allow public read access to published promises
CREATE POLICY "Allow public read access for published promises" 
ON public.manifesto_promises 
FOR SELECT 
USING (published = true);

-- Allow public read access to evidence for published promises
CREATE POLICY "Allow public read access for evidence of published promises" 
ON public.promise_evidence 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.manifesto_promises 
        WHERE manifesto_promises.id = promise_evidence.promise_id 
        AND manifesto_promises.published = true
    )
);

-- Note: To insert/update/delete data, you will either need to:
-- a) Use the Supabase Dashboard UI (Table Editor).
-- b) Create a secure admin dashboard in your app.
-- c) Add policies allowing authenticated users with a specific role to edit.
-- For now, using the Supabase Dashboard Table Editor is the easiest way to add the data.

-- 4. Create an update trigger for updated_at
CREATE OR REPLACE FUNCTION update_modified_column() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$ language 'plpgsql';

CREATE TRIGGER update_manifesto_promises_modtime
BEFORE UPDATE ON public.manifesto_promises
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- ==============================================================================
-- MIGRATION: RUN THIS TO UPGRADE EXISTING TABLES (DO NOT RUN IF STARTING FRESH)
-- ==============================================================================
-- ALTER TABLE public.manifesto_promises ADD COLUMN IF NOT EXISTS announced_date DATE;
-- ALTER TABLE public.manifesto_promises ADD COLUMN IF NOT EXISTS announced_situation TEXT;
-- ALTER TABLE public.manifesto_promises ADD COLUMN IF NOT EXISTS fulfilled_details TEXT;
-- ALTER TABLE public.manifesto_promises ADD COLUMN IF NOT EXISTS unfulfilled_details TEXT;
