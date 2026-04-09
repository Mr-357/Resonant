-- Migration to add the server_bans table
CREATE TABLE server_bans (
    id UUID NOT NULL,
    server_id UUID NOT NULL,
    user_id UUID NOT NULL,
    banned_until TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_server_bans_server FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
    CONSTRAINT fk_server_bans_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uk_server_bans_server_user UNIQUE (server_id, user_id)
);