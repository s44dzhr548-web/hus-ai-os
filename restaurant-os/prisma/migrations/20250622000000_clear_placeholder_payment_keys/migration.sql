-- Remove placeholder payment keys from all restaurants
UPDATE "restaurants"
SET
  "moyasar_publishable_key" = NULL,
  "moyasar_secret_key" = NULL
WHERE
  "moyasar_publishable_key" ILIKE '%placeholder%'
  OR "moyasar_secret_key" ILIKE '%placeholder%'
  OR "moyasar_publishable_key" = 'pk_test_placeholder'
  OR "moyasar_secret_key" = 'sk_test_placeholder';

UPDATE "restaurants"
SET
  "tap_publishable_key" = NULL,
  "tap_secret_key" = NULL
WHERE
  "tap_publishable_key" ILIKE '%placeholder%'
  OR "tap_secret_key" ILIKE '%placeholder%'
  OR "tap_publishable_key" = 'pk_test_tap_placeholder'
  OR "tap_secret_key" = 'sk_test_tap_placeholder';
