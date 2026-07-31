-- Fresh Postgres schema for Dinkboard + DiscordBot (pgvector-ready).
-- Applied on first container boot via /docker-entrypoint-initdb.d.

CREATE EXTENSION IF NOT EXISTS vector;

-- updated_at / last_updated triggers (Postgres has no ON UPDATE CURRENT_TIMESTAMP)
CREATE OR REPLACE FUNCTION set_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_timestamp_last_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Discord ingest tables
CREATE TABLE IF NOT EXISTS members (
  id            VARCHAR(20) PRIMARY KEY,
  user_name     VARCHAR(255),
  display_name  VARCHAR(255),
  avatar        VARCHAR(255),
  created_at    TIMESTAMP,
  last_updated  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER members_last_updated
  BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION set_timestamp_last_updated();

CREATE TABLE IF NOT EXISTS channels (
  id            BIGINT PRIMARY KEY,
  channel_name  VARCHAR(32),
  created_at    TIMESTAMP,
  last_updated  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER channels_last_updated
  BEFORE UPDATE ON channels
  FOR EACH ROW EXECUTE FUNCTION set_timestamp_last_updated();

CREATE TABLE IF NOT EXISTS emojis (
  id            BIGINT PRIMARY KEY,
  emoji_name    VARCHAR(32),
  guild_id      BIGINT,
  url           VARCHAR(255),
  created_at    TIMESTAMP,
  last_updated  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER emojis_last_updated
  BEFORE UPDATE ON emojis
  FOR EACH ROW EXECUTE FUNCTION set_timestamp_last_updated();

CREATE TABLE IF NOT EXISTS messages (
  id            BIGINT PRIMARY KEY,
  member_id     VARCHAR(20) REFERENCES members(id),
  channel_id    BIGINT REFERENCES channels(id),
  content       VARCHAR(4000),
  created_at    TIMESTAMP,
  last_updated  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_member_id ON messages(member_id);
CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

CREATE TRIGGER messages_last_updated
  BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION set_timestamp_last_updated();

CREATE TABLE IF NOT EXISTS firstlist_id (
  user_id   VARCHAR(255),
  timesent  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_firstlist_timesent ON firstlist_id(timesent);
CREATE INDEX IF NOT EXISTS idx_firstlist_user_id ON firstlist_id(user_id);

CREATE TABLE IF NOT EXISTS chatgpt_logs (
  id                BIGSERIAL PRIMARY KEY,
  user_id           VARCHAR(20) NOT NULL REFERENCES members(id),
  model             VARCHAR(50) NOT NULL,
  request_messages  JSONB NOT NULL,
  response_content  TEXT,
  input_tokens      INTEGER,
  output_tokens     INTEGER,
  total_tokens      INTEGER,
  function_calls    JSONB,
  image_urls        JSONB,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  message_id        BIGINT REFERENCES messages(id)
);

CREATE INDEX IF NOT EXISTS idx_chatgpt_logs_user_id ON chatgpt_logs(user_id);

CREATE TABLE IF NOT EXISTS dalle_3_prompts (
  id          BIGSERIAL PRIMARY KEY,
  user_id     VARCHAR(20) REFERENCES members(id),
  timesent    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  prompt      VARCHAR(2000),
  message_id  BIGINT REFERENCES messages(id)
);

CREATE TABLE IF NOT EXISTS dinkcoin_balances (
  user_id  VARCHAR(32) PRIMARY KEY,
  balance  NUMERIC(18, 8) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS dinkcoin_transactions (
  id            SERIAL PRIMARY KEY,
  from_user_id  VARCHAR(32),
  to_user_id    VARCHAR(32) NOT NULL,
  amount        NUMERIC(18, 8) NOT NULL,
  tx_type       TEXT NOT NULL CHECK (tx_type IN ('mint', 'transfer')),
  tx_hash       VARCHAR(66),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS message_sentiment (
  message_id      BIGINT PRIMARY KEY REFERENCES messages(id),
  polarity        TEXT NOT NULL CHECK (polarity IN ('positive', 'negative', 'neutral', 'mixed')),
  polarity_score  REAL NOT NULL,
  emotions        VARCHAR(128) NOT NULL,
  sarcasm         BOOLEAN NOT NULL,
  toxicity        TEXT NOT NULL CHECK (toxicity IN ('none', 'mild', 'moderate', 'severe')),
  directed_at     TEXT NOT NULL CHECK (directed_at IN ('general', 'person', 'group', 'self', 'topic')),
  confidence      REAL NOT NULL,
  rationale       VARCHAR(255) NOT NULL,
  model           VARCHAR(64) NOT NULL,
  scored_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sentiment_scored_at ON message_sentiment(scored_at);
CREATE INDEX IF NOT EXISTS idx_sentiment_polarity ON message_sentiment(polarity);

CREATE TRIGGER message_sentiment_updated_at
  BEFORE UPDATE ON message_sentiment
  FOR EACH ROW EXECUTE FUNCTION set_timestamp_updated_at();
