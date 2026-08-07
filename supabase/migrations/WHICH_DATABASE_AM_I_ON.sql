-- Run this FIRST, in the same SQL Editor tab you've been using.
-- It identifies which database that tab is actually connected to.
--
-- The app's REST API (project ref fewmirilarrgkshwffwy) can read `properties`
-- and `conversations` right now, so those tables definitely exist somewhere.
-- If this query says otherwise, the editor is pointed at a different database
-- — a preview BRANCH, a different project, or a non-primary source.

SELECT
  current_database()                      AS database_name,
  current_user                            AS connected_as,
  current_setting('search_path')          AS search_path,
  to_regclass('public.tenants')           AS has_tenants,
  to_regclass('public.conversations')     AS has_conversations,
  to_regclass('public.properties')        AS has_properties_014,
  to_regclass('public.widget_usage')      AS has_widget_usage_015,
  (SELECT count(*) FROM information_schema.tables
    WHERE table_schema = 'public')        AS public_table_count;

-- Expected on the CORRECT database (013 + 014 applied, 015 not yet):
--   has_tenants          -> tenants
--   has_conversations    -> conversations
--   has_properties_014   -> properties
--   has_widget_usage_015 -> NULL
--   public_table_count   -> ~24
--
-- If has_tenants is NULL too, you are on an empty//different database:
--   1. Check the URL contains  /project/fewmirilarrgkshwffwy/
--   2. Check the branch selector at the top reads  main / PRODUCTION
--      (a preview branch has its own separate database)
--   3. Check the "Source" dropdown above the editor reads  Primary Database
