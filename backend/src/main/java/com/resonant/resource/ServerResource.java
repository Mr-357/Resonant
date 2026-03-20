package com.resonant.resource;

import com.resonant.dto.CreateServerRequest;
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
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponses;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

import java.util.List;

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
        Long userId = Long.parseLong(securityContext.getUserPrincipal().getName());
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
            Long userId = Long.parseLong(securityContext.getUserPrincipal().getName());
            Server server = serverService.createServer(request, userId);
            return Response.status(Response.Status.CREATED).entity(server).build();
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
        @PathParam("serverId") Long serverId) {
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
    public Response joinServer(@PathParam("serverId") Long serverId) {
        try {
            Long userId = Long.parseLong(securityContext.getUserPrincipal().getName());
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
    public Response leaveServer(@PathParam("serverId") Long serverId) {
        try {
            Long userId = Long.parseLong(securityContext.getUserPrincipal().getName());
            serverService.leaveServer(serverId, userId);
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
        @PathParam("serverId") Long serverId) {
        try {
            Long userId = Long.parseLong(securityContext.getUserPrincipal().getName());
            serverService.deleteServer(serverId, userId);
            return Response.noContent().build();
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
}
