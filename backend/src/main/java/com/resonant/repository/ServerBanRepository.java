package com.resonant.repository;

import com.resonant.entity.ServerBan;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class ServerBanRepository implements PanacheRepositoryBase<ServerBan, UUID> {

    public Optional<ServerBan> findActiveBan(UUID serverId, UUID userId) {
        return find("server.id = ?1 and user.id = ?2 and bannedUntil > ?3", serverId, userId, LocalDateTime.now()).firstResultOptional();
    }

    public Optional<ServerBan> findByServerAndUser(UUID serverId, UUID userId) {
        return find("server.id = ?1 and user.id = ?2", serverId, userId).firstResultOptional();
    }

    public List<ServerBan> findActiveBansByServer(UUID serverId) {
        return list("server.id = ?1 and bannedUntil > ?2", serverId, LocalDateTime.now());
    }
}