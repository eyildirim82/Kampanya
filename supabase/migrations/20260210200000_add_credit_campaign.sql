-- Migration: Add Credit Campaign
-- Description: Inserts the new 'Kredi Kampanyası' into the campaigns table 
-- so that the application actions can find it.

DO $$
DECLARE
    v_campaign_id UUID;
BEGIN
    -- Check if campaign already exists by Name (most reliable across schema versions based on observation)
    IF NOT EXISTS (SELECT 1 FROM campaigns WHERE name ILIKE '%Kredi Kampanyası%' OR name = 'DenizBank İhtiyaç Kredisi') THEN
        
        -- Insert new campaign
        -- We try to handle different schema possibilities for 'campaign_code' column existence
        -- Attempting to insert with name and is_active. 
        -- If campaign_code column exists, we must provide it if it's NOT NULL.
        
        -- Strategy: Dynamic SQL to handle optional column? 
        -- Or just update the 'Genel Başvuru' or insert a new one compatible with probable schema.
        
        -- Let's try to find if campaign_code column exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='campaign_code') THEN
             INSERT INTO campaigns (name, campaign_code, is_active, created_at)
             VALUES ('DenizBank İhtiyaç Kredisi', 'CREDIT_2026', true, NOW());
             
             RAISE NOTICE 'Campaign created with code CREDIT_2026';
        ELSE
             -- Schema without campaign_code (older or different migration path)
             INSERT INTO campaigns (name, is_active, created_at)
             VALUES ('DenizBank İhtiyaç Kredisi', true, NOW());
             
             RAISE NOTICE 'Campaign created without code (name only)';
        END IF;
        
    ELSE
        RAISE NOTICE 'Campaign already exists, skipping insert.';
    END IF;

END $$;
