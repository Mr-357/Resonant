package com.resonant.ratelimit;

import io.quarkus.redis.datasource.RedisDataSource;
import jakarta.annotation.Priority;
import jakarta.enterprise.context.Dependent;
import jakarta.inject.Inject;
import jakarta.interceptor.AroundInvoke;
import jakarta.interceptor.Interceptor;
import jakarta.interceptor.InvocationContext;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.SecurityContext;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.security.Principal;

@Interceptor
@Priority(1)
@RateLimit
@Dependent
public class RateLimitInterceptor {

    @Inject
    RedisDataSource redisDS;

    @Inject
    SecurityContext securityContext;

    @ConfigProperty(name = "app.ratelimit.enabled", defaultValue = "true")
    boolean rateLimitEnabled;

    @AroundInvoke
    public Object rateLimit(InvocationContext ctx) throws Exception {
        if (!rateLimitEnabled) {
            return ctx.proceed();
        }

        try {
            RateLimit annotation = ctx.getMethod().getAnnotation(RateLimit.class);
            if (annotation == null) {
                return ctx.proceed();
            }

            Principal principal = securityContext.getUserPrincipal();
            if (principal == null) {
                return ctx.proceed();
            }
            String userId = principal.getName();
            String key = buildKey(userId, annotation.key());
            
            long counter = 0;
            Long existing = redisDS.value(Long.class).get(key);
            if (existing != null) {
                counter = existing;
            }
            counter++;

            if (counter > annotation.limit()) {
                return buildTooManyRequestsResponse();
            }

            // Use setex to set with expiration
            redisDS.value(Long.class).psetex(key, annotation.windowSeconds() * 1000L, counter);

            return ctx.proceed();
        } catch (Exception e) {
            // If rate limit check fails, allow the request to proceed
            return ctx.proceed();
        }
    }

    private String buildKey(String userId, String endpoint) {
        return "ratelimit:" + userId + ":" + endpoint;
    }

    private Response buildTooManyRequestsResponse() {
        return Response.status(429)
            .entity(new RateLimitError("Rate limit exceeded. Please try again later"))
            .build();
    }

    static class RateLimitError {
        public String error;

        RateLimitError(String error) {
            this.error = error;
        }
    }
}
