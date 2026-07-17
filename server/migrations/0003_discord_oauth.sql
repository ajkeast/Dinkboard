-- Allow passwordless Discord OAuth users; enforce one account per Discord snowflake.
ALTER TABLE app_users MODIFY password_hash VARCHAR(255) NULL;
CREATE UNIQUE INDEX idx_app_users_member_id ON app_users (member_id);
