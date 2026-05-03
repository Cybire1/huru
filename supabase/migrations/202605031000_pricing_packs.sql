-- Add Growth and Scale credit packs
INSERT INTO huru_credit_packs (public_id, name, amount_minor, currency, credits_awarded)
VALUES
  ('credits_300', 'Growth Top-Up', 30000, 'NGN', 5000),
  ('credits_1000', 'Scale Top-Up', 100000, 'NGN', 25000)
ON CONFLICT (public_id) DO NOTHING;
