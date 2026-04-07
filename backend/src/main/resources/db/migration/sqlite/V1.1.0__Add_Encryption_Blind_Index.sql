-- SQLite migration for encrypted personal data

-- 1. Add columns for blind indexes
-- In SQLite, VARCHAR(255) and TEXT are treated the same.
ALTER TABLE users ADD COLUMN email_blind_index TEXT;
ALTER TABLE users ADD COLUMN username_blind_index TEXT;

-- 2. Add unique indexes to the blind index columns
CREATE UNIQUE INDEX idx_users_email_blind_index ON users(email_blind_index);
CREATE UNIQUE INDEX idx_users_username_blind_index ON users(username_blind_index);