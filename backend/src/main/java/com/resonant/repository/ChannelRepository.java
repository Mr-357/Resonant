package com.resonant.repository;

import com.resonant.entity.Channel;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class ChannelRepository implements PanacheRepositoryBase<Channel, UUID> {

    public List<Channel> findByServer(UUID serverId) {
        return find("server.id", serverId).list();
    }
}
