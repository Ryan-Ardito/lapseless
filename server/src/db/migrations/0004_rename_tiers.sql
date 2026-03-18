CREATE TYPE "public"."subscription_tier_new" AS ENUM('solo', 'team', 'growth', 'scale');
ALTER TABLE "subscriptions"
  ALTER COLUMN "tier" TYPE "subscription_tier_new"
  USING (CASE "tier"::text
    WHEN 'starter' THEN 'solo'
    WHEN 'basic' THEN 'team'
    WHEN 'professional' THEN 'growth'
    WHEN 'business' THEN 'scale'
  END)::"subscription_tier_new";
ALTER TABLE "subscriptions" ALTER COLUMN "tier" SET DEFAULT 'solo'::"subscription_tier_new";
DROP TYPE "public"."subscription_tier";
ALTER TYPE "public"."subscription_tier_new" RENAME TO "subscription_tier";
