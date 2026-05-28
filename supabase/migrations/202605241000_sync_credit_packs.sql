-- Sync credit packs to match config.ts pack IDs and pricing
-- Update in place to preserve foreign key references from huru_credit_purchases
UPDATE huru_credit_packs SET pack_id = 'pack_100',   name = 'Starter Top-Up', amount_minor = 5100,    credits_awarded = 100   WHERE pack_id = 'credits_10';
UPDATE huru_credit_packs SET pack_id = 'pack_300',   name = 'Builder Top-Up', amount_minor = 15100,   credits_awarded = 300   WHERE pack_id = 'credits_25';
UPDATE huru_credit_packs SET pack_id = 'pack_1400',  name = 'Pilot Top-Up',   amount_minor = 70500,   credits_awarded = 1400  WHERE pack_id = 'credits_100';
UPDATE huru_credit_packs SET pack_id = 'pack_5000',  name = 'Growth Top-Up',  amount_minor = 251500,  credits_awarded = 5000  WHERE pack_id = 'credits_300';
UPDATE huru_credit_packs SET pack_id = 'pack_25000', name = 'Scale Top-Up',   amount_minor = 1257400, credits_awarded = 25000 WHERE pack_id = 'credits_1000';
