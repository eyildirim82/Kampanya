-- Add slug column to campaigns table
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Initialize slugs for existing campaigns
UPDATE campaigns SET slug = LOWER(REGEXP_REPLACE(
  REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(name, ''), 'İ', 'i'), 'I', 'i'), 'ğ', 'g'), 'ü', 'u'), 'ş', 's'), 'ö', 'o'), 'ç', 'c'),
  '[^a-z0-9]+', '-', 'g'
))
WHERE slug IS NULL;

-- Remove leading/trailing dashes
UPDATE campaigns SET slug = REGEXP_REPLACE(slug, '^-+|-+$', '', 'g')
WHERE slug IS NOT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_campaigns_slug ON campaigns(slug);
