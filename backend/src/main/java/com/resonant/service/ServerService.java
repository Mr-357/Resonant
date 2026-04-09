package com.resonant.service;

import com.resonant.dto.CreateServerRequest;
import com.resonant.entity.Server;
import com.resonant.entity.ServerBan;
import com.resonant.entity.User;
import com.resonant.repository.ServerBanRepository;
import com.resonant.repository.ServerRepository;
import com.resonant.repository.UserRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Named;
import jakarta.transaction.Transactional;
import jakarta.inject.Inject;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class ServerService {
    
    @Inject
    ServerRepository serverRepository;
    
    @Inject
    UserRepository userRepository;

    @Inject
    ServerBanRepository serverBanRepository;

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

    public List<Server> getServersForUser(UUID userId) { // TODO: Filter out servers where user is currently banned
        // For now, we'll rely on the joinServer check. A more robust solution would involve
        // modifying the findServersForUser query in ServerRepository to exclude banned servers.
        // This is a more complex change that might involve custom HQL/JPQL.
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
    public void kickMember(UUID serverId, UUID memberId, UUID requesterId) throws Exception {
        Server server = getServer(serverId);

        if (!server.owner.id.equals(requesterId)) { // Only owner can kick/ban
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

        // Remove from members list if they are currently a member
        if (server.members.removeIf(u -> u.id.equals(memberId))) {
            // Also remove from user's servers list to keep consistency
            member.servers.removeIf(s -> s.id.equals(serverId));
        }
        // Implement a 1-minute ban for kicking
        banUser(serverId, memberId, requesterId, 1);
    }

    @Transactional
    public void joinServer(UUID serverId, UUID userId) throws Exception {
        Server server = getServer(serverId);

        Optional<User> userOpt = userRepository.findByIdOptional(userId);
        if (userOpt.isEmpty()) {
            throw new Exception("User not found");
        }
        User user = userOpt.get();

        // Check if user is currently banned
        if (serverBanRepository.findActiveBan(serverId, userId).isPresent()) {
            throw new Exception("You are currently banned from this server.");
        }

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

    @Transactional
    public ServerBan banUser(UUID serverId, UUID userIdToBan, UUID requesterId, long banDurationMinutes) throws Exception {
        Server server = getServer(serverId);
        User userToBan = userRepository.findByIdOptional(userIdToBan)
                                       .orElseThrow(() -> new Exception("User to ban not found"));

        if (!server.owner.id.equals(requesterId)) {
            throw new Exception("Only owner can ban users");
        }

        if (server.owner.id.equals(userIdToBan)) {
            throw new Exception("Cannot ban the server owner");
        }

        // Remove from members list if they are currently a member
        if (server.members.removeIf(u -> u.id.equals(userIdToBan))) {
            // Also remove from user's servers list to keep consistency
            userToBan.servers.removeIf(s -> s.id.equals(serverId));
        }

        LocalDateTime bannedUntil = banDurationMinutes == 0 ? LocalDateTime.ofEpochSecond(253402300799L, 0, ZoneOffset.UTC) : LocalDateTime.now().plusMinutes(banDurationMinutes);

        Optional<ServerBan> existingBanOpt = serverBanRepository.findByServerAndUser(serverId, userIdToBan);
        ServerBan serverBan;
        if (existingBanOpt.isPresent()) {
            serverBan = existingBanOpt.get();
            serverBan.bannedUntil = bannedUntil;
        } else {
            serverBan = new ServerBan();
            serverBan.server = server;
            serverBan.user = userToBan;
            serverBan.bannedUntil = bannedUntil;
        }
        serverBanRepository.persist(serverBan);
        return serverBan;
    }

    @Transactional
    public void unbanUser(UUID serverId, UUID userIdToUnban, UUID requesterId) throws Exception {
        Server server = getServer(serverId);

        if (!server.owner.id.equals(requesterId)) {
            throw new Exception("Only owner can unban users");
        }

        Optional<ServerBan> serverBanOpt = serverBanRepository.findByServerAndUser(serverId, userIdToUnban);
        if (serverBanOpt.isEmpty()) {
            throw new Exception("User is not currently banned from this server.");
        }
        serverBanRepository.delete(serverBanOpt.get());
    }

    public List<ServerBan> getActiveBansForServer(UUID serverId) throws Exception {
        getServer(serverId); // Ensure server exists
        return serverBanRepository.findActiveBansByServer(serverId);
    }
}
