-- Account-level trainer capture acknowledgement (not per exercise) and a
-- durable flag when a stored BYOK credential can no longer be decrypted.
-- Prisma Migrate is the schema source of truth. Do not db push.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trainer_consent_at TIMESTAMPTZ(6);

ALTER TABLE public.llm_settings
  ADD COLUMN IF NOT EXISTS needs_reentry BOOLEAN NOT NULL DEFAULT false;
