package com.resonant.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "channels")
public class Channel extends PanacheEntityBase {
    @Id
    @GeneratedValue 
    public UUID id;
    @Column(nullable = false, length = 100)
    public String name;
    
    @Column(length = 500)
    public String description;
    
    @ManyToOne(optional = false)
    @JoinColumn(name = "server_id", nullable = false)
    public Server server;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    public LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    public LocalDateTime updatedAt;
    
    @OneToMany(mappedBy = "channel", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    public List<Message> messages;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public static List<Channel> findByServer(UUID serverId) {
        return find("server.id", serverId).list();
    }
}
