package com.resonant.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "servers")
public class Server extends PanacheEntityBase {

    @Id @GeneratedValue
    public UUID id;
    
    @Column(nullable = false, length = 100)
    public String name;
    
    @Column(length = 500)
    public String description;
    
    @ManyToOne(optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    public User owner;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    public LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    public LocalDateTime updatedAt;
    
    @OneToMany(mappedBy = "server", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    public List<Channel> channels;
    
    @ManyToMany(mappedBy = "servers", cascade = CascadeType.ALL)
    @JsonIgnore
    public List<User> members;

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
