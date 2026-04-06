package com.resonant.repository;

import com.resonant.entity.User;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class UserRepository implements PanacheRepositoryBase<User, UUID> {

   public Optional<User> findByUsernameIndex(String blindIndex) {
        return find("usernameBlindIndex", blindIndex).firstResultOptional();
    }

    public Optional<User> findByEmailIndex(String blindIndex) {
        return find("emailBlindIndex", blindIndex).firstResultOptional();
    }
}
