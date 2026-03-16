package com.resonant.repository;

import com.resonant.entity.Server;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;

@ApplicationScoped
public class ServerRepository implements PanacheRepository<Server> {

    public List<Server> findServersForUser(Long userId) {
        return find("SELECT DISTINCT s FROM Server s LEFT JOIN s.members m WHERE s.owner.id = ?1 OR m.id = ?1", userId).list();
    }
}
