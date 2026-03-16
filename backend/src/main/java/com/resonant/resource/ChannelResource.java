package com.resonant.resource;

import com.resonant.dto.CreateChannelRequest;
import com.resonant.dto.ChannelDTO;
import com.resonant.entity.Channel;
import com.resonant.entity.Server;
import com.resonant.repository.ChannelRepository;
import com.resonant.repository.ServerRepository;
import com.resonant.ratelimit.RateLimit;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.SecurityContext;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Path("/api/servers/{serverId}/channels")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Authenticated
public class ChannelResource {

    @Inject
    SecurityContext securityContext;
    
    @Inject
    ServerRepository serverRepository;
    
    @Inject
    ChannelRepository channelRepository;

    @GET
    public Response getChannels(@PathParam("serverId") Long serverId) {
        try {
            Optional<Server> serverOpt = serverRepository.findByIdOptional(serverId);
            if (serverOpt.isEmpty()) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new ErrorResponse("Server not found"))
                    .build();
            }

            List<ChannelDTO> channels = channelRepository.findByServer(serverId)
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());

            return Response.ok(channels).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new ErrorResponse(e.getMessage()))
                .build();
        }
    }

    @POST
    @RateLimit(key = "channel.create", limit = 5, windowSeconds = 60)
    @Transactional
    public Response createChannel(@PathParam("serverId") Long serverId, CreateChannelRequest request) {
        try {
            if (request.name == null || request.name.isBlank()) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new ErrorResponse("Channel name is required"))
                    .build();
            }

            Optional<Server> serverOpt = serverRepository.findByIdOptional(serverId);
            if (serverOpt.isEmpty()) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new ErrorResponse("Server not found"))
                    .build();
            }
            Server server = serverOpt.get();

            // Verify user is member of server
            Long userId = Long.parseLong(securityContext.getUserPrincipal().getName());
            if (!server.owner.id.equals(userId) && !server.members.stream().anyMatch(m -> m.id.equals(userId))) {
                return Response.status(Response.Status.FORBIDDEN)
                    .entity(new ErrorResponse("You are not a member of this server"))
                    .build();
            }

            Channel channel = new Channel();
            channel.name = request.name;
            channel.description = request.description;
            channel.server = server;
            channelRepository.persist(channel);

            return Response.status(Response.Status.CREATED)
                .entity(mapToDTO(channel))
                .build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new ErrorResponse(e.getMessage()))
                .build();
        }
    }

    @DELETE
    @Path("/{channelId}")
    @Transactional
    public Response deleteChannel(@PathParam("serverId") Long serverId, @PathParam("channelId") Long channelId) {
        try {
            Optional<Channel> channelOpt = channelRepository.findByIdOptional(channelId);
            if (channelOpt.isEmpty() || !channelOpt.get().server.id.equals(serverId)) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new ErrorResponse("Channel not found"))
                    .build();
            }
            Channel channel = channelOpt.get();

            Long userId = Long.parseLong(securityContext.getUserPrincipal().getName());
            if (!channel.server.owner.id.equals(userId)) {
                return Response.status(Response.Status.FORBIDDEN)
                    .entity(new ErrorResponse("Only server owner can delete channels"))
                    .build();
            }

            channelRepository.delete(channel);
            return Response.noContent().build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new ErrorResponse(e.getMessage()))
                .build();
        }
    }

    private ChannelDTO mapToDTO(Channel channel) {
        ChannelDTO dto = new ChannelDTO();
        dto.id = channel.id;
        dto.name = channel.name;
        dto.description = channel.description;
        dto.serverId = channel.server.id;
        dto.createdAt = channel.createdAt;
        return dto;
    }

    static class ErrorResponse {
        public String error;
        public ErrorResponse(String error) {
            this.error = error;
        }
    }
}
