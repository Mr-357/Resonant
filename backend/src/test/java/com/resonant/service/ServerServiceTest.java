package com.resonant.service;

import com.resonant.entity.Server;
import com.resonant.entity.ServerBan;
import com.resonant.entity.User;
import com.resonant.repository.ServerBanRepository;
import com.resonant.repository.ServerRepository;
import com.resonant.repository.UserRepository;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@QuarkusTest
public class ServerServiceTest {

    @Inject
    ServerService serverService;

    @InjectMock
    ServerRepository serverRepository;

    @InjectMock
    UserRepository userRepository;

    @InjectMock
    ServerBanRepository serverBanRepository;

    @Test
    void testKickMemberAppliesOneMinuteBan() throws Exception {
        UUID serverId = UUID.randomUUID();
        UUID memberId = UUID.randomUUID();
        UUID ownerId = UUID.randomUUID();

        Server server = new Server();
        server.id = serverId;
        server.owner = new User();
        server.owner.id = ownerId;
        server.members = new ArrayList<>();

        User member = new User();
        member.id = memberId;
        member.servers = new ArrayList<>();
        server.members.add(member);

        when(serverRepository.findByIdOptional(serverId)).thenReturn(Optional.of(server));
        when(userRepository.findByIdOptional(memberId)).thenReturn(Optional.of(member));
        when(serverBanRepository.findByServerAndUser(any(), any())).thenReturn(Optional.empty());

        serverService.kickMember(serverId, memberId, ownerId);

        // Verify member was removed
        assertFalse(server.members.contains(member));

        // Verify ban was created for ~1 minute
        ArgumentCaptor<ServerBan> banCaptor = ArgumentCaptor.forClass(ServerBan.class);
        verify(serverBanRepository).persist(banCaptor.capture());
        
        ServerBan ban = banCaptor.getValue();
        assertTrue(ban.bannedUntil.isAfter(LocalDateTime.now().plusSeconds(50)));
        assertTrue(ban.bannedUntil.isBefore(LocalDateTime.now().plusSeconds(70)));
    }

    @Test
    void testPermanentBanSetsMaxDateTime() throws Exception {
        UUID serverId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID ownerId = UUID.randomUUID();

        Server server = new Server();
        server.id = serverId;
        server.owner = new User();
        server.owner.id = ownerId;
        server.members = new ArrayList<>();

        when(serverRepository.findByIdOptional(serverId)).thenReturn(Optional.of(server));
        when(userRepository.findByIdOptional(userId)).thenReturn(Optional.of(new User()));
        when(serverBanRepository.findByServerAndUser(any(), any())).thenReturn(Optional.empty());

        serverService.banUser(serverId, userId, ownerId, 0); // 0 = permanent

        ArgumentCaptor<ServerBan> banCaptor = ArgumentCaptor.forClass(ServerBan.class);
        verify(serverBanRepository).persist(banCaptor.capture());
        assertTrue(banCaptor.getValue().bannedUntil.toString().startsWith("9999-12-31"));
    }

    @Test
    void testJoinServerFailsIfBanned() {
        UUID serverId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        Server server = new Server();
        server.owner = new User();
        server.owner.id = UUID.randomUUID();

        when(serverRepository.findByIdOptional(serverId)).thenReturn(Optional.of(server));
        when(userRepository.findByIdOptional(userId)).thenReturn(Optional.of(new User()));
        when(serverBanRepository.findActiveBan(serverId, userId)).thenReturn(Optional.of(new ServerBan()));

        Exception exception = assertThrows(Exception.class, () -> {
            serverService.joinServer(serverId, userId);
        });

        assertTrue(exception.getMessage().contains("currently banned"));
    }
}