-- =============================================
-- Sync subscription_plans table to match frontend
-- Run this in Supabase SQL Editor (run each step separately)
-- =============================================

-- Step 1: Check current state
SELECT id, name, price_zmw, messages_per_month, whatsapp_numbers FROM subscription_plans;

-- Step 2: Update "free" plan - set correct limits (5 msgs, not 100)
UPDATE subscription_plans
SET messages_per_month = 5,
    name = 'Free',
    price_zmw = 0,
    whatsapp_numbers = 1
WHERE id = 'free';

-- Step 3: Rename "starter" → "basic" and update details
-- 1. First CREATE the new plan
INSERT INTO subscription_plans (id, name, price_zmw, messages_per_month, whatsapp_numbers, features, is_active, sort_order)
SELECT 'basic', 'Basic', 499, 1000, 1, features, true, sort_order
FROM subscription_plans WHERE id = 'starter';

-- 2. Then update subscriptions to use the new plan
UPDATE subscriptions SET plan_id = 'basic' WHERE plan_id = 'starter';

-- 3. Finally delete the old plan
DELETE FROM subscription_plans WHERE id = 'starter';

-- Step 4: Rename "growth" → "business" and update price from K1299 → K1699
-- 1. First CREATE the new plan
INSERT INTO subscription_plans (id, name, price_zmw, messages_per_month, whatsapp_numbers, features, is_active, sort_order)
SELECT 'business', 'Business', 1699, 5000, 2, features, true, sort_order
FROM subscription_plans WHERE id = 'growth';

-- 2. Then update subscriptions to use the new plan
UPDATE subscriptions SET plan_id = 'business' WHERE plan_id = 'growth';

-- 3. Finally delete the old plan
DELETE FROM subscription_plans WHERE id = 'growth';

-- Step 5: Update enterprise plan
UPDATE subscription_plans
SET price_zmw = 5000,
    name = 'Enterprise'
WHERE id = 'enterprise';

-- Step ---6: Verify final state
SELECT id, name, price_zmw, messages_per_month, whatsapp_numbers FROM subscription_plans ORDER BY price_zmw;

-- Expected result:
-- id          | name       | price_zmw | messages_per_month | whatsapp_numbers
-- free        | Free       | 0         | 5                  | 1
-- basic       | Basic      | 499       | 1000               | 1
-- business    | Business   | 1699      | 5000               | 2
-- enterprise  | Enterprise | 5000      | 999999             | 99
