package com.resonant.resource;

import com.resonant.dto.CreateMessageRequest;
import com.resonant.dto.MessageDTO;
import com.resonant.entity.Channel;
import com.resonant.entity.Message;
import com.resonant.entity.User;
import com.resonant.repository.ChannelRepository;
import com.resonant.repository.MessageRepository;
import com.resonant.repository.UserRepository;
import com.resonant.ratelimit.RateLimit;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.SecurityContext;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponses;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

import java.time.LocalDateTime;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Path("/api/channels/{channelId}/messages")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Authenticated
@Tag(name = "Messages", description = "Message management endpoints")
public class MessageResource {

    @Inject
    SecurityContext securityContext;
    
    @Inject
    ChannelRepository channelRepository;
    
    @Inject
    MessageRepository messageRepository;
    
    @Inject
    UserRepository userRepository;

    @GET
    @Operation(summary = "Get channel messages", description = "Retrieve messages from a channel with optional filtering by timestamp and limit")
    @APIResponses(value = {
        @APIResponse(responseCode = "200", description = "List of messages",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = MessageDTO.class))),
        @APIResponse(responseCode = "404", description = "Channel not found")
    })
    public Response getMessages(
        @Parameter(description = "Channel ID", required = true)
        @PathParam("channelId") Long channelId,
        @Parameter(description = "Unix timestamp in milliseconds - retrieve only messages after this time", required = false)
        @QueryParam("since") Long sinceTimestamp,
        @Parameter(description = "Maximum number of messages to return", required = false)
        @QueryParam("limit") @DefaultValue("50") int limit) {
        
        try {
            Optional<Channel> channelOpt = channelRepository.findByIdOptional(channelId);
            if (channelOpt.isEmpty()) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new ErrorResponse("Channel not found"))
                    .build();
            }
            Channel channel = channelOpt.get();

            // Verify user is member of channel's server
            verifyServerMembership(channel.server.id);

            List<MessageDTO> messages;
            if (sinceTimestamp != null && sinceTimestamp > 0) {
                LocalDateTime since = Instant.ofEpochMilli(sinceTimestamp)
                    .atZone(ZoneId.systemDefault())
                    .toLocalDateTime();
                messages = messageRepository.findByChannelSinceNotDeleted(channelId, since)
                    .stream()
                    .limit(limit)
                    .map(this::mapToDTO)
                    .collect(Collectors.toList());
            } else {
                messages = messageRepository.findByChannelNotDeleted(channelId)
                    .stream()
                    .limit(limit)
                    .map(this::mapToDTO)
                    .collect(Collectors.toList());
            }

            return Response.ok(messages).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new ErrorResponse(e.getMessage()))
                .build();
        }
    }

    @POST
    @RateLimit(key = "message.send", limit = 10, windowSeconds = 60)
    @Transactional
    @Operation(summary = "Send a message", description = "Create a new message in a channel (rate limited to 10 per 60 seconds)")
    @APIResponses(value = {
        @APIResponse(responseCode = "201", description = "Message created successfully",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = MessageDTO.class))),
        @APIResponse(responseCode = "400", description = "Invalid message data or message exceeds length limit"),
        @APIResponse(responseCode = "404", description = "Channel not found")
    })
    public Response createMessage(
        @Parameter(description = "Channel ID", required = true)
        @PathParam("channelId") Long channelId, CreateMessageRequest request) {
        try {
            if (request.content == null || request.content.isBlank()) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new ErrorResponse("Message content is required"))
                    .build();
            }

            if (request.content.length() > 4000) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new ErrorResponse("Message exceeds maximum length"))
                    .build();
            }

            Optional<Channel> channelOpt = channelRepository.findByIdOptional(channelId);
            if (channelOpt.isEmpty()) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new ErrorResponse("Channel not found"))
                    .build();
            }
            Channel channel = channelOpt.get();

            Long userId = Long.parseLong(securityContext.getUserPrincipal().getName());
            Optional<User> authorOpt = userRepository.findByIdOptional(userId);
            if (authorOpt.isEmpty()) {
                return Response.status(Response.Status.UNAUTHORIZED)
                    .entity(new ErrorResponse("User not found"))
                    .build();
            }
            User author = authorOpt.get();

            // Verify user is member of channel's server
            verifyServerMembership(channel.server.id);

            Message message = new Message();
            message.content = request.content;
            message.channel = channel;
            message.author = author;
            messageRepository.persist(message);

            return Response.status(Response.Status.CREATED)
                .entity(mapToDTO(message))
                .build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new ErrorResponse(e.getMessage()))
                .build();
        }
    }

    @DELETE
    @Path("/{messageId}")
    @Transactional
    @Operation(summary = "Delete a message", description = "Delete a message (only message author can delete)")
    @APIResponses(value = {
        @APIResponse(responseCode = "204", description = "Message deleted successfully"),
        @APIResponse(responseCode = "403", description = "Only message author can delete it"),
        @APIResponse(responseCode = "404", description = "Message not found")
    })
    public Response deleteMessage(
        @Parameter(description = "Channel ID", required = true)
        @PathParam("channelId") Long channelId,
        @Parameter(description = "Message ID", required = true)
        @PathParam("messageId") Long messageId) {
        try {
            Optional<Message> messageOpt = messageRepository.findByIdOptional(messageId);
            if (messageOpt.isEmpty() || !messageOpt.get().channel.id.equals(channelId)) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new ErrorResponse("Message not found"))
                    .build();
            }
            Message message = messageOpt.get();

            Long userId = Long.parseLong(securityContext.getUserPrincipal().getName());
            if (!message.author.id.equals(userId)) {
                return Response.status(Response.Status.FORBIDDEN)
                    .entity(new ErrorResponse("Only message author can delete it"))
                    .build();
            }

            message.isDeleted = true;
            messageRepository.persist(message);

            return Response.noContent().build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new ErrorResponse(e.getMessage()))
                .build();
        }
    }

    private void verifyServerMembership(Long serverId) throws Exception {
        Long userId = Long.parseLong(securityContext.getUserPrincipal().getName());
        Optional<User> userOpt = userRepository.findByIdOptional(userId);
        if (userOpt.isEmpty()) {
            throw new Exception("User not found");
        }
        // TODO: Check if user is member of server
    }

    private MessageDTO mapToDTO(Message message) {
        MessageDTO dto = new MessageDTO();
        dto.id = message.id;
        dto.content = message.content;
        dto.author = message.author.username;
        dto.authorId = message.author.id;
        dto.channelId = message.channel.id;
        dto.createdAt = message.createdAt;
        dto.isDeleted = message.isDeleted;
        return dto;
    }

    static class ErrorResponse {
        public String error;
        public ErrorResponse(String error) {
            this.error = error;
        }
    }
}
