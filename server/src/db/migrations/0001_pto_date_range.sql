ALTER TABLE "pto_entries" ADD COLUMN "start_date" date;
ALTER TABLE "pto_entries" ADD COLUMN "end_date" date;
UPDATE "pto_entries" SET "start_date" = "date", "end_date" = "date";
ALTER TABLE "pto_entries" ALTER COLUMN "start_date" SET NOT NULL;
ALTER TABLE "pto_entries" ALTER COLUMN "end_date" SET NOT NULL;
ALTER TABLE "pto_entries" DROP COLUMN "date";
