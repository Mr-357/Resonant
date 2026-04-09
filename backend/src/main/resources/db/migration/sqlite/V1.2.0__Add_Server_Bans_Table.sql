-- Migration to add the server_bans table
CREATE TABLE server_bans (
    id TEXT NOT NULL,
    server_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    banned_until TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_server_bans_server FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
    CONSTRAINT fk_server_bans_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uk_server_bans_server_user UNIQUE (server_id, user_id)
);