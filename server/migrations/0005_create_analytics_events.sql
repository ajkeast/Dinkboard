CREATE TABLE IF NOT EXISTS app_analytics_events (
  id            BIGSERIAL PRIMARY KEY,
  event_type    TEXT NOT NULL CHECK (event_type IN ('page_view','session_start','auth','action','error','web_vital')),
  user_id       INTEGER NULL REFERENCES app_users(id) ON DELETE SET NULL,
  session_id    CHAR(36) NOT NULL,
  path          VARCHAR(512) NULL,
  referrer      VARCHAR(1024) NULL,
  device_type   TEXT NOT NULL DEFAULT 'unknown' CHECK (device_type IN ('mobile','tablet','desktop','unknown')),
  os            VARCHAR(64) NULL,
  browser       VARCHAR(64) NULL,
  viewport_w    SMALLINT NULL,
  viewport_h    SMALLINT NULL,
  properties    JSONB NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analytics_created ON app_analytics_events (created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_type_created ON app_analytics_events (event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_session ON app_analytics_events (session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON app_analytics_events (user_id);
