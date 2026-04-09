package com.resonant.resource;

import com.resonant.dto.CreateServerRequest;
import com.resonant.entity.ServerBan;
import com.resonant.entity.Server;
import com.resonant.entity.User;
import com.resonant.service.ServerService;
import io.quarkus.security.Authenticated;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.SecurityContext;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.enums.SchemaType;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponses;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.time.LocalDateTime;

import java.util.UUID;

@Path("/api/servers")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Authenticated
@Tag(name = "Servers", description = "Server management endpoints")
public class ServerResource {

    @Inject
    ServerService serverService;

    @Inject
    SecurityContext securityContext;

    @GET
    @Operation(summary = "Get user servers", description = "Retrieve all servers where the authenticated user is a member")
    @APIResponse(responseCode = "200", description = "List of servers",
        content = @Content(mediaType = "application/json", schema = @Schema(implementation = Server.class)))
    public Response getServers() {
        UUID userId = UUID.fromString(securityContext.getUserPrincipal().getName());
        List<Server> servers = serverService.getServersForUser(userId);
        return Response.ok(servers).build();
    }

    @POST
    @Operation(summary = "Create a new server", description = "Create a new server with the authenticated user as owner")
    @APIResponses(value = {
        @APIResponse(responseCode = "201", description = "Server created successfully",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = Server.class))),
        @APIResponse(responseCode = "400", description = "Invalid server data")
    })
    public Response createServer(CreateServerRequest request) {
        try {
            UUID userId = UUID.fromString(securityContext.getUserPrincipal().getName());
            Server server = serverService.createServer(request, userId);
            return Response.status(Response.Status.CREATED).entity(server).build();
        } catch (Exception e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new ErrorResponse(e.getMessage()))
                .build();
        }
    }

    @PUT
    @Path("/{serverId}")
    @Operation(summary = "Update server", description = "Update server name and description (owner only)")
    @APIResponses(value = {
        @APIResponse(responseCode = "200", description = "Server updated successfully",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = Server.class))),
        @APIResponse(responseCode = "400", description = "Invalid request or permissions")
    })
    public Response updateServer(
        @PathParam("serverId") UUID serverId, 
        CreateServerRequest request) {
        try {
            UUID userId = UUID.fromString(securityContext.getUserPrincipal().getName());
            Server server = serverService.updateServer(serverId, request.name, request.description, userId);
            return Response.ok(server).build();
        } catch (Exception e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new ErrorResponse(e.getMessage()))
                .build();
        }
    }

    @GET
    @Path("/{serverId}")
    @Operation(summary = "Get server details", description = "Retrieve details of a specific server")
    @APIResponses(value = {
        @APIResponse(responseCode = "200", description = "Server details",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = Server.class))),
        @APIResponse(responseCode = "404", description = "Server not found")
    })
    public Response getServer(
        @Parameter(description = "Server ID", required = true)
        @PathParam("serverId") UUID serverId) {
        try {
            Server server = serverService.getServer(serverId);
            return Response.ok(server).build();
        } catch (Exception e) {
            return Response.status(Response.Status.NOT_FOUND)
                .entity(new ErrorResponse(e.getMessage()))
                .build();
        }
    }

    @GET
    @Path("/all")
    @Operation(summary = "Get all servers", description = "Retrieve a list of all available servers")
    @APIResponse(responseCode = "200", description = "List of all servers",
        content = @Content(mediaType = "application/json", schema = @Schema(implementation = Server.class)))
    public Response getAllServers() {
        return Response.ok(serverService.getAllServers()).build();
    }

    @POST
    @Path("/{serverId}/join")
    @Operation(summary = "Join a server", description = "Add the authenticated user to a server's member list")
    @APIResponses(value = {
        @APIResponse(responseCode = "200", description = "Joined successfully"),
        @APIResponse(responseCode = "400", description = "Already a member or other error"),
        @APIResponse(responseCode = "404", description = "Server not found")
    })
    public Response joinServer(@PathParam("serverId") UUID serverId) {
        try {
            UUID userId = UUID.fromString(securityContext.getUserPrincipal().getName());
            serverService.joinServer(serverId, userId);
            return Response.ok().build();
        } catch (Exception e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new ErrorResponse(e.getMessage()))
                .build();
        }
    }

    @POST
    @Path("/{serverId}/leave")
    @Operation(summary = "Leave a server", description = "Remove the authenticated user from a server's member list")
    @APIResponses(value = {
        @APIResponse(responseCode = "200", description = "Left successfully"),
        @APIResponse(responseCode = "400", description = "Cannot leave server (e.g., you are the owner)"),
        @APIResponse(responseCode = "404", description = "Server not found")
    })
    public Response leaveServer(@PathParam("serverId") UUID serverId) {
        try {
            UUID userId = UUID.fromString(securityContext.getUserPrincipal().getName());
            serverService.leaveServer(serverId, userId);
            return Response.ok().build();
        } catch (Exception e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new ErrorResponse(e.getMessage()))
                .build();
        }
    }

    @DELETE
    @Path("/{serverId}/members/{userId}")
    @Operation(summary = "Kick member", description = "Kick a user from the server (owner only). This applies a 1-minute ban.")
    @APIResponses(value = {
        @APIResponse(responseCode = "200", description = "Member kicked and temporarily banned successfully"),
        @APIResponse(responseCode = "400", description = "Error kicking member")
    })
    public Response removeMember(
        @PathParam("serverId") UUID serverId,
        @PathParam("userId") UUID userId) {
        try {
            UUID requesterId = UUID.fromString(securityContext.getUserPrincipal().getName());
            serverService.kickMember(serverId, userId, requesterId); // Now kicks and bans for 1 minute
            return Response.ok().build();
        } catch (Exception e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new ErrorResponse(e.getMessage()))
                .build();
        }
    }

    @DELETE
    @Path("/{serverId}")
    @Operation(summary = "Delete a server", description = "Delete a server (only owner can delete)")
    @APIResponses(value = {
        @APIResponse(responseCode = "204", description = "Server deleted successfully"),
        @APIResponse(responseCode = "403", description = "Insufficient permissions"),
        @APIResponse(responseCode = "404", description = "Server not found")
    })
    public Response deleteServer(
        @Parameter(description = "Server ID", required = true)
        @PathParam("serverId") UUID serverId) {
        try {
            UUID userId = UUID.fromString(securityContext.getUserPrincipal().getName());
            serverService.deleteServer(serverId, userId);
            return Response.noContent().build();
        } catch (Exception e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new ErrorResponse(e.getMessage()))
                .build();
        }
    }

    @GET
    @Path("/{serverId}/members")
    @Operation(summary = "Get server members", description = "Retrieve list of members for a server")
    public Response getMembers(@PathParam("serverId") UUID serverId) {
        try {
            Server server = serverService.getServer(serverId);
            
            // Combine owner and members for the list
            Stream<User> memberStream = server.members.stream();
            if (server.owner != null) {
                memberStream = Stream.concat(Stream.of(server.owner), memberStream);
            }
            
            List<MemberDTO> members = memberStream
                .distinct()
                .map(u -> new MemberDTO(u.id, u.username))
                .collect(Collectors.toList());
                
            return Response.ok(members).build();
        } catch (Exception e) {
             return Response.status(Response.Status.BAD_REQUEST)
                .entity(new ErrorResponse(e.getMessage()))
                .build();
        }
    }

    @POST
    @Path("/{serverId}/bans/{userId}")
    @Operation(summary = "Ban a user from the server", description = "Ban a user from the server for a specified duration (owner only). Duration 0 means permanent.")
    @APIResponses(value = {
        @APIResponse(responseCode = "200", description = "User banned successfully",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = ServerBanDTO.class))),
        @APIResponse(responseCode = "400", description = "Invalid request or permissions")
    })
    public Response banUser(
        @PathParam("serverId") UUID serverId,
        @PathParam("userId") UUID userId,
        @QueryParam("durationMinutes") @DefaultValue("0") long durationMinutes) { // 0 for permanent
        try {
            UUID requesterId = UUID.fromString(securityContext.getUserPrincipal().getName());
            ServerBan serverBan = serverService.banUser(serverId, userId, requesterId, durationMinutes);
            return Response.ok(new ServerBanDTO(serverBan.id, serverBan.user.id, serverBan.user.username, serverBan.bannedUntil)).build();
        } catch (Exception e) {
           
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new ErrorResponse(e.getMessage()))
                .build();
        }
    }

    @DELETE
    @Path("/{serverId}/bans/{userId}")
    @Operation(summary = "Unban a user from the server", description = "Unban a user from the server (owner only).")
    @APIResponses(value = {
        @APIResponse(responseCode = "204", description = "User unbanned successfully"),
        @APIResponse(responseCode = "400", description = "Invalid request or permissions")
    })
    public Response unbanUser(
        @PathParam("serverId") UUID serverId,
        @PathParam("userId") UUID userId) {
        try {
            UUID requesterId = UUID.fromString(securityContext.getUserPrincipal().getName());
            serverService.unbanUser(serverId, userId, requesterId);
            return Response.noContent().build();
        } catch (Exception e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new ErrorResponse(e.getMessage()))
                .build();
        }
    }

    @GET
    @Path("/{serverId}/bans")
    @Operation(summary = "Get banned users for a server", description = "Retrieve a list of currently banned users for a server (owner only).")
    @APIResponses(value = {
        @APIResponse(responseCode = "403", description = "Forbidden - Only owner can view banned users"),
        @APIResponse(responseCode = "200", description = "List of banned users",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = ServerBanDTO.class, type = SchemaType.ARRAY))),
        @APIResponse(responseCode = "400", description = "Invalid request or permissions")
    })
    public Response getBannedUsers(@PathParam("serverId") UUID serverId) {
        try {
            UUID requesterId = UUID.fromString(securityContext.getUserPrincipal().getName());
            Server server = serverService.getServer(serverId); // Get server to check owner

            if (!server.owner.id.equals(requesterId)) {
                return Response.status(Response.Status.FORBIDDEN)
                    .entity(new ErrorResponse("Only the server owner can view banned users."))
                    .build();
            }

            List<ServerBan> bans = serverService.getActiveBansForServer(serverId);
            List<ServerBanDTO> bannedUsers = bans.stream()
                .map(ban -> new ServerBanDTO(ban.id, ban.user.id, ban.user.username, ban.bannedUntil))
                .collect(Collectors.toList());
            return Response.ok(bannedUsers).build();
        } catch (Exception e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new ErrorResponse(e.getMessage()))
                .build();
        }
    }

    static class ErrorResponse {
        public String error;
        public ErrorResponse(String error) {
            this.error = error;
        }
    }

    public static class MemberDTO {
        public UUID id;
        public String username;
        public MemberDTO(UUID id, String username) {
            this.id = id;
            this.username = username;
        }
    }

    public static class ServerBanDTO {
        public UUID id;
        public UUID userId;
        public String username;
        public LocalDateTime bannedUntil;
        public ServerBanDTO(UUID id, UUID userId, String username, LocalDateTime bannedUntil) {
            this.id = id; this.userId = userId; this.username = username; this.bannedUntil = bannedUntil;
        }
    }
}
