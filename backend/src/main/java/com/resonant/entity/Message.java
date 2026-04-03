package com.resonant.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "messages", indexes = {
    @Index(name = "idx_channel_created", columnList = "channel_id, created_at DESC"),
    @Index(name = "idx_channel_id", columnList = "channel_id"),
    @Index(name = "idx_user_id", columnList = "user_id")
})
public class Message extends PanacheEntityBase {
    
    @Id @GeneratedValue
    public UUID id;

    @Column(nullable = false)
    public String content;
    
    @ManyToOne(optional = false)
    @JoinColumn(name = "channel_id", nullable = false)
    public Channel channel;
    
    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    public User author;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    public LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    public LocalDateTime updatedAt;
    
    @Column(name = "is_deleted")
    public boolean isDeleted = false;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
