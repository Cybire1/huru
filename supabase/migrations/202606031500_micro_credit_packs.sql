-- Add micro entry-tier credit packs: Sip (₦100 / 50 credits)
-- and Sample (₦200 / 100 credits). Both are entry tiers priced
-- at ₦2/credit — slightly cheaper per credit than Starter to
-- lower the impulse-purchase floor for the Nigerian market.
INSERT INTO huru_credit_packs (public_id, pack_id, name, amount_minor, currency, credits_awarded)
VALUES
  ('cpk_pack_sip',    'pack_sip',    'Sip',    10000, 'NGN', 50),
  ('cpk_pack_sample', 'pack_sample', 'Sample', 20000, 'NGN', 100)
ON CONFLICT (pack_id) DO UPDATE SET
  name           = EXCLUDED.name,
  amount_minor   = EXCLUDED.amount_minor,
  currency       = EXCLUDED.currency,
  credits_awarded = EXCLUDED.credits_awarded;
