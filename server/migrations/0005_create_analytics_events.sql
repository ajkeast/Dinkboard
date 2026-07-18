CREATE TABLE IF NOT EXISTS app_analytics_events (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_type    ENUM('page_view','session_start','auth','action','error','web_vital') NOT NULL,
  user_id       INT UNSIGNED NULL,
  session_id    CHAR(36) NOT NULL,
  path          VARCHAR(512) NULL,
  referrer      VARCHAR(1024) NULL,
  device_type   ENUM('mobile','tablet','desktop','unknown') NOT NULL DEFAULT 'unknown',
  os            VARCHAR(64) NULL,
  browser       VARCHAR(64) NULL,
  viewport_w    SMALLINT UNSIGNED NULL,
  viewport_h    SMALLINT UNSIGNED NULL,
  properties    JSON NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_analytics_created (created_at),
  INDEX idx_analytics_type_created (event_type, created_at),
  INDEX idx_analytics_session (session_id),
  INDEX idx_analytics_user (user_id),
  CONSTRAINT fk_analytics_user
    FOREIGN KEY (user_id) REFERENCES app_users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
