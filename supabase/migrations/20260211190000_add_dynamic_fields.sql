-- Add dynamic fields to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS form_schema JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS page_content JSONB DEFAULT '{}'::jsonb;

-- Index for faster slug lookup
CREATE INDEX IF NOT EXISTS idx_campaigns_slug ON public.campaigns(slug);

-- Update existing campaigns with a slug based on their code (optional but good for consistency)
UPDATE public.campaigns SET slug = LOWER(campaign_code) WHERE slug IS NULL;
