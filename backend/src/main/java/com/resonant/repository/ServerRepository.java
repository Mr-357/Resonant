package com.resonant.repository;

import com.resonant.entity.Server;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class ServerRepository implements PanacheRepositoryBase<Server, UUID> {

    public List<Server> findServersForUser(UUID userId) {
        return find("SELECT DISTINCT s FROM Server s LEFT JOIN s.members m WHERE s.owner.id = ?1 OR m.id = ?1", userId).list();
    }
}
