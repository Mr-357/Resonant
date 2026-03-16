package com.resonant.repository;

import com.resonant.entity.Channel;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;

@ApplicationScoped
public class ChannelRepository implements PanacheRepository<Channel> {

    public List<Channel> findByServer(Long serverId) {
        return find("server.id", serverId).list();
    }
}
