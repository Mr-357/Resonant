package com.resonant.repository;

import com.resonant.entity.Message;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;
import java.time.LocalDateTime;
import java.util.List;

@ApplicationScoped
public class MessageRepository implements PanacheRepository<Message> {

    public List<Message> findByChannelNotDeleted(Long channelId) {
        return find("channel.id = ?1 and is_deleted = false order by createdAt desc", channelId)
                .list();
    }

    public List<Message> findByChannelSinceNotDeleted(Long channelId, LocalDateTime since) {
        return find("channel.id = ?1 and is_deleted = false and created_at > ?2 order by createdAt desc", channelId, since)
                .list();
    }
}
