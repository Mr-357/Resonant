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

import java.util.List;

@Path("/api/servers")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Authenticated
public class ServerResource {

    @Inject
    ServerService serverService;

    @Inject
    SecurityContext securityContext;

    @GET
    public Response getServers() {
        Long userId = Long.parseLong(securityContext.getUserPrincipal().getName());
        List<Server> servers = serverService.getServersForUser(userId);
        return Response.ok(servers).build();
    }

    @POST
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
    public Response getServer(@PathParam("serverId") Long serverId) {
        try {
            Server server = serverService.getServer(serverId);
            return Response.ok(server).build();
        } catch (Exception e) {
            return Response.status(Response.Status.NOT_FOUND)
                .entity(new ErrorResponse(e.getMessage()))
                .build();
        }
    }

    @DELETE
    @Path("/{serverId}")
    public Response deleteServer(@PathParam("serverId") Long serverId) {
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
