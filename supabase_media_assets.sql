-- Create the `media_assets` table for storing Wikimedia Commons assets
CREATE TABLE IF NOT EXISTS public.media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    topic TEXT NOT NULL,
    subtopic TEXT,
    bucket TEXT NOT NULL DEFAULT 'reel-assets',
    path TEXT NOT NULL UNIQUE,
    source_type TEXT NOT NULL DEFAULT 'wikimedia',
    source_page_url TEXT,
    source_file_url TEXT,
    license TEXT,
    artist TEXT,
    attribution_text TEXT,
    width INTEGER,
    height INTEGER,
    mime_type TEXT,
    tags JSONB,
    year_context INTEGER, -- 2014, 2019, 2024, or null
    leader TEXT, -- e.g. 'modi'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

-- Allow public read access to media assets
CREATE POLICY "Allow public read access for media_assets" 
ON public.media_assets 
FOR SELECT 
USING (true);

-- Allow authenticated/service-role write access
CREATE POLICY "Allow all write access for service role"
ON public.media_assets
FOR ALL
USING (true)
WITH CHECK (true);
