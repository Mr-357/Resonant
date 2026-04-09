package com.resonant.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.resonant.util.EncryptedStringConverter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User extends PanacheEntityBase {

    @Id 
    @GeneratedValue 
    public UUID id;
    
    @Convert(converter = EncryptedStringConverter.class)
    @Column(name = "username")
    public String username;

    @Column(name = "username_blind_index")
    public String usernameBlindIndex;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(name = "email")
    public String email;

    @Column(name = "email_blind_index")
    public String emailBlindIndex;
    
    @Column(nullable = false, name = "password_hash", length = 255)
    @JsonIgnore
    public String passwordHash;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    public LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    public LocalDateTime updatedAt;
    
    @OneToMany(mappedBy = "owner", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    public List<Server> ownedServers;
    
    @ManyToMany(cascade = CascadeType.ALL)
    @JoinTable(
        name = "server_members",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "server_id")
    )
    @JsonIgnore
    public List<Server> servers;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public static User findByUsername(String username) {
        return find("username", username).firstResult();
    }

    public static User findByEmail(String email) {
        return find("email", email).firstResult();
    }
}
