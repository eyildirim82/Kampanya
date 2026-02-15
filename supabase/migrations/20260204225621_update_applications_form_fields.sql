-- Migration: Update applications table for new form structure
-- Date: 2026-02-04
-- Purpose: Add new consent fields and remove denizbank customer field

-- Add new consent columns
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS address_sharing_consent BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS card_application_consent BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS tckn_phone_sharing_consent BOOLEAN DEFAULT FALSE NOT NULL;

-- Remove denizbank customer column (if exists)
ALTER TABLE applications
  DROP COLUMN IF EXISTS is_denizbank_customer;

-- Add comment for documentation
COMMENT ON COLUMN applications.address_sharing_consent IS 'Kart gönderimi için adres bilgimin ilgili şube ile paylaşılmasını onaylıyorum';
COMMENT ON COLUMN applications.card_application_consent IS 'Denizbank Yeşilköy Şubesinden kredi kartı başvurusu yapılmasını onaylıyorum';
COMMENT ON COLUMN applications.tckn_phone_sharing_consent IS 'TC kimlik ve telefon numaramın Denizbank Yeşilköy Şubesi ile paylaşılmasını onaylıyorum';
