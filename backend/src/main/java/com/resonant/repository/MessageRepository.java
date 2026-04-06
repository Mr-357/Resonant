package com.resonant.repository;

import com.resonant.entity.Message;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class MessageRepository implements PanacheRepositoryBase<Message, UUID> {

    public List<Message> findByChannelNotDeleted(UUID channelId) {
        return find("channel.id = ?1 and isDeleted = false order by createdAt asc", channelId)
                .list();
    }

    public List<Message> findByChannelSinceNotDeleted(UUID channelId, LocalDateTime since) {
        return find("channel.id = ?1 and isDeleted = false and createdAt > ?2 order by createdAt asc", channelId, since)
                .list();
    }
}
