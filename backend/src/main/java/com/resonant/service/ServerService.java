package com.resonant.service;

import com.resonant.dto.CreateServerRequest;
import com.resonant.entity.Server;
import com.resonant.entity.User;
import com.resonant.repository.ServerRepository;
import com.resonant.repository.UserRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import jakarta.inject.Inject;

import java.util.List;
import java.util.Optional;

@ApplicationScoped
public class ServerService {
    
    @Inject
    ServerRepository serverRepository;
    
    @Inject
    UserRepository userRepository;

    @Transactional
    public Server createServer(CreateServerRequest request, Long userId) throws Exception {
        if (request.name == null || request.name.isBlank()) {
            throw new Exception("Server name is required");
        }

        Optional<User> ownerOpt = userRepository.findByIdOptional(userId);
        if (ownerOpt.isEmpty()) {
            throw new Exception("User not found");
        }
        User owner = ownerOpt.get();

        Server server = new Server();
        server.name = request.name;
        server.description = request.description;
        server.owner = owner;
        serverRepository.persist(server);

        return server;
    }

    public List<Server> getServersForUser(Long userId) {
        return serverRepository.findServersForUser(userId);
    }

    public List<Server> getAllServers() {
        return serverRepository.listAll();
    }

    public Server getServer(Long serverId) throws Exception {
        Optional<Server> server = serverRepository.findByIdOptional(serverId);
        if (server.isEmpty()) {
            throw new Exception("Server not found");
        }
        return server.get();
    }

    @Transactional
    public void deleteServer(Long serverId, Long userId) throws Exception {
        Optional<Server> serverOpt = serverRepository.findByIdOptional(serverId);
        if (serverOpt.isEmpty()) {
            throw new Exception("Server not found");
        }
        Server server = serverOpt.get();

        if (!server.owner.id.equals(userId)) {
            throw new Exception("Only owner can delete server");
        }

        serverRepository.delete(server);
    }

    @Transactional
    public void joinServer(Long serverId, Long userId) throws Exception {
        Server server = getServer(serverId);

        Optional<User> userOpt = userRepository.findByIdOptional(userId);
        if (userOpt.isEmpty()) {
            throw new Exception("User not found");
        }
        User user = userOpt.get();

        if (server.owner.id.equals(userId) || user.servers.stream().anyMatch(s -> s.id.equals(serverId))) {
            throw new Exception("You are already a member or owner of this server");
        }

        user.servers.add(server);
    }

    @Transactional
    public void leaveServer(Long serverId, Long userId) throws Exception {
        Server server = getServer(serverId);

        Optional<User> userOpt = userRepository.findByIdOptional(userId);
        if (userOpt.isEmpty()) {
            throw new Exception("User not found");
        }
        User user = userOpt.get();

        if (server.owner.id.equals(userId)) {
            throw new Exception("Owner cannot leave the server. You must delete it instead.");
        }

        if (!user.servers.removeIf(s -> s.id.equals(serverId))) {
            throw new Exception("You are not a member of this server.");
        }
    }
}
