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
import java.util.UUID;

@ApplicationScoped
public class ServerService {
    
    @Inject
    ServerRepository serverRepository;
    
    @Inject
    UserRepository userRepository;

    @Transactional
    public Server createServer(CreateServerRequest request, UUID userId) throws Exception {
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

    public List<Server> getServersForUser(UUID userId) {
        return serverRepository.findServersForUser(userId);
    }

    public List<Server> getAllServers() {
        return serverRepository.listAll();
    }

    public Server getServer(UUID serverId) throws Exception {
        Optional<Server> server = serverRepository.findByIdOptional(serverId);
        if (server.isEmpty()) {
            throw new Exception("Server not found");
        }
        return server.get();
    }

    @Transactional
    public void deleteServer(UUID serverId, UUID userId) throws Exception {
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
    public Server updateServer(UUID serverId, String name, String description, UUID userId) throws Exception {
        Optional<Server> serverOpt = serverRepository.findByIdOptional(serverId);
        if (serverOpt.isEmpty()) {
            throw new Exception("Server not found");
        }
        Server server = serverOpt.get();

        if (!server.owner.id.equals(userId)) {
            throw new Exception("Only owner can update server");
        }

        if (name != null && !name.isBlank()) {
            server.name = name;
        }
        if (description != null) {
            server.description = description;
        }
        return server;
    }

    @Transactional
    public void removeMember(UUID serverId, UUID memberId, UUID requesterId) throws Exception {
        Server server = getServer(serverId);

        if (!server.owner.id.equals(requesterId)) {
            throw new Exception("Only owner can remove members");
        }

        if (server.owner.id.equals(memberId)) {
            throw new Exception("Cannot remove the server owner");
        }

        Optional<User> memberOpt = userRepository.findByIdOptional(memberId);
        if (memberOpt.isEmpty()) {
            throw new Exception("Member not found");
        }
        User member = memberOpt.get();

        if (!member.servers.removeIf(s -> s.id.equals(serverId))) {
            throw new Exception("User is not a member of this server");
        }
    }

    @Transactional
    public void joinServer(UUID serverId, UUID userId) throws Exception {
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
    public void leaveServer(UUID serverId, UUID userId) throws Exception {
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
