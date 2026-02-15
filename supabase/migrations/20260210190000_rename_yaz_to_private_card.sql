-- Rename "Yaz Kampanyası 2024" to "Private Card Kampanyası"
UPDATE public.campaigns
SET
    name = 'Private Card Kampanyası',
    campaign_code = 'PRIVATE_CARD'
WHERE name = 'Yaz Kampanyası 2024'
   OR campaign_code = 'SUMMER_2024';
