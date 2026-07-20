-- CI/tests delete app_users with ON DELETE SET NULL, leaving anonymous usage rows.
-- Drop those orphans so they never inflate analytics.
DELETE FROM app_analytics_events WHERE user_id IS NULL;
