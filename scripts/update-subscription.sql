-- =============================================
-- Manual Subscription Update Script
-- Run this in Supabase SQL Editor
-- =============================================

-- Update subscription for a specific tenant
-- Replace 'TENANT_ID_HERE' with the actual tenant ID
-- Replace 'basic' or 'business' with desired plan

-- Step 1: Find the tenant (optional - to verify)
SELECT id, name, slug FROM tenants WHERE email = 'user@example.com';
-- OR
SELECT id, name, slug FROM tenants WHERE slug = 'business-name';

-- Step 2: Cancel any existing active/trialing subscription
UPDATE subscriptions 
SET status = 'cancelled', 
    updated_at = NOW()
WHERE tenant_id = 'TENANT_ID_HERE'
  AND status IN ('active', 'trialing', 'free');

-- Step 3: Create new active subscription
INSERT INTO subscriptions (
    tenant_id,
    plan_id,
    status,
    current_period_start,
    current_period_end,
    billing_interval,
    messages_used,
    voice_minutes_used,
    created_at,
    updated_at
) VALUES (
    'TENANT_ID_HERE',           -- Replace with tenant ID
    'business',                 -- Choose: 'basic', 'business', or 'enterprise'
    'active',                   -- Status: 'active'
    NOW(),                      -- Period starts now
    NOW() + INTERVAL '30 days', -- Period ends in 30 days (change as needed)
    'monthly',                  -- 'monthly' or 'yearly'
    0,                          -- Reset messages used
    0,                          -- Reset voice minutes used
    NOW(),
    NOW()
);

-- Step 4: Verify the update
SELECT s.*, t.name as tenant_name, t.email 
FROM subscriptions s
JOIN tenants t ON s.tenant_id = t.id
WHERE s.tenant_id = 'TENANT_ID_HERE'
ORDER BY s.created_at DESC
LIMIT 1;
