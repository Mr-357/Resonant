package com.resonant.resource;

import com.resonant.dto.CreateMessageRequest;
import com.resonant.dto.MessageDTO;
import com.resonant.entity.Message;
import com.resonant.ratelimit.RateLimit;
import com.resonant.service.MessageService;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
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
    MessageService messageService;

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
            List<Message> messages = messageService.getMessages(channelId, sinceTimestamp, limit);
            
            List<MessageDTO> dtos = messages.stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());

            return Response.ok(dtos).build();
        } catch (NotFoundException e) {
            return Response.status(Response.Status.NOT_FOUND).entity(new ErrorResponse(e.getMessage())).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new ErrorResponse(e.getMessage()))
                .build();
        }
    }

    @POST
    @RateLimit(key = "message.send", limit = 10, windowSeconds = 60)
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
            Long userId = Long.parseLong(securityContext.getUserPrincipal().getName());
            Message message = messageService.create(channelId, request.content, userId);

            return Response.status(Response.Status.CREATED)
                .entity(mapToDTO(message))
                .build();
        } catch (BadRequestException e) {
            return Response.status(Response.Status.BAD_REQUEST).entity(new ErrorResponse(e.getMessage())).build();
        } catch (NotFoundException e) {
            return Response.status(Response.Status.NOT_FOUND).entity(new ErrorResponse(e.getMessage())).build();
        } catch (ForbiddenException e) {
            return Response.status(Response.Status.FORBIDDEN).entity(new ErrorResponse(e.getMessage())).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new ErrorResponse(e.getMessage()))
                .build();
        }
    }

    @DELETE
    @Path("/{messageId}")
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
            Long userId = Long.parseLong(securityContext.getUserPrincipal().getName());
            messageService.delete(channelId, messageId, userId);

            return Response.noContent().build();
        } catch (NotFoundException e) {
            return Response.status(Response.Status.NOT_FOUND).entity(new ErrorResponse(e.getMessage())).build();
        } catch (ForbiddenException e) {
            return Response.status(Response.Status.FORBIDDEN).entity(new ErrorResponse(e.getMessage())).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new ErrorResponse(e.getMessage()))
                .build();
        }
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
