-- Additive: actual people who arrived (does not overwrite planned reservation.guest_count)
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "actual_arrived_guest_count" INTEGER;
