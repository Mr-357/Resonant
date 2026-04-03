package com.resonant.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public class ChannelDTO {
    public UUID id;
    public String name;
    public String description;
    public UUID serverId;
    public LocalDateTime createdAt;
}
