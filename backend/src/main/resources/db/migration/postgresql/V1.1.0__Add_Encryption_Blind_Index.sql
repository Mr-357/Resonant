-- Migration to handle encrypted emails with a blind index for searching
-- Migration to handle encrypted personal data (email and username)

-- 1. Add columns for blind indexes
ALTER TABLE users ADD COLUMN email_blind_index VARCHAR(255);
ALTER TABLE users ADD COLUMN username_blind_index VARCHAR(255);

-- 2. Remove unique constraints from the original columns
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key;

-- 3. Add unique indexes to the blind index columns
CREATE UNIQUE INDEX idx_users_email_blind_index ON users(email_blind_index);
CREATE UNIQUE INDEX idx_users_username_blind_index ON users(username_blind_index);

-- 4. Increase column sizes to accommodate ciphertext overhead
ALTER TABLE users ALTER COLUMN email TYPE TEXT;
ALTER TABLE users ALTER COLUMN username TYPE TEXT;