-- Migration: Add fields to campaigns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS fields JSONB DEFAULT '[]'::jsonb;
