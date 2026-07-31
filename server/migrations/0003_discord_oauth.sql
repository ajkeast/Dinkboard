-- Allow passwordless Discord OAuth users; enforce one account per Discord snowflake.
ALTER TABLE app_users ALTER COLUMN password_hash DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_users_member_id ON app_users (member_id);
